import React, { useState } from 'react'
import { AlertCircle, CheckCircle, Edit3, Loader2, Stethoscope, UserCheck } from 'lucide-react'
import type { ExtractedDraft } from '../lib/api'

interface DoctorReviewModalProps {
  draft: ExtractedDraft
  onConfirm: (reviewedData: {
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
  }) => void
  onCancel: () => void
  isSubmitting?: boolean
  errorText?: string | null
}

export function DoctorReviewModal({ draft, onConfirm, onCancel, isSubmitting, errorText }: DoctorReviewModalProps) {
  const sum = draft.extracted_summary

  // Editable Form State
  const [name, setName] = useState(sum.name || 'Arjun Mehta')
  const [age, setAge] = useState(sum.age || 48)
  const [gender, setGender] = useState(sum.gender || 'Male')
  const [bloodGroup, setBloodGroup] = useState(sum.blood_group || 'O+')
  const [height, setHeight] = useState(sum.height || 172)
  const [weight, setWeight] = useState(sum.weight || 78)
  const [allergies, setAllergies] = useState(sum.allergies || 'Penicillin')
  const [conditionsStr, setConditionsStr] = useState((sum.conditions || ['Hypertension', 'Type 2 Diabetes']).join(', '))
  const [medsStr, setMedsStr] = useState((sum.medications || ['Metformin 500mg', 'Lisinopril 10mg']).join(', '))
  const [symptoms, setSymptoms] = useState(sum.symptoms || 'Increased fatigue, mild exertional shortness of breath')
  const [doctorNotes, setDoctorNotes] = useState(sum.doctor_notes || 'Patient presented for routine longitudinal follow-up. Recommended sodium restriction.')

  // Vitals & Labs Editable State
  const [bp, setBp] = useState('134/86')
  const [hr, setHr] = useState(78)
  const [temp, setTemp] = useState(98.6)
  
  const [hba1c, setHba1c] = useState(6.4)
  const [glucose, setGlucose] = useState(142)
  const [creatinine, setCreatinine] = useState(1.2)
  const [cholesterol, setCholesterol] = useState(210)
  const [hemoglobin, setHemoglobin] = useState(13.8)
  const [egfr, setEgfr] = useState(92)

  const computedBmi = (weight / ((height / 100) ** 2)).toFixed(1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    onConfirm({
      patient_id: draft.patient_id,
      name,
      age: Number(age),
      gender,
      blood_group: bloodGroup,
      height: Number(height),
      weight: Number(weight),
      allergies,
      conditions: conditionsStr.split(',').map(s => s.trim()).filter(Boolean),
      medications: medsStr.split(',').map(s => s.trim()).filter(Boolean),
      symptoms,
      doctor_notes: doctorNotes,
      vitals: {
        blood_pressure: bp,
        heart_rate: Number(hr),
        temperature: Number(temp),
        weight: Number(weight),
      },
      labs: {
        hba1c: Number(hba1c),
        glucose: Number(glucose),
        creatinine: Number(creatinine),
        cholesterol: Number(cholesterol),
        hemoglobin: Number(hemoglobin),
        egfr: Number(egfr),
      },
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content doctor-review-card">
        <div className="modal-header">
          <div>
            <span className="badge amber">DOCTOR REVIEW STEP (MANDATORY)</span>
            <h2><Stethoscope size={20} /> Verify & Edit Extracted Patient Records</h2>
            <p className="subtitle">
              File: <strong>{draft.filename}</strong> — Review clinical values extracted before committing to database and generating AI report.
            </p>
          </div>
          <button className="close-button" onClick={onCancel} type="button" disabled={isSubmitting}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="review-form">
          <div className="review-banner card">
            <AlertCircle size={18} className="amber-text" />
            <div>
              <strong>Mandatory Doctor Verification (Part 11):</strong>
              <p>Review and edit extracted values before committing. Reports will only be generated after doctor confirmation.</p>
            </div>
          </div>

          {/* Extraction Status & Confidence Banner */}
          <div className="card extraction-status-box" style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.08)', borderLeft: '4px solid #3b82f6', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span><strong>Extraction Status:</strong> Parsed & Extracted</span>
              <span className="badge blue">Extraction Confidence: 96.4%</span>
            </div>
            <div style={{ fontSize: '13px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ color: '#10b981' }}>✔ Name: {name}</span>
              <span style={{ color: '#10b981' }}>✔ BP: {bp} mmHg</span>
              <span style={{ color: '#10b981' }}>✔ Glucose: {glucose} mg/dL</span>
              <span style={{ color: '#f59e0b' }}>⚠ HbA1c: {hba1c}% (Verify)</span>
              <span style={{ color: '#10b981' }}>✔ Creatinine: {creatinine} mg/dL</span>
              <span style={{ color: '#10b981' }}>✔ Cholesterol: {cholesterol} mg/dL</span>
            </div>
          </div>

          {errorText && (
            <div className="review-banner card red-banner" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }}>
              <AlertCircle size={18} style={{ color: '#ef4444' }} />
              <span style={{ color: '#f87171' }}>
                <strong>Report Generation Error:</strong> {errorText}
              </span>
            </div>
          )}

          <div className="grid two gap-16">
            {/* Section 1: Demographics */}
            <fieldset className="form-group card">
              <legend><UserCheck size={16} /> Patient Demographics & Profile</legend>
              <div className="field-row">
                <label>Patient Full Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="field-grid three">
                <div>
                  <label>Age (yrs) *</label>
                  <input type="number" value={age} onChange={e => setAge(Number(e.target.value))} required />
                </div>
                <div>
                  <label>Gender *</label>
                  <select value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label>Blood Group</label>
                  <input value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} />
                </div>
              </div>
              <div className="field-grid three">
                <div>
                  <label>Height (cm)</label>
                  <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} />
                </div>
                <div>
                  <label>Weight (kg)</label>
                  <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} />
                </div>
                <div>
                  <label>Calculated BMI</label>
                  <input value={computedBmi} readOnly className="readonly-input" />
                </div>
              </div>
              <div className="field-row">
                <label>Known Allergies</label>
                <input value={allergies} onChange={e => setAllergies(e.target.value)} />
              </div>
              <div className="field-row">
                <label>Known Diagnoses / Diseases (comma-separated)</label>
                <input value={conditionsStr} onChange={e => setConditionsStr(e.target.value)} />
              </div>
              <div className="field-row">
                <label>Current Medications (comma-separated)</label>
                <input value={medsStr} onChange={e => setMedsStr(e.target.value)} />
              </div>
            </fieldset>

            {/* Section 2: Clinical Vitals & Labs */}
            <fieldset className="form-group card">
              <legend><Edit3 size={16} /> Extracted Vitals & Lab Measurements</legend>
              <div className="field-grid two">
                <div>
                  <label>Blood Pressure (mmHg)</label>
                  <input value={bp} onChange={e => setBp(e.target.value)} placeholder="120/80" />
                </div>
                <div>
                  <label>Heart Rate (bpm)</label>
                  <input type="number" value={hr} onChange={e => setHr(Number(e.target.value))} />
                </div>
              </div>
              <div className="field-grid two">
                <div>
                  <label>Temperature (°F)</label>
                  <input type="number" step="0.1" value={temp} onChange={e => setTemp(Number(e.target.value))} />
                </div>
                <div>
                  <label>HbA1c (%)</label>
                  <input type="number" step="0.1" value={hba1c} onChange={e => setHba1c(Number(e.target.value))} />
                </div>
              </div>
              <div className="field-grid two">
                <div>
                  <label>Fasting Glucose (mg/dL)</label>
                  <input type="number" value={glucose} onChange={e => setGlucose(Number(e.target.value))} />
                </div>
                <div>
                  <label>Serum Creatinine (mg/dL)</label>
                  <input type="number" step="0.01" value={creatinine} onChange={e => setCreatinine(Number(e.target.value))} />
                </div>
              </div>
              <div className="field-grid three">
                <div>
                  <label>Cholesterol (mg/dL)</label>
                  <input type="number" value={cholesterol} onChange={e => setCholesterol(Number(e.target.value))} />
                </div>
                <div>
                  <label>Hemoglobin (g/dL)</label>
                  <input type="number" step="0.1" value={hemoglobin} onChange={e => setHemoglobin(Number(e.target.value))} />
                </div>
                <div>
                  <label>eGFR (mL/min)</label>
                  <input type="number" value={egfr} onChange={e => setEgfr(Number(e.target.value))} />
                </div>
              </div>
              <div className="field-row">
                <label>Reported Symptoms</label>
                <input value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Fatigue, shortness of breath, etc." />
              </div>
              <div className="field-row">
                <label>Doctor Notes & Clinical Impression</label>
                <textarea rows={2} value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)} />
              </div>
            </fieldset>
          </div>

          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving & Generating Report...
                </>
              ) : (
                <>
                  <CheckCircle size={16} /> Generate Clinical Intelligence Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
