import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, http, setUnauthorizedHandler } from './client'
import { ApiError } from './errors'
import { tokenStorage } from './tokenStorage'

function responder(status: number, data: unknown) {
  http.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const response = { data, status, statusText: '', headers: {}, config }
    if (status >= 200 && status < 300) return response
    throw new AxiosError('fallo', 'ERR_BAD_REQUEST', config, null, response)
  }
}

describe('cliente HTTP', () => {
  beforeEach(() => tokenStorage.clear())

  it('desenvuelve { ok, data }', async () => {
    responder(200, { ok: true, data: { hola: 1 } })
    expect(await api.get('/x')).toEqual({ hola: 1 })
  })

  it('traduce una regla de negocio (409) a lenguaje del usuario', async () => {
    responder(409, { ok: false, error: { codigo: 'ASIENTO_OCUPADO', mensaje: 'técnico' } })
    const error = (await api.post('/reservas', {}).catch((e) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.kind).toBe('CONFLICTO')
    expect(error.userMessage).toContain('Elige otro')
  })

  it('expone errores por campo en 400', async () => {
    responder(400, {
      ok: false,
      error: { codigo: 'VALIDACION_FALLIDA', mensaje: 'x', detalles: [{ donde: 'body', campo: 'email', mensaje: 'Correo inválido' }] },
    })
    const error = (await api.post('/auth/login', {}, { skipAuth: true }).catch((e) => e)) as ApiError
    expect(error.fieldErrors.email).toBe('Correo inválido')
  })

  it('401 con sesión: limpia token y avisa una vez', async () => {
    tokenStorage.set('abc')
    const manejador = vi.fn()
    const quitar = setUnauthorizedHandler(manejador)
    responder(401, { ok: false, error: { codigo: 'NO_AUTENTICADO', mensaje: 'venció' } })
    await api.get('/auth/me').catch(() => undefined)
    expect(tokenStorage.get()).toBeNull()
    expect(manejador).toHaveBeenCalledTimes(1)
    quitar()
  })

  it('401 en login (skipAuth) no cierra sesión', async () => {
    tokenStorage.set('abc')
    const manejador = vi.fn()
    const quitar = setUnauthorizedHandler(manejador)
    responder(401, { ok: false, error: { codigo: 'NO_AUTENTICADO', mensaje: 'Correo o contraseña incorrectos.' } })
    const error = (await api.post('/auth/login', {}, { skipAuth: true }).catch((e) => e)) as ApiError
    expect(manejador).not.toHaveBeenCalled()
    expect(error.userMessage).toBe('Correo o contraseña incorrectos.')
    quitar()
  })

  it('servicio apagado: error de red entendible', async () => {
    http.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config)
    }
    const error = (await api.get('/vuelos/V1').catch((e) => e)) as ApiError
    expect(error.kind).toBe('RED')
    expect(error.userMessage).toContain('No pudimos conectar')
  })

  it('envía el token automáticamente y lo omite en login', async () => {
    tokenStorage.set('credencial-prueba')
    const headers: unknown[] = []
    http.defaults.adapter = async (config) => {
      headers.push(config.headers.get('Authorization'))
      return { data: { ok: true, data: [] }, status: 200, statusText: '', headers: {}, config }
    }
    await api.get('/reservas')
    await api.post('/auth/login', {}, { skipAuth: true })
    expect(headers).toEqual(['Bearer credencial-prueba', undefined])
  })

  it('una respuesta tardía de la sesión anterior no cierra la nueva', async () => {
    tokenStorage.set('sesion-anterior')
    const handler = vi.fn()
    const remove = setUnauthorizedHandler(handler)
    http.defaults.adapter = async (config) => {
      tokenStorage.set('sesion-nueva')
      const response = { data: { ok: false, error: { codigo: 'NO_AUTENTICADO' } }, status: 401, statusText: '', headers: {}, config }
      throw new AxiosError('fallo', 'ERR_BAD_REQUEST', config, null, response)
    }
    await api.get('/reservas').catch(() => undefined)
    expect(tokenStorage.get()).toBe('sesion-nueva')
    expect(handler).not.toHaveBeenCalled()
    remove()
  })

  it('rechaza envolturas inválidas y oculta mensajes técnicos desconocidos', async () => {
    responder(200, { vuelos: [] })
    await expect(api.get('/vuelos')).rejects.toMatchObject({ code: 'RESPUESTA_INVALIDA' })
    responder(409, { ok: false, error: { codigo: 'CODIGO_NUEVO', mensaje: 'Prisma SQL stacktrace interno' } })
    const error = await api.post('/reservas', {}).catch((reason: unknown) => reason) as ApiError
    expect(error.userMessage).not.toContain('Prisma')
    expect(error.userMessage).toContain('Inténtalo de nuevo')
  })
})
