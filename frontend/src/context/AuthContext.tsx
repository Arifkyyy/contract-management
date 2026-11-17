import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from '../lib/api'
import type { Admin } from '../lib/types'

interface AuthCtx {
  admin: Admin | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  setAdmin: (a: Admin) => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setAdmin(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await api.get<Admin>('/api/auth/me')
      setAdmin(data)
    } catch {
      tokenStore.clear()
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    tokenStore.set(data.access_token)
    setAdmin(data.admin)
  }

  const logout = () => {
    tokenStore.clear()
    setAdmin(null)
  }

  return <Ctx.Provider value={{ admin, loading, login, logout, refresh, setAdmin }}>{children}</Ctx.Provider>
}

export const useAuth = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth harus di dalam AuthProvider')
  return c
}
