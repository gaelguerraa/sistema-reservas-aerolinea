import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authApi } from './authApi'
import { authStorage } from './authStorage'
import { AuthContext, type AuthContextValue, type AuthSession } from './authContext'
import { setUnauthorizedHandler } from '../../shared/http/client'
import { tokenStorage } from '../../shared/http/tokenStorage'
import type { LoginBody } from '../../shared/types/api'

function restoreSession(): AuthSession | null {
  const token = tokenStorage.get()
  const user = authStorage.getUser()
  if (token && user) return { token, user }

  tokenStorage.clear()
  authStorage.clear()
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState<AuthSession | null>(restoreSession)
  const [notice, setNotice] = useState<string | null>(null)

  const logout = useCallback(() => {
    authApi.logout()
    authStorage.clear()
    setSession(null)
  }, [])

  const login = useCallback(async (credentials: LoginBody) => {
    const result = await authApi.login(credentials)
    authStorage.setUser(result.usuario)
    setSession({ user: result.usuario, token: result.accessToken })
  }, [])

  const dismissNotice = useCallback(() => setNotice(null), [])

  useEffect(() => {
    const unregister = setUnauthorizedHandler(() => {
      const requestedPath = `${location.pathname}${location.search}${location.hash}`
      const redirect = location.pathname === '/login' ? '/vuelos' : requestedPath
      logout()
      setNotice('Tu sesión ha vencido. Inicia sesión nuevamente para continuar.')
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true })
    })
    return unregister
  }, [location.hash, location.pathname, location.search, logout, navigate])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(dismissNotice, 8000)
    return () => window.clearTimeout(timer)
  }, [dismissNotice, notice])

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: Boolean(session),
    notice,
    login,
    logout,
    dismissNotice,
  }), [dismissNotice, login, logout, notice, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
