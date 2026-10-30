import axios from 'axios'

/** Punto de integración P1: reemplazable por el cliente HTTP compartido del equipo. */
const baseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
export const http = axios.create({ baseURL, timeout: 12000, headers: { Accept: 'application/json' } })

export type ApiError = Error & { status?: number; code?: string }

/** La envoltura uniforme del servicio se interpreta únicamente aquí. */
export async function requestData<T>(request: Promise<{ data: unknown }>): Promise<T> {
  try {
    const response = await request
    const body = response.data as { ok?: boolean; data?: T; error?: { codigo?: string; mensaje?: string } }
    if (body?.ok !== true) {
      const error = new Error(body?.error?.mensaje || 'No fue posible completar la solicitud.') as ApiError
      error.code = body?.error?.codigo
      throw error
    }
    return body.data as T
  } catch (cause) {
    if (axios.isAxiosError(cause)) {
      const body = cause.response?.data as { error?: { codigo?: string; mensaje?: string } } | undefined
      const error = new Error(body?.error?.mensaje || cause.message || 'No se pudo conectar.') as ApiError
      error.status = cause.response?.status
      error.code = body?.error?.codigo
      throw error
    }
    throw cause
  }
}
