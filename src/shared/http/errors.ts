import axios from 'axios'
import type { RespuestaError } from '../types/api'

export type ApiErrorDetails = unknown

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorDetails
  readonly isNetworkError: boolean

  constructor(input: { status: number; code: string; message: string; details?: unknown; isNetworkError?: boolean }) {
    super(input.message)
    this.name = 'ApiError'
    this.status = input.status
    this.code = input.code
    this.details = input.details
    this.isNetworkError = input.isNetworkError ?? false
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function validationErrorsByField(details: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (!Array.isArray(details)) return result
  for (const detail of details) {
    if (detail && typeof detail === 'object') {
      const candidate = detail as { campo?: unknown; mensaje?: unknown }
      if (typeof candidate.campo === 'string' && candidate.campo && typeof candidate.mensaje === 'string') {
        result[candidate.campo] ??= candidate.mensaje
      }
    }
  }
  return result
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error
  if (axios.isAxiosError<RespuestaError>(error)) {
    const payload = error.response?.data
    const serviceError = payload && typeof payload === 'object' && 'error' in payload ? payload.error : undefined
    if (error.response) {
      return new ApiError({
        status: error.response.status,
        code: serviceError?.codigo ?? 'ERROR_HTTP',
        message: serviceError?.mensaje ?? 'El servicio respondió con un error sin mensaje.',
        details: serviceError?.detalles,
      })
    }
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
    return new ApiError({
      status: 0,
      code: timedOut ? 'TIMEOUT' : 'ERROR_RED',
      message: timedOut ? 'El servicio tardó demasiado en responder.' : 'No se pudo conectar con el servicio.',
      isNetworkError: true,
    })
  }
  return new ApiError({
    status: 0,
    code: 'ERROR_DESCONOCIDO',
    message: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
  })
}
