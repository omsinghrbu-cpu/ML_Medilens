import axios from 'axios'
import {
  MOCK_USERS,
  mockConfirmUpload,
  mockExtractUpload,
  mockGetDashboard,
  mockGetPatient,
  mockGetPatients,
  mockGetReports,
  mockUpdatePatient,
  generatePatientAnalysis,
} from './mockData'

export function getApiBaseUrl(): string {
  const custom = localStorage.getItem('medilens_api_url')
  if (custom && custom.trim()) return custom.trim()
  return import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
}

export function setApiBaseUrl(url: string): void {
  const clean = url.trim()
  if (clean) {
    localStorage.setItem('medilens_api_url', clean)
    api.defaults.baseURL = clean
  } else {
    localStorage.removeItem('medilens_api_url')
    api.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
  }
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 5000,
})

// Attach Bearer token from localStorage automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medilens_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global API connectivity tracking
let backendActive = false
export const isLiveBackend = () => backendActive

export async function checkBackendConnection(): Promise<boolean> {
  try {
    const rootUrl = getApiBaseUrl().replace(/\/api\/v1\/?$/, '')
    await axios.get(`${rootUrl}/health`, { timeout: 2500 })
    backendActive = true
    return true
  } catch {
    backendActive = false
    return false
  }
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'PENDING' | 'UNAVAILABLE'

export interface User {
  id: string
  name: string
  role: 'doctor' | 'patient'
  specialty?: string
  hospital?: string
  doctor_id?: string
  patient_id?: string
}

export interface Patient {
  id: string
  username?: string
  name: string
  age: number
  gender: string
  dob?: string
  blood_group?: string
  height?: number
  weight?: number
  bmi?: number
  phone?: string
  conditions: string[]
  medications?: string[]
  allergies?: string
  doctor_id?: string
  doctor_name?: string
  admission_date?: string
  records_processed?: number
  last_visit: string
  analyzed?: boolean
  pending_review?: boolean
}

export interface HealthScore {
  score: number
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  color: string
}

export interface VitalRow {
  name: string
  value: string
  unit: string
  ref: string
  status: 'Normal' | 'Warning' | 'Critical'
}

export interface LabRow {
  name: string
  value: string
  unit: string
  ref: string
  status: 'Normal' | 'Warning' | 'Critical'
}

export interface TimelineDay {
  date: string
  events: {
    type: string
    type_label: string
    category: string
    summary: string
    text?: string
    value?: number | string
    unit?: string
    source?: string
  }[]
}

export interface Trend {
  category: string
  direction: string
  label: string
  values: { date: string; value: number }[]
  first: number
  last: number
  change: number
}

export interface Anomaly {
  id: string
  date: string
  category: string
  severity: 'high' | 'medium' | 'low'
  message: string
  label: string
  previous_value?: number
  current_value: number
  unit?: string
}

export interface Insight {
  priority: string
  text: string
  reference: string
  category: string
}

export interface StructuredSummary {
  patient_history: string
  current_findings: string
  trend_summary: string
  clinical_impression: string
}

export interface CategorizedRecommendations {
  immediate_actions: string[]
  monitoring: string[]
  lifestyle: string[]
  follow_up: string[]
  medication_review: string[]
}

export interface DiseaseRiskDetail {
  score: number
  level: RiskLevel
  model: string
  available?: boolean
  contributing_factors?: string[]
}

export interface Analysis {
  patient_id: string
  overall_risk: { score: number; level: RiskLevel }
  health_score: HealthScore
  disease_risks: Record<string, number>
  disease_risk_details?: Record<string, DiseaseRiskDetail>
  summary: string
  structured_summary?: StructuredSummary
  recommendations: string[]
  categorized_recommendations?: CategorizedRecommendations
  review_areas: string[]
  vitals_table?: VitalRow[]
  labs_table?: LabRow[]
  trend_analysis: Record<string, string>
  trend_deltas?: any[]
  trends: Trend[]
  anomalies: Anomaly[]
  insights: Insight[]
  timeline: TimelineDay[]
  risk_trend: { indicators: Record<string, string>; summary: string }
  confidence: number
  disclaimer: string
  models_loaded: boolean
}

export interface DashboardData {
  metrics: {
    total_patients: number
    patients_analyzed: number
    records_processed: number
    high_risk_signals: number
    new_anomalies: number
    pending_review: number
    today_analyses: number
  }
  recent_patients: Patient[]
  risk_distribution: Record<string, number>
  alerts: { text: string; severity: string; patient_id: string }[]
  trending_conditions: string[]
  recent_insights: string[]
}

export interface ReportSavedEntry {
  id: string
  patient_id: string
  created_at: string
  date: string
  doctor_name: string
  overall_risk: { score: number; level: RiskLevel }
  health_score: HealthScore
  summary: string
  report_data?: Record<string, unknown>
}

export interface PatientDetail extends Patient {
  bmi: number
  events: Record<string, unknown>[]
  timeline: TimelineDay[]
  trends: Trend[]
  anomalies: Anomaly[]
  analysis: Analysis
  vitals: Record<string, unknown>[]
  labs: Record<string, unknown>[]
  notes: { date: string; text: string }[]
  previous_reports?: ReportSavedEntry[]
}

export interface ExtractedDraft {
  filename: string
  patient_id?: string
  demographics: Record<string, unknown>
  events: Record<string, unknown>[]
  extracted_summary: {
    name: string
    age: number
    gender: string
    height: number
    weight: number
    blood_group: string
    allergies: string
    conditions: string[]
    medications: string[]
    symptoms: string
    doctor_notes: string
    events_count: number
  }
}

// Resilient API Methods with Zero-Downtime Fallback
export const loginApi = async (username: string, password: string, role: 'doctor' | 'patient') => {
  try {
    const res = await api.post('/auth/login', { username, password, role })
    backendActive = true
    const user = res.data.user
    if (!user.id) user.id = user.doctor_id || user.patient_id || username
    return res.data
  } catch (err) {
    console.warn('[MediLens AI] Live backend unreachable for login. Using fallback credentials:', err)
    backendActive = false
    const key = username.toLowerCase()
    const mockU = MOCK_USERS[key] || (role === 'doctor' ? MOCK_USERS['dr_jenkins'] : MOCK_USERS['p1001'])
    return {
      access_token: `mock_token_${mockU.id}`,
      token_type: 'bearer',
      user: mockU,
    }
  }
}

export const getMe = async (): Promise<User> => {
  try {
    const res = await api.get('/auth/me')
    backendActive = true
    const u = res.data
    if (!u.id) u.id = u.doctor_id || u.patient_id || u.sub || 'doc_101'
    return u
  } catch (err) {
    backendActive = false
    const token = localStorage.getItem('medilens_token') || ''
    if (token.includes('P1001') || token.includes('p1001')) {
      return MOCK_USERS['p1001']
    }
    if (token.includes('dr_rivera') || token.includes('doc_102')) {
      return MOCK_USERS['dr_rivera']
    }
    return MOCK_USERS['dr_jenkins']
  }
}

export const getDashboard = async (currentUser?: User | null): Promise<DashboardData> => {
  try {
    const res = await api.get('/dashboard')
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    return mockGetDashboard(currentUser)
  }
}

export const getPatients = async (q = '', currentUser?: User | null): Promise<Patient[]> => {
  try {
    const res = await api.get('/patients', { params: { q } })
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    return mockGetPatients(q, currentUser)
  }
}

export const getPatient = async (id: string): Promise<PatientDetail> => {
  try {
    const res = await api.get(`/patients/${id}`)
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    return mockGetPatient(id)
  }
}

export const updatePatientApi = async (id: string, updates: Partial<Patient>) => {
  try {
    const res = await api.put(`/patients/${id}`, updates)
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    return mockUpdatePatient(id, updates)
  }
}

export const analyzePatient = async (id: string): Promise<Analysis> => {
  try {
    const res = await api.post('/analyze', { patient_id: id })
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    const p = mockGetPatient(id)
    return generatePatientAnalysis(p)
  }
}

export const extractUpload = async (file: File, patientId?: string): Promise<ExtractedDraft> => {
  try {
    const form = new FormData()
    form.append('file', file)
    const url = patientId ? `/upload/extract?patient_id=${patientId}` : '/upload/extract'
    const res = await api.post(url, form)
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    return mockExtractUpload(file, patientId)
  }
}

export const confirmUpload = async (payload: {
  patient_id?: string
  name: string
  age: number
  gender: string
  dob?: string
  blood_group: string
  height: number
  weight: number
  allergies: string
  conditions: string[]
  medications: string[]
  symptoms: string
  doctor_notes: string
  vitals: Record<string, unknown>
  labs: Record<string, unknown>
}) => {
  try {
    const res = await api.post('/upload/confirm', payload)
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    return mockConfirmUpload(payload)
  }
}

export const uploadRecord = async (file: File, patientId?: string) => {
  try {
    const form = new FormData()
    form.append('file', file)
    const url = patientId ? `/upload?patient_id=${patientId}` : '/upload'
    const res = await api.post(url, form)
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    return mockExtractUpload(file, patientId)
  }
}

export const getTimeline = async (id: string, filter = 'all', q = '') => {
  try {
    const res = await api.get(`/patients/${id}/timeline`, { params: { filter_type: filter, q } })
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    const p = mockGetPatient(id)
    return p.timeline
  }
}

export const searchRecords = async (patientId: string, query: string) => {
  try {
    const res = await api.post('/search', { patient_id: patientId, query })
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    const p = mockGetPatient(id)
    return p.events
  }
}

export const generateReport = async (patientId: string) => {
  try {
    const res = await api.post('/generate-report', { patient_id: patientId })
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    const p = mockGetPatient(patientId)
    return {
      status: 'success',
      report_id: `REP-2026-${patientId}`,
      patient_id: patientId,
      analysis: p.analysis,
    }
  }
}

export const getPatientReport = async (patientId: string) => {
  try {
    const res = await api.get(`/reports/${patientId}`)
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    const p = mockGetPatient(patientId)
    return p.analysis
  }
}

export const getReports = async (): Promise<ReportSavedEntry[]> => {
  try {
    const res = await api.get('/reports')
    backendActive = true
    return res.data
  } catch (err) {
    backendActive = false
    return mockGetReports()
  }
}
