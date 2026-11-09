import { createContext } from 'react'
import type { LoginBody, Usuario } from '../../shared/types/api'

export interface AuthSession {
  user: Usuario
  token: string
}

export interface AuthContextValue {
  user: Usuario | null
  token: string | null
  isAuthenticated: boolean
  notice: string | null
  login: (credentials: LoginBody) => Promise<void>
  logout: () => void
  dismissNotice: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
