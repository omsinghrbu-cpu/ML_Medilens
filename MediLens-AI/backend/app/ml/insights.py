"""Generate AI clinical insights from trends, anomalies, and risk scores."""
from __future__ import annotations

from typing import Any


def generate_insights(
    trends: list[dict[str, Any]],
    anomalies: list[dict[str, Any]],
    disease_risks: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    insights: list[dict[str, Any]] = []

    for t in trends:
        if t["direction"] != "Stable":
            ref = f"↑ {t['category'].replace('_', ' ').title()}: {t['first']} → {t['last']}"
            if t.get("unit"):
                ref += f" {t['values'][0].get('unit', '')}" if False else ""
            insights.append({
                "priority": "high" if t["direction"] == "Increasing" else "medium",
                "text": t["label"] + ".",
                "reference": ref,
                "category": t["category"],
            })

    for a in anomalies[:5]:
        insights.append({
            "priority": a.get("severity", "medium"),
            "text": a["message"],
            "reference": f"{a['date']} — {a['category'].replace('_', ' ').title()}",
            "category": a["category"],
        })

    high_risks = [k for k, v in disease_risks.items() if v.get("level") == "HIGH"]
    if len(high_risks) >= 2:
        names = ", ".join(r.replace("_", " ").title() for r in high_risks)
        insights.append({
            "priority": "high",
            "text": f"Patient's combined risk profile indicates elevated {names.lower()} risk.",
            "reference": "ML risk models",
            "category": "risk",
        })
    elif high_risks:
        insights.append({
            "priority": "high",
            "text": f"Elevated {high_risks[0].replace('_', ' ').lower()} risk detected by ML model.",
            "reference": "ML risk models",
            "category": "risk",
        })

    if not insights:
        insights.append({
            "priority": "low",
            "text": "No significant trends or anomalies detected in available records.",
            "reference": "Analysis complete",
            "category": "general",
        })

    priority_order = {"high": 0, "medium": 1, "low": 2}
    insights.sort(key=lambda x: priority_order.get(x["priority"], 3))
    return insights[:8]
