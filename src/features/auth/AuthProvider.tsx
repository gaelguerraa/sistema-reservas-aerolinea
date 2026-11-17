import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, setUnauthorizedHandler } from '../../shared/http/client'
import { tokenStorage } from '../../shared/http/tokenStorage'
import type { LoginBody, Usuario } from '../../shared/types/api'
import { authApi } from './authApi'
import { authStorage } from './authStorage'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext'

interface AuthState {
  status: AuthStatus
  user: Usuario | null
  token: string | null
  notice: string | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [state, setState] = useState<AuthState>(() => {
    const hasStoredSession = Boolean(authStorage.getUser() && tokenStorage.get())
    if (hasStoredSession) return { status: 'loading', user: null, token: null, notice: null }
    authStorage.clear()
    return { status: 'anonymous', user: null, token: null, notice: null }
  })

  const logout = useCallback((notice?: string) => {
    authStorage.clear()
    setState({ status: 'anonymous', user: null, token: null, notice: notice ?? null })
    navigate('/login', { replace: true })
  }, [navigate])

  const clearNotice = useCallback(() => {
    setState((current) => ({ ...current, notice: null }))
  }, [])

  const login = useCallback(async (credentials: LoginBody) => {
    const result = await authApi.login(credentials)
    if (result.usuario.rol !== 'ADMIN') {
      authStorage.clear()
      setState({ status: 'anonymous', user: null, token: null, notice: 'Acceso denegado: esta cuenta no tiene el rol autorizado para el panel administrativo.' })
      throw new ApiError({ status: 403, code: 'SIN_PERMISO', message: 'Esta cuenta no tiene el rol autorizado para el panel administrativo.' })
    }
    authStorage.setUser(result.usuario)
    tokenStorage.set(result.accessToken)
    setState({ status: 'authenticated', user: result.usuario, token: result.accessToken, notice: null })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const token = authStorage.getUser() && tokenStorage.get()
    if (!token) {
      authStorage.clear()
      return () => controller.abort()
    }

    authApi.me(controller.signal).then((user) => {
      if (controller.signal.aborted) return
      if (user.rol !== 'ADMIN') {
        logout('Acceso denegado: esta cuenta no tiene el rol autorizado para el panel administrativo.')
        return
      }
      setState({ status: 'authenticated', user, token, notice: null })
      authStorage.setUser(user)
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) return
      setState({ status: 'anonymous', user: null, token: null, notice: error instanceof Error ? error.message : 'No se pudo restaurar la sesión.' })
      authStorage.clear()
    })
    return () => controller.abort()
  }, [logout])

  useEffect(() => setUnauthorizedHandler(() => logout('Tu sesión venció. Inicia sesión nuevamente.')), [logout])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === null || event.key.startsWith('aerolinea.admin.')) {
        const user = authStorage.getUser()
        if (!user) logout('La sesión se cerró en otra pestaña.')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [logout])

  const value = useMemo<AuthContextValue>(() => ({
    user: state.user,
    role: state.user?.rol ?? null,
    token: state.token,
    status: state.status,
    notice: state.notice,
    login,
    logout,
    clearNotice,
  }), [clearNotice, login, logout, state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
