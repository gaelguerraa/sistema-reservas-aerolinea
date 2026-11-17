import type { Usuario } from '../../shared/types/api'
import { tokenStorage } from '../../shared/http/tokenStorage'

const USER_KEY = 'aerolinea.admin.usuario'
let memoryUser: Usuario | null = null

function isUsuario(value: unknown): value is Usuario {
  if (!value || typeof value !== 'object') return false
  const user = value as Partial<Usuario>
  return typeof user.id === 'string'
    && typeof user.email === 'string'
    && (user.rol === 'ADMIN' || user.rol === 'CLIENTE')
    && (user.pasajeroId === null || typeof user.pasajeroId === 'string')
}

export const authStorage = {
  getUser(): Usuario | null {
    try {
      const user: unknown = JSON.parse(window.localStorage.getItem(USER_KEY) ?? 'null')
      if (isUsuario(user)) memoryUser = user
      return isUsuario(user) ? user : null
    } catch {
      return memoryUser
    }
  },
  setUser(user: Usuario): void {
    memoryUser = user
    try {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user))
    } catch {
      // Sesión disponible en memoria hasta que se recargue la página.
    }
  },
  clear(): void {
    memoryUser = null
    tokenStorage.clear()
    try {
      window.localStorage.removeItem(USER_KEY)
    } catch {
      // No hay persistencia disponible que limpiar.
    }
  },
}

export const USER_STORAGE_KEY = USER_KEY
