"""Train diabetes risk model on Pima-style feature set."""
from __future__ import annotations

import csv
from pathlib import Path

import numpy as np

from .common import DATASETS_DIR, train_classifier

FEATURES = [
    "pregnancies", "glucose", "blood_pressure", "skin_thickness",
    "insulin", "bmi", "diabetes_pedigree", "age",
]


def _load_dataset() -> tuple[np.ndarray, np.ndarray]:
    path = DATASETS_DIR / "diabetes.csv"
    rows = list(csv.DictReader(path.open()))
    X = np.array([[float(r[f]) for f in FEATURES] for r in rows])
    y = np.array([int(r["outcome"]) for r in rows])
    return X, y


def main() -> dict:
    X, y = _load_dataset()
    return train_classifier(X, y, "diabetes")


if __name__ == "__main__":
    print(main())
