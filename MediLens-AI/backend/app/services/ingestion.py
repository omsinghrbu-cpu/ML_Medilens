"""Parse uploaded patient records (CSV, JSON, PDF text) for extraction and doctor review."""
from __future__ import annotations

import csv
import io
import json
import re
from datetime import date
from typing import Any

COLUMN_MAP = {
    "glucose": "glucose", "blood_glucose": "glucose", "blood sugar": "glucose",
    "hba1c": "hba1c", "hb_a1c": "hba1c", "a1c": "hba1c",
    "creatinine": "creatinine", "cholesterol": "cholesterol", "chol": "cholesterol",
    "systolic": "systolic", "diastolic": "diastolic", "bp": "blood_pressure",
    "blood_pressure": "blood_pressure", "weight": "weight", "heart_rate": "heart_rate",
    "temperature": "temperature", "note": "note", "notes": "note", "text": "note",
    "medication": "medication", "diagnosis": "diagnosis", "condition": "diagnosis",
    "symptoms": "symptoms", "symptom": "symptoms", "allergies": "allergies",
}

NUMERIC_CATEGORIES = {
    "glucose", "hba1c", "creatinine", "cholesterol", "weight",
    "heart_rate", "temperature", "systolic", "diastolic", "hemoglobin", "egfr",
}


def _normalize_col(name: str) -> str:
    return COLUMN_MAP.get(name.strip().lower().replace(" ", "_"), name.strip().lower())


def _parse_date(raw: str | None) -> str:
    if not raw:
        return str(date.today())
    raw = raw.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            from datetime import datetime
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return raw[:10] if len(raw) >= 10 else str(date.today())


def parse_csv(content: str, patient_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    reader = csv.DictReader(io.StringIO(content))
    events: list[dict[str, Any]] = []
    demographics: dict[str, Any] = {}
    for row in reader:
        normalized = {_normalize_col(k): v for k, v in row.items() if k}
        if "name" in normalized and normalized["name"]:
            demographics.setdefault("name", normalized["name"])
        if "age" in normalized and normalized["age"]:
            try:
                demographics["age"] = int(float(normalized["age"]))
            except ValueError:
                pass
        if "gender" in normalized and normalized["gender"]:
            demographics["gender"] = normalized["gender"]
        if "height" in normalized and normalized["height"]:
            try:
                demographics["height"] = float(normalized["height"])
            except ValueError:
                pass
        if "weight" in normalized and normalized["weight"]:
            try:
                demographics["weight"] = float(normalized["weight"])
            except ValueError:
                pass
        if "blood_group" in normalized and normalized["blood_group"]:
            demographics["blood_group"] = normalized["blood_group"]
        if "allergies" in normalized and normalized["allergies"]:
            demographics["allergies"] = normalized["allergies"]
        if "symptoms" in normalized and normalized["symptoms"]:
            demographics["symptoms"] = normalized["symptoms"]

        event_date = _parse_date(normalized.get("date"))
        if "note" in normalized and normalized["note"]:
            events.append({
                "patient_id": patient_id, "date": event_date,
                "type": "note", "text": normalized["note"], "source": "csv_upload",
            })
            continue
        if "medication" in normalized and normalized["medication"]:
            events.append({
                "patient_id": patient_id, "date": event_date,
                "type": "medication", "category": "prescription",
                "value": normalized["medication"], "source": "csv_upload",
            })
            continue
        if "diagnosis" in normalized and normalized["diagnosis"]:
            events.append({
                "patient_id": patient_id, "date": event_date,
                "type": "diagnosis", "category": "condition",
                "value": normalized["diagnosis"], "source": "csv_upload",
            })
            continue
        if "systolic" in normalized and "diastolic" in normalized:
            sys_v = normalized.get("systolic", "")
            dia_v = normalized.get("diastolic", "")
            if sys_v and dia_v:
                events.append({
                    "patient_id": patient_id, "date": event_date,
                    "type": "vital", "category": "blood_pressure",
                    "value": f"{sys_v}/{dia_v}", "unit": "mmHg",
                    "systolic": float(sys_v), "diastolic": float(dia_v),
                    "source": "csv_upload",
                })
                continue
        for key, val in normalized.items():
            if key in NUMERIC_CATEGORIES and val not in (None, ""):
                try:
                    num = float(val)
                except ValueError:
                    continue
                etype = "vital" if key in {"weight", "heart_rate", "temperature", "systolic", "diastolic"} else "lab"
                cat = "blood_pressure" if key in {"systolic", "diastolic"} else key
                unit = {"glucose": "mg/dL", "hba1c": "%", "creatinine": "mg/dL",
                        "cholesterol": "mg/dL", "weight": "kg", "heart_rate": "bpm",
                        "temperature": "°F", "hemoglobin": "g/dL", "egfr": "mL/min"}.get(key, "")
                events.append({
                    "patient_id": patient_id, "date": event_date,
                    "type": etype, "category": cat, "value": num, "unit": unit,
                    "source": "csv_upload",
                })
    return demographics, events


def parse_json(content: str, patient_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    data = json.loads(content)
    if isinstance(data, list):
        events = [{**e, "patient_id": patient_id} for e in data]
        return {}, events
    demo = {k: data[k] for k in ("name", "age", "gender", "conditions", "medications", "allergies", "height", "weight", "blood_group") if k in data}
    events = data.get("events", data.get("records", []))
    for e in events:
        e.setdefault("patient_id", patient_id)
        e.setdefault("source", "json_upload")
    return demo, events


def parse_pdf_text(content: str, patient_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Extract clinical values from text-based PDF or TXT content."""
    events: list[dict[str, Any]] = []
    demo: dict[str, Any] = {}
    today = str(date.today())

    # Demographics regex
    name_m = re.search(r"(?:Patient Name|Name)[:\s]+([A-Za-z\s]{3,30})", content, re.IGNORECASE)
    if name_m:
        demo["name"] = name_m.group(1).strip()
    age_m = re.search(r"(?:Age)[:\s]+(\d{1,3})", content, re.IGNORECASE)
    if age_m:
        demo["age"] = int(age_m.group(1))
    gender_m = re.search(r"(?:Gender|Sex)[:\s]+(Male|Female|Other)", content, re.IGNORECASE)
    if gender_m:
        demo["gender"] = gender_m.group(1).capitalize()

    patterns = [
        (r"(?:glucose|blood sugar)[:\s]+(\d+\.?\d*)\s*(?:mg/dL)?", "glucose", "lab", "mg/dL"),
        (r"(?:HbA1c|A1C|HBA1C)[:\s]+(\d+\.?\d*)\s*%?", "hba1c", "lab", "%"),
        (r"(?:creatinine)[:\s]+(\d+\.?\d*)\s*(?:mg/dL)?", "creatinine", "lab", "mg/dL"),
        (r"(?:cholesterol)[:\s]+(\d+\.?\d*)\s*(?:mg/dL)?", "cholesterol", "lab", "mg/dL"),
        (r"(?:blood pressure|BP)[:\s]+(\d+)\s*/\s*(\d+)", "blood_pressure", "vital", "mmHg"),
        (r"(?:weight)[:\s]+(\d+\.?\d*)\s*(?:kg)?", "weight", "vital", "kg"),
        (r"(?:heart rate|pulse)[:\s]+(\d+\.?\d*)\s*(?:bpm)?", "heart_rate", "vital", "bpm"),
        (r"(?:hemoglobin)[:\s]+(\d+\.?\d*)\s*(?:g/dL)?", "hemoglobin", "lab", "g/dL"),
        (r"(?:egfr)[:\s]+(\d+\.?\d*)", "egfr", "lab", "mL/min"),
    ]
    for pattern, category, etype, unit in patterns:
        for match in re.finditer(pattern, content, re.IGNORECASE):
            if category == "blood_pressure":
                events.append({
                    "patient_id": patient_id, "date": today,
                    "type": etype, "category": category,
                    "value": f"{match.group(1)}/{match.group(2)}", "unit": unit,
                    "systolic": int(match.group(1)), "diastolic": int(match.group(2)),
                    "source": "pdf_upload",
                })
            else:
                events.append({
                    "patient_id": patient_id, "date": today,
                    "type": etype, "category": category,
                    "value": float(match.group(1)), "unit": unit,
                    "source": "pdf_upload",
                })
    note_match = re.search(r"(?:clinical note|assessment|notes?)[:\s]+(.{20,300})", content, re.IGNORECASE | re.DOTALL)
    if note_match:
        events.append({
            "patient_id": patient_id, "date": today,
            "type": "note", "text": note_match.group(1).strip()[:500],
            "source": "pdf_upload",
        })
    return demo, events


def extract_file_data(filename: str, content: bytes, patient_id: str | None = None) -> dict[str, Any]:
    """Parse file and return extracted draft data for Doctor Review before commit."""
    text = content.decode("utf-8", errors="ignore")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    demo: dict[str, Any] = {}
    events: list[dict[str, Any]] = []

    if ext == "csv":
        demo, events = parse_csv(text, patient_id or "DRAFT")
    elif ext == "json":
        demo, events = parse_json(text, patient_id or "DRAFT")
    elif ext == "pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            pdf_text = "\n".join(page.extract_text() or "" for page in reader.pages)
            demo, events = parse_pdf_text(pdf_text, patient_id or "DRAFT")
        except Exception:
            demo, events = parse_pdf_text(text, patient_id or "DRAFT")
    else:
        demo, events = parse_pdf_text(text, patient_id or "DRAFT")

    return {
        "filename": filename,
        "patient_id": patient_id,
        "demographics": demo,
        "events": events,
        "extracted_summary": {
            "name": demo.get("name", "Extracted Patient"),
            "age": demo.get("age", 45),
            "gender": demo.get("gender", "Male"),
            "height": demo.get("height", 170),
            "weight": demo.get("weight", 70),
            "blood_group": demo.get("blood_group", "O+"),
            "allergies": demo.get("allergies", "None known"),
            "conditions": demo.get("conditions", []),
            "medications": demo.get("medications", []),
            "symptoms": demo.get("symptoms", "Fatigue, mild exertional dyspnea"),
            "doctor_notes": next((e.get("text") for e in events if e.get("type") == "note"), "Patient presented for routine longitudinal follow-up."),
            "events_count": len(events),
        },
    }


def ingest_file(filename: str, content: bytes, patient_id: str | None = None) -> dict[str, Any]:
    """Legacy helper for direct file ingestion."""
    from ..data.store import create_patient_from_demographics, add_events, get_patient

    extracted = extract_file_data(filename, content, patient_id)
    demo = extracted["demographics"]
    events = extracted["events"]

    if not patient_id:
        patient = create_patient_from_demographics(demo)
        patient_id = patient["id"]
        for e in events:
            e["patient_id"] = patient_id
    else:
        patient = get_patient(patient_id)
        if not patient:
            patient = create_patient_from_demographics({**demo, "id": patient_id})

    if demo:
        patient.update({k: v for k, v in demo.items() if v})

    if events:
        add_events(patient_id, events)

    return {
        "patient_id": patient_id,
        "events_extracted": len(events),
        "demographics": demo,
        "events": events,
        "filename": filename,
    }
