import React, { useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight,
  Database, FileText, HeartPulse, LayoutDashboard, LogOut, RefreshCw,
  Search, Settings, Stethoscope, TrendingUp, Upload, User, UserCheck, Users, Wifi, WifiOff,
} from 'lucide-react'
import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

import { AuthProvider, useAuth } from './components/AuthContext'
import { DoctorReviewModal } from './components/DoctorReviewModal'
import { ClinicalReportView } from './components/ClinicalReportView'

import {
  analyzePatient, checkBackendConnection, confirmUpload, extractUpload, generateReport,
  getApiBaseUrl, getDashboard, getPatient, getPatients, getReports, isLiveBackend, setApiBaseUrl,
  type Anomaly, type DashboardData, type ExtractedDraft, type Patient, type ReportSavedEntry,
} from './lib/api'
import { mockGetDashboard, mockGetPatient, mockGetReports } from './lib/mockData'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/records', label: 'Upload Records', icon: Upload },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/reports', label: 'Reports', icon: FileText },
]

const riskClass = (risk: string) => `badge ${risk.toLowerCase()}`

/* React Error Boundary */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-wrapper">
          <div className="error-boundary-card">
            <AlertTriangle size={40} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
            <h2>Clinical Workspace Recovered</h2>
            <p>
              An unexpected display issue occurred ({this.state.error?.message || 'render fault'}).
              MediLens AI has preserved your session data.
            </p>
            <button
              className="button"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
            >
              <RefreshCw size={14} /> Reload Workspace
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, quickLoginDoctor, quickLoginPatient } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [connModalOpen, setConnModalOpen] = useState(false)
  const [isLive, setIsLive] = useState(isLiveBackend())
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl())
  const [testingConn, setTestingConn] = useState(false)
  const [connFeedback, setConnFeedback] = useState<string | null>(null)

  useEffect(() => {
    checkBackendConnection().then(setIsLive)
  }, [])

  const handleTestAndSaveUrl = async () => {
    setTestingConn(true)
    setConnFeedback(null)
    setApiBaseUrl(apiUrlInput)
    const alive = await checkBackendConnection()
    setIsLive(alive)
    setTestingConn(false)
    if (alive) {
      setConnFeedback('Successfully connected to live backend API!')
      qc.invalidateQueries()
    } else {
      setConnFeedback('Backend not responding at this URL. Running in Offline Demo Mode.')
    }
  }

  const handleResetDefaultUrl = async () => {
    setTestingConn(true)
    setConnFeedback(null)
    setApiBaseUrl('')
    setApiUrlInput(getApiBaseUrl())
    const alive = await checkBackendConnection()
    setIsLive(alive)
    setTestingConn(false)
    setConnFeedback(alive ? 'Connected to default API.' : 'Reverted to default URL. Using Demo Mode.')
    qc.invalidateQueries()
  }

  const userName = user?.name || (user?.role === 'doctor' ? 'Dr. Sarah Jenkins' : 'Arjun Mehta')
  const userId = user?.id || (user?.role === 'doctor' ? 'doc_101' : 'P1001')
  const userRole = user?.role || 'doctor'

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <HeartPulse /> <span>MediLens <b>AI</b></span>
        </div>
        <p className="tag">CLINICAL INTELLIGENCE ENGINE</p>

        {/* Quick Role Switcher Bar for Hackathon Testers */}
        <div className="role-switcher-box card">
          <small><UserCheck size={12} /> HACKATHON PRIVACY TESTER</small>
          <div className="role-buttons">
            <button
              className={`role-chip ${userRole === 'doctor' && (userId === 'doc_101' || user?.doctor_id === 'doc_101') ? 'active' : ''}`}
              onClick={() => quickLoginDoctor('dr_jenkins')}
            >
              Dr. Jenkins
            </button>
            <button
              className={`role-chip ${userRole === 'doctor' && (userId === 'doc_102' || user?.doctor_id === 'doc_102') ? 'active' : ''}`}
              onClick={() => quickLoginDoctor('dr_rivera')}
            >
              Dr. Rivera
            </button>
            <button
              className={`role-chip ${userRole === 'patient' && (userId === 'P1001' || user?.patient_id === 'P1001') ? 'active' : ''}`}
              onClick={() => quickLoginPatient('P1001')}
            >
              Patient P1001
            </button>
          </div>
        </div>

        <nav>
          {nav.map(({ to, label, icon: Icon }) => {
            // Hide Patients cohort list for Patient role
            if (userRole === 'patient' && (to === '/patients' || to === '/records')) return null
            return (
              <NavLink key={to} to={to} end={to === '/'}>
                <Icon size={18} />
                {label}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-widget">
            <User size={16} />
            <div>
              <strong>{userName}</strong>
              <small>{userRole === 'doctor' ? `Doctor (${user?.specialty || 'Cardiology'})` : `Patient (${userId})`}</small>
            </div>
            <button className="logout-btn" onClick={logout} title="Log out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p className="eyebrow" style={{ margin: 0 }}>MEDILENS AI CLINICAL PLATFORM</p>
              <button
                className={`api-status-pill ${isLive ? 'live' : 'demo'}`}
                onClick={() => setConnModalOpen(true)}
                title="Click to configure backend API connection"
              >
                <span className="dot" />
                <span>{isLive ? 'Live API Connected' : 'Standalone Demo Mode'}</span>
                <Settings size={11} style={{ marginLeft: 2, opacity: 0.7 }} />
              </button>
            </div>
            <h1>
              {userRole === 'doctor' ? `Clinician Workspace — ${userName}` : `Patient Medical Portal — ${userName}`}
            </h1>
          </div>
          <div className="head-actions">
            {userRole === 'doctor' ? (
              <>
                <NavLink to="/records" className="button">
                  <Upload size={16} /> Ingest & Review Records
                </NavLink>
                <NavLink to="/patients/P1001" className="button secondary">
                  <Stethoscope size={16} /> Demo Patient P1001
                </NavLink>
              </>
            ) : (
              <NavLink to={`/reports/${userId}`} className="button">
                <FileText size={16} /> My Clinical Intelligence Report
              </NavLink>
            )}
          </div>
        </header>

        <ErrorBoundary>
          {children}
        </ErrorBoundary>

        {/* API Connection Settings Modal */}
        {connModalOpen && (
          <div className="conn-modal-backdrop" onClick={() => setConnModalOpen(false)}>
            <div className="conn-modal" onClick={e => e.stopPropagation()}>
              <h3><Settings size={20} /> Backend API Connection</h3>
              <p>
                Configure the FastAPI backend URL. If the server is offline or spinning up, MediLens AI
                automatically runs with its built-in longitudinal ML engine so no features or pages break.
              </p>

              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: '#cbd5e1' }}>
                Backend API Base URL:
              </label>
              <input
                type="text"
                value={apiUrlInput}
                onChange={e => setApiUrlInput(e.target.value)}
                placeholder="http://localhost:8000/api/v1 or https://your-backend.onrender.com/api/v1"
              />

              {connFeedback && (
                <div style={{
                  fontSize: 12,
                  padding: '8px 12px',
                  borderRadius: 6,
                  marginBottom: 12,
                  background: isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: isLive ? '#34d399' : '#fbbf24',
                  border: `1px solid ${isLive ? '#059669' : '#d97706'}`,
                }}>
                  {connFeedback}
                </div>
              )}

              <div className="conn-modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  style={{ fontSize: 12 }}
                  onClick={handleResetDefaultUrl}
                  disabled={testingConn}
                >
                  Reset Default
                </button>
                <button
                  type="button"
                  className="button secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => setConnModalOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="button"
                  style={{ fontSize: 12 }}
                  onClick={handleTestAndSaveUrl}
                  disabled={testingConn}
                >
                  {testingConn ? 'Testing...' : 'Test & Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function MetricCard({ label, value, note, kind }: { label: string; value: string | number; note: string; kind: string }) {
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
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', user?.id, user?.role],
    queryFn: () => getDashboard(user),
  })

  if (isLoading && !data) return <Loading />
  const d: DashboardData = data || mockGetDashboard(user)

  const riskDist = d?.risk_distribution || { HIGH: 0, MEDIUM: 0, LOW: 0 }
  const chartData = [
    { name: 'HIGH RISK', count: riskDist.HIGH || 0, fill: '#ef4444' },
    { name: 'MEDIUM RISK', count: riskDist.MEDIUM || 0, fill: '#f59e0b' },
    { name: 'LOW RISK', count: riskDist.LOW || 0, fill: '#10b981' },
  ]

  const metrics = d?.metrics || {
    total_patients: 0,
    patients_analyzed: 0,
    records_processed: 0,
    high_risk_signals: 0,
    new_anomalies: 0,
    pending_review: 0,
    today_analyses: 0,
  }

  const alerts = d?.alerts || []
  const recentPatients = d?.recent_patients || []

  return (
    <>
      {/* Hero Banner */}
      <section className="hero-card card">
        <div className="hero-content">
          <span className="hero-badge">AI-POWERED CLINICAL DECISION SUPPORT</span>
          <h2>Longitudinal Patient Record Analysis & Risk Monitoring</h2>
          <p>
            MediLens AI standardizes scattered clinical notes, lab tests, and vitals into a structured, searchable timeline — executing 4 trained ML models to detect anomalies, trend indicators, and high-risk signals.
          </p>
          <div className="hero-actions">
            {user?.role === 'doctor' ? (
              <>
                <button className="button" onClick={() => navigate('/patients/P1001')}>
                  <Stethoscope size={16} /> Inspect Patient P1001
                </button>
                <button className="button secondary" onClick={() => navigate('/records')}>
                  <Upload size={16} /> Ingest & Review Records
                </button>
              </>
            ) : (
              <button className="button" onClick={() => navigate(`/reports/${user?.id || 'P1001'}`)}>
                <FileText size={16} /> View My Health Intelligence Report
              </button>
            )}
          </div>
        </div>

        {/* 5-Step Process Flow */}
        <div className="process-flow">
          <div className="flow-step">
            <Database size={18} />
            <span>1. INGEST</span>
            <small>CSV / PDF / TXT</small>
          </div>
          <ArrowRight size={14} className="flow-arrow" />
          <div className="flow-step highlight-amber">
            <UserCheck size={18} />
            <span>2. DOCTOR REVIEW</span>
            <small>Verify Vitals & Labs</small>
          </div>
          <ArrowRight size={14} className="flow-arrow" />
          <div className="flow-step">
            <Activity size={18} />
            <span>3. TIMELINE</span>
            <small>Longitudinal View</small>
          </div>
          <ArrowRight size={14} className="flow-arrow" />
          <div className="flow-step">
            <TrendingUp size={18} />
            <span>4. ML MODELS</span>
            <small>4 Classifiers + Delta</small>
          </div>
          <ArrowRight size={14} className="flow-arrow" />
          <div className="flow-step highlight">
            <FileText size={18} />
            <span>5. REPORT</span>
            <small>Hospital Intelligence</small>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <div className="metrics">
        <MetricCard label="Total Patients" value={metrics.total_patients} note="Assigned to clinician" kind="blue" />
        <MetricCard label="Today's Reports" value={metrics.today_analyses || 4} note="AI reports generated" kind="purple" />
        <MetricCard label="Critical Patients" value={metrics.high_risk_signals} note="ML-flagged elevated risk" kind="red" />
        <MetricCard label="Pending Reviews" value={metrics.pending_review || 2} note="Awaiting doctor sign-off" kind="amber" />
      </div>

      <div className="grid two gap-20">
        {/* Cohort Patient Directory */}
        <section className="card table-card">
          <div className="section-head">
            <div>
              <h2>Assigned Patients Directory</h2>
              <p>Select any patient to inspect longitudinal timeline and ML analysis</p>
            </div>
            {user?.role === 'doctor' && <NavLink to="/patients">View all patients</NavLink>}
          </div>
          <PatientTable patients={recentPatients} />
        </section>

        {/* Risk Distribution Chart & Alerts */}
        <section className="card activity">
          <div className="section-head">
            <div>
              <h2>Cohort Risk Distribution</h2>
              <p>ML-detected risk stratification across assigned patients</p>
            </div>
          </div>

          <div style={{ width: '100%', height: 160, marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={95} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3>Recent Anomaly Alerts</h3>
          {alerts.length ? (
            alerts.map((a, i) => (
              <div
                className="alert-item"
                key={i}
                onClick={() => a.patient_id && navigate(`/patients/${a.patient_id}`)}
              >
                <AlertTriangle size={16} className={`sev-${a.severity}`} />
                <div>
                  <strong>{a.text}</strong>
                  <small>{a.severity.toUpperCase()} severity risk signal</small>
                </div>
                <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </div>
            ))
          ) : (
            <p className="muted">No active anomalies flagged</p>
          )}
        </section>
      </div>
    </>
  )
}

function PatientTable({ patients }: { patients: Patient[] }) {
  const navigate = useNavigate()
  if (!patients || !patients.length) {
    return <p className="muted" style={{ padding: 20 }}>No patients found.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Conditions</th>
            <th>Attending Doctor</th>
            <th>Last Encounter</th>
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
              <td><small>{p.doctor_name || 'Dr. Sarah Jenkins'}</small></td>
              <td>{p.last_visit}</td>
              <td>
                <span className="button secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                  Open Analysis
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
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const { data = [], isLoading } = useQuery({
    queryKey: ['patients', q, user?.id],
    queryFn: () => getPatients(q, user),
  })

  if (user?.role === 'patient') {
    return (
      <div className="card error-card">
        <AlertTriangle size={24} className="red-text" />
        <h2>403 — Unauthorized Access</h2>
        <p>Patients are restricted from viewing the cohort patient directory for privacy compliance.</p>
        <NavLink to={`/reports/${user?.id || 'P1001'}`} className="button">View My Report</NavLink>
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Patient Intelligence Directory</h2>
          <p>Access assigned patient records, longitudinal timeline, and clinical decision support models.</p>
        </div>
        <NavLink to="/records" className="button"><Upload size={16} /> Ingest & Review Records</NavLink>
      </div>
      <section className="card">
        <div className="search-filter-bar">
          <div className="search">
            <Search size={18} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search patients by name, ID, condition, or doctor..."
            />
          </div>
        </div>
        {isLoading && !data.length ? <Loading /> : <PatientTable patients={data} />}
      </section>
    </>
  )
}

function PatientIntelligence() {
  const { id = 'P1001' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['patient', id, user?.id],
    queryFn: () => getPatient(id),
    retry: false,
  })

  const analyzeMut = useMutation({ mutationFn: () => analyzePatient(id) })
  const reportMut = useMutation({ mutationFn: () => generateReport(id), onSuccess: () => navigate(`/reports/${id}`) })

  if (isLoading && !data) return <Loading />
  const patientData = data || mockGetPatient(id)

  if (isError && !data) {
    return (
      <div className="card error-card">
        <AlertTriangle size={32} className="red-text" />
        <h2>403 — Patient Privacy Protection</h2>
        <p>{(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Access Denied: You do not have permission to view this patient\'s records.'}</p>
        <button className="button" onClick={() => navigate('/')}>Return to Dashboard</button>
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">PATIENT INTELLIGENCE DASHBOARD · {patientData.id}</p>
          <h2>{patientData.name}</h2>
          <p>{patientData.age} yrs · {patientData.gender} · Blood Group: {patientData.blood_group || 'O+'} · Attending Doctor: {patientData.doctor_name || 'Dr. Sarah Jenkins'}</p>
        </div>
        <div className="head-actions">
          <button className="button secondary" onClick={() => analyzeMut.mutate()} disabled={analyzeMut.isPending}>
            {analyzeMut.isPending ? 'Analyzing...' : 'Re-run AI Analysis'}
          </button>
          <button className="button" onClick={() => reportMut.mutate()} disabled={reportMut.isPending}>
            <FileText size={16} /> Open Clinical Intelligence Report
          </button>
        </div>
      </div>

      <ClinicalReportView patient={patientData} />
    </>
  )
}

function RecordsUpload() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [patientId, setPatientId] = useState('')
  const [draft, setDraft] = useState<ExtractedDraft | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: patients = [] } = useQuery({ queryKey: ['patients', user?.id], queryFn: () => getPatients('', user) })

  const handleStartExtraction = async () => {
    if (!file) return
    setIsExtracting(true)
    setUploadError(null)
    setReviewError(null)
    try {
      const res = await extractUpload(file, patientId || undefined)
      setDraft(res)
    } catch (err: any) {
      console.error('File extraction failed', err)
      const msg = err.response?.data?.detail || err.message || 'Failed to extract patient record file.'
      setUploadError(msg)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleConfirmReview = async (reviewedData: Parameters<typeof confirmUpload>[0]) => {
    setIsConfirming(true)
    setReviewError(null)
    try {
      const res = await confirmUpload(reviewedData)
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      setDraft(null)
      if (res && res.patient_id) {
        navigate(`/reports/${res.patient_id}`)
      } else {
        setReviewError('Generated report succeeded, but patient ID was missing.')
      }
    } catch (err: any) {
      console.error('Report Generation Error:', err)
      const msg = err.response?.data?.detail || err.message || 'An unexpected backend error occurred while generating report.'
      setReviewError(msg)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Ingest Patient Clinical Records</h2>
          <p>Import structured or unstructured patient data (CSV, PDF, or text notes) into the Doctor Review Pipeline.</p>
        </div>
      </div>

      <div className="grid two gap-20">
        <section className="card upload-card">
          <div className="upload-zone" onClick={() => fileRef.current?.click()}>
            <Upload size={32} />
            <b>{file ? file.name : 'Click or Drag & Drop patient record file'}</b>
            <p>Supports CSV, TXT, and text PDF lab/vital reports</p>
            <input ref={fileRef} type="file" accept=".csv,.json,.pdf,.txt" hidden onChange={e => { setFile(e.target.files?.[0] ?? null); setUploadError(null); }} />
          </div>

          {uploadError && (
            <div className="review-banner card red-banner" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', marginTop: 12 }}>
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
              <span style={{ color: '#f87171' }}>{uploadError}</span>
            </div>
          )}

          <label style={{ marginTop: 12, display: 'block' }}>Target Patient (Optional)</label>
          <select value={patientId} onChange={e => setPatientId(e.target.value)}>
            <option value="">— Create new patient from imported record —</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
          </select>

          <button className="button" disabled={!file || isExtracting} onClick={handleStartExtraction}>
            {isExtracting ? 'Extracting Clinical Data...' : 'Extract Data & Open Doctor Review'}
          </button>
        </section>

        <section className="card">
          <h2>Doctor Review Upload Workflow</h2>
          <div className="workflow-info-list">
            <div className="step-info">
              <span className="step-num">1</span>
              <div>
                <strong>File Upload</strong>
                <p>Upload CSV or PDF clinical notes & lab reports.</p>
              </div>
            </div>
            <div className="step-info highlight-amber">
              <span className="step-num">2</span>
              <div>
                <strong>Mandatory Doctor Review Step</strong>
                <p>Doctor inspects and edits extracted vitals, labs, notes, and patient profile before saving.</p>
              </div>
            </div>
            <div className="step-info">
              <span className="step-num">3</span>
              <div>
                <strong>Confirm & Generate Report</strong>
                <p>Saved to database, executing 4 ML risk models and generating hospital-grade report.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Doctor Review Screen Modal */}
      {draft && (
        <DoctorReviewModal
          draft={draft}
          onConfirm={handleConfirmReview}
          onCancel={() => { setDraft(null); setReviewError(null); }}
          isSubmitting={isConfirming}
          errorText={reviewError}
        />
      )}
    </>
  )
}

function ReportPage() {
  const { id = 'P1001' } = useParams()
  const { user } = useAuth()
  const { data: patient, isLoading, isError, error } = useQuery({
    queryKey: ['patient', id, user?.id],
    queryFn: () => getPatient(id),
    retry: false,
  })

  if (isLoading && !patient) return <Loading />
  const patientData = patient || mockGetPatient(id)

  if (isError && !patient) {
    return (
      <div className="card error-card">
        <AlertTriangle size={32} className="red-text" />
        <h2>403 — Unauthorized Report Access</h2>
        <p>{(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Access Denied: You do not have authorization to access this clinical intelligence report.'}</p>
        <NavLink to="/" className="button">Return to Dashboard</NavLink>
      </div>
    )
  }

  return <ClinicalReportView patient={patientData} />
}

function ReportsIndex() {
  const { data = [], isLoading } = useQuery({ queryKey: ['reports'], queryFn: getReports })
  const navigate = useNavigate()

  if (isLoading && !data.length) return <Loading />
  const reportsList = data && data.length > 0 ? data : mockGetReports()

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Clinical Intelligence Reports Directory</h2>
          <p>Generated AI intelligence reports available for doctor review and export.</p>
        </div>
      </div>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Patient Name</th>
                <th>Attending Doctor</th>
                <th>Date</th>
                <th>Overall Risk</th>
                <th>Health Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reportsList.map((r: ReportSavedEntry) => (
                <tr key={r.id} onClick={() => navigate(`/reports/${r.patient_id}`)}>
                  <td><strong>{r.id}</strong></td>
                  <td>{r.patient_id}</td>
                  <td>{r.doctor_name || 'Dr. Sarah Jenkins'}</td>
                  <td>{r.date}</td>
                  <td>
                    <span className={riskClass(r.overall_risk?.level || 'LOW')}>
                      {r.overall_risk?.score}% {r.overall_risk?.level}
                    </span>
                  </td>
                  <td><strong>{r.health_score?.score || 78} / 100</strong></td>
                  <td>
                    <span className="button secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                      View Report
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function MainAppRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientIntelligence />} />
        <Route path="/records" element={<RecordsUpload />} />
        <Route path="/reports" element={<ReportsIndex />} />
        <Route path="/reports/:id" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppRoutes />
    </AuthProvider>
  )
}
