"""Shared training utilities for disease-risk models."""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ML_ROOT = Path(__file__).resolve().parents[1]
DATASETS_DIR = ML_ROOT / "datasets"
MODELS_DIR = ML_ROOT / "models"
METRICS_DIR = ML_ROOT / "models" / "metrics"


def ensure_dirs() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    METRICS_DIR.mkdir(parents=True, exist_ok=True)


def train_classifier(
    X: np.ndarray,
    y: np.ndarray,
    model_name: str,
    random_state: int = 42,
) -> dict:
    """Train a gradient-boosting classifier and persist model + metrics."""
    ensure_dirs()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state, stratify=y
    )
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", GradientBoostingClassifier(random_state=random_state)),
    ])
    pipeline.fit(X_train, y_train)
    proba = pipeline.predict_proba(X_test)[:, 1]
    preds = pipeline.predict(X_test)
    metrics = {
        "model": model_name,
        "accuracy": round(float(accuracy_score(y_test, preds)), 4),
        "precision": round(float(precision_score(y_test, preds, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, preds, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, preds, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, proba)), 4),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
    }
    joblib.dump(pipeline, MODELS_DIR / f"{model_name}.pkl")
    (METRICS_DIR / f"{model_name}_metrics.json").write_text(json.dumps(metrics, indent=2))
    return metrics
