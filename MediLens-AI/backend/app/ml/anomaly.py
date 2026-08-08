"""Anomaly detection for clinical events."""
from __future__ import annotations

from typing import Any

from .trend import REFERENCE_RANGES


def _severity(score: float) -> str:
    if score >= 0.7:
        return "high"
    if score >= 0.4:
        return "medium"
    return "low"


def detect_anomalies(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Flag unusual values vs patient history or reference ranges."""
    anomalies: list[dict[str, Any]] = []
    history: dict[str, list[tuple[str, float]]] = {}

    sorted_events = sorted(events, key=lambda e: e.get("date", ""))
    for e in sorted_events:
        cat = e.get("category", "")
        val = e.get("value")
        if cat == "blood_pressure" and "systolic" in e:
            val = float(e["systolic"])
            cat = "systolic"
        if not isinstance(val, (int, float)):
            continue

        val = float(val)
        prev = history.get(cat, [])
        message = ""
        severity_score = 0.0

        if prev:
            last_date, last_val = prev[-1]
            pct_change = abs(val - last_val) / max(abs(last_val), 1) * 100
            if pct_change >= 15:
                severity_score = min(pct_change / 50, 1.0)
                direction = "increased" if val > last_val else "decreased"
                unit = e.get("unit", "")
                message = (
                    f"{cat.replace('_', ' ').title()} {direction} from "
                    f"{last_val}{(' ' + unit) if unit else ''} to {val}{(' ' + unit) if unit else ''}, "
                    f"representing a significant change from the previous reading."
                )
                anomalies.append({
                    "id": f"anom-{cat}-{e['date']}",
                    "date": e["date"],
                    "category": cat,
                    "type": e.get("type", "lab"),
                    "severity": _severity(severity_score),
                    "message": message,
                    "previous_value": last_val,
                    "current_value": val,
                    "unit": e.get("unit", ""),
                    "label": "Potential risk signal — requires clinical review",
                    "source_event": e,
                })

        ref = REFERENCE_RANGES.get(cat)
        if ref and (val < ref[0] or val > ref[1]):
            if not any(a["date"] == e["date"] and a["category"] == cat for a in anomalies):
                if val > ref[1]:
                    message = (
                        f"{cat.replace('_', ' ').title()} of {val}{(' ' + e.get('unit', '')) if e.get('unit') else ''} "
                        f"is above typical reference range ({ref[0]}-{ref[1]})."
                    )
                else:
                    message = (
                        f"{cat.replace('_', ' ').title()} of {val}{(' ' + e.get('unit', '')) if e.get('unit') else ''} "
                        f"is below typical reference range ({ref[0]}-{ref[1]})."
                    )
                anomalies.append({
                    "id": f"anom-ref-{cat}-{e['date']}",
                    "date": e["date"],
                    "category": cat,
                    "type": e.get("type", "lab"),
                    "severity": "medium" if val > ref[1] * 1.1 or val < ref[0] * 0.9 else "low",
                    "message": message,
                    "previous_value": prev[-1][1] if prev else None,
                    "current_value": val,
                    "unit": e.get("unit", ""),
                    "label": "Abnormal trend detected — requires clinical review",
                    "source_event": e,
                })

        prev.append((e["date"], val))
        history[cat] = prev

    return anomalies
