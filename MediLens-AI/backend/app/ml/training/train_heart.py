"""Train heart disease risk model."""
from __future__ import annotations

import csv

import numpy as np

from .common import DATASETS_DIR, train_classifier

FEATURES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal",
]


def _load_dataset() -> tuple[np.ndarray, np.ndarray]:
    path = DATASETS_DIR / "heart.csv"
    rows = list(csv.DictReader(path.open()))
    X = np.array([[float(r[f]) for f in FEATURES] for r in rows])
    y = np.array([int(r["target"]) for r in rows])
    return X, y


def main() -> dict:
    X, y = _load_dataset()
    return train_classifier(X, y, "heart")


if __name__ == "__main__":
    print(main())
