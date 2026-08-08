"""Clinical event store with seeded longitudinal patient histories."""
from __future__ import annotations

import copy
from datetime import date, timedelta
from typing import Any

NAMES = [
    "Arjun Mehta", "Priya Sharma", "Rohan Kapoor", "Ananya Iyer", "Vikram Singh",
    "Kavya Nair", "Rahul Verma", "Meera Joshi", "Aditi Rao", "Sanjay Patel",
]
CONDITIONS = [
    ["Hypertension", "Type 2 Diabetes"], ["Asthma"], ["Hyperlipidemia"],
    ["Type 2 Diabetes"], ["Hypertension"], ["Chronic Kidney Disease"], ["None"],
]
MEDICATIONS = [
    ["Metformin 500mg", "Lisinopril 10mg"], ["Albuterol inhaler"],
    ["Atorvastatin 20mg"], ["Metformin 850mg", "Glipizide 5mg"],
    ["Amlodipine 5mg"], ["Losartan 50mg"], ["None"],
]

PATIENTS: list[dict[str, Any]] = []
CLINICAL_EVENTS: dict[str, list[dict[str, Any]]] = {}
RECORDS_PROCESSED = 0


def _make_timeline(patient_id: str, idx: int) -> list[dict[str, Any]]:
    """Generate rich longitudinal clinical events for demo patients."""
    base = date(2026, 1, 12)
    events: list[dict[str, Any]] = []
    hba1c_vals = [6.1, 6.4, 6.8]
    glucose_vals = [118, 142, 168, 196]
    bp_vals = [(128, 80), (132, 84), (134, 86), (148, 92)]
    weight_vals = [72, 74, 76, 81]
    creatinine_vals = [0.9, 1.0, 1.1, 1.3]
    chol_vals = [185, 198, 212]

    for i, val in enumerate(hba1c_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=66 * i)),
            "type": "lab", "category": "hba1c", "value": val, "unit": "%",
            "source": "lab_report",
        })

    for i, val in enumerate(glucose_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=45 + 38 * i)),
            "type": "lab", "category": "glucose", "value": val, "unit": "mg/dL",
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
            "type": "vital", "category": "weight", "value": val, "unit": "kg",
            "source": "vitals",
        })

    for i, val in enumerate(creatinine_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=40 + 60 * i)),
            "type": "lab", "category": "creatinine", "value": val, "unit": "mg/dL",
            "source": "lab_report",
        })

    for i, val in enumerate(chol_vals):
        events.append({
            "patient_id": patient_id,
            "date": str(base + timedelta(days=50 + 70 * i)),
            "type": "lab", "category": "cholesterol", "value": val, "unit": "mg/dL",
            "source": "lab_report",
        })

    notes = [
        "Patient reports increased fatigue over the past month.",
        "Medication adherence reviewed; lifestyle counselling provided.",
        "Follow-up recommended for elevated glucose readings.",
        "Blood pressure trending upward; dietary sodium reduction discussed.",
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
    global PATIENTS, CLINICAL_EVENTS
    if PATIENTS:
        return
    for i in range(30):
        pid = f"P{1001 + i}"
        patient = {
            "id": pid,
            "name": NAMES[i % len(NAMES)],
            "age": 34 + (i * 3) % 48,
            "gender": "Female" if i % 2 else "Male",
            "dob": f"{1990 - i:04d}-06-15",
            "blood_group": ["O+", "A+", "B+", "AB+"][i % 4],
            "height": 158 + (i % 6) * 4,
            "weight": 58 + (i * 5) % 38,
            "phone": f"+91 98{i:08d}",
            "conditions": CONDITIONS[i % len(CONDITIONS)],
            "medications": MEDICATIONS[i % len(MEDICATIONS)],
            "allergies": "None known",
            "records_processed": 12 + i,
            "last_visit": f"2026-08-{(i % 8) + 1:02d}",
            "analyzed": True,
        }
        PATIENTS.append(patient)
        CLINICAL_EVENTS[pid] = _make_timeline(pid, i)


def get_patient(patient_id: str) -> dict[str, Any] | None:
    return next((p for p in PATIENTS if p["id"] == patient_id), None)


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


def create_patient_from_demographics(demo: dict[str, Any]) -> dict[str, Any]:
    pid = f"P{1001 + len(PATIENTS)}"
    patient = {
        "id": pid,
        "name": demo.get("name", f"Patient {pid}"),
        "age": demo.get("age", 45),
        "gender": demo.get("gender", "Unknown"),
        "dob": demo.get("dob", "1980-01-01"),
        "blood_group": demo.get("blood_group", "Unknown"),
        "height": demo.get("height", 170),
        "weight": demo.get("weight", 70),
        "phone": demo.get("phone", ""),
        "conditions": demo.get("conditions", []),
        "medications": demo.get("medications", []),
        "allergies": demo.get("allergies", "None known"),
        "records_processed": 0,
        "last_visit": str(date.today()),
        "analyzed": False,
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
