"""Main ML analysis pipeline — uses trained models and clinical intelligence modules."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

from ..data.store import get_patient, get_events
from .anomaly import detect_anomalies
from .insights import generate_insights
from .model_loader import get_model, load_models, models_ready
from .preprocessing import prepare_features
from .risk import calculate_risk, risk_level
from .summary import generate_summary
from .timeline import generate_timeline
from .trend import detect_trends

METRICS_DIR = Path(__file__).resolve().parent / "models" / "metrics"


def _predict_disease_risks(features: dict[str, Any]) -> dict[str, dict[str, Any]]:
    risks = {}
    availability = features.get("availability", {})
    for name in ("diabetes", "heart", "kidney", "stroke"):
        model = get_model(name)
        if model is None:
            continue
        if availability and not availability.get(name, True):
            risks[name] = {
                "score": 0,
                "level": "UNAVAILABLE",
                "status": "Insufficient data for this model",
                "model": name,
                "available": False,
            }
            continue
        X = np.array([features[name]])
        proba = float(model.predict_proba(X)[0][1])
        res = calculate_risk(name, proba)
        res["available"] = True
        risks[name] = res
    return risks


def _overall_risk(disease_risks: dict[str, dict[str, Any]]) -> dict[str, Any]:
    if not disease_risks:
        return {"score": 0, "level": "PENDING"}
    available_scores = [v["score"] for v in disease_risks.values() if v.get("level") != "UNAVAILABLE"]
    if not available_scores:
        return {"score": 0, "level": "PENDING"}
    avg = sum(available_scores) / len(available_scores)
    return {"score": round(avg, 1), "level": risk_level(avg / 100)}


def _model_metrics() -> dict[str, Any]:
    metrics = {}
    if METRICS_DIR.exists():
        for path in METRICS_DIR.glob("*_metrics.json"):
            metrics[path.stem.replace("_metrics", "")] = json.loads(path.read_text())
    return metrics


def _risk_trend_indicators(trends: list[dict[str, Any]]) -> dict[str, str]:
    cv_categories = {"blood_pressure", "cholesterol", "weight", "heart_rate"}
    indicators = {}
    for t in trends:
        if t["category"] in cv_categories or t["category"] in {"glucose", "hba1c"}:
            arrow = "↑" if t["direction"] == "Increasing" else "↓" if t["direction"] == "Decreasing" else "→"
            indicators[t["category"]] = f"{arrow} {t['direction']}"
    summary = "Overall cardiovascular risk indicators are trending upward." if any(
        t["direction"] == "Increasing" for t in trends
        if t["category"] in cv_categories | {"glucose", "hba1c"}
    ) else "Risk-related indicators appear stable."
    return {"indicators": indicators, "summary": summary}


def analyze_patient(patient_id: str) -> dict[str, Any]:
    """Full patient intelligence analysis using trained ML models."""
    load_models()
    patient = get_patient(patient_id)
    if not patient:
        return {"error": "Patient not found", "patient_id": patient_id}

    events = get_events(patient_id)
    features = prepare_features(patient, events)
    disease_risks = _predict_disease_risks(features)
    overall = _overall_risk(disease_risks)
    trends = detect_trends(events)
    anomalies = detect_anomalies(events)
    insights = generate_insights(trends, anomalies, disease_risks)
    timeline = generate_timeline(events)
    report = generate_summary(patient, trends, anomalies, insights, disease_risks, overall)
    risk_trend = _risk_trend_indicators(trends)

    trend_analysis = {t["category"]: t["direction"] for t in trends}
    recommendations = report["review_areas"]

    return {
        "patient_id": patient_id,
        "overall_risk": overall,
        "disease_risks": {k: v["score"] for k, v in disease_risks.items()},
        "disease_risk_details": disease_risks,
        "summary": report["summary"],
        "recommendations": recommendations,
        "review_areas": report["review_areas"],
        "trend_analysis": trend_analysis,
        "trends": trends,
        "anomalies": anomalies,
        "insights": insights,
        "timeline": timeline,
        "timeline_legacy": [{"date": t["date"], "event": e["summary"]} for t in timeline for e in t["events"]],
        "risk_trend": risk_trend,
        "raw_features": features.get("raw", {}),
        "model_metrics": _model_metrics(),
        "models_loaded": models_ready(),
        "confidence": round(min(95, 70 + len(events) * 0.5), 1),
        "disclaimer": report["disclaimer"],
    }
