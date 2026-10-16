import React, { createContext, useContext, useEffect, useState } from 'react'
import { getMe, loginApi, type User } from '../lib/api'

export const DEFAULT_DOCTOR: User = {
  id: 'doc_101',
  name: 'Dr. Sarah Jenkins',
  role: 'doctor',
  specialty: 'Cardiology & Internal Medicine',
  hospital: 'MediLens AI Medical Center',
  doctor_id: 'doc_101',
}

interface AuthContextType {
  user: User
  token: string | null
  isLoading: boolean
  login: (username: string, password: string, role: 'doctor' | 'patient') => Promise<void>
  logout: () => void
  quickLoginDoctor: (docId: string) => Promise<void>
  quickLoginPatient: (patientId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(() => {
    const savedRole = localStorage.getItem('medilens_role')
    const savedName = localStorage.getItem('medilens_name')
    const savedId = localStorage.getItem('medilens_uid')
    if (savedRole && savedName && savedId) {
      return {
        id: savedId,
        name: savedName,
        role: savedRole as 'doctor' | 'patient',
        doctor_id: savedRole === 'doctor' ? savedId : undefined,
        patient_id: savedRole === 'patient' ? savedId : undefined,
      }
    }
    return DEFAULT_DOCTOR
  })
  const [token, setToken] = useState<string | null>(localStorage.getItem('medilens_token'))
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        // Auto-login default Doctor for seamless experience
        await quickLoginDoctor('dr_jenkins')
        setIsLoading(false)
        return
      }
      try {
        const u = await getMe()
        if (u && u.name) {
          setUser(u)
          localStorage.setItem('medilens_role', u.role)
          localStorage.setItem('medilens_name', u.name)
          localStorage.setItem('medilens_uid', u.id)
        } else {
          setUser(DEFAULT_DOCTOR)
        }
      } catch (err) {
        console.warn('Auth verification fallback:', err)
        setUser(DEFAULT_DOCTOR)
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [token])

  const login = async (username: string, password: string, role: 'doctor' | 'patient') => {
    setIsLoading(true)
    try {
      const res = await loginApi(username, password, role)
      localStorage.setItem('medilens_token', res.access_token)
      localStorage.setItem('medilens_role', res.user.role)
      localStorage.setItem('medilens_name', res.user.name)
      localStorage.setItem('medilens_uid', res.user.id)
      setToken(res.access_token)
      setUser(res.user)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('medilens_token')
    localStorage.removeItem('medilens_role')
    localStorage.removeItem('medilens_name')
    localStorage.removeItem('medilens_uid')
    setToken(null)
    setUser(DEFAULT_DOCTOR)
  }

  const quickLoginDoctor = async (docUsername: string) => {
    setIsLoading(true)
    try {
      const res = await loginApi(docUsername, 'password123', 'doctor')
      localStorage.setItem('medilens_token', res.access_token)
      localStorage.setItem('medilens_role', res.user.role)
      localStorage.setItem('medilens_name', res.user.name)
      localStorage.setItem('medilens_uid', res.user.id)
      setToken(res.access_token)
      setUser(res.user)
    } catch (err) {
      console.warn('Quick login fallback:', err)
      const isRivera = docUsername.toLowerCase().includes('rivera')
      const fallbackDoc: User = isRivera
        ? {
            id: 'doc_102',
            name: 'Dr. Alex Rivera',
            role: 'doctor',
            specialty: 'Endocrinology & Primary Care',
            hospital: 'MediLens AI Medical Center',
            doctor_id: 'doc_102',
          }
        : DEFAULT_DOCTOR
      setUser(fallbackDoc)
    } finally {
      setIsLoading(false)
    }
  }

  const quickLoginPatient = async (patientId: string) => {
    setIsLoading(true)
    try {
      const res = await loginApi(patientId, 'password123', 'patient')
      localStorage.setItem('medilens_token', res.access_token)
      localStorage.setItem('medilens_role', res.user.role)
      localStorage.setItem('medilens_name', res.user.name)
      localStorage.setItem('medilens_uid', res.user.id)
      setToken(res.access_token)
      setUser(res.user)
    } catch (err) {
      console.warn('Quick patient login fallback:', err)
      const fallbackPat: User = {
        id: patientId || 'P1001',
        name: 'Arjun Mehta',
        role: 'patient',
        patient_id: patientId || 'P1001',
      }
      setUser(fallbackPat)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        quickLoginDoctor,
        quickLoginPatient,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
