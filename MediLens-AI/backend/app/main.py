from contextlib import asynccontextmanager
from typing import Any
from datetime import date

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .data.store import (
    CLINICAL_EVENTS,
    DOCTORS,
    PATIENTS,
    RECORDS_PROCESSED,
    add_events,
    create_patient_from_demographics,
    get_events,
    get_patient,
    get_reports_for_patient,
    save_report,
    search_events,
    seed_patients,
    update_patient,
)
from .ml.anomaly import detect_anomalies
from .ml.model_loader import load_models, models_ready
from .ml.predict import analyze_patient
from .ml.timeline import generate_timeline
from .ml.trend import detect_trends
from .services.ingestion import extract_file_data, ingest_file
from .utils.auth import create_access_token, get_current_user, verify_patient_access


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_patients()
    try:
        load_models()
    except Exception as e:
        print(f"Startup ML Model Load Warning: {e}")
    yield


app = FastAPI(title="MediLens AI API", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str
    role: str = "doctor"  # "doctor" or "patient"


class AnalysisRequest(BaseModel):
    patient_id: str


class SearchRequest(BaseModel):
    patient_id: str
    query: str = ""


class ConfirmUploadRequest(BaseModel):
    patient_id: str | None = None
    name: str
    age: int
    gender: str
    dob: str | None = None
    blood_group: str = "O+"
    height: float = 170
    weight: float = 70
    allergies: str = "None known"
    conditions: list[str] = []
    medications: list[str] = []
    symptoms: str = ""
    doctor_notes: str = ""
    vitals: dict[str, Any] = {}
    labs: dict[str, Any] = {}


@app.get("/health")
def health():
    return {"status": "ok", "service": "MediLens AI", "models_loaded": models_ready()}


@app.post("/api/v1/auth/login")
def login(payload: LoginRequest):
    uname = payload.username.strip().lower()
    pwd = payload.password.strip()

    if payload.role == "doctor":
        doc = next((d for d in DOCTORS if d["username"].lower() == uname or d["id"].lower() == uname), None)
        if not doc or pwd != doc["password"]:
            raise HTTPException(401, "Invalid doctor credentials")
        token = create_access_token(doc["id"], "doctor", {"name": doc["name"], "doctor_id": doc["id"]})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": doc["id"],
                "name": doc["name"],
                "role": "doctor",
                "specialty": doc["specialty"],
                "hospital": doc["hospital"],
                "doctor_id": doc["id"],
            },
        }
    else:
        patient = next((p for p in PATIENTS if p["id"].lower() == uname or p.get("username", "").lower() == uname), None)
        if not patient or pwd != patient.get("password", "password123"):
            raise HTTPException(401, "Invalid patient credentials")
        token = create_access_token(patient["id"], "patient", {"name": patient["name"], "patient_id": patient["id"]})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": patient["id"],
                "name": patient["name"],
                "role": "patient",
                "patient_id": patient["id"],
            },
        }


@app.get("/api/v1/auth/me")
def get_me(current_user: dict[str, Any] = Depends(get_current_user)):
    return current_user


@app.get("/api/v1/dashboard")
def dashboard(current_user: dict[str, Any] = Depends(get_current_user)):
    role = current_user.get("role", "doctor")
    doc_id = current_user.get("doctor_id") or current_user.get("id")

    if role == "doctor":
        visible_patients = [
            p for p in PATIENTS
            if p.get("doctor_id") == doc_id or p.get("assigned_doctor_id") == doc_id or p.get("owner_user_id") == doc_id
        ]
    else:
        pid = current_user.get("patient_id") or current_user.get("id")
        visible_patients = [p for p in PATIENTS if p["id"] == pid]

    all_anomalies = []
    all_insights = []
    high_risk_count = 0
    pending_review_count = sum(1 for p in visible_patients if p.get("pending_review"))

    for p in visible_patients:
        events = get_events(p["id"])
        anomalies = detect_anomalies(events)
        all_anomalies.extend(anomalies)
        trends = detect_trends(events)
        for t in trends:
            if t["direction"] == "Increasing":
                all_insights.append(f"Rising {t['category'].replace('_', ' ')} — {p['name']}")

        analysis = analyze_patient(p["id"])
        if analysis.get("overall_risk", {}).get("level") == "HIGH":
            high_risk_count += 1

    risk_distribution = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for p in visible_patients:
        analysis = analyze_patient(p["id"])
        lvl = analysis.get("overall_risk", {}).get("level", "LOW")
        if lvl in risk_distribution:
            risk_distribution[lvl] += 1

    return {
        "metrics": {
            "total_patients": len(visible_patients),
            "patients_analyzed": sum(1 for p in visible_patients if p.get("analyzed")),
            "records_processed": sum(p.get("records_processed", 0) for p in visible_patients),
            "high_risk_signals": high_risk_count,
            "new_anomalies": len(all_anomalies),
            "pending_review": pending_review_count,
            "today_analyses": max(1, len(visible_patients) // 3),
        },
        "recent_patients": visible_patients[:6],
        "risk_distribution": risk_distribution,
        "alerts": [
            {"text": a["message"][:85], "severity": a["severity"], "patient_id": a.get("source_event", {}).get("patient_id", "")}
            for a in all_anomalies[:8]
        ],
        "trending_conditions": list(set(all_insights))[:6],
        "recent_insights": all_insights[:5],
    }


@app.get("/api/v1/patients")
def list_patients(q: str = "", current_user: dict[str, Any] = Depends(get_current_user)):
    role = current_user.get("role", "doctor")
    if role == "patient":
        raise HTTPException(status_code=403, detail="Access Denied: Patients cannot view cohort directory.")

    doc_id = current_user.get("doctor_id") or current_user.get("id")
    doctor_patients = [
        p for p in PATIENTS
        if p.get("doctor_id") == doc_id or p.get("assigned_doctor_id") == doc_id or p.get("owner_user_id") == doc_id
    ]

    term = q.lower().strip()
    if not term:
        return doctor_patients
    return [
        p for p in doctor_patients
        if term in (p["name"] + p["id"] + " ".join(p.get("conditions", [])) + p.get("doctor_name", "")).lower()
    ]


@app.get("/api/v1/patients/{patient_id}")
def patient_detail(patient_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    patient = verify_patient_access(patient_id, current_user)
    events = get_events(patient_id)
    analysis = analyze_patient(patient_id)
    previous_reports = get_reports_for_patient(patient_id)

    return {
        **patient,
        "bmi": round(patient.get("weight", 70) / ((patient.get("height", 170) / 100) ** 2), 1),
        "events": events,
        "timeline": generate_timeline(events),
        "trends": detect_trends(events),
        "anomalies": detect_anomalies(events),
        "analysis": analysis,
        "vitals": _vitals_chart(events),
        "labs": _labs_chart(events),
        "notes": [e for e in events if e.get("type") == "note"],
        "previous_reports": previous_reports,
    }


@app.put("/api/v1/patients/{patient_id}")
def edit_patient(patient_id: str, updates: dict[str, Any], current_user: dict[str, Any] = Depends(get_current_user)):
    role = current_user.get("role", "doctor")
    if role != "doctor":
        raise HTTPException(403, "Access Denied: Only assigned doctors can edit patient details.")

    verify_patient_access(patient_id, current_user)
    updated = update_patient(patient_id, updates)
    if not updated:
        raise HTTPException(404, "Patient not found")
    return updated


def _vitals_chart(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    chart = []
    for e in events:
        if e.get("type") != "vital":
            continue
        row = {"date": e["date"]}
        if e.get("category") == "blood_pressure":
            row["systolic"] = e.get("systolic")
            row["diastolic"] = e.get("diastolic")
        elif isinstance(e.get("value"), (int, float)):
            row[e["category"]] = e["value"]
        if len(row) > 1:
            chart.append(row)
    return chart


def _labs_chart(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_date: dict[str, dict] = {}
    for e in events:
        if e.get("type") != "lab":
            continue
        by_date.setdefault(e["date"], {"date": e["date"]})
        if isinstance(e.get("value"), (int, float)):
            by_date[e["date"]][e["category"]] = e["value"]
    return list(by_date.values())


@app.post("/api/v1/upload/extract")
async def extract_upload(
    file: UploadFile = File(...),
    patient_id: str | None = Query(None),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    content = await file.read()
    extracted = extract_file_data(file.filename or "record.csv", content, patient_id)
    return extracted


@app.post("/api/v1/upload/confirm")
def confirm_upload(
    payload: ConfirmUploadRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    try:
        doc_id = current_user.get("doctor_id") or current_user.get("id")
        doc_name = current_user.get("name") or "Dr. Sarah Jenkins"
        pid = payload.patient_id

        # Robust check: if pid is None, empty, "DRAFT", "TEMP", or non-existent -> Create New Patient Record!
        if not pid or pid in ("DRAFT", "TEMP") or get_patient(pid) is None:
            patient = create_patient_from_demographics({
                "name": payload.name,
                "age": payload.age,
                "gender": payload.gender,
                "dob": payload.dob,
                "blood_group": payload.blood_group,
                "height": payload.height,
                "weight": payload.weight,
                "allergies": payload.allergies,
                "conditions": payload.conditions,
                "medications": payload.medications,
            }, doctor_id=doc_id, doctor_name=doc_name)
            pid = patient["id"]
        else:
            verify_patient_access(pid, current_user)
            update_patient(pid, {
                "name": payload.name,
                "age": payload.age,
                "gender": payload.gender,
                "blood_group": payload.blood_group,
                "height": payload.height,
                "weight": payload.weight,
                "allergies": payload.allergies,
                "conditions": payload.conditions,
                "medications": payload.medications,
                "pending_review": False,
            })

        # Add clinical events from doctor review screen
        today = str(date.today())
        new_events = []

        if payload.doctor_notes:
            new_events.append({
                "patient_id": pid, "date": today,
                "type": "note", "text": payload.doctor_notes, "source": "doctor_review",
            })

        for vit_name, vit_val in payload.vitals.items():
            if not vit_val:
                continue
            if vit_name == "blood_pressure" and "/" in str(vit_val):
                try:
                    sys_str, dia_str = str(vit_val).split("/")
                    new_events.append({
                        "patient_id": pid, "date": today,
                        "type": "vital", "category": "blood_pressure",
                        "value": str(vit_val), "unit": "mmHg", "systolic": float(sys_str), "diastolic": float(dia_str),
                        "source": "doctor_review",
                    })
                except Exception:
                    pass
            elif isinstance(vit_val, (int, float)):
                new_events.append({
                    "patient_id": pid, "date": today,
                    "type": "vital", "category": vit_name, "value": float(vit_val), "source": "doctor_review",
                })

        for lab_name, lab_val in payload.labs.items():
            if lab_val not in (None, ""):
                try:
                    new_events.append({
                        "patient_id": pid, "date": today,
                        "type": "lab", "category": lab_name, "value": float(lab_val), "source": "doctor_review",
                    })
                except ValueError:
                    pass

        # Add workflow events for longitudinal audit trail
        new_events.append({
            "patient_id": pid, "date": today,
            "type": "workflow", "type_label": "Upload", "category": "record_ingestion",
            "summary": "Patient Clinical Record File Ingested & Extracted",
            "text": f"File record processed for patient {payload.name} ({pid}).",
            "source": "ingestion_engine",
        })
        new_events.append({
            "patient_id": pid, "date": today,
            "type": "workflow", "type_label": "Doctor Review", "category": "doctor_verification",
            "summary": "Mandatory Doctor Review & Verification Completed",
            "text": f"Attending physician ({doc_name}) verified patient vitals and lab parameters.",
            "source": "doctor_review",
        })

        if new_events:
            add_events(pid, new_events)

        analysis = analyze_patient(pid)

        # AI Analysis event
        add_events(pid, [{
            "patient_id": pid, "date": today,
            "type": "workflow", "type_label": "AI Analysis", "category": "ml_inference",
            "summary": f"4 ML Disease Models Executed (Overall Risk: {analysis.get('overallRisk')} {analysis.get('overall_risk', {}).get('score')}%)",
            "text": f"Model predictions: Heart ({analysis.get('disease_risks', {}).get('heart')}%), Diabetes ({analysis.get('disease_risks', {}).get('diabetes')}%), Kidney ({analysis.get('disease_risks', {}).get('kidney')}%), Stroke ({analysis.get('disease_risks', {}).get('stroke')}%). Confidence: {analysis.get('confidence')}%.",
            "source": "ml_pipeline",
        }])

        report_payload = {
            "status": "ready",
            "report_id": f"REP-{pid}-001",
            "generated_date": today,
            "patient": get_patient(pid),
            "analysis": analysis,
        }
        saved_report = save_report(pid, report_payload, doctor_id=doc_id, created_by=doc_id)

        return {
            "status": "success",
            "patient_id": pid,
            "report_id": saved_report["id"],
            "doctor_id": doc_id,
            "owner_id": doc_id,
            "message": "Doctor review confirmed. Clinical intelligence report generated successfully.",
            "analysis": analysis,
        }
    except HTTPException:
        raise
    except Exception as err:
        print(f"Backend Exception in confirm_upload: {err}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(err)}")


@app.post("/api/v1/upload")
async def upload_record(
    file: UploadFile = File(...),
    patient_id: str | None = Query(None),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    content = await file.read()
    result = ingest_file(file.filename or "upload.csv", content, patient_id)
    analysis = analyze_patient(result["patient_id"])
    return {
        **result,
        "status": "processed",
        "message": f"Extracted {result['events_extracted']} clinical events. Timeline and analysis ready.",
        "analysis": analysis,
    }


@app.post("/api/v1/analyze")
def analyze(payload: AnalysisRequest, current_user: dict[str, Any] = Depends(get_current_user)):
    verify_patient_access(payload.patient_id, current_user)
    return analyze_patient(payload.patient_id)


@app.get("/api/v1/analysis/{patient_id}")
def get_analysis(patient_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    verify_patient_access(patient_id, current_user)
    return analyze_patient(patient_id)


@app.get("/api/v1/patients/{patient_id}/timeline")
def patient_timeline(
    patient_id: str,
    filter_type: str = "all",
    q: str = "",
    current_user: dict[str, Any] = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user)
    events = get_events(patient_id)
    return generate_timeline(events, filter_type, q)


@app.post("/api/v1/search")
def search(payload: SearchRequest, current_user: dict[str, Any] = Depends(get_current_user)):
    verify_patient_access(payload.patient_id, current_user)
    results = search_events(payload.patient_id, payload.query)
    return {"query": payload.query, "results": results, "count": len(results)}


@app.get("/api/v1/reports")
def reports(current_user: dict[str, Any] = Depends(get_current_user)):
    role = current_user.get("role", "doctor")
    doc_id = current_user.get("doctor_id") or current_user.get("id")

    if role == "doctor":
        visible_patients = [
            p for p in PATIENTS
            if p.get("doctor_id") == doc_id or p.get("assigned_doctor_id") == doc_id or p.get("owner_user_id") == doc_id
        ]
    else:
        pid = current_user.get("patient_id") or current_user.get("id")
        visible_patients = [p for p in PATIENTS if p["id"] == pid]

    report_list = []
    for p in visible_patients:
        saved = get_reports_for_patient(p["id"])
        if saved:
            for s in saved:
                report_list.append({
                    "id": s["id"],
                    "patient_id": p["id"],
                    "patient": p["name"],
                    "date": s["date"],
                    "created_at": s["created_at"],
                    "doctor_name": s["doctor_name"],
                    "status": "Ready",
                    "overall_risk": s["overall_risk"],
                    "health_score": s["health_score"],
                })
        else:
            report_list.append({
                "id": f"R-{p['id']}",
                "patient_id": p["id"],
                "patient": p["name"],
                "date": p["last_visit"],
                "created_at": f"{p['last_visit']} 09:00:00",
                "doctor_name": p.get("doctor_name", "Dr. Sarah Jenkins"),
                "status": "Ready" if p.get("analyzed") else "Pending",
                "overall_risk": analyze_patient(p["id"]).get("overall_risk", {}),
                "health_score": analyze_patient(p["id"]).get("health_score", {}),
            })
    return report_list


@app.get("/api/v1/reports/{patient_id}")
def get_patient_report(patient_id: str, current_user: dict[str, Any] = Depends(get_current_user)):
    patient = verify_patient_access(patient_id, current_user)
    doc_id = current_user.get("doctor_id") or current_user.get("id")
    analysis = analyze_patient(patient_id)
    events = get_events(patient_id)
    previous_reports = get_reports_for_patient(patient_id)

    report_payload = {
        "status": "ready",
        "report_id": f"REP-{patient_id}-001",
        "generated_date": str(date.today()),
        "patient": patient,
        "analysis": analysis,
        "timeline": generate_timeline(events),
        "trends": detect_trends(events),
        "anomalies": detect_anomalies(events),
        "previous_reports": previous_reports,
        "disclaimer": analysis.get("disclaimer"),
    }

    if not previous_reports:
        save_report(patient_id, report_payload, doctor_id=doc_id, created_by=doc_id)

    return report_payload


@app.post("/api/v1/generate-report")
def generate_report_endpoint(payload: AnalysisRequest, current_user: dict[str, Any] = Depends(get_current_user)):
    patient = verify_patient_access(payload.patient_id, current_user)
    doc_id = current_user.get("doctor_id") or current_user.get("id")
    analysis = analyze_patient(payload.patient_id)
    events = get_events(payload.patient_id)

    report_payload = {
        "status": "ready",
        "report_id": f"REP-{payload.patient_id}-001",
        "generated_date": str(date.today()),
        "patient": patient,
        "analysis": analysis,
        "timeline": generate_timeline(events),
        "trends": detect_trends(events),
        "anomalies": detect_anomalies(events),
        "disclaimer": analysis.get("disclaimer"),
    }
    saved = save_report(payload.patient_id, report_payload, doctor_id=doc_id, created_by=doc_id)
    return {**report_payload, "report_id": saved["id"]}


@app.get("/api/v1/model-metrics")
def model_metrics():
    from .ml.predict import _model_metrics
    return _model_metrics()
