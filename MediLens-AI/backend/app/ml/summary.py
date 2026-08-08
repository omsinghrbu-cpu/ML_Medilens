"""Generate clinical intelligence report summary."""
from __future__ import annotations

from typing import Any


DISCLAIMER = (
    "This AI-generated report is intended to support clinical review "
    "and does not constitute a medical diagnosis."
)


def generate_summary(
    patient: dict[str, Any],
    trends: list[dict[str, Any]],
    anomalies: list[dict[str, Any]],
    insights: list[dict[str, Any]],
    disease_risks: dict[str, dict[str, Any]],
    overall_risk: dict[str, Any],
) -> dict[str, Any]:
    increasing = [t for t in trends if t["direction"] == "Increasing"]
    trend_text = ", ".join(t["label"] for t in increasing[:3]) if increasing else "No significant adverse trends detected."

    anomaly_text = (
        f"{len(anomalies)} potential risk signal(s) detected requiring clinical review."
        if anomalies else "No anomalies flagged in available records."
    )

    high_risks = [k for k, v in disease_risks.items() if v.get("level") == "HIGH"]
    risk_text = (
        f"Elevated risk detected for: {', '.join(r.replace('_', ' ').title() for r in high_risks)}."
        if high_risks else "Risk scores within moderate range across disease models."
    )

    summary = (
        f"{patient.get('name', 'Patient')} ({patient.get('id', '')}), "
        f"{patient.get('age', '')} years, {patient.get('gender', '')}. "
        f"Conditions: {', '.join(patient.get('conditions', ['None']))}. "
        f"{trend_text} {anomaly_text} {risk_text}"
    )

    review_areas = []
    for t in increasing:
        review_areas.append(f"Monitor {t['category'].replace('_', ' ')} — {t['label']}")
    for a in anomalies[:3]:
        review_areas.append(a["label"])
    for k, v in disease_risks.items():
        if v.get("level") in ("HIGH", "MEDIUM"):
            review_areas.append(f"Review {k.replace('_', ' ')} risk ({v['score']}%)")
    if not review_areas:
        review_areas.append("Continue routine monitoring")

    return {
        "summary": summary,
        "disclaimer": DISCLAIMER,
        "review_areas": review_areas[:6],
        "key_insights": [i["text"] for i in insights[:5]],
        "overall_risk": overall_risk,
    }
