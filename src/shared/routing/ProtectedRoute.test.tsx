import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/authContext'
import { ProtectedRoute } from './ProtectedRoute'

function value(role: 'ADMIN' | 'CLIENTE' | null, status: 'loading' | 'authenticated' | 'anonymous'): AuthContextValue {
  const user = role ? { id: '1', email: 'staff@example.com', rol: role, pasajeroId: null } : null
  return { user, role, token: user ? 'token' : null, status, notice: null, login: async () => {}, logout: () => {}, clearNotice: () => {} }
}

function renderAt(auth: AuthContextValue) {
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/app/privado']}><Routes>
    <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}><Route path="/app/privado" element={<h1>Contenido protegido</h1>} /></Route>
    <Route path="/login" element={<h1>Iniciar sesión</h1>} />
  </Routes></MemoryRouter></AuthContext.Provider>)
}

describe('ProtectedRoute', () => {
  it('redirige sin sesión y nunca renderiza contenido protegido', () => {
    renderAt(value(null, 'anonymous'))
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('muestra acceso denegado para CLIENTE', () => {
    renderAt(value('CLIENTE', 'authenticated'))
    expect(screen.getByRole('heading', { name: 'No tienes permiso para esta sección' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('no muestra contenido mientras restaura la sesión', () => {
    renderAt(value(null, 'loading'))
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('permite ADMIN', () => {
    renderAt(value('ADMIN', 'authenticated'))
    expect(screen.getByRole('heading', { name: 'Contenido protegido' })).toBeInTheDocument()
  })
})
