"""Train stroke risk model."""
from __future__ import annotations

import csv

import numpy as np

from .common import DATASETS_DIR, train_classifier

FEATURES = [
    "gender", "age", "hypertension", "heart_disease", "ever_married",
    "work_type", "residence_type", "avg_glucose_level", "bmi", "smoking_status",
]


def _load_dataset() -> tuple[np.ndarray, np.ndarray]:
    path = DATASETS_DIR / "stroke.csv"
    rows = list(csv.DictReader(path.open()))
    X = np.array([[float(r[f]) for f in FEATURES] for r in rows])
    y = np.array([int(r["stroke"]) for r in rows])
    return X, y


def main() -> dict:
    X, y = _load_dataset()
    return train_classifier(X, y, "stroke")


if __name__ == "__main__":
    print(main())
