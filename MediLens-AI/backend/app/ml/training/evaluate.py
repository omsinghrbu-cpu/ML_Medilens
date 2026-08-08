"""Evaluate all trained disease-risk models."""
from __future__ import annotations

import json
from pathlib import Path

from .common import METRICS_DIR


def main() -> dict:
    results = {}
    for path in sorted(METRICS_DIR.glob("*_metrics.json")):
        results[path.stem.replace("_metrics", "")] = json.loads(path.read_text())
    return results


if __name__ == "__main__":
    print(json.dumps(main(), indent=2))
