from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .data.store import (
    CLINICAL_EVENTS,
    PATIENTS,
    RECORDS_PROCESSED,
    add_events,
    create_patient_from_demographics,
    get_events,
    get_patient,
    search_events,
    seed_patients,
)
from .ml.anomaly import detect_anomalies
from .ml.model_loader import load_models, models_ready
from .ml.predict import analyze_patient
from .ml.timeline import generate_timeline
from .ml.trend import detect_trends
from .services.ingestion import ingest_file


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_patients()
    load_models()
    yield


app = FastAPI(title="MediLens AI API", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalysisRequest(BaseModel):
    patient_id: str


class SearchRequest(BaseModel):
    patient_id: str
    query: str = ""


@app.get("/health")
def health():
    return {"status": "ok", "service": "MediLens AI", "models_loaded": models_ready()}


@app.get("/api/v1/dashboard")
def dashboard():
    all_anomalies = []
    all_insights = []
    for p in PATIENTS[:10]:
        events = get_events(p["id"])
        anomalies = detect_anomalies(events)
        all_anomalies.extend(anomalies)
        trends = detect_trends(events)
        for t in trends:
            if t["direction"] == "Increasing":
                all_insights.append(f"Rising {t['category'].replace('_', ' ')} — {p['name']}")

    high_risk = 0
    for p in PATIENTS:
        analysis = analyze_patient(p["id"])
        if analysis.get("overall_risk", {}).get("level") == "HIGH":
            high_risk += 1

    return {
        "metrics": {
            "patients_analyzed": sum(1 for p in PATIENTS if p.get("analyzed")),
            "records_processed": RECORDS_PROCESSED + sum(p.get("records_processed", 0) for p in PATIENTS),
            "high_risk_signals": high_risk,
            "new_anomalies": len(all_anomalies),
        },
        "recent_patients": PATIENTS[:5],
        "alerts": [
            {"text": a["message"][:80], "severity": a["severity"], "patient_id": a.get("source_event", {}).get("patient_id", "")}
            for a in all_anomalies[:6]
        ],
        "trending_conditions": all_insights[:5],
        "recent_insights": all_insights[:4],
    }


@app.get("/api/v1/patients")
def list_patients(q: str = ""):
    term = q.lower().strip()
    if not term:
        return PATIENTS
    return [
        p for p in PATIENTS
        if term in (p["name"] + p["id"] + " ".join(p.get("conditions", []))).lower()
    ]


@app.get("/api/v1/patients/{patient_id}")
def patient_detail(patient_id: str):
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    events = get_events(patient_id)
    analysis = analyze_patient(patient_id)
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
    }


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


@app.post("/api/v1/upload")
async def upload_record(
    file: UploadFile = File(...),
    patient_id: str | None = Query(None),
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
def analyze(payload: AnalysisRequest):
    if not get_patient(payload.patient_id):
        raise HTTPException(404, "Patient not found")
    return analyze_patient(payload.patient_id)


@app.get("/api/v1/analysis/{patient_id}")
def get_analysis(patient_id: str):
    if not get_patient(patient_id):
        raise HTTPException(404, "Patient not found")
    return analyze_patient(patient_id)


@app.get("/api/v1/patients/{patient_id}/timeline")
def patient_timeline(patient_id: str, filter_type: str = "all", q: str = ""):
    if not get_patient(patient_id):
        raise HTTPException(404, "Patient not found")
    events = get_events(patient_id)
    return generate_timeline(events, filter_type, q)


@app.post("/api/v1/search")
def search(payload: SearchRequest):
    if not get_patient(payload.patient_id):
        raise HTTPException(404, "Patient not found")
    results = search_events(payload.patient_id, payload.query)
    return {"query": payload.query, "results": results, "count": len(results)}


@app.get("/api/v1/reports")
def reports():
    return [
        {
            "id": f"R-{p['id']}",
            "patient_id": p["id"],
            "patient": p["name"],
            "date": p["last_visit"],
            "status": "Ready" if p.get("analyzed") else "Pending",
        }
        for p in PATIENTS[:12]
    ]


@app.post("/api/v1/generate-report")
def generate_report(payload: AnalysisRequest):
    patient = get_patient(payload.patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    analysis = analyze_patient(payload.patient_id)
    events = get_events(payload.patient_id)
    return {
        "status": "ready",
        "report_id": f"R-{payload.patient_id}",
        "patient": patient,
        "analysis": analysis,
        "timeline": generate_timeline(events),
        "trends": detect_trends(events),
        "anomalies": detect_anomalies(events),
        "disclaimer": analysis.get("disclaimer"),
    }


@app.get("/api/v1/model-metrics")
def model_metrics():
    from .ml.predict import _model_metrics
    return _model_metrics()
