import axios from 'axios'
import { requestData, type ApiError, http } from '../../shared/http/client'
import { getMockAsientos, getMockVuelo, getMockVuelos } from './mocks'
import type { Asiento, Vuelo, VueloDetalle } from './types'

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

function mockErrorEnabled(): boolean {
  return new URLSearchParams(window.location.search).get('mockError') === '1'
}

function wait(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, 600 + Math.random() * 600)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(new DOMException('Solicitud cancelada', 'AbortError'))
    }, { once: true })
  })
}

async function mock<T>(data: T | undefined, signal?: AbortSignal): Promise<T> {
  await wait(signal)
  if (mockErrorEnabled()) {
    const error = new Error('Servicio no disponible') as ApiError
    error.status = 503
    throw error
  }
  if (data === undefined) {
    const error = new Error('Recurso no encontrado') as ApiError
    error.status = 404
    throw error
  }
  return data
}

export const vuelosApi = {
  list(signal?: AbortSignal): Promise<Vuelo[]> {
    if (useMocks) return mock(getMockVuelos(), signal)
    // Supuesto pendiente: el backend actual no publica GET /vuelos.
    return requestData<Vuelo[]>(http.get('/vuelos', { signal }))
  },
  get(id: string, signal?: AbortSignal): Promise<VueloDetalle> {
    if (useMocks) return mock(getMockVuelo(id), signal)
    return requestData<VueloDetalle>(http.get(`/vuelos/${encodeURIComponent(id)}`, { signal }))
  },
  seats(id: string, signal?: AbortSignal): Promise<Asiento[]> {
    if (useMocks) return mock(getMockAsientos(id), signal)
    return requestData<Asiento[]>(http.get(`/vuelos/${encodeURIComponent(id)}/asientos`, { signal }))
  },
}

export function isAbortError(error: unknown): boolean {
  return (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') || (error instanceof DOMException && error.name === 'AbortError')
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return (error as ApiError)?.status
}
