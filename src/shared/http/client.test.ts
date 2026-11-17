import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, http, setUnauthorizedHandler } from './client'
import { tokenStorage } from './tokenStorage'

const originalAdapter = http.defaults.adapter
const originalBaseURL = http.defaults.baseURL

function response(config: Parameters<AxiosAdapter>[0], status: number, data: unknown): AxiosResponse<unknown> {
  return { config, data, status, statusText: 'OK', headers: new AxiosHeaders() }
}

describe('cliente HTTP', () => {
  beforeEach(() => {
    tokenStorage.clear()
    http.defaults.baseURL = 'http://api.test'
    http.defaults.adapter = undefined
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    http.defaults.baseURL = originalBaseURL
    tokenStorage.clear()
  })

  it('adjunta Bearer y devuelve data sin la envoltura', async () => {
    tokenStorage.set('token-admin')
    let authorization: unknown
    http.defaults.adapter = async (config) => {
      authorization = config.headers.get('Authorization')
      return response(config, 200, { ok: true, data: { id: 'V100' } })
    }
    await expect(api.get<{ id: string }>('/vuelos/V100')).resolves.toEqual({ id: 'V100' })
    expect(authorization).toBe('Bearer token-admin')
  })

  it('normaliza el error del servicio conservando mensaje, código y detalles', async () => {
    http.defaults.adapter = async (config) => {
      const result = response(config, 400, { ok: false, error: { codigo: 'VALIDACION_FALLIDA', mensaje: 'El origen no es válido.', detalles: [{ donde: 'body', campo: 'origen', mensaje: 'Campo requerido.' }] } })
      throw new AxiosError('Bad Request', 'ERR_BAD_REQUEST', config, undefined, result)
    }
    await expect(api.post('/vuelos', {})).rejects.toMatchObject({
      name: 'ApiError', status: 400, code: 'VALIDACION_FALLIDA', message: 'El origen no es válido.',
      details: [{ donde: 'body', campo: 'origen', mensaje: 'Campo requerido.' }],
    })
  })

  it('reacciona una sola vez al 401 con credencial y omite la reacción en login', async () => {
    const handler = vi.fn()
    const unregister = setUnauthorizedHandler(handler)
    tokenStorage.set('token-expirado')
    http.defaults.adapter = async (config) => {
      const result = response(config, 401, { ok: false, error: { codigo: 'NO_AUTENTICADO', mensaje: 'La credencial expiró.' } })
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, result)
    }
    await expect(api.get('/auth/me')).rejects.toBeInstanceOf(ApiError)
    await expect(api.get('/auth/me')).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(tokenStorage.get()).toBeNull()

    tokenStorage.set('token-otro')
    await expect(api.post('/auth/login', { email: 'x', password: 'y' }, { skipAuth: true })).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledTimes(1)
    unregister()
  })
})
