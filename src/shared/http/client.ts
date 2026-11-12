import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { DetalleValidacion, RespuestaError } from '../types/api'
import { tokenStorage } from './tokenStorage'

export type ApiErrorKind =
  | 'RED'
  | 'TIMEOUT'
  | 'VALIDACION'
  | 'NO_AUTENTICADO'
  | 'SIN_PERMISO'
  | 'NO_ENCONTRADO'
  | 'CONFLICTO'
  | 'SERVIDOR'
  | 'DESCONOCIDO'

interface ApiErrorInit {
  kind: ApiErrorKind
  message?: string
  status?: number
  code?: string
  details?: unknown
}

export class ApiError extends Error {
  kind: ApiErrorKind
  status?: number
  code?: string
  details?: unknown

  userMessage: string

  fieldErrors: Record<string, string>

  constructor(init: ApiErrorInit) {
    super(init.message || 'Error de comunicación con el servicio')
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status
    this.code = init.code
    this.details = init.details
    this.fieldErrors = extraerCampos(init.details)
    this.userMessage = mensajeUsuario(init.kind, init.code, init.message)
  }
}

const MENSAJES_POR_CODIGO: Record<string, string> = {
  ASIENTO_OCUPADO: 'Ese asiento acaba de ser reservado por otra persona. Elige otro.',
  VUELO_SIN_DISPONIBILIDAD: 'Este vuelo ya no tiene asientos disponibles.',
  CAPACIDAD_MAXIMA_ALCANZADA: 'Este vuelo alcanzó su capacidad máxima.',
  RESERVA_COMPLETADA: 'Esta reservación ya fue completada y no se puede modificar.',
  RESERVA_DUPLICADA: 'Ya tienes una reservación activa para ese asiento.',
  TRANSICION_INVALIDA: 'Esta reservación ya no admite ese cambio (por ejemplo, ya está cancelada).',
  REGLA_DE_NEGOCIO: 'No pudimos realizar ese cambio. Actualiza la información e inténtalo de nuevo.',
  NO_AUTENTICADO: 'Correo o contraseña incorrectos.',
  DEMASIADOS_INTENTOS: 'Has intentado varias veces. Espera unos minutos antes de volver a intentarlo.',
  RESPUESTA_INVALIDA: 'No pudimos leer la información. Inténtalo de nuevo.',
  EMAIL_DUPLICADO: 'Ese correo ya está registrado. Inicia sesión.',
  REGISTRO_DUPLICADO: 'Ya existe un registro con esos datos.',
  REFERENCIA_INVALIDA: 'La operación depende de información que ya no existe.',
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  NO_ENCONTRADO: 'No encontramos lo que buscas.',
  RUTA_NO_ENCONTRADA: 'No encontramos lo que buscas.',
  ORIGEN_NO_PERMITIDO: 'El portal no está autorizado para conectarse con el servicio.',
}

const MENSAJES_POR_TIPO: Partial<Record<ApiErrorKind, string>> = {
  RED: 'No pudimos conectar con el servicio. Revisa tu conexión o inténtalo más tarde.',
  TIMEOUT: 'El servicio tardó demasiado en responder. Inténtalo de nuevo.',
  SERVIDOR: 'El servicio tuvo un problema. Inténtalo de nuevo en unos minutos.',
}

function mensajeUsuario(kind: ApiErrorKind, code?: string, servidor?: string): string {
  if (code && MENSAJES_POR_CODIGO[code]) return MENSAJES_POR_CODIGO[code]
  const porTipo = MENSAJES_POR_TIPO[kind]
  if (porTipo) return porTipo
  return kind === 'VALIDACION' && servidor ? 'Revisa los datos que ingresaste.' : 'No fue posible completar la solicitud. Inténtalo de nuevo.'
}

function extraerCampos(details: unknown): Record<string, string> {
  const campos: Record<string, string> = {}
  if (!Array.isArray(details)) return campos
  for (const item of details as Partial<DetalleValidacion>[]) {
    if (item?.campo && item.mensaje && !(item.campo in campos)) campos[item.campo] = item.mensaje
  }
  return campos
}

export function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'VALIDACION'
  if (status === 401) return 'NO_AUTENTICADO'
  if (status === 403) return 'SIN_PERMISO'
  if (status === 404) return 'NO_ENCONTRADO'
  if (status === 409) return 'CONFLICTO'
  if (status >= 500) return 'SERVIDOR'
  return 'DESCONOCIDO'
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    const { response } = error
    if (!response) {
      const timeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      return new ApiError({ kind: timeout ? 'TIMEOUT' : 'RED', code: error.code, message: error.message })
    }
    const cuerpo = response.data as Partial<RespuestaError> | undefined
    return new ApiError({
      kind: kindFromStatus(response.status),
      status: response.status,
      code: cuerpo?.error?.codigo,
      message: cuerpo?.error?.mensaje,
      details: cuerpo?.error?.detalles,
    })
  }

  return new ApiError({ kind: 'DESCONOCIDO', message: error instanceof Error ? error.message : undefined })
}

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean
    sentToken?: string | null
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.replace(/\/$/, ''),
  timeout: 12000,
  headers: { Accept: 'application/json' },
})

if (import.meta.env.VITE_USE_MOCKS === 'true') {
  http.defaults.adapter = async (config) => {
    const { demoRequest } = await import('../../features/demo/seed')
    await new Promise<void>((resolve, reject) => {
      if (config.signal?.aborted) {
        reject(new axios.CanceledError())
        return
      }
      const cancel = () => {
        window.clearTimeout(timer)
        reject(new axios.CanceledError())
      }
      const timer = window.setTimeout(() => {
        config.signal?.removeEventListener?.('abort', cancel)
        resolve()
      }, 350)
      config.signal?.addEventListener?.('abort', cancel, { once: true })
    })
    const url = new URL(config.url ?? '/', 'http://demo.local')
    for (const [key, value] of Object.entries(config.params ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
    const body: unknown = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    const result = demoRequest(config.method ?? 'get', url, body, String(config.headers.get('Authorization') ?? ''))
    const response = { data: result.body, status: result.status, statusText: '', headers: {}, config }
    if (result.status >= 400) throw new axios.AxiosError('Solicitud rechazada', 'ERR_BAD_RESPONSE', config, null, response)
    return response
  }
}

let unauthorizedHandler: ((error: ApiError) => void) | null = null

export function setUnauthorizedHandler(handler: (error: ApiError) => void): () => void {
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
  if (!config.baseURL && import.meta.env.VITE_USE_MOCKS !== 'true') {
    throw new ApiError({ kind: 'RED', code: 'API_NO_CONFIGURADA' })
  }
  return config
})

http.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isCancel(error)) return Promise.reject(error)
  const apiError = toApiError(error)
  const config = axios.isAxiosError(error) ? error.config : undefined
  if (apiError.kind === 'NO_AUTENTICADO' && !config?.skipAuth && config?.sentToken && config.sentToken === tokenStorage.get()) {
    tokenStorage.clear()
    unauthorizedHandler?.(apiError)
  }
  return Promise.reject(apiError)
})

export function unwrap<T>(response: AxiosResponse<unknown>): T {
  const body = response.data as { ok?: boolean; data?: T } | null
  if (body && typeof body === 'object' && body.ok === true && 'data' in body) return body.data as T
  throw new ApiError({ kind: 'DESCONOCIDO', status: response.status, code: 'RESPUESTA_INVALIDA' })
}

export async function requestData<T>(request: Promise<AxiosResponse<unknown>>): Promise<T> {
  return unwrap<T>(await request)
}

export function isAbortError(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof DOMException && error.name === 'AbortError')
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => requestData<T>(http.get(url, config)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => requestData<T>(http.post(url, body, config)),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => requestData<T>(http.patch(url, body, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) => requestData<T>(http.delete(url, config)),
}
