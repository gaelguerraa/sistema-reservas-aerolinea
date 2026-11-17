import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { RespuestaError, RespuestaOk } from '../types/api'
import { ApiError, toApiError } from './errors'
import { tokenStorage } from './tokenStorage'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Omitir credencial y reacción global a 401, por ejemplo en login. */
    skipAuth?: boolean
    sentToken?: string | null
  }
}

export { ApiError, isApiError, validationErrorsByField } from './errors'
export type { ApiErrorDetails } from './errors'

const baseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

export const http = axios.create({
  baseURL,
  timeout: 12000,
  headers: { Accept: 'application/json' },
})

type UnauthorizedHandler = (error: ApiError) => void
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler): () => void {
  unauthorizedHandler = handler
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null
  }
}

http.interceptors.request.use((config) => {
  const token = config.skipAuth ? null : tokenStorage.get()
  config.sentToken = token
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  else config.headers.delete('Authorization')
  if (!config.baseURL && !config.url?.startsWith('http')) {
    throw new ApiError({ status: 0, code: 'API_NO_CONFIGURADA', message: 'Configura VITE_API_URL para conectar con el servicio.' })
  }
  return config
})

http.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isCancel(error)) return Promise.reject(error)
  const apiError = toApiError(error)
  const config = axios.isAxiosError(error) ? error.config : undefined
  const sentToken = config?.sentToken
  if (apiError.status === 401 && !config?.skipAuth && sentToken && sentToken === tokenStorage.get()) {
    tokenStorage.clear()
    unauthorizedHandler?.(apiError)
  }
  return Promise.reject(apiError)
})

export function unwrap<T>(response: AxiosResponse<unknown>): T {
  const body = response.data as RespuestaOk<T> | RespuestaError | null
  if (body && typeof body === 'object' && body.ok === true && 'data' in body) return body.data
  if (body && typeof body === 'object' && body.ok === false && 'error' in body) {
    throw new ApiError({
      status: response.status,
      code: body.error.codigo,
      message: body.error.mensaje,
      details: body.error.detalles,
    })
  }
  throw new ApiError({ status: response.status, code: 'RESPUESTA_INVALIDA', message: 'El servicio respondió con un formato inesperado.' })
}

async function requestData<T>(request: Promise<AxiosResponse<unknown>>): Promise<T> {
  return unwrap<T>(await request)
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => requestData<T>(http.get<unknown>(url, config)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => requestData<T>(http.post<unknown>(url, body, config)),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => requestData<T>(http.patch<unknown>(url, body, config)),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => requestData<T>(http.put<unknown>(url, body, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) => requestData<T>(http.delete<unknown>(url, config)),
}
