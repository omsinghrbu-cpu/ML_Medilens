"""Generate synthetic training datasets for the four disease-risk models."""
from __future__ import annotations

import csv
import random
from pathlib import Path

DATASETS_DIR = Path(__file__).resolve().parents[1] / "datasets"


def _write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def generate_diabetes(n: int = 768) -> None:
    random.seed(42)
    rows = []
    for _ in range(n):
        pregnancies = random.randint(0, 17)
        glucose = random.gauss(120, 32)
        bp = random.gauss(70, 12)
        skin = random.gauss(20, 16)
        insulin = max(0, random.gauss(80, 60))
        bmi = random.gauss(32, 7)
        pedigree = random.uniform(0.08, 2.42)
        age = random.randint(21, 81)
        risk = (
            (glucose - 100) * 0.04
            + (bmi - 25) * 0.06
            + (age - 30) * 0.01
            + pedigree * 0.5
            + pregnancies * 0.02
        )
        outcome = 1 if risk + random.gauss(0, 0.5) > 0.8 else 0
        rows.append({
            "pregnancies": pregnancies, "glucose": round(max(0, glucose), 1),
            "blood_pressure": round(max(0, bp), 1), "skin_thickness": round(max(0, skin), 1),
            "insulin": round(insulin, 1), "bmi": round(max(10, bmi), 1),
            "diabetes_pedigree": round(pedigree, 3), "age": age, "outcome": outcome,
        })
    _write_csv(DATASETS_DIR / "diabetes.csv", list(rows[0].keys()), rows)


def generate_heart(n: int = 303) -> None:
    random.seed(43)
    rows = []
    for _ in range(n):
        age = random.randint(29, 77)
        sex = random.randint(0, 1)
        cp = random.randint(0, 3)
        trestbps = random.gauss(132, 18)
        chol = random.gauss(247, 52)
        fbs = random.randint(0, 1)
        restecg = random.randint(0, 2)
        thalach = random.gauss(150, 23)
        exang = random.randint(0, 1)
        oldpeak = max(0, random.gauss(1.0, 1.2))
        slope = random.randint(0, 2)
        ca = random.randint(0, 3)
        thal = random.randint(1, 3)
        risk = (
            (age - 50) * 0.03 + sex * 0.4 + cp * 0.3
            + (trestbps - 120) * 0.02 + (chol - 200) * 0.005
            + exang * 0.8 + oldpeak * 0.5 + ca * 0.4
        )
        target = 1 if risk + random.gauss(0, 0.4) > 1.2 else 0
        rows.append({
            "age": age, "sex": sex, "cp": cp, "trestbps": round(trestbps, 1),
            "chol": round(max(100, chol), 1), "fbs": fbs, "restecg": restecg,
            "thalach": round(max(70, thalach), 1), "exang": exang,
            "oldpeak": round(oldpeak, 2), "slope": slope, "ca": ca, "thal": thal,
            "target": target,
        })
    _write_csv(DATASETS_DIR / "heart.csv", list(rows[0].keys()), rows)


def generate_kidney(n: int = 400) -> None:
    random.seed(44)
    rows = []
    for _ in range(n):
        age = random.randint(2, 90)
        bp = random.gauss(80, 20)
        sg = round(random.choice([1.005, 1.010, 1.015, 1.020, 1.025]), 3)
        al = random.randint(0, 5)
        su = random.randint(0, 5)
        rbc = random.randint(0, 1)
        pc = random.randint(0, 1)
        pcc = random.randint(0, 1)
        ba = random.randint(0, 1)
        bgr = random.gauss(148, 50)
        bu = random.gauss(57, 40)
        sc = random.gauss(1.5, 1.2)
        sod = random.gauss(138, 8)
        pot = random.gauss(4.0, 0.8)
        hemo = random.gauss(12.5, 2.5)
        pcv = random.gauss(40, 8)
        wc = random.gauss(8000, 2000)
        rc = random.gauss(5.0, 1.5)
        htn = random.randint(0, 1)
        dm = random.randint(0, 1)
        cad = random.randint(0, 1)
        appet = random.randint(0, 1)
        pe = random.randint(0, 1)
        ane = random.randint(0, 1)
        risk = (
            (sc - 1.0) * 1.5 + al * 0.4 + su * 0.3 + htn * 0.5
            + dm * 0.6 + (bu - 40) * 0.01 + (hemo - 12) * -0.2
        )
        classification = 1 if risk + random.gauss(0, 0.3) > 0.6 else 0
        rows.append({
            "age": age, "bp": round(max(50, bp), 1), "sg": sg, "al": al, "su": su,
            "rbc": rbc, "pc": pc, "pcc": pcc, "ba": ba,
            "bgr": round(max(50, bgr), 1), "bu": round(max(10, bu), 1),
            "sc": round(max(0.4, sc), 2), "sod": round(sod, 1), "pot": round(pot, 2),
            "hemo": round(max(3, hemo), 1), "pcv": round(max(10, pcv), 1),
            "wc": round(max(2000, wc), 0), "rc": round(max(2, rc), 2),
            "htn": htn, "dm": dm, "cad": cad, "appet": appet, "pe": pe, "ane": ane,
            "classification": classification,
        })
    _write_csv(DATASETS_DIR / "kidney.csv", list(rows[0].keys()), rows)


def generate_stroke(n: int = 5110) -> None:
    random.seed(45)
    rows = []
    for _ in range(n):
        gender = random.randint(0, 1)
        age = random.uniform(0.08, 82)
        hypertension = random.randint(0, 1)
        heart_disease = random.randint(0, 1)
        ever_married = random.randint(0, 1)
        work_type = random.randint(0, 4)
        residence_type = random.randint(0, 1)
        avg_glucose_level = random.gauss(106, 45)
        bmi = random.gauss(28.9, 7)
        smoking_status = random.randint(0, 3)
        risk = (
            (age - 40) * 0.02 + hypertension * 0.8 + heart_disease * 0.7
            + (avg_glucose_level - 100) * 0.005 + (bmi - 25) * 0.03
            + smoking_status * 0.15
        )
        stroke = 1 if risk + random.gauss(0, 0.4) > 1.0 else 0
        rows.append({
            "gender": gender, "age": round(age, 1), "hypertension": hypertension,
            "heart_disease": heart_disease, "ever_married": ever_married,
            "work_type": work_type, "residence_type": residence_type,
            "avg_glucose_level": round(max(50, avg_glucose_level), 1),
            "bmi": round(max(10, bmi), 1), "smoking_status": smoking_status,
            "stroke": stroke,
        })
    _write_csv(DATASETS_DIR / "stroke.csv", list(rows[0].keys()), rows)


def main() -> None:
    generate_diabetes()
    generate_heart()
    generate_kidney()
    generate_stroke()
    print(f"Datasets written to {DATASETS_DIR}")


if __name__ == "__main__":
    main()
