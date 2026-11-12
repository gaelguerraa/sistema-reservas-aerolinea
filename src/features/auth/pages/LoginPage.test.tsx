import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../../shared/http/client'
import { LoginPage } from './LoginPage'

const login = vi.fn()
vi.mock('../useAuth', () => ({ useAuth: () => ({ isAuthenticated: false, login }) }))

function show() {
  render(<MemoryRouter><LoginPage /></MemoryRouter>)
}

describe('validación del login', () => {
  beforeEach(() => { login.mockReset() })
  afterEach(() => cleanup())

  it('valida campos vacíos e inválidos sin enviar la petición', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-describedby', 'login-email-error')
    expect(screen.getByText('Escribe tu correo electrónico.')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'correo-mal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(screen.getByText('Escribe un correo electrónico válido.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('coloca el rechazo de credenciales junto a la contraseña', async () => {
    login.mockRejectedValue(new ApiError({ kind: 'NO_AUTENTICADO', status: 401 }))
    show()
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'cliente@ejemplo.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'incorrecta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('El correo o la contraseña no coinciden. Revisa ambos datos.')).toHaveAttribute('id', 'login-password-error')
  })

  it('muestra el error de campo recibido del servicio', async () => {
    login.mockRejectedValue(new ApiError({ kind: 'VALIDACION', status: 400, details: [{ campo: 'email', mensaje: 'Revisa este correo.' }] }))
    show()
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'cliente@ejemplo.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Cliente123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('Revisa este correo.')).toHaveAttribute('id', 'login-email-error')
  })
})
