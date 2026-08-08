# MediLens AI

AI-driven patient record analysis and monitoring for clinician workflows. This starter is intentionally a **clinical decision-support demo**, not a diagnostic device: every AI-generated output requires clinician review.

## Included

- Responsive React/Vite clinician dashboard, patient search, longitudinal profile, charts, AI-analysis screen, and print-to-PDF clinical report.
- FastAPI API with 30 seeded patients, CRUD routes, upload endpoint, dashboard metrics, and demo reports.
- Stable `POST /api/v1/analyze` JSON contract. The frontend knows nothing about individual ML models.
- Empty, documented ML extension points in `backend/app/ml/`.

## Run locally

Prerequisites: Node.js 20+ and Python 3.11+.

```powershell
cd frontend
npm install
npm run dev
```

In a second terminal:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `http://localhost:5173`. API docs are at `http://localhost:8000/docs`.

## Main API routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/v1/login` | Demo JWT-style login response |
| GET/POST | `/api/v1/patients` | Patient list and creation |
| GET/PUT/DELETE | `/api/v1/patients/{patient_id}` | Patient record CRUD |
| POST | `/api/v1/upload` | Upload record placeholder |
| GET | `/api/v1/dashboard` | Dashboard metrics and activity |
| POST | `/api/v1/analyze` | One ML integration endpoint |
| GET | `/api/v1/analysis/{patient_id}` | Latest placeholder analysis |
| GET | `/api/v1/reports` | Report index |

## ML integration

Replace only `backend/app/ml/predict.py:analyze_patient()` at first. Preserve its response structure; all frontend pages will continue to work untouched. As you build models, use the companion TODO modules for feature preparation, model loading, risks, trends, summaries, and timelines.

## Project layout

```text
frontend/                 React application
  src/App.tsx             Dashboard and clinician pages
  src/lib/api.ts          Typed API client and analysis contract
backend/app/
  main.py                 FastAPI routes + demo data
  ml/                     Reserved ML integration layer
docker-compose.yml        Local container starter
```

## Production notes

The current data is in memory for a frictionless demo. Move it to PostgreSQL with SQLAlchemy migrations, add real authentication and role checks, encrypt sensitive data, add audit logging, consent controls, and validation before any real deployment. Do not use this project for live clinical decisions without appropriate clinical, privacy, and regulatory work.
