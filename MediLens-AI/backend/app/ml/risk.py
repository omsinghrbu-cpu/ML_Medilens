"""Risk level classification from model probability scores."""
from __future__ import annotations


def risk_level(score: float) -> str:
    if score >= 0.65:
        return "HIGH"
    if score >= 0.35:
        return "MEDIUM"
    return "LOW"


def calculate_risk(model_name: str, probability: float) -> dict:
    pct = round(probability * 100, 1)
    return {
        "score": pct,
        "level": risk_level(probability),
        "model": model_name,
    }
