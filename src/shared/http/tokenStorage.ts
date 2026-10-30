const KEY = 'aerolinea.accessToken'
let enMemoria: string | null = null

/** Único lugar que sabe dónde vive el token. */
export const tokenStorage = {
  get(): string | null {
    try {
      return window.localStorage.getItem(KEY)
    } catch {
      return enMemoria
    }
  },
  set(token: string): void {
    enMemoria = token
    try {
      window.localStorage.setItem(KEY, token)
    } catch {
      /* almacenamiento no disponible: queda en memoria */
    }
  },
  clear(): void {
    enMemoria = null
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      /* nada que limpiar */
    }
  },
}