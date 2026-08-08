"""Clinical event store with seeded longitudinal patient histories, assigned doctors, report storage, and full multi-tenant ownership metadata."""
from __future__ import annotations

import copy
from datetime import date, datetime, timedelta
from typing import Any

DOCTORS = [
    {
        "id": "doc_101",
        "username": "dr_jenkins",
        "password": "password123",
        "name": "Dr. Sarah Jenkins",
        "specialty": "Cardiology & Internal Medicine",
        "hospital": "MediLens AI Medical Center",
    },
    {
        "id": "doc_102",
        "username": "dr_rivera",
        "password": "password123",
        "name": "Dr. Alex Rivera",
        "specialty": "Endocrinology & Primary Care",
        "hospital": "MediLens AI Medical Center",
    },
]

NAMES = [
    "Arjun Mehta", "Priya Sharma", "Rohan Kapoor", "Ananya Iyer", "Vikram Singh",
    "Kavya Nair", "Rahul Verma", "Meera Joshi", "Aditi Rao", "Sanjay Patel",
    "Deepak Verma", "Sunita Rao", "Karan Malhotra", "Neha Gupta", "Amitabh Bachan",
    "Smriti Mandhana", "Rohit Sharma", "Virat Kohli", "Shreya Ghoshal", "Arijit Singh",
    "Pooja Hegde", "Siddharth Malhotra", "Kiara Advani", "Ranveer Singh", "Deepika Padukone",
    "Alia Bhatt", "Ranbir Kapoor", "Varun Dhawan", "Kriti Sanon", "Ayushmann Khurrana",
]

CONDITIONS = [
    ["Hypertension", "Type 2 Diabetes"], ["Asthma"], ["Hyperlipidemia"],
    ["Type 2 Diabetes"], ["Hypertension"], ["Chronic Kidney Disease"], ["Hyperlipidemia", "Coronary Artery Disease"],
]

MEDICATIONS = [
    ["Metformin 500mg", "Lisinopril 10mg"], ["Albuterol inhaler"],
    ["Atorvastatin 20mg"], ["Metformin 850mg", "Glipizide 5mg"],
    ["Amlodipine 5mg"], ["Losartan 50mg"], ["Atorvastatin 40mg", "Aspirin 81mg"],
]

ALLERGIES = [
    "Penicillin", "Sulfa drugs", "Aspirin", "None known", "Latex", "Peanuts", "None known",
]

PATIENTS: list[dict[str, Any]] = []
CLINICAL_EVENTS: dict[str, list[dict[str, Any]]] = {}
REPORTS_STORE: dict[str, list[dict[str, Any]]] = {}
RECORDS_PROCESSED = 0


def _make_timeline(patient_id: str, idx: int) -> list[dict[str, Any]]:
    """Generate rich longitudinal clinical events for demo patients."""
    base = date(2026, 1, 12)
    events: list[dict[str, Any]] = []
    
    hba1c_vals = [5.8 + (idx % 4) * 0.4, 6.1 + (idx % 3) * 0.3, 6.5 + (idx % 5) * 0.4]
    glucose_vals = [110 + idx * 3, 125 + idx * 4, 145 + idx * 5, 160 + idx * 6]
    bp_vals = [(120 + (idx * 2) % 35, 78 + (idx * 2) % 20) for _ in range(4)]
    weight_vals = [65 + idx % 20, 67 + idx % 20, 69 + idx % 20, 72 + idx % 20]
    creatinine_vals = [0.8 + (idx % 3) * 0.2, 1.0 + (idx % 3) * 0.2, 1.2 + (idx % 3) * 0.3, 1.4 + (idx % 3) * 0.3]
    chol_vals = [180 + idx * 4, 195 + idx * 5, 215 + idx * 6]
    hr_vals = [72 + idx % 15, 76 + idx % 15, 82 + idx % 15]
    temp_vals = [98.4, 98.6, 99.1]
    hb_vals = [13.8 - (idx % 3) * 0.5, 13.5 - (idx % 3) * 0.5]
    egfr_vals = [105 - idx * 2, 98 - idx * 2, 90 - idx * 2]

    for i, val in enumerate(hba1c_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=66 * i)),
            "type": "lab", "category": "hba1c", "value": round(val, 1), "unit": "%",
            "source": "lab_report",
        })

    for i, val in enumerate(glucose_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=45 + 38 * i)),
            "type": "lab", "category": "glucose", "value": round(val, 1), "unit": "mg/dL",
            "source": "lab_report",
        })

    for i, (sys, dia) in enumerate(bp_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=30 + 50 * i)),
            "type": "vital", "category": "blood_pressure",
            "value": f"{sys}/{dia}", "unit": "mmHg", "source": "vitals",
            "systolic": sys, "diastolic": dia,
        })

    for i, val in enumerate(weight_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=20 + 55 * i)),
            "type": "vital", "category": "weight", "value": round(val, 1), "unit": "kg",
            "source": "vitals",
        })

    for i, val in enumerate(creatinine_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=40 + 60 * i)),
            "type": "lab", "category": "creatinine", "value": round(val, 2), "unit": "mg/dL",
            "source": "lab_report",
        })

    for i, val in enumerate(chol_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=50 + 70 * i)),
            "type": "lab", "category": "cholesterol", "value": round(val, 1), "unit": "mg/dL",
            "source": "lab_report",
        })

    for i, val in enumerate(hr_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=25 + 40 * i)),
            "type": "vital", "category": "heart_rate", "value": round(val, 1), "unit": "bpm",
            "source": "vitals",
        })

    for i, val in enumerate(temp_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=35 + 45 * i)),
            "type": "vital", "category": "temperature", "value": round(val, 1), "unit": "°F",
            "source": "vitals",
        })

    for i, val in enumerate(hb_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=55 + 65 * i)),
            "type": "lab", "category": "hemoglobin", "value": round(val, 1), "unit": "g/dL",
            "source": "lab_report",
        })

    for i, val in enumerate(egfr_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=60 + 75 * i)),
            "type": "lab", "category": "egfr", "value": round(val, 1), "unit": "mL/min/1.73m²",
            "source": "lab_report",
        })

    notes = [
        "Patient reports increased fatigue and mild exertional dyspnea over the past month.",
        "Medication adherence reviewed; lifestyle counselling provided regarding sodium and carbohydrate restriction.",
        "Follow-up recommended for elevated fasting glucose readings and blood pressure monitoring.",
        "Blood pressure trending upward; added dietary modifications and scheduled renal panel.",
    ]
    for i, text in enumerate(notes):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=80 + 35 * i)),
            "type": "note", "text": text, "source": "clinical_note",
        })

    for i, cond in enumerate(CONDITIONS[idx % len(CONDITIONS)]):
        events.append({
            "patient_id": patient_id,
            "date": str(base - timedelta(days=365 * (i + 1))),
            "type": "diagnosis", "category": "condition", "value": cond,
            "source": "medical_history",
        })

    for med in MEDICATIONS[idx % len(MEDICATIONS)]:
        events.append({
            "patient_id": patient_id,
            "date": str(base - timedelta(days=180)),
            "type": "medication", "category": "prescription", "value": med,
            "source": "medication_list",
        })

    events.sort(key=lambda e: e["date"])
    return events


def seed_patients() -> None:
    global PATIENTS, CLINICAL_EVENTS, REPORTS_STORE
    if PATIENTS:
        return
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for i in range(30):
        pid = f"P{1001 + i}"
        doc = DOCTORS[0] if i < 15 else DOCTORS[1]
        ht = 158 + (i % 6) * 4
        wt = 58 + (i * 5) % 38
        bmi = round(wt / ((ht / 100) ** 2), 1)

        patient = {
            "id": pid,
            "username": pid.lower(),
            "password": "password123",
            "name": NAMES[i % len(NAMES)],
            "age": 34 + (i * 3) % 48,
            "gender": "Female" if i % 2 else "Male",
            "dob": f"{1990 - i:04d}-06-15",
            "blood_group": ["O+", "A+", "B+", "AB+"][i % 4],
            "height": ht,
            "weight": wt,
            "bmi": bmi,
            "phone": f"+91 98{i:08d}12",
            "conditions": CONDITIONS[i % len(CONDITIONS)],
            "medications": MEDICATIONS[i % len(MEDICATIONS)],
            "allergies": ALLERGIES[i % len(ALLERGIES)],
            "doctor_id": doc["id"],
            "doctor_name": doc["name"],
            "assigned_doctor_id": doc["id"],
            "assigned_doctor_name": doc["name"],
            "owner_user_id": doc["id"],
            "created_by": doc["id"],
            "created_at": now_str,
            "admission_date": f"2026-01-{(i % 25) + 1:02d}",
            "records_processed": 14 + i,
            "last_visit": f"2026-08-{(i % 8) + 1:02d}",
            "analyzed": True,
            "pending_review": i % 5 == 0,
        }
        PATIENTS.append(patient)
        CLINICAL_EVENTS[pid] = _make_timeline(pid, i)


def get_patient(patient_id: str) -> dict[str, Any] | None:
    return next((p for p in PATIENTS if p["id"] == patient_id), None)


def update_patient(patient_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    patient = get_patient(patient_id)
    if not patient:
        return None
    patient.update({k: v for k, v in updates.items() if v is not None})
    if "height" in updates or "weight" in updates:
        ht = patient.get("height", 170)
        wt = patient.get("weight", 70)
        if ht and wt:
            patient["bmi"] = round(wt / ((ht / 100) ** 2), 1)
    return patient


def get_events(patient_id: str) -> list[dict[str, Any]]:
    return CLINICAL_EVENTS.get(patient_id, [])


def add_events(patient_id: str, events: list[dict[str, Any]]) -> None:
    global RECORDS_PROCESSED
    existing = CLINICAL_EVENTS.setdefault(patient_id, [])
    existing.extend(events)
    existing.sort(key=lambda e: e["date"])
    RECORDS_PROCESSED += len(events)
    patient = get_patient(patient_id)
    if patient:
        patient["records_processed"] = patient.get("records_processed", 0) + len(events)
        patient["analyzed"] = True


def save_report(
    patient_id: str,
    report_data: dict[str, Any],
    doctor_id: str = "doc_101",
    created_by: str = "doc_101",
) -> dict[str, Any]:
    global REPORTS_STORE
    reports = REPORTS_STORE.setdefault(patient_id, [])
    report_id = f"REP-{patient_id}-{len(reports) + 1:03d}"
    patient = get_patient(patient_id)
    doc_name = patient.get("doctor_name") if patient else "Dr. Sarah Jenkins"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    saved_entry = {
        "id": report_id,
        "report_id": report_id,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "owner_id": doctor_id,
        "created_by": created_by,
        "created_at": now_str,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "generated_by": doc_name,
        "analysis_version": "2.0.0",
        "doctor_name": doc_name,
        "overall_risk": report_data.get("analysis", {}).get("overall_risk", {}),
        "health_score": report_data.get("analysis", {}).get("health_score", {}),
        "summary": report_data.get("analysis", {}).get("summary", ""),
        "report_data": report_data,
    }
    reports.insert(0, saved_entry)

    # Append timeline event: Report Generated & Risk Analysis Completed
    if patient_id in CLINICAL_EVENTS:
        risk_info = saved_entry["overall_risk"]
        lvl = risk_info.get("level", "MEDIUM")
        score = risk_info.get("score", 50)
        CLINICAL_EVENTS[patient_id].append({
            "patient_id": patient_id,
            "date": str(date.today()),
            "type": "report",
            "type_label": "Report Generated",
            "category": "ai_analysis",
            "summary": f"Clinical Intelligence Report Generated (Overall Risk: {lvl} {score}%)",
            "text": f"Report ID: {report_id}. Doctor: {doc_name}. Health Score: {saved_entry['health_score'].get('score', 75)}/100 ({saved_entry['health_score'].get('rating', 'Good')}).",
            "source": "ai_intelligence_engine",
        })
        CLINICAL_EVENTS[patient_id].sort(key=lambda e: e["date"])

    return saved_entry


def get_reports_for_patient(patient_id: str) -> list[dict[str, Any]]:
    return REPORTS_STORE.get(patient_id, [])


def create_patient_from_demographics(
    demo: dict[str, Any],
    doctor_id: str = "doc_101",
    doctor_name: str | None = None,
) -> dict[str, Any]:
    doc = next((d for d in DOCTORS if d["id"] == doctor_id), None)
    doc_name = doctor_name or (doc["name"] if doc else "Dr. Sarah Jenkins")
    pid = f"P{1001 + len(PATIENTS)}"
    ht = demo.get("height", 170)
    wt = demo.get("weight", 70)
    bmi = round(wt / ((ht / 100) ** 2), 1)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    patient = {
        "id": pid,
        "username": pid.lower(),
        "password": "password123",
        "name": demo.get("name", f"Patient {pid}"),
        "age": demo.get("age", 45),
        "gender": demo.get("gender", "Unknown"),
        "dob": demo.get("dob", "1980-01-01"),
        "blood_group": demo.get("blood_group", "O+"),
        "height": ht,
        "weight": wt,
        "bmi": bmi,
        "phone": demo.get("phone", "+91 9800000000"),
        "conditions": demo.get("conditions", []),
        "medications": demo.get("medications", []),
        "allergies": demo.get("allergies", "None known"),
        "doctor_id": doctor_id,
        "doctor_name": doc_name,
        "assigned_doctor_id": doctor_id,
        "assigned_doctor_name": doc_name,
        "owner_user_id": doctor_id,
        "created_by": doctor_id,
        "created_at": now_str,
        "admission_date": str(date.today()),
        "records_processed": 0,
        "last_visit": str(date.today()),
        "analyzed": False,
        "pending_review": True,
    }
    PATIENTS.append(patient)
    CLINICAL_EVENTS[pid] = []
    return patient


def search_events(patient_id: str, query: str) -> list[dict[str, Any]]:
    q = query.lower().strip()
    if not q:
        return get_events(patient_id)
    results = []
    for e in get_events(patient_id):
        blob = " ".join(str(v) for v in e.values()).lower()
        if q in blob:
            results.append(e)
    return results
