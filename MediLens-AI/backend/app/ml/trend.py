"""Trend detection for longitudinal clinical metrics."""
from __future__ import annotations

from typing import Any


REFERENCE_RANGES: dict[str, tuple[float, float]] = {
    "glucose": (70, 140),
    "hba1c": (4.0, 5.7),
    "creatinine": (0.6, 1.2),
    "cholesterol": (0, 200),
    "systolic": (90, 120),
    "diastolic": (60, 80),
    "weight": (0, 300),
    "heart_rate": (60, 100),
}


def _direction(values: list[float]) -> str:
    if len(values) < 2:
        return "Stable"
    diffs = [values[i + 1] - values[i] for i in range(len(values) - 1)]
    avg_diff = sum(diffs) / len(diffs)
    threshold = max(abs(values[0]) * 0.02, 0.5)
    if avg_diff > threshold:
        return "Increasing"
    if avg_diff < -threshold:
        return "Decreasing"
    return "Stable"


def _trend_label(category: str, direction: str) -> str:
    labels = {
        ("hba1c", "Increasing"): "Rising glucose-control trend",
        ("glucose", "Increasing"): "Rising blood glucose trend",
        ("blood_pressure", "Increasing"): "Progressive elevation in blood pressure",
        ("weight", "Increasing"): "Gradual weight increase",
        ("creatinine", "Increasing"): "Rising creatinine trend",
        ("cholesterol", "Increasing"): "Elevated cholesterol trend",
        ("heart_rate", "Increasing"): "Increasing heart rate trend",
        ("hba1c", "Decreasing"): "Improving glucose control",
        ("glucose", "Decreasing"): "Declining blood glucose trend",
        ("weight", "Decreasing"): "Weight reduction trend",
    }
    return labels.get((category, direction), f"{direction} {category.replace('_', ' ')} trend")


def compute_trend_deltas(trends: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Generate structured Previous -> Current -> % Change -> Clinical Interpretation deltas."""
    deltas = []
    interpretations = {
        "hba1c": {
            "Increasing": "Poor Glycemic Control — Escalating Diabetes Risk",
            "Decreasing": "Improving Glycemic Regulation",
            "Stable": "Stable Long-Term Glucose Control",
        },
        "glucose": {
            "Increasing": "Elevated Fasting Glucose Trajectory",
            "Decreasing": "Normalizing Blood Glucose Level",
            "Stable": "Normoglycemic Fasting Range",
        },
        "blood_pressure": {
            "Increasing": "Progressive Elevation in Blood Pressure — Stage 1-2 Hypertension Vector",
            "Decreasing": "Improved Antihypertensive Response",
            "Stable": "Controlled Hemodynamic Pressure",
        },
        "creatinine": {
            "Increasing": "Renal Function Decline — Nephron Stress Indicator",
            "Decreasing": "Improved Glomerular Clearance",
            "Stable": "Stable Serum Renal Clearance",
        },
        "cholesterol": {
            "Increasing": "Elevated Hypercholesterolemia Trajectory",
            "Decreasing": "Favorable Lipid Profile Improvement",
            "Stable": "Controlled Total Lipid Baseline",
        },
        "weight": {
            "Increasing": "Weight Gain — Potential Metabolic Stress Factor",
            "Decreasing": "Favorable Weight Reduction",
            "Stable": "Stable Body Mass Trajectory",
        },
        "egfr": {
            "Decreasing": "Declining Kidney Filtration Rate — Nephrology Review Recommended",
            "Increasing": "Improving Glomerular Filtration Capacity",
            "Stable": "Preserved Renal Filtration Function",
        },
    }

    for t in trends:
        cat = t["category"]
        first_val = t["first"]
        last_val = t["last"]
        direction = t["direction"]
        
        pct_change = round(((last_val - first_val) / max(abs(first_val), 0.1)) * 100, 1)
        direction_icon = "↑" if direction == "Increasing" else "↓" if direction == "Decreasing" else "→"
        interp = interpretations.get(cat, {}).get(
            direction, f"{direction} trajectory requiring routine tracking"
        )

        deltas.append({
            "category": cat,
            "name": cat.replace("_", " ").title(),
            "previous_value": first_val,
            "current_value": last_val,
            "pct_change": pct_change,
            "direction": direction,
            "direction_icon": direction_icon,
            "interpretation": interp,
        })
    return deltas


def detect_trends(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Detect trends across lab and vital categories."""
    series: dict[str, list[tuple[str, float]]] = {}
    for e in events:
        cat = e.get("category", "")
        if cat == "blood_pressure" and "systolic" in e:
            series.setdefault("blood_pressure", []).append((e["date"], float(e["systolic"])))
        elif cat in REFERENCE_RANGES and isinstance(e.get("value"), (int, float)):
            series.setdefault(cat, []).append((e["date"], float(e["value"])))

    trends = []
    for category, points in series.items():
        points.sort(key=lambda x: x[0])
        if len(points) < 2:
            continue
        values = [v for _, v in points]
        direction = _direction(values)
        trends.append({
            "category": category,
            "direction": direction,
            "label": _trend_label(category, direction),
            "values": [{"date": d, "value": v} for d, v in points],
            "first": values[0],
            "last": values[-1],
            "change": round(values[-1] - values[0], 2),
        })
    return trends

