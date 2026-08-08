"""Load trained disease-risk models at application startup."""
from __future__ import annotations

from pathlib import Path

import joblib

ML_ROOT = Path(__file__).resolve().parent
MODELS_DIR = ML_ROOT / "models"

_MODELS: dict = {}
_LOADED = False


def load_models() -> dict:
    global _MODELS, _LOADED
    if _LOADED:
        return _MODELS
    for name in ("diabetes", "heart", "kidney", "stroke"):
        path = MODELS_DIR / f"{name}.pkl"
        if path.exists():
            _MODELS[name] = joblib.load(path)
    _LOADED = True
    return _MODELS


def get_model(name: str):
    load_models()
    return _MODELS.get(name)


def models_ready() -> bool:
    load_models()
    return len(_MODELS) == 4
