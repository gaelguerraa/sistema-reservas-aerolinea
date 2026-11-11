import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'
import { authStorage } from './authStorage'
import { api, http } from '../../shared/http/client'
import { SessionNotice } from '../../shared/layout/SessionNotice'
import { tokenStorage } from '../../shared/http/tokenStorage'
import { ProtectedRoute } from '../../shared/routing/ProtectedRoute'
import type { Usuario } from '../../shared/types/api'

const originalAdapter = http.defaults.adapter
const usuario: Usuario = {
  id: 'user-1',
  email: 'cliente@example.com',
  rol: 'CLIENTE',
  pasajeroId: 'passenger-1',
}

function CurrentPath() {
  const location = useLocation()
  return <output>{location.pathname}{location.search}</output>
}

function PrivatePage() {
  const { user } = useAuth()
  return <p>Reservas de {user?.email}</p>
}

function renderRoutes(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <SessionNotice />
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/reservas" element={<PrivatePage />} />
          </Route>
          <Route path="/login" element={<CurrentPath />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('sesión y rutas protegidas', () => {
  beforeEach(() => {
    tokenStorage.clear()
    authStorage.clear()
  })

  afterEach(() => {
    cleanup()
    http.defaults.adapter = originalAdapter
  })

  it('redirige al login conservando la ruta y sus parámetros', () => {
    renderRoutes('/reservas?estado=pendiente')
    expect(screen.getByText('/login?redirect=%2Freservas%3Festado%3Dpendiente')).toBeInTheDocument()
  })

  it('restaura usuario y token persistidos para permitir rutas protegidas', () => {
    tokenStorage.set('token-valid')
    authStorage.setUser(usuario)
    renderRoutes('/reservas')
    expect(screen.getByText('Reservas de cliente@example.com')).toBeInTheDocument()
  })

  it('cierra la sesión, avisa y redirige al login al recibir un 401', async () => {
    tokenStorage.set('expired-token')
    authStorage.setUser(usuario)
    http.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const response = {
        data: { ok: false, error: { codigo: 'NO_AUTENTICADO', mensaje: 'Sesión vencida' } },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      }
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response)
    }

    renderRoutes('/reservas')
    expect(await screen.findByText('Reservas de cliente@example.com')).toBeInTheDocument()
    await expect(api.get('/reservas')).rejects.toMatchObject({ kind: 'NO_AUTENTICADO' })
    expect(await screen.findByRole('alert')).toHaveTextContent('Tu sesión ha vencido')
    expect(screen.getByText('/login?redirect=%2Freservas')).toBeInTheDocument()
    expect(tokenStorage.get()).toBeNull()
    expect(authStorage.getUser()).toBeNull()
  })
})
