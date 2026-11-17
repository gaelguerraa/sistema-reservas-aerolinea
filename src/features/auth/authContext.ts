import { createContext } from 'react'
import type { LoginBody, Rol, Usuario } from '../../shared/types/api'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  user: Usuario | null
  role: Rol | null
  token: string | null
  status: AuthStatus
  notice: string | null
  login: (credentials: LoginBody) => Promise<void>
  logout: (notice?: string) => void
  clearNotice: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
