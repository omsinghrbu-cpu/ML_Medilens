import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
})

// Attach Bearer token from localStorage automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medilens_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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

// API Methods
export const loginApi = async (username: string, password: string, role: 'doctor' | 'patient') => {
  const res = await api.post('/auth/login', { username, password, role })
  return res.data
}

export const getMe = async (): Promise<User> => (await api.get('/auth/me')).data

export const getDashboard = async (): Promise<DashboardData> => (await api.get('/dashboard')).data

export const getPatients = async (q = ''): Promise<Patient[]> => (await api.get('/patients', { params: { q } })).data

export const getPatient = async (id: string): Promise<PatientDetail> => (await api.get(`/patients/${id}`)).data

export const updatePatientApi = async (id: string, updates: Partial<Patient>) => (await api.put(`/patients/${id}`, updates)).data

export const analyzePatient = async (id: string): Promise<Analysis> => (await api.post('/analyze', { patient_id: id })).data

export const extractUpload = async (file: File, patientId?: string): Promise<ExtractedDraft> => {
  const form = new FormData()
  form.append('file', file)
  const url = patientId ? `/upload/extract?patient_id=${patientId}` : '/upload/extract'
  return (await api.post(url, form)).data
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
}) => (await api.post('/upload/confirm', payload)).data

export const uploadRecord = async (file: File, patientId?: string) => {
  const form = new FormData()
  form.append('file', file)
  const url = patientId ? `/upload?patient_id=${patientId}` : '/upload'
  return (await api.post(url, form)).data
}

export const getTimeline = async (id: string, filter = 'all', q = '') =>
  (await api.get(`/patients/${id}/timeline`, { params: { filter_type: filter, q } })).data

export const searchRecords = async (patientId: string, query: string) =>
  (await api.post('/search', { patient_id: patientId, query })).data

export const generateReport = async (patientId: string) =>
  (await api.post('/generate-report', { patient_id: patientId })).data

export const getPatientReport = async (patientId: string) => (await api.get(`/reports/${patientId}`)).data

export const getReports = async (): Promise<ReportSavedEntry[]> => (await api.get('/reports')).data
