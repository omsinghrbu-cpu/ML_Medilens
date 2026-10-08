import React, { createContext, useContext, useEffect, useState } from 'react'
import { getMe, loginApi, type User } from '../lib/api'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string, role: 'doctor' | 'patient') => Promise<void>
  logout: () => void
  quickLoginDoctor: (docId: string) => Promise<void>
  quickLoginPatient: (patientId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('medilens_token'))
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        // Auto-login default Doctor for seamless experience
        await quickLoginDoctor('dr_jenkins')
        return
      }
      try {
        const u = await getMe()
        setUser(u)
      } catch (err) {
        console.error('Auth verification failed:', err)
        localStorage.removeItem('medilens_token')
        setToken(null)
        setUser(null)
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
      setToken(res.access_token)
      setUser(res.user)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('medilens_token')
    setToken(null)
    setUser(null)
  }

  const quickLoginDoctor = async (docUsername: string) => {
    setIsLoading(true)
    try {
      const res = await loginApi(docUsername, 'password123', 'doctor')
      localStorage.setItem('medilens_token', res.access_token)
      setToken(res.access_token)
      setUser(res.user)
    } catch (err) {
      console.error('Quick login failed', err)
    } finally {
      setIsLoading(false)
    }
  }

  const quickLoginPatient = async (patientId: string) => {
    setIsLoading(true)
    try {
      const res = await loginApi(patientId, 'password123', 'patient')
      localStorage.setItem('medilens_token', res.access_token)
      setToken(res.access_token)
      setUser(res.user)
    } catch (err) {
      console.error('Quick patient login failed', err)
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
