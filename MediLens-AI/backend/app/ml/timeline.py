"""Build searchable longitudinal clinical timeline."""
from __future__ import annotations

from typing import Any


TYPE_LABELS = {
    "lab": "Lab", "vital": "Vital", "note": "Clinical Note",
    "diagnosis": "Diagnosis", "medication": "Medication",
}


def _format_event(e: dict[str, Any]) -> str:
    cat = e.get("category", "")
    if e.get("type") == "note":
        return e.get("text", "")[:120]
    if e.get("type") == "diagnosis" or e.get("type") == "medication":
        return str(e.get("value", ""))
    val = e.get("value", "")
    unit = e.get("unit", "")
    label = cat.replace("_", " ").title()
    return f"{label}: {val}{(' ' + unit) if unit else ''}"


def generate_timeline(
    events: list[dict[str, Any]],
    filter_type: str = "all",
    search: str = "",
) -> list[dict[str, Any]]:
    """Organize events into a searchable timeline grouped by date."""
    filtered = events
    if filter_type and filter_type != "all":
        filtered = [e for e in filtered if e.get("type") == filter_type]
    if search:
        q = search.lower()
        filtered = [e for e in filtered if q in " ".join(str(v) for v in e.values()).lower()]

    by_date: dict[str, list[dict[str, Any]]] = {}
    for e in sorted(filtered, key=lambda x: x.get("date", "")):
        d = e.get("date", "Unknown")
        by_date.setdefault(d, []).append(e)

    timeline = []
    for d in sorted(by_date.keys(), reverse=True):
        day_events = []
        for e in by_date[d]:
            day_events.append({
                "type": e.get("type", ""),
                "type_label": TYPE_LABELS.get(e.get("type", ""), e.get("type", "")),
                "category": e.get("category", ""),
                "summary": _format_event(e),
                "text": e.get("text", ""),
                "value": e.get("value"),
                "unit": e.get("unit", ""),
                "source": e.get("source", ""),
                "raw": e,
            })
        timeline.append({"date": d, "events": day_events})
    return timeline
