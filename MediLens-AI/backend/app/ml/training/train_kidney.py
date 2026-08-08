"""Train chronic kidney disease risk model."""
from __future__ import annotations

import csv

import numpy as np

from .common import DATASETS_DIR, train_classifier

FEATURES = [
    "age", "bp", "sg", "al", "su", "rbc", "pc", "pcc", "ba",
    "bgr", "bu", "sc", "sod", "pot", "hemo", "pcv", "wc", "rc",
    "htn", "dm", "cad", "appet", "pe", "ane",
]


def _load_dataset() -> tuple[np.ndarray, np.ndarray]:
    path = DATASETS_DIR / "kidney.csv"
    rows = list(csv.DictReader(path.open()))
    X = np.array([[float(r[f]) for f in FEATURES] for r in rows])
    y = np.array([int(r["classification"]) for r in rows])
    return X, y


def main() -> dict:
    X, y = _load_dataset()
    return train_classifier(X, y, "kidney")


if __name__ == "__main__":
    print(main())
