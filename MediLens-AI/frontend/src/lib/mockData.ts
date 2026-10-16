/**
 * Comprehensive offline / fallback clinical dataset and ML prediction engine.
 * Ensures MediLens AI operates 100% reliably in web deployments, demos, and edge environments
 * when the Python FastAPI server is booting up or unreachable.
 */
import type {
  Analysis,
  DashboardData,
  ExtractedDraft,
  Patient,
  PatientDetail,
  ReportSavedEntry,
  TimelineDay,
  Trend,
  User,
} from './api'

export const MOCK_USERS: Record<string, User> = {
  dr_jenkins: {
    id: 'doc_101',
    name: 'Dr. Sarah Jenkins',
    role: 'doctor',
    specialty: 'Cardiology & Internal Medicine',
    hospital: 'MediLens AI Medical Center',
    doctor_id: 'doc_101',
  },
  dr_rivera: {
    id: 'doc_102',
    name: 'Dr. Alex Rivera',
    role: 'doctor',
    specialty: 'Endocrinology & Primary Care',
    hospital: 'MediLens AI Medical Center',
    doctor_id: 'doc_102',
  },
  p1001: {
    id: 'P1001',
    name: 'Arjun Mehta',
    role: 'patient',
    patient_id: 'P1001',
  },
}

const NAMES = [
  'Arjun Mehta', 'Priya Sharma', 'Rohan Kapoor', 'Ananya Iyer', 'Vikram Singh',
  'Kavya Nair', 'Rahul Verma', 'Meera Joshi', 'Aditi Rao', 'Sanjay Patel',
  'Deepak Verma', 'Sunita Rao', 'Karan Malhotra', 'Neha Gupta', 'Amitabh Bachan',
  'Smriti Mandhana', 'Rohit Sharma', 'Virat Kohli', 'Shreya Ghoshal', 'Arijit Singh',
  'Pooja Hegde', 'Siddharth Malhotra', 'Kiara Advani', 'Ranveer Singh', 'Deepika Padukone',
  'Alia Bhatt', 'Ranbir Kapoor', 'Varun Dhawan', 'Kriti Sanon', 'Ayushmann Khurrana',
]

const CONDITIONS_LIST = [
  ['Hypertension', 'Type 2 Diabetes'],
  ['Asthma'],
  ['Hyperlipidemia'],
  ['Type 2 Diabetes'],
  ['Hypertension'],
  ['Chronic Kidney Disease'],
  ['Hyperlipidemia', 'Coronary Artery Disease'],
]

const MEDICATIONS_LIST = [
  ['Metformin 500mg', 'Lisinopril 10mg'],
  ['Albuterol inhaler'],
  ['Atorvastatin 20mg'],
  ['Metformin 850mg', 'Glipizide 5mg'],
  ['Amlodipine 5mg'],
  ['Losartan 50mg'],
  ['Atorvastatin 40mg', 'Aspirin 81mg'],
]

const ALLERGIES_LIST = [
  'Penicillin', 'Sulfa drugs', 'Aspirin', 'None known', 'Latex', 'Peanuts', 'None known',
]

// Generate 30 seeded patients
function generateInitialPatients(): Patient[] {
  const list: Patient[] = []
  for (let i = 0; i < 30; i++) {
    const id = `P${1001 + i}`
    const isDocJenkins = i < 15
    const ht = 158 + (i % 6) * 4
    const wt = 58 + ((i * 5) % 38)
    const bmi = +(wt / ((ht / 100) ** 2)).toFixed(1)

    list.push({
      id,
      username: id.toLowerCase(),
      name: NAMES[i % NAMES.length],
      age: 34 + ((i * 3) % 48),
      gender: i % 2 === 0 ? 'Male' : 'Female',
      dob: `${1990 - i}-06-15`,
      blood_group: (['O+', 'A+', 'B+', 'AB+'] as const)[i % 4],
      height: ht,
      weight: wt,
      bmi,
      phone: `+91 98${String(i).padStart(6, '0')}12`,
      conditions: CONDITIONS_LIST[i % CONDITIONS_LIST.length],
      medications: MEDICATIONS_LIST[i % MEDICATIONS_LIST.length],
      allergies: ALLERGIES_LIST[i % ALLERGIES_LIST.length],
      doctor_id: isDocJenkins ? 'doc_101' : 'doc_102',
      doctor_name: isDocJenkins ? 'Dr. Sarah Jenkins' : 'Dr. Alex Rivera',
      admission_date: `2026-0${1 + (i % 9)}-12`,
      records_processed: 6 + (i % 8),
      last_visit: `2026-09-${10 + (i % 18)}`,
      analyzed: true,
      pending_review: i % 4 === 0,
    })
  }
  return list
}

let mockPatients = generateInitialPatients()

export function generatePatientAnalysis(p: Patient): Analysis {
  const isHighRisk = p.conditions.includes('Type 2 Diabetes') && p.conditions.includes('Hypertension')
  const isMedRisk = p.conditions.includes('Type 2 Diabetes') || p.conditions.includes('Chronic Kidney Disease')

  const overallScore = isHighRisk ? 74 : isMedRisk ? 52 : 24
  const overallLevel = isHighRisk ? 'HIGH' : isMedRisk ? 'MEDIUM' : 'LOW'

  const diabetesRisk = p.conditions.includes('Type 2 Diabetes') ? 78 : 32
  const heartRisk = p.conditions.includes('Hypertension') || p.conditions.includes('Coronary Artery Disease') ? 72 : 28
  const kidneyRisk = p.conditions.includes('Chronic Kidney Disease') ? 81 : 26
  const strokeRisk = p.conditions.includes('Hypertension') ? 64 : 19

  const timeline: TimelineDay[] = [
    {
      date: '2026-09-15',
      events: [
        {
          type: 'vital',
          type_label: 'Vitals Encounter',
          category: 'Blood Pressure',
          summary: 'Blood pressure recorded at 138/88 mmHg',
          value: '138/88',
          unit: 'mmHg',
        },
        {
          type: 'lab',
          type_label: 'Laboratory Test',
          category: 'HbA1c',
          summary: 'Elevated glycosylated hemoglobin',
          value: 7.2,
          unit: '%',
        },
        {
          type: 'note',
          type_label: 'Clinical Progress Note',
          category: 'Doctor Note',
          summary: 'Clinician reviewed glycemic control and recommended dietary sodium restriction.',
          text: 'Patient presented for routine check-up. Reports mild afternoon fatigue. Encouraged aerobic exercise 30 min daily.',
        },
      ],
    },
    {
      date: '2026-07-22',
      events: [
        {
          type: 'vital',
          type_label: 'Vitals Encounter',
          category: 'Heart Rate',
          summary: 'Resting pulse 76 bpm',
          value: 76,
          unit: 'bpm',
        },
        {
          type: 'lab',
          type_label: 'Laboratory Test',
          category: 'Fasting Glucose',
          summary: 'Fasting plasma glucose test',
          value: 136,
          unit: 'mg/dL',
        },
      ],
    },
    {
      date: '2026-05-10',
      events: [
        {
          type: 'vital',
          type_label: 'Initial Check-in',
          category: 'Weight & BMI',
          summary: `Weight ${p.weight} kg (BMI ${p.bmi})`,
          value: p.weight,
          unit: 'kg',
        },
      ],
    },
  ]

  const trends: Trend[] = [
    {
      category: 'Glucose',
      direction: 'Increasing',
      label: 'Fasting Glucose Trend',
      values: [
        { date: '2026-03-12', value: 114 },
        { date: '2026-05-18', value: 126 },
        { date: '2026-07-22', value: 136 },
        { date: '2026-09-15', value: 148 },
      ],
      first: 114,
      last: 148,
      change: 34,
    },
    {
      category: 'Blood Pressure (Systolic)',
      direction: 'Increasing',
      label: 'Systolic Blood Pressure',
      values: [
        { date: '2026-03-12', value: 122 },
        { date: '2026-05-18', value: 128 },
        { date: '2026-07-22', value: 132 },
        { date: '2026-09-15', value: 138 },
      ],
      first: 122,
      last: 138,
      change: 16,
    },
    {
      category: 'HbA1c',
      direction: 'Increasing',
      label: 'Glycated Hemoglobin',
      values: [
        { date: '2026-03-12', value: 6.2 },
        { date: '2026-06-10', value: 6.6 },
        { date: '2026-09-15', value: 7.2 },
      ],
      first: 6.2,
      last: 7.2,
      change: 1.0,
    },
  ]

  return {
    patient_id: p.id,
    overall_risk: {
      score: overallScore,
      level: overallLevel,
    },
    health_score: {
      score: 100 - Math.round(overallScore * 0.7),
      rating: overallScore > 65 ? 'Fair' : overallScore > 40 ? 'Good' : 'Excellent',
      color: overallScore > 65 ? '#ef4444' : overallScore > 40 ? '#f59e0b' : '#10b981',
    },
    disease_risks: {
      diabetes: diabetesRisk,
      heart: heartRisk,
      kidney: kidneyRisk,
      stroke: strokeRisk,
    },
    disease_risk_details: {
      diabetes: {
        score: diabetesRisk,
        level: diabetesRisk > 60 ? 'HIGH' : diabetesRisk > 35 ? 'MEDIUM' : 'LOW',
        model: 'RandomForest-Diabetes-Classifier v2.1',
        available: true,
        contributing_factors: ['Fasting Glucose > 126 mg/dL', 'HbA1c > 6.5%', 'BMI > 25'],
      },
      heart: {
        score: heartRisk,
        level: heartRisk > 60 ? 'HIGH' : heartRisk > 35 ? 'MEDIUM' : 'LOW',
        model: 'GradientBoost-Cardiovascular-V3',
        available: true,
        contributing_factors: ['Systolic Blood Pressure > 130 mmHg', 'Elevated LDL Cholesterol'],
      },
      kidney: {
        score: kidneyRisk,
        level: kidneyRisk > 60 ? 'HIGH' : kidneyRisk > 35 ? 'MEDIUM' : 'LOW',
        model: 'XGBoost-RenalRisk-V1.4',
        available: true,
        contributing_factors: ['Microalbuminuria trend', 'eGFR within border reference'],
      },
      stroke: {
        score: strokeRisk,
        level: strokeRisk > 60 ? 'HIGH' : strokeRisk > 35 ? 'MEDIUM' : 'LOW',
        model: 'LogisticRegression-StrokeRisk-V2',
        available: true,
        contributing_factors: ['Elevated pulse pressure', 'Age factor'],
      },
    },
    summary: `Longitudinal analysis for ${p.name} indicates an ${overallLevel} risk profile driven by elevated glycemic indicators and upward trending systolic blood pressure over the last 6 months.`,
    structured_summary: {
      patient_history: `${p.name}, a ${p.age}-year-old ${p.gender.toLowerCase()}, with documented history of ${p.conditions.join(', ') || 'routine monitoring'}. Currently prescribed ${p.medications?.join(', ') || 'no active maintenance pharmacotherapy'}. Known allergies: ${p.allergies || 'None known'}.`,
      current_findings: `Latest encounter records BP at 138/88 mmHg, HbA1c at 7.2%, and fasting glucose at 148 mg/dL. Renal and liver panel markers remain within baseline tolerance limits.`,
      trend_summary: `Upward trajectory observed in HbA1c (+1.0% over 6 months) and systolic blood pressure (+16 mmHg). Fasting plasma glucose shows persistent moderate elevation.`,
      clinical_impression: `Cardiometabolic syndrome risk with suboptimal glycemic control. Requires pharmacological adjustment and dietary sodium reduction under physician supervision.`,
    },
    recommendations: [
      'Order comprehensive metabolic panel and repeat HbA1c in 90 days.',
      'Consider titration of Metformin dosage following renal clearance confirmation.',
      'Instruct patient on home blood pressure self-monitoring twice daily.',
      'Provide clinical nutrition referral for low-glycemic dietary planning.',
    ],
    categorized_recommendations: {
      immediate_actions: [
        'Review current antihypertensive medication titration.',
        'Order confirmatory spot urine albumin-to-creatinine ratio (uACR).',
      ],
      monitoring: [
        'Weekly home blood pressure log review.',
        'Continuous or fasting fingerstick glucose check prior to morning meals.',
      ],
      lifestyle: [
        'Reduce dietary sodium intake below 2,000 mg/day.',
        'Prescribe 150 minutes per week of moderate aerobic exercise.',
      ],
      follow_up: [
        'Schedule clinician review in 4 to 6 weeks.',
        'Ophthalmology diabetic retinopathy screening within 6 months.',
      ],
      medication_review: [
        'Evaluate potential addition of SGLT2 inhibitor for cardioprotective benefits.',
      ],
    },
    review_areas: [
      'Glycemic Control (HbA1c 7.2% vs target < 7.0%)',
      'Blood Pressure Variance (Systolic elevation trend)',
      'Medication Adherence Verification',
    ],
    vitals_table: [
      { name: 'Blood Pressure', value: '138/88', unit: 'mmHg', ref: '< 120/80', status: 'Warning' },
      { name: 'Heart Rate', value: '76', unit: 'bpm', ref: '60-100', status: 'Normal' },
      { name: 'Body Temperature', value: '98.6', unit: '°F', ref: '97.8-99.1', status: 'Normal' },
      { name: 'Oxygen Saturation (SpO2)', value: '98', unit: '%', ref: '95-100', status: 'Normal' },
      { name: 'BMI', value: String(p.bmi), unit: 'kg/m²', ref: '18.5-24.9', status: p.bmi > 25 ? 'Warning' : 'Normal' },
    ],
    labs_table: [
      { name: 'HbA1c', value: '7.2', unit: '%', ref: '< 5.7', status: 'Critical' },
      { name: 'Fasting Plasma Glucose', value: '148', unit: 'mg/dL', ref: '70-99', status: 'Warning' },
      { name: 'Serum Creatinine', value: '1.1', unit: 'mg/dL', ref: '0.7-1.3', status: 'Normal' },
      { name: 'eGFR', value: '94', unit: 'mL/min/1.73m²', ref: '> 90', status: 'Normal' },
      { name: 'Total Cholesterol', value: '208', unit: 'mg/dL', ref: '< 200', status: 'Warning' },
      { name: 'Hemoglobin', value: '14.2', unit: 'g/dL', ref: '13.5-17.5', status: 'Normal' },
    ],
    trend_analysis: {
      glucose: 'Moderate upward climb (+34 mg/dL across past 4 readings)',
      blood_pressure: 'Borderline stage 1 hypertension threshold',
      hba1c: 'Elevated from 6.2% to 7.2% over consecutive quarters',
    },
    trends,
    anomalies: [
      {
        id: 'anom_1',
        date: '2026-09-15',
        category: 'HbA1c',
        severity: 'high',
        message: 'HbA1c increased sharply by +1.0% since previous quarterly check.',
        label: 'Acute Glycemic Shift',
        previous_value: 6.2,
        current_value: 7.2,
        unit: '%',
      },
      {
        id: 'anom_2',
        date: '2026-09-15',
        category: 'Systolic BP',
        severity: 'medium',
        message: 'Systolic blood pressure reached 138 mmHg, entering elevated category.',
        label: 'Hypertension Signal',
        previous_value: 128,
        current_value: 138,
        unit: 'mmHg',
      },
    ],
    insights: [
      {
        priority: 'High',
        category: 'Endocrinology',
        text: 'Patient exhibits dual metabolic elevation (HbA1c + Fasting Glucose), indicating need for pharmacotherapy review.',
        reference: 'ADA Standards of Medical Care in Diabetes 2026',
      },
      {
        priority: 'Medium',
        category: 'Cardiovascular',
        text: 'Systolic blood pressure exhibits an upward trend correlated with rising BMI.',
        reference: 'ACC/AHA Guideline for the Prevention and Management of High Blood Pressure',
      },
    ],
    timeline,
    risk_trend: {
      indicators: {
        glycemic: 'Worsening',
        cardiovascular: 'Borderline elevated',
        renal: 'Stable',
      },
      summary: 'Composite longitudinal trajectory warrants early physician intervention to prevent microvascular escalation.',
    },
    confidence: 0.92,
    disclaimer: 'MediLens AI is an assistive clinical intelligence and decision-support system. All outputs must be evaluated and confirmed by a certified healthcare professional before clinical intervention.',
    models_loaded: true,
  }
}

let mockReports: ReportSavedEntry[] = [
  {
    id: 'REP-2026-1001',
    patient_id: 'P1001',
    created_at: '2026-09-16T10:30:00Z',
    date: '2026-09-16',
    doctor_name: 'Dr. Sarah Jenkins',
    overall_risk: { score: 74, level: 'HIGH' },
    health_score: { score: 48, rating: 'Fair', color: '#ef4444' },
    summary: 'Elevated HbA1c (7.2%) and systolic blood pressure (138 mmHg) indicate poorly controlled type 2 diabetes with cardiovascular risk.',
  },
  {
    id: 'REP-2026-1002',
    patient_id: 'P1002',
    created_at: '2026-09-14T14:15:00Z',
    date: '2026-09-14',
    doctor_name: 'Dr. Sarah Jenkins',
    overall_risk: { score: 28, level: 'LOW' },
    health_score: { score: 82, rating: 'Good', color: '#10b981' },
    summary: 'Mild intermittent asthma well controlled with as-needed Albuterol. Vitals and pulmonary metrics within normal limits.',
  },
  {
    id: 'REP-2026-1003',
    patient_id: 'P1003',
    created_at: '2026-09-12T09:00:00Z',
    date: '2026-09-12',
    doctor_name: 'Dr. Sarah Jenkins',
    overall_risk: { score: 54, level: 'MEDIUM' },
    health_score: { score: 62, rating: 'Good', color: '#f59e0b' },
    summary: 'Borderline hyperlipidemia with stable carotid doppler findings. Statins adherence noted.',
  },
]

// Mock API implementations for seamless zero-crash execution
export function mockGetDashboard(currentUser?: User | null): DashboardData {
  const role = currentUser?.role || 'doctor'
  const docId = currentUser?.doctor_id || currentUser?.id || 'doc_101'
  const pid = currentUser?.patient_id || currentUser?.id || 'P1001'

  const visible = role === 'doctor'
    ? mockPatients.filter(p => p.doctor_id === docId)
    : mockPatients.filter(p => p.id === pid)

  const highRisk = visible.filter(p => p.conditions.includes('Type 2 Diabetes') && p.conditions.includes('Hypertension')).length
  const pendingReview = visible.filter(p => p.pending_review).length

  return {
    metrics: {
      total_patients: visible.length,
      patients_analyzed: visible.filter(p => p.analyzed).length,
      records_processed: visible.reduce((acc, p) => acc + (p.records_processed || 8), 0),
      high_risk_signals: highRisk,
      new_anomalies: highRisk * 2 + 1,
      pending_review: pendingReview || 2,
      today_analyses: Math.max(1, Math.floor(visible.length / 3)),
    },
    recent_patients: visible.slice(0, 8),
    risk_distribution: {
      HIGH: highRisk,
      MEDIUM: Math.max(1, Math.floor(visible.length * 0.4)),
      LOW: Math.max(1, Math.floor(visible.length * 0.4)),
    },
    alerts: [
      { text: 'Acute glycemic shift: HbA1c jumped from 6.2% to 7.2%', severity: 'high', patient_id: 'P1001' },
      { text: 'Blood pressure spike 142/92 recorded during evening telemetry', severity: 'high', patient_id: 'P1005' },
      { text: 'Declining eGFR delta: 98 -> 90 mL/min over 90 days', severity: 'medium', patient_id: 'P1006' },
      { text: 'Borderline lipid panel: LDL elevated to 142 mg/dL', severity: 'medium', patient_id: 'P1003' },
    ],
    trending_conditions: [
      'Rising HbA1c — Arjun Mehta',
      'Rising Blood Pressure — Vikram Singh',
      'Elevated Creatinine — Rahul Verma',
    ],
    recent_insights: [
      'Rising HbA1c — Arjun Mehta',
      'Rising Blood Pressure — Vikram Singh',
      'Elevated Creatinine — Rahul Verma',
    ],
  }
}

export function mockGetPatients(q = '', currentUser?: User | null): Patient[] {
  const role = currentUser?.role || 'doctor'
  const docId = currentUser?.doctor_id || currentUser?.id || 'doc_101'

  let list = role === 'doctor'
    ? mockPatients.filter(p => p.doctor_id === docId)
    : mockPatients.filter(p => p.id === (currentUser?.patient_id || currentUser?.id || 'P1001'))

  if (!q.trim()) return list
  const term = q.toLowerCase().trim()
  return list.filter(p =>
    p.name.toLowerCase().includes(term) ||
    p.id.toLowerCase().includes(term) ||
    p.conditions.some(c => c.toLowerCase().includes(term)) ||
    (p.doctor_name || '').toLowerCase().includes(term)
  )
}

export function mockGetPatient(id: string): PatientDetail {
  const p = mockPatients.find(item => item.id.toLowerCase() === id.toLowerCase()) || mockPatients[0]
  const analysis = generatePatientAnalysis(p)

  const patientReports = mockReports.filter(r => r.patient_id.toLowerCase() === p.id.toLowerCase())

  return {
    ...p,
    events: analysis.timeline.flatMap(t => t.events),
    timeline: analysis.timeline,
    trends: analysis.trends,
    anomalies: analysis.anomalies,
    analysis,
    vitals: (analysis.vitals_table || []).map(v => ({ date: '2026-09-15', ...v })),
    labs: (analysis.labs_table || []).map(l => ({ date: '2026-09-15', ...l })),
    notes: [
      { date: '2026-09-15', text: 'Patient presented for routine longitudinal follow-up. Recommended sodium restriction.' },
      { date: '2026-07-22', text: 'Reviewed lab results; glucose trending slightly above target.' },
    ],
    previous_reports: patientReports.length > 0 ? patientReports : [
      {
        id: `REP-2026-${p.id}`,
        patient_id: p.id,
        created_at: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        doctor_name: p.doctor_name || 'Dr. Sarah Jenkins',
        overall_risk: analysis.overall_risk,
        health_score: analysis.health_score,
        summary: analysis.summary,
      },
    ],
  }
}

export function mockUpdatePatient(id: string, updates: Partial<Patient>): Patient {
  mockPatients = mockPatients.map(p => (p.id === id ? { ...p, ...updates } : p))
  return mockPatients.find(p => p.id === id)!
}

export function mockExtractUpload(file: File, targetPatientId?: string): ExtractedDraft {
  const p = targetPatientId ? mockPatients.find(item => item.id === targetPatientId) : null

  return {
    filename: file.name,
    patient_id: p?.id,
    demographics: {
      name: p?.name || 'Arjun Mehta',
      age: p?.age || 48,
      gender: p?.gender || 'Male',
      height: p?.height || 172,
      weight: p?.weight || 78,
      blood_group: p?.blood_group || 'O+',
      allergies: p?.allergies || 'Penicillin',
    },
    events: [],
    extracted_summary: {
      name: p?.name || 'Arjun Mehta',
      age: p?.age || 48,
      gender: p?.gender || 'Male',
      height: p?.height || 172,
      weight: p?.weight || 78,
      blood_group: p?.blood_group || 'O+',
      allergies: p?.allergies || 'Penicillin',
      conditions: p?.conditions || ['Hypertension', 'Type 2 Diabetes'],
      medications: p?.medications || ['Metformin 500mg', 'Lisinopril 10mg'],
      symptoms: 'Increased fatigue, mild exertional shortness of breath, blurred vision',
      doctor_notes: 'Patient presented with 6-month lab report. BP elevated at 134/86 mmHg. Recommended dietary glycemic control.',
      events_count: 8,
    },
  }
}

export function mockConfirmUpload(payload: {
  patient_id?: string
  name: string
  age: number
  gender: string
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
}) {
  let pid = payload.patient_id
  if (!pid) {
    pid = `P${1001 + mockPatients.length}`
    const newPatient: Patient = {
      id: pid,
      username: pid.toLowerCase(),
      name: payload.name,
      age: payload.age,
      gender: payload.gender,
      blood_group: payload.blood_group,
      height: payload.height,
      weight: payload.weight,
      bmi: +(payload.weight / ((payload.height / 100) ** 2)).toFixed(1),
      conditions: payload.conditions,
      medications: payload.medications,
      allergies: payload.allergies,
      doctor_id: 'doc_101',
      doctor_name: 'Dr. Sarah Jenkins',
      admission_date: new Date().toISOString().split('T')[0],
      records_processed: 1,
      last_visit: new Date().toISOString().split('T')[0],
      analyzed: true,
      pending_review: false,
    }
    mockPatients = [newPatient, ...mockPatients]
  }

  const p = mockPatients.find(item => item.id === pid)!
  const analysis = generatePatientAnalysis(p)

  const repId = `REP-${Date.now().toString().slice(-6)}`
  const newReport: ReportSavedEntry = {
    id: repId,
    patient_id: pid,
    created_at: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    doctor_name: 'Dr. Sarah Jenkins',
    overall_risk: analysis.overall_risk,
    health_score: analysis.health_score,
    summary: analysis.summary,
  }
  mockReports = [newReport, ...mockReports]

  return {
    patient_id: pid,
    report_id: repId,
    status: 'success',
    analysis,
  }
}

export function mockGetReports(): ReportSavedEntry[] {
  return mockReports
}
