"""Feature preparation from patient demographics and clinical events."""
from __future__ import annotations

from typing import Any


def _has_category(events: list[dict[str, Any]], category: str) -> bool:
    return any(e.get("category") == category for e in events)


def _latest_value(events: list[dict[str, Any]], category: str, default: float) -> tuple[float, bool]:
    vals = [
        float(e["value"]) for e in events
        if e.get("category") == category and isinstance(e.get("value"), (int, float))
    ]
    if vals:
        return vals[-1], True
    return default, False


def _latest_bp(events: list[dict[str, Any]], default: tuple[float, float]) -> tuple[tuple[float, float], bool]:
    for e in reversed(events):
        if e.get("category") == "blood_pressure" and "systolic" in e:
            return (float(e["systolic"]), float(e["diastolic"])), True
    return default, False


def prepare_features(patient: dict[str, Any], events: list[dict[str, Any]]) -> dict[str, Any]:
    """Extract feature vectors for each disease-risk model with availability tracking."""
    age = float(patient.get("age", 50))
    gender = patient.get("gender", "Male")
    sex = 1 if gender == "Male" else 0
    weight = float(patient.get("weight", 70))
    height = float(patient.get("height", 170))
    bmi = weight / ((height / 100) ** 2)

    glucose, has_glucose = _latest_value(events, "glucose", 120.0)
    hba1c, has_hba1c = _latest_value(events, "hba1c", 5.8)
    creatinine, has_creatinine = _latest_value(events, "creatinine", 1.0)
    cholesterol, has_cholesterol = _latest_value(events, "cholesterol", 200.0)
    (sys_bp, dia_bp), has_bp = _latest_bp(events, (130.0, 80.0))
    heart_rate, has_hr = _latest_value(events, "heart_rate", 72.0)

    conditions = " ".join(patient.get("conditions", [])).lower()
    has_htn = 1 if "hypertension" in conditions or sys_bp >= 140 else 0
    has_dm = 1 if "diabetes" in conditions or glucose >= 126 or hba1c >= 6.5 else 0
    has_heart = 1 if "heart" in conditions or "cardio" in conditions else 0
    has_kidney = 1 if "kidney" in conditions or creatinine >= 1.3 else 0

    has_any_events = len(events) > 0

    availability = {
        "diabetes": has_any_events and (has_glucose or has_hba1c or has_dm != 0),
        "heart": has_any_events and (has_bp or has_cholesterol or has_heart != 0),
        "kidney": has_any_events and (has_creatinine or has_bp or has_kidney != 0),
        "stroke": has_any_events and (has_glucose or has_bp or has_heart != 0),
    }

    return {
        "diabetes": [
            2, glucose, dia_bp, 20, 80, bmi, 0.5, age,
        ],
        "heart": [
            age, sex, 1 if has_htn else 0, sys_bp, cholesterol,
            1 if glucose > 120 else 0, 0, 150 - age * 0.5, has_heart,
            1.0 if has_htn else 0.0, 1, 0, 2,
        ],
        "kidney": [
            age, dia_bp, 1.015, 1, 0, 1, 1, 0, 0, glucose, 40, creatinine,
            138, 4.0, 13, 40, 8000, 5.0, has_htn, has_dm, 0, 1, 0, 0,
        ],
        "stroke": [
            sex, age, has_htn, has_heart, 1, 2, 1, glucose, bmi, 1,
        ],
        "raw": {
            "glucose": glucose, "hba1c": hba1c, "creatinine": creatinine,
            "cholesterol": cholesterol, "systolic": sys_bp, "diastolic": dia_bp,
            "bmi": round(bmi, 1), "heart_rate": heart_rate,
        },
        "availability": availability,
    }

