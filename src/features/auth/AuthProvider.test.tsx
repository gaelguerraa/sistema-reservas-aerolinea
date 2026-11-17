import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'
import { ProtectedRoute } from '../../shared/routing/ProtectedRoute'
import { authStorage } from './authStorage'
import { tokenStorage } from '../../shared/http/tokenStorage'
import { api as clientApi, http } from '../../shared/http/client'

const admin = { id: 'admin-1', email: 'admin@example.com', rol: 'ADMIN' as const, pasajeroId: null }
vi.mock('./authApi', () => ({ authApi: { me: vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.com', rol: 'ADMIN', pasajeroId: null })), login: vi.fn() } }))

function Content() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return <><h1>Panel protegido</h1><button onClick={() => logout()}>Cerrar sesión</button><button onClick={() => void navigate(-1)}>Atrás</button></>
}

function Login() {
  const navigate = useNavigate()
  return <><h1>Iniciar sesión</h1><button onClick={() => void navigate(-1)}>Atrás</button></>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    authStorage.clear()
    authStorage.setUser(admin)
    tokenStorage.set('valid-admin-token')
    http.defaults.baseURL = 'http://api.test'
  })

  afterEach(() => {
    http.defaults.adapter = undefined
    window.localStorage.clear()
  })

  it('sale de inmediato del panel al cerrar sesión y no restaura la página protegida con atrás', async () => {
    render(<MemoryRouter initialEntries={['/antes', '/app/dashboard']} initialIndex={1}><AuthProvider><Routes>
      <Route path="/antes" element={<h1>Página previa</h1>} />
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}><Route path="/app/dashboard" element={<Content />} /></Route>
      <Route path="/login" element={<Login />} />
    </Routes></AuthProvider></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Panel protegido' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByText('Panel protegido')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(await screen.findByRole('heading', { name: 'Página previa' })).toBeInTheDocument()
    expect(screen.queryByText('Panel protegido')).not.toBeInTheDocument()
  })

  it('un 401 con token cierra sesión y navega a login', async () => {
    const previous = http.defaults.adapter
    http.defaults.adapter = async (config) => {
      const response = { config, data: { ok: false, error: { codigo: 'NO_AUTENTICADO', mensaje: 'Credencial vencida.' } }, status: 401, statusText: 'Unauthorized', headers: new AxiosHeaders() }
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response)
    }
    function Trigger() {
      const { user } = useAuth()
      return <>{user && <button onClick={() => void clientApi.get('/auth/me').catch(() => {})}>Probar sesión vencida</button>}</>
    }
    render(<MemoryRouter initialEntries={['/app/dashboard']}><AuthProvider><Routes>
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}><Route path="/app/dashboard" element={<Trigger />} /></Route>
      <Route path="/login" element={<h1>Iniciar sesión</h1>} />
    </Routes></AuthProvider></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Probar sesión vencida' }))
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    await waitFor(() => expect(tokenStorage.get()).toBeNull())
    http.defaults.adapter = previous
  })
})
