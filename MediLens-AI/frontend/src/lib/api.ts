import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
})

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'PENDING' | 'UNAVAILABLE'

export interface Patient {
  id: string
  name: string
  age: number
  gender: string
  blood_group?: string
  phone?: string
  conditions: string[]
  medications?: string[]
  records_processed?: number
  last_visit: string
  analyzed?: boolean
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
  severity: string
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

export interface Analysis {
  patient_id: string
  overall_risk: { score: number; level: RiskLevel }
  disease_risks: Record<string, number>
  disease_risk_details?: Record<string, { score: number; level: RiskLevel; model: string }>
  summary: string
  recommendations: string[]
  review_areas: string[]
  trend_analysis: Record<string, string>
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
    patients_analyzed: number
    records_processed: number
    high_risk_signals: number
    new_anomalies: number
  }
  recent_patients: Patient[]
  alerts: { text: string; severity: string; patient_id: string }[]
  trending_conditions: string[]
  recent_insights: string[]
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
}

export const getDashboard = async (): Promise<DashboardData> =>
  (await api.get('/dashboard')).data

export const getPatients = async (q = ''): Promise<Patient[]> =>
  (await api.get('/patients', { params: { q } })).data

export const getPatient = async (id: string): Promise<PatientDetail> =>
  (await api.get(`/patients/${id}`)).data

export const analyzePatient = async (id: string): Promise<Analysis> =>
  (await api.post('/analyze', { patient_id: id })).data

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

export const getReports = async () => (await api.get('/reports')).data
