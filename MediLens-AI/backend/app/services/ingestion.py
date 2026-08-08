"""Parse uploaded patient records (CSV, JSON, PDF text)."""
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
}

NUMERIC_CATEGORIES = {
    "glucose", "hba1c", "creatinine", "cholesterol", "weight",
    "heart_rate", "temperature", "systolic", "diastolic",
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
                        "temperature": "°F"}.get(key, "")
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
    demo = {k: data[k] for k in ("name", "age", "gender", "conditions") if k in data}
    events = data.get("events", data.get("records", []))
    for e in events:
        e.setdefault("patient_id", patient_id)
        e.setdefault("source", "json_upload")
    return demo, events


def parse_pdf_text(content: str, patient_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Extract clinical values from text-based PDF content."""
    events: list[dict[str, Any]] = []
    today = str(date.today())
    patterns = [
        (r"(?:glucose|blood sugar)[:\s]+(\d+\.?\d*)\s*(?:mg/dL)?", "glucose", "lab", "mg/dL"),
        (r"(?:HbA1c|A1C|HBA1C)[:\s]+(\d+\.?\d*)\s*%?", "hba1c", "lab", "%"),
        (r"(?:creatinine)[:\s]+(\d+\.?\d*)\s*(?:mg/dL)?", "creatinine", "lab", "mg/dL"),
        (r"(?:cholesterol)[:\s]+(\d+\.?\d*)\s*(?:mg/dL)?", "cholesterol", "lab", "mg/dL"),
        (r"(?:blood pressure|BP)[:\s]+(\d+)\s*/\s*(\d+)", "blood_pressure", "vital", "mmHg"),
        (r"(?:weight)[:\s]+(\d+\.?\d*)\s*(?:kg)?", "weight", "vital", "kg"),
        (r"(?:heart rate|pulse)[:\s]+(\d+\.?\d*)\s*(?:bpm)?", "heart_rate", "vital", "bpm"),
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
    return {}, events


def ingest_file(filename: str, content: bytes, patient_id: str | None = None) -> dict[str, Any]:
    """Ingest uploaded file and return demographics + clinical events."""
    from ..data.store import create_patient_from_demographics, add_events, get_patient

    text = content.decode("utf-8", errors="ignore")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    demo: dict[str, Any] = {}
    events: list[dict[str, Any]] = []

    if ext == "csv":
        demo, events = parse_csv(text, patient_id or "TEMP")
    elif ext == "json":
        demo, events = parse_json(text, patient_id or "TEMP")
    elif ext == "pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            pdf_text = "\n".join(page.extract_text() or "" for page in reader.pages)
            demo, events = parse_pdf_text(pdf_text, patient_id or "TEMP")
        except Exception:
            demo, events = parse_pdf_text(text, patient_id or "TEMP")
    else:
        demo, events = parse_csv(text, patient_id or "TEMP")

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
