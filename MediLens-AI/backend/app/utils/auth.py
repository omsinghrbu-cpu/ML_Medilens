"""Authentication and authorization utilities for MediLens AI backend."""
from __future__ import annotations

import base64
import json
import time
from typing import Any

from fastapi import Depends, HTTPException, Header, status
from ..data.store import DOCTORS, PATIENTS, get_patient

SECRET_KEY = "medilens_ai_clinical_secret_key"


def create_access_token(user_id: str, role: str, extra: dict[str, Any] | None = None) -> str:
    payload = {
        "sub": user_id,
        "id": user_id,
        "role": role,
        "exp": int(time.time()) + 86400 * 7,  # 7 days
        **(extra or {}),
    }
    dumped = json.dumps(payload).encode("utf-8")
    return base64.urlsafe_b64encode(dumped).decode("utf-8")


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        if token.startswith("Bearer "):
            token = token[7:]
        decoded_bytes = base64.urlsafe_b64decode(token.encode("utf-8"))
        payload = json.loads(decoded_bytes.decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def get_current_user(authorization: str | None = Header(None)) -> dict[str, Any]:
    if not authorization:
        # Default to Dr. Sarah Jenkins for unauthenticated requests in demo
        doc = DOCTORS[0]
        return {
            "id": doc["id"],
            "role": "doctor",
            "name": doc["name"],
            "doctor_id": doc["id"],
            "specialty": doc.get("specialty", "Cardiology & Internal Medicine"),
            "hospital": doc.get("hospital", "MediLens AI Medical Center"),
        }
    
    payload = decode_token(authorization)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )
    user_id = payload.get("id") or payload.get("sub", "")
    role = payload.get("role", "doctor")
    result = dict(payload)
    result["id"] = user_id
    if role == "doctor":
        doc = next((d for d in DOCTORS if d["id"] == user_id or d["username"] == user_id), None)
        if doc:
            result.setdefault("name", doc["name"])
            result.setdefault("doctor_id", doc["id"])
            result.setdefault("specialty", doc.get("specialty", "Cardiology & Internal Medicine"))
            result.setdefault("hospital", doc.get("hospital", "MediLens AI Medical Center"))
    elif role == "patient":
        patient = next((p for p in PATIENTS if p["id"] == user_id or p.get("username", "") == user_id), None)
        if patient:
            result.setdefault("name", patient["name"])
            result.setdefault("patient_id", patient["id"])
    return result


def verify_patient_access(patient_id: str, current_user: dict[str, Any]) -> dict[str, Any]:
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    role = current_user.get("role", "doctor")
    
    if role == "doctor":
        doc_id = current_user.get("doctor_id") or current_user.get("id")
        assigned_id = patient.get("doctor_id") or patient.get("assigned_doctor_id") or patient.get("owner_user_id") or patient.get("created_by")
        if assigned_id and assigned_id != doc_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Patient {patient_id} is assigned to another clinician.",
            )
    elif role == "patient":
        user_patient_id = current_user.get("patient_id") or current_user.get("id")
        if patient_id != user_patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You do not have permission to view another patient's medical records.",
            )

    return patient
