import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ApiError, toApiError } from './errors'
import { tokenStorage } from './tokenStorage'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** true en login/registro: no envía token ni dispara el cierre de sesión por 401. */
    skipAuth?: boolean
  }
}

// La dirección del servicio SOLO viene de VITE_API_URL.
const baseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

export const http = axios.create({
  baseURL,
  timeout: 12000,
  headers: { Accept: 'application/json' },
})

// ---- Reacción global al 401 (P2 registra qué hacer: cerrar sesión, avisar, redirigir) ----
type ManejadorNoAutorizado = (error: ApiError) => void
let manejadorNoAutorizado: ManejadorNoAutorizado | null = null

export function setUnauthorizedHandler(fn: ManejadorNoAutorizado): () => void {
  manejadorNoAutorizado = fn
  return () => {
    if (manejadorNoAutorizado === fn) manejadorNoAutorizado = null
  }
}

// ---- Credencial automática en cada petición ----
http.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token && !config.skipAuth) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

// ---- Errores: todo se traduce a ApiError; el 401 con sesión cierra sesión ----
http.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isCancel(error)) return Promise.reject(error) // cancelaciones (AbortController) pasan intactas

  const apiError = toApiError(error)
  const config = axios.isAxiosError(error) ? error.config : undefined

  // Solo si había credencial: un login incorrecto también responde 401 y no es "sesión vencida".
  if (apiError.kind === 'NO_AUTENTICADO' && !config?.skipAuth && tokenStorage.get()) {
    tokenStorage.clear() // las peticiones simultáneas que fallen después ya no repiten el aviso
    manejadorNoAutorizado?.(apiError)
  }
  return Promise.reject(apiError)
})

// ---- Interpretación ÚNICA de la envoltura { ok, data } / { ok, error } ----
export function unwrap<T>(response: AxiosResponse<unknown>): T {
  const cuerpo = response.data as { ok?: boolean; data?: T; error?: { codigo?: string; mensaje?: string } } | undefined
  if (cuerpo && typeof cuerpo === 'object' && cuerpo.ok === true && 'data' in cuerpo) return cuerpo.data as T
  throw new ApiError({
    kind: 'DESCONOCIDO',
    status: response.status,
    code: cuerpo?.error?.codigo ?? 'RESPUESTA_INVALIDA',
    message: cuerpo?.error?.mensaje ?? 'El servicio respondió con un formato inesperado.',
  })
}

/** Compatibilidad con vuelosApi: requestData(http.get(...)). */
export async function requestData<T>(request: Promise<AxiosResponse<unknown>>): Promise<T> {
  return unwrap<T>(await request)
}

/** Forma recomendada para las features: devuelve directamente `data`. */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => requestData<T>(http.get(url, config)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => requestData<T>(http.post(url, body, config)),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => requestData<T>(http.patch(url, body, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) => requestData<T>(http.delete(url, config)),
}

export { ApiError }
export type { ApiErrorKind } from './errors'