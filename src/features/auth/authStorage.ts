import type { Usuario } from '../../shared/types/api'

const KEY = 'aerolinea.usuario'
let enMemoria: Usuario | null = null

function isUsuario(value: unknown): value is Usuario {
  if (!value || typeof value !== 'object') return false
  const usuario = value as Partial<Usuario>
  return typeof usuario.id === 'string'
    && typeof usuario.email === 'string'
    && (usuario.rol === 'ADMIN' || usuario.rol === 'CLIENTE')
    && (usuario.pasajeroId === null || typeof usuario.pasajeroId === 'string')
}

export const authStorage = {
  getUser(): Usuario | null {
    try {
      const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? 'null')
      if (isUsuario(value)) {
        enMemoria = value
        return value
      }
      return null
    } catch {
      return enMemoria
    }
  },
  setUser(user: Usuario): void {
    enMemoria = user
    try {
      window.localStorage.setItem(KEY, JSON.stringify(user))
    } catch {
      // La sesión permanece disponible en memoria hasta que se recargue la página.
    }
  },
  clear(): void {
    enMemoria = null
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      // No hay almacenamiento persistente que limpiar.
    }
  },
}
