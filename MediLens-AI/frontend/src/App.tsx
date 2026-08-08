import { useRef, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity, AlertTriangle, ArrowRight, BrainCircuit, ChevronRight,
  Database, FileText, HeartPulse, LayoutDashboard, Search, Stethoscope, TrendingUp, Upload, Users,
} from 'lucide-react'
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import {
  analyzePatient, generateReport, getDashboard, getPatient, getPatients,
  getTimeline, uploadRecord,
  type Analysis, type Anomaly, type Insight, type Patient, type Trend,
} from './lib/api'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/records', label: 'Upload Records', icon: Upload },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/reports', label: 'Reports', icon: FileText },
]

const riskClass = (risk: string) => `badge ${risk.toLowerCase()}`
const FILTERS = ['all', 'lab', 'vital', 'note', 'diagnosis', 'medication'] as const

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <HeartPulse /> <span>MediLens <b>AI</b></span>
        </div>
        <p className="tag">CLINICAL INTELLIGENCE</p>
        <nav>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <small>AI-Powered Clinical Record Intelligence Platform</small>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">MEDILENS AI PLATFORM</p>
            <h1>Clinical Record Intelligence</h1>
          </div>
          <div className="head-actions">
            <NavLink to="/records" className="button">
              <Upload size={16} /> Upload Records
            </NavLink>
            <NavLink to="/patients/P1001" className="button secondary">
              <Stethoscope size={16} /> Analyze Demo Patient
            </NavLink>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}

function Metric({ label, value, note, kind }: { label: string; value: string | number; note: string; kind: string }) {
  return (
    <section className="metric card">
      <div className={`metric-icon ${kind}`}><Activity size={20} /></div>
      <div>
        <span>{label}</span>
        <h2>{value}</h2>
        <small>{note}</small>
      </div>
    </section>
  )
}

function Loading() {
  return <div className="loading"><span /><span /><span /></div>
}

function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })
  const navigate = useNavigate()
  if (isLoading) return <Loading />
  const d = data!

  return (
    <>
      {/* High-Impact Hero Banner */}
      <section className="hero-card card">
        <div className="hero-content">
          <span className="hero-badge">AI-POWERED CLINICAL RECORD INTELLIGENCE</span>
          <h2>Transform scattered patient records into actionable clinical insights.</h2>
          <p>
            MediLens AI extracts, normalizes, and organizes longitudinal patient history into a searchable timeline — auto-detecting risks, trends, and anomalies to empower clinical decision-making.
          </p>
          <div className="hero-actions">
            <button className="button" onClick={() => navigate('/patients/P1001')}>
              <Stethoscope size={16} /> Analyze Patient Records
            </button>
            <button className="button secondary" onClick={() => navigate('/records')}>
              <Upload size={16} /> Upload Records
            </button>
          </div>
        </div>

        {/* 5-Step Visual Process Flow */}
        <div className="process-flow">
          <div className="flow-step">
            <Database size={18} />
            <span>RECORDS</span>
            <small>CSV / PDF / JSON</small>
          </div>
          <ArrowRight size={14} className="flow-arrow" />
          <div className="flow-step">
            <BrainCircuit size={18} />
            <span>AI ANALYSIS</span>
            <small>Extraction & Normalization</small>
          </div>
          <ArrowRight size={14} className="flow-arrow" />
          <div className="flow-step">
            <Activity size={18} />
            <span>TIMELINE</span>
            <small>Longitudinal View</small>
          </div>
          <ArrowRight size={14} className="flow-arrow" />
          <div className="flow-step">
            <TrendingUp size={18} />
            <span>RISKS & TRENDS</span>
            <small>4 ML Models + Delta</small>
          </div>
          <ArrowRight size={14} className="flow-arrow" />
          <div className="flow-step highlight">
            <FileText size={18} />
            <span>CLINICAL INSIGHTS</span>
            <small>Report & Review Signals</small>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <div className="metrics">
        <Metric label="Patients analyzed" value={d.metrics.patients_analyzed} note="Longitudinal histories processed" kind="blue" />
        <Metric label="Records processed" value={d.metrics.records_processed} note="Clinical events extracted" kind="purple" />
        <Metric label="High-risk signals" value={d.metrics.high_risk_signals} note="ML-detected elevated risk" kind="red" />
        <Metric label="New anomalies" value={d.metrics.new_anomalies} note="Potential risk signals flagged" kind="amber" />
      </div>

      <div className="grid two">
        <section className="card table-card">
          <div className="section-head">
            <div>
              <h2>Recently analyzed patients</h2>
              <p>Select a patient to view their intelligence dashboard</p>
            </div>
            <NavLink to="/patients">View all patients</NavLink>
          </div>
          <PatientTable patients={d.recent_patients} />
        </section>

        <section className="card activity">
          <div className="section-head">
            <div>
              <h2>Clinical alerts & anomalies</h2>
              <p>AI-detected abnormal risk signals</p>
            </div>
          </div>
          {d.alerts.length ? (
            d.alerts.map((a, i) => (
              <div
                className="alert-item"
                key={i}
                onClick={() => a.patient_id && navigate(`/patients/${a.patient_id}`)}
              >
                <AlertTriangle size={16} className={`sev-${a.severity}`} />
                <div>
                  <strong>{a.text}</strong>
                  <small>{a.severity.toUpperCase()} severity signal</small>
                </div>
                <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </div>
            ))
          ) : (
            <p className="muted">No active alerts</p>
          )}

          <div className="quick">
            <h3>Quick actions</h3>
            <NavLink to="/records" className="button">
              <Upload size={14} /> Upload Patient Record
            </NavLink>
            <NavLink to="/patients" className="button secondary">
              <Users size={14} /> Browse Patient List
            </NavLink>
          </div>
        </section>
      </div>

      {d.trending_conditions.length > 0 && (
        <section className="card" style={{ marginTop: 20 }}>
          <h2><TrendingUp size={18} /> Trending clinical indicators across cohort</h2>
          <div className="tag-list">
            {d.trending_conditions.map(t => (
              <span key={t} className="tag-chip">{t}</span>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function PatientTable({ patients }: { patients: Patient[] }) {
  const navigate = useNavigate()
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Conditions</th>
            <th>Records</th>
            <th>Last Visit</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.map(p => (
            <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)}>
              <td>
                <strong>{p.name}</strong>
                <small>{p.id} · {p.age} yrs · {p.gender}</small>
              </td>
              <td>{p.conditions?.join(', ') || '—'}</td>
              <td>{p.records_processed ?? '—'}</td>
              <td>{p.last_visit}</td>
              <td>
                <span className="button secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                  Analyze
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Patients() {
  const [q, setQ] = useState('')
  const { data = [], isLoading } = useQuery({ queryKey: ['patients', q], queryFn: () => getPatients(q) })
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Patient Intelligence Directory</h2>
          <p>Select any patient to inspect their longitudinal history, ML risk models, and clinical timeline.</p>
        </div>
        <NavLink to="/records" className="button"><Upload size={16} /> Upload Records</NavLink>
      </div>
      <section className="card">
        <div className="search">
          <Search size={18} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search patients by name, ID, or condition..."
          />
        </div>
        {isLoading ? <Loading /> : <PatientTable patients={data} />}
      </section>
    </>
  )
}

function RiskCards({ analysis }: { analysis: Analysis }) {
  const labels: Record<string, string> = {
    diabetes: 'Diabetes Risk',
    heart: 'Heart Disease Risk',
    kidney: 'Kidney Disease Risk',
    stroke: 'Stroke Risk',
  }

  return (
    <div className="risk-grid">
      {Object.entries(analysis.disease_risks).map(([key, score]) => {
        const detail = analysis.disease_risk_details?.[key]
        const isUnavailable = detail?.level === 'UNAVAILABLE'
        const level = detail?.level ?? (score >= 65 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW')

        return (
          <div className={`risk-card ${isUnavailable ? 'unavailable' : level.toLowerCase()}`} key={key}>
            <span className="risk-title">{labels[key] ?? key}</span>
            {isUnavailable ? (
              <>
                <b className="unavailable-text">N/A</b>
                <span className="badge pending">Insufficient Data</span>
              </>
            ) : (
              <>
                <b>{score}%</b>
                <span className={riskClass(level)}>{level}</span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function InsightsList({ insights }: { insights: Insight[] }) {
  return (
    <div className="insights-list">
      {insights.map((ins, i) => (
        <div className={`insight-item priority-${ins.priority}`} key={i}>
          <span className="insight-num">{i + 1}</span>
          <div>
            <p>{ins.text}</p>
            <small>{ins.reference}</small>
          </div>
        </div>
      ))}
    </div>
  )
}

function AnomalyList({ anomalies, onSelect }: { anomalies: Anomaly[]; onSelect?: (a: Anomaly) => void }) {
  if (!anomalies.length) return <p className="muted">No anomalies detected in patient records.</p>
  return (
    <div className="anomaly-list">
      {anomalies.map(a => (
        <div className={`anomaly-item sev-${a.severity}`} key={a.id} onClick={() => onSelect?.(a)}>
          <AlertTriangle size={16} />
          <div>
            <b>{a.label}</b>
            <p>{a.message}</p>
            <small>Recorded: {a.date}</small>
          </div>
          <ChevronRight size={16} />
        </div>
      ))}
    </div>
  )
}

function TrendCharts({ trends, vitals, labs }: { trends: Trend[]; vitals: Record<string, unknown>[]; labs: Record<string, unknown>[] }) {
  return (
    <div className="grid two">
      <section className="card">
        <h2>Vital Signs Trends</h2>
        <div className="chart">
          <ResponsiveContainer>
            <LineChart data={vitals}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip /><Legend />
              <Line type="monotone" dataKey="systolic" name="Systolic BP (mmHg)" stroke="#2874f0" strokeWidth={2} dot />
              <Line type="monotone" dataKey="diastolic" name="Diastolic BP (mmHg)" stroke="#65b9ff" strokeWidth={2} dot />
              <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#0ca878" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {trends.filter(t => ['blood_pressure', 'weight', 'heart_rate'].includes(t.category)).map(t => (
          <div className="trend-badge" key={t.category}>
            <TrendingUp size={14} /> {t.label} ({t.first} → {t.last})
          </div>
        ))}
      </section>
      <section className="card">
        <h2>Laboratory Results Trends</h2>
        <div className="chart">
          <ResponsiveContainer>
            <LineChart data={labs}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip /><Legend />
              <Line type="monotone" dataKey="glucose" name="Glucose (mg/dL)" stroke="#8b5cf6" strokeWidth={2} dot />
              <Line type="monotone" dataKey="hba1c" name="HbA1c (%)" stroke="#e64b59" strokeWidth={2} dot />
              <Line type="monotone" dataKey="creatinine" name="Creatinine (mg/dL)" stroke="#e69b13" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {trends.filter(t => ['glucose', 'hba1c', 'creatinine', 'cholesterol'].includes(t.category)).map(t => (
          <div className="trend-badge" key={t.category}>
            <TrendingUp size={14} /> {t.label} ({t.first} → {t.last})
          </div>
        ))}
      </section>
    </div>
  )
}

function TimelineSection({ patientId, highlightedDate }: { patientId: string; highlightedDate?: string }) {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { data = [], isLoading } = useQuery({
    queryKey: ['timeline', patientId, filter, search],
    queryFn: () => getTimeline(patientId, filter, search),
  })

  return (
    <section className="card timeline-card" id="timeline-section">
      <div className="section-head">
        <div>
          <h2>Longitudinal Clinical Timeline</h2>
          <p>Chronological patient history across labs, vitals, clinical notes, diagnoses, and prescriptions.</p>
        </div>
      </div>
      <div className="timeline-controls">
        <div className="search">
          <Search size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Search timeline ("glucose", "blood pressure", "HbA1c", "fatigue", "2026-07")...'
          />
        </div>
        <div className="filter-tabs">
          {FILTERS.map(f => (
            <button
              key={f}
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <Loading />
      ) : (
        <div className="timeline">
          {data.map((day: { date: string; events: { type: string; type_label: string; summary: string; text?: string; source?: string }[] }) => {
            const isMatch = highlightedDate === day.date
            return (
              <div className={`timeline-day ${isMatch ? 'highlighted-day' : ''}`} key={day.date}>
                <div className="timeline-date">
                  {day.date} {isMatch && <span className="badge high">SELECTED ANOMALY DATE</span>}
                </div>
                {day.events.map((ev, i) => (
                  <div className="timeline-event" key={i}>
                    <span className={`event-type type-${ev.type_label?.toLowerCase().replace(' ', '-')}`}>
                      {ev.type_label}
                    </span>
                    <span className="event-summary">{ev.summary || ev.text}</span>
                    {ev.source && <small className="event-source">source: {ev.source}</small>}
                  </div>
                ))}
              </div>
            )
          })}
          {!data.length && <p className="muted">No clinical events match your filter or search query.</p>}
        </div>
      )}
    </section>
  )
}

function PatientIntelligence() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null)
  const { data, isLoading, refetch } = useQuery({ queryKey: ['patient', id], queryFn: () => getPatient(id) })
  const analyzeMut = useMutation({ mutationFn: () => analyzePatient(id), onSuccess: () => refetch() })
  const reportMut = useMutation({ mutationFn: () => generateReport(id), onSuccess: () => navigate(`/reports/${id}`) })

  if (isLoading) return <Loading />
  if (!data) return <p>Patient not found</p>
  const a = data.analysis

  const handleAnomalyClick = (anom: Anomaly) => {
    setSelectedAnomaly(anom)
    document.getElementById('timeline-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">PATIENT INTELLIGENCE · {data.id}</p>
          <h2>{data.name}</h2>
          <p>{data.age} years · {data.gender} · BMI {data.bmi} · Conditions: {data.conditions?.join(', ') || 'None'}</p>
        </div>
        <div className="head-actions">
          <button className="button secondary" onClick={() => analyzeMut.mutate()} disabled={analyzeMut.isPending}>
            {analyzeMut.isPending ? 'Analyzing...' : 'Re-analyze Records'}
          </button>
          <button className="button" onClick={() => reportMut.mutate()} disabled={reportMut.isPending}>
            <FileText size={16} /> Generate Intelligence Report
          </button>
        </div>
      </div>

      {analyzeMut.isPending && <div className="analyzing-banner">Analyzing longitudinal history with ML models...</div>}

      {/* 4 ML Disease Risk Models */}
      <section className="card">
        <div className="section-head">
          <div>
            <h2>ML Disease Risk Models</h2>
            <p>Calculated directly from actual trained disease-risk classifiers — decision support only.</p>
          </div>
        </div>
        <RiskCards analysis={a} />
        <p className="disclaimer">{a.disclaimer ?? 'AI-generated risk estimates are decision-support signals and do not constitute a medical diagnosis.'}</p>
        {a.risk_trend && <div className="risk-trend"><TrendingUp size={14} /> {a.risk_trend.summary}</div>}
      </section>

      {/* AI Insights & Anomaly Alerts */}
      <div className="grid two">
        <section className="card">
          <h2><BrainCircuit size={18} /> AI Key Clinical Insights</h2>
          <InsightsList insights={a.insights} />
        </section>
        <section className="card">
          <h2><AlertTriangle size={18} /> Detected Anomaly Alerts</h2>
          <AnomalyList anomalies={a.anomalies} onSelect={handleAnomalyClick} />
        </section>
      </div>

      {/* Anomaly Source Record Popup/Card */}
      {selectedAnomaly && (
        <section className="card anomaly-detail">
          <div className="section-head">
            <h3><AlertTriangle size={18} /> Anomaly Detail — Underlying Clinical Event</h3>
            <button className="button secondary" style={{ padding: '4px 8px' }} onClick={() => setSelectedAnomaly(null)}>Close</button>
          </div>
          <p><b>{selectedAnomaly.message}</b></p>
          <dl>
            <dt>Event Date</dt><dd>{selectedAnomaly.date}</dd>
            <dt>Category</dt><dd>{selectedAnomaly.category.replace('_', ' ').toUpperCase()}</dd>
            <dt>Previous Reading</dt><dd>{selectedAnomaly.previous_value ?? '—'} {selectedAnomaly.unit}</dd>
            <dt>Current Reading</dt><dd>{selectedAnomaly.current_value} {selectedAnomaly.unit}</dd>
            <dt>Clinical Label</dt><dd>{selectedAnomaly.label}</dd>
          </dl>
        </section>
      )}

      {/* Vital & Lab Trend Charts */}
      <TrendCharts trends={a.trends} vitals={data.vitals} labs={data.labs} />

      {/* Searchable Longitudinal Timeline */}
      <TimelineSection patientId={id} highlightedDate={selectedAnomaly?.date} />

      {/* AI Summary & Review Areas */}
      <section className="card">
        <h2>Clinical Intelligence Summary</h2>
        <p className="summary-text">{a.summary}</p>
        <h3>Recommended Areas for Clinical Review</h3>
        <ul>
          {a.review_areas?.map(r => <li key={r}>{r}</li>)}
        </ul>
      </section>
    </>
  )
}

function RecordsUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [patientId, setPatientId] = useState('')
  const [stage, setStage] = useState<number>(0)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => getPatients() })

  const uploadMut = useMutation({
    mutationFn: async () => {
      setStage(1) // STEP 1: Uploading
      await new Promise(r => setTimeout(r, 400))
      setStage(2) // STEP 2: Extracting clinical information
      const res = await uploadRecord(file!, patientId || undefined)
      setStage(3) // STEP 3: Organizing longitudinal history
      await new Promise(r => setTimeout(r, 300))
      setStage(4) // STEP 4: Analyzing trends and anomalies
      await new Promise(r => setTimeout(r, 300))
      setStage(5) // STEP 5: Running ML models
      await new Promise(r => setTimeout(r, 300))
      setStage(6) // STEP 6: Generating insights
      return res
    },
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
    onError: () => setStage(0),
  })

  const STAGES = [
    'STEP 1: Uploading record file',
    'STEP 2: Extracting clinical information',
    'STEP 3: Organizing longitudinal history timeline',
    'STEP 4: Analyzing trends and anomaly detection',
    'STEP 5: Running four ML disease risk models',
    'STEP 6: Generating AI clinical insights',
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Upload Patient Records</h2>
          <p>Import structured or unstructured patient data (CSV or text PDF) into the clinical intelligence engine.</p>
        </div>
      </div>
      <div className="grid two">
        <section className="card upload-card">
          <div className="upload-zone" onClick={() => fileRef.current?.click()}>
            <Upload size={32} />
            <b>{file ? file.name : 'Drag & drop or click to upload record file'}</b>
            <p>Supports CSV, JSON, and PDF (text-based reports)</p>
            <input ref={fileRef} type="file" accept=".csv,.json,.pdf" hidden onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>

          <label>Target Patient (Optional)</label>
          <select value={patientId} onChange={e => setPatientId(e.target.value)}>
            <option value="">— Create new patient from imported record —</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
          </select>

          <button className="button" disabled={!file || uploadMut.isPending} onClick={() => uploadMut.mutate()}>
            {uploadMut.isPending ? 'Processing Clinical Records...' : 'Ingest & Run AI Analysis'}
          </button>
        </section>

        <section className="card">
          <h2>Clinical Data Ingestion Pipeline</h2>
          <div className="pipeline">
            {STAGES.map((stepLabel, i) => {
              const stepNum = i + 1
              const isDone = stage > stepNum || result !== null
              const isActive = stage === stepNum
              return (
                <div className={`pipeline-step ${isDone ? 'done' : isActive ? 'active' : ''}`} key={stepLabel}>
                  <span>{stepNum}</span>
                  {stepLabel}
                </div>
              )
            })}
          </div>

          {result && (
            <div className="upload-result">
              <b>✓ Records Ingested & Analyzed Successfully</b>
              <p>
                Patient ID: <strong>{(result as { patient_id: string }).patient_id}</strong> · Clinical Events Extracted: <strong>{(result as { events_extracted: number }).events_extracted}</strong>
              </p>
              <button
                className="button"
                onClick={() => navigate(`/patients/${(result as { patient_id: string }).patient_id}`)}
              >
                Open Patient Intelligence Dashboard <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function ReportPage() {
  const { id = 'P1001' } = useParams()
  const { data: patient, isLoading } = useQuery({ queryKey: ['patient', id], queryFn: () => getPatient(id) })

  if (isLoading) return <Loading />
  if (!patient) return <p>Patient not found</p>
  const a = patient.analysis

  return (
    <div className="report-page">
      <div className="page-head no-print">
        <div>
          <h2>Clinical Intelligence Report</h2>
          <p>Longitudinal record analysis for clinician decision support</p>
        </div>
        <button className="button" onClick={() => window.print()}>
          <FileText size={16} /> Print / Save PDF
        </button>
      </div>

      <article className="report card">
        <div className="report-header">
          <div className="hospital-mark"><HeartPulse /></div>
          <div>
            <h1>MediLens AI — Clinical Intelligence Report</h1>
            <p>AI-Driven Longitudinal Patient Record Analysis</p>
          </div>
          <small>Generated: {new Date().toLocaleDateString()}</small>
        </div>

        <h2>Patient Overview</h2>
        <div className="patient-grid">
          <p><b>Name</b>{patient.name}</p>
          <p><b>Patient ID</b>{patient.id}</p>
          <p><b>Age / Gender</b>{patient.age} yrs / {patient.gender}</p>
          <p><b>Known Conditions</b>{patient.conditions?.join(', ') || 'None'}</p>
        </div>

        <h2>AI Summary</h2>
        <p className="summary-text">{a.summary}</p>

        <h2>ML Disease Risk Predictions</h2>
        <div className="disease-grid">
          {Object.entries(a.disease_risks).map(([k, score]) => {
            const level = a.disease_risk_details?.[k]?.level ?? (score >= 65 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW')
            return (
              <div key={k}>
                <span>{k.toUpperCase()}</span>
                <b>{level === 'UNAVAILABLE' ? 'N/A' : `${score}%`}</b>
                <small className={riskClass(level)}>{level}</small>
              </div>
            )
          })}
        </div>

        <h2>Key AI Insights</h2>
        <ol>{a.insights.map((ins, i) => <li key={i}>{ins.text} ({ins.reference})</li>)}</ol>

        <h2>Detected Anomalies & Risk Signals</h2>
        {a.anomalies.length ? (
          a.anomalies.map(an => <p key={an.id} className="anomaly-line">⚠ <strong>{an.date}:</strong> {an.message}</p>)
        ) : (
          <p>No anomalies detected in patient history.</p>
        )}

        <h2>Lab & Vital Trends Summary</h2>
        {a.trends.map(t => <p key={t.category}>• <strong>{t.label}:</strong> {t.first} → {t.last}</p>)}

        <h2>Recommended Areas for Clinical Review</h2>
        <ul>{a.review_areas?.map(r => <li key={r}>{r}</li>)}</ul>

        <div className="notice">
          <strong>IMPORTANT CLINICAL DISCLAIMER:</strong> {a.disclaimer}
        </div>
      </article>
    </div>
  )
}

function ReportsIndex() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { getReports } = await import('./lib/api')
      return getReports()
    },
  })
  const navigate = useNavigate()
  if (isLoading) return <Loading />

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Clinical Reports Directory</h2>
          <p>Generated AI intelligence reports available for clinician review and export.</p>
        </div>
      </div>
      <section className="card">
        <table>
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Patient Name</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r: { id: string; patient_id: string; patient: string; date: string; status: string }) => (
              <tr key={r.id} onClick={() => navigate(`/reports/${r.patient_id}`)}>
                <td><strong>{r.id}</strong></td>
                <td>{r.patient}</td>
                <td>{r.date}</td>
                <td><span className="badge low">{r.status}</span></td>
                <td>
                  <span className="button secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                    View Report
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientIntelligence />} />
        <Route path="/records" element={<RecordsUpload />} />
        <Route path="/reports" element={<ReportsIndex />} />
        <Route path="/reports/:id" element={<ReportPage />} />
        <Route path="/analysis" element={<Navigate to="/patients/P1001" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
