const TOKEN_KEY = 'aerolinea.admin.accessToken'
let memoryToken: string | null = null

// SUPUESTO: se replica localStorage del storefront para conservar sesión entre recargas.
export const tokenStorage = {
  get(): string | null {
    try {
      const value = window.localStorage.getItem(TOKEN_KEY)
      if (value) memoryToken = value
      return value ?? memoryToken
    } catch {
      return memoryToken
    }
  },
  set(token: string): void {
    memoryToken = token
    try {
      window.localStorage.setItem(TOKEN_KEY, token)
    } catch {
      // Si el navegador bloquea el almacenamiento, la sesión vive en memoria.
    }
  },
  clear(): void {
    memoryToken = null
    try {
      window.localStorage.removeItem(TOKEN_KEY)
    } catch {
      // No hay persistencia disponible que limpiar.
    }
  },
}

export const TOKEN_STORAGE_KEY = TOKEN_KEY
