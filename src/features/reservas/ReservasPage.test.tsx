import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/http/client'
import { ReservaDetailPage } from './ReservaDetailPage'
import { ReservaFormPage } from './ReservaFormPage'
import { ReservasListPage } from './ReservasListPage'
import { reservasApi } from './reservasApi'
import type { Reserva } from './types'

const reserva: Reserva = {
  id: 'rsv-101',
  vueloId: 'v-202',
  asientoId: '12A',
  pasajeroId: 'pas-303',
  estado: 'PENDIENTE',
  fechaCreacion: '2026-03-15T12:30:00.000Z',
}

afterEach(() => window.history.replaceState(null, '', '/'))
beforeEach(() => {
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

function renderModulo(initialEntry = '/app/reservas') {
  const router = createMemoryRouter([
    { path: '/app/reservas', element: <ReservasListPage /> },
    { path: '/app/reservas/nueva', element: <ReservaFormPage /> },
    { path: '/app/reservas/:id', element: <ReservaDetailPage /> },
  ], { initialEntries: [initialEntry] })
  render(<RouterProvider router={router} />)
  return router
}

describe('Reservas', () => {
  it('lista reservas desde el endpoint administrativo global', async () => {
    vi.spyOn(reservasApi, 'listar').mockResolvedValue([{
      id: 'rsv-101',
      estado: 'PENDIENTE',
      fechaCreacion: '2026-03-15T12:30:00.000Z',
      vuelo: { id: 'v-202', origen: 'Bogotá', destino: 'Medellín', fecha: '2026-03-16', hora: '08:30' },
      asiento: { id: '12A', numero: '12A', clase: 'ECONOMICA' },
      pasajero: { id: 'pas-303', nombre: 'Ana Pérez' },
    }])

    renderModulo()

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(reservasApi.listar).toHaveBeenCalledWith({
      desde: '',
      hasta: '',
      vueloId: '',
      estado: '',
      pasajeroId: '',
    }, expect.any(AbortSignal))
  })

  it('confirma una reserva pendiente y recarga el estado desde el servicio', async () => {
    const obtener = vi.spyOn(reservasApi, 'obtener')
      .mockResolvedValueOnce(reserva)
      .mockResolvedValueOnce({ ...reserva, estado: 'CONFIRMADA' })
    const cambiarEstado = vi.spyOn(reservasApi, 'cambiarEstado').mockResolvedValue({ ...reserva, estado: 'CONFIRMADA' })
    renderModulo('/app/reservas/rsv-101')

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar reserva' }))

    await waitFor(() => expect(screen.getByText('Confirmada')).toBeInTheDocument())
    expect(cambiarEstado).toHaveBeenCalledWith('rsv-101', 'CONFIRMADA')
    expect(obtener).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument()
  })

  it('conserva el mensaje del servicio cuando una regla de negocio rechaza el cambio', async () => {
    vi.spyOn(reservasApi, 'obtener').mockResolvedValue(reserva)
    vi.spyOn(reservasApi, 'cambiarEstado').mockRejectedValue(
      new ApiError({ status: 409, code: 'RESERVA_NO_CONFIRMABLE', message: 'El vuelo ya no tiene asientos disponibles.' })
    )
    renderModulo('/app/reservas/rsv-101')

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar reserva' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El vuelo ya no tiene asientos disponibles.')
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('no ofrece cambios para una reserva completada', async () => {
    vi.spyOn(reservasApi, 'obtener').mockResolvedValue({ ...reserva, estado: 'COMPLETADA' })
    renderModulo('/app/reservas/rsv-101')

    expect(await screen.findByText(/No hay acciones disponibles/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar reserva' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument()
  })

  it('muestra una pantalla de no encontrado para un id inexistente', async () => {
    vi.spyOn(reservasApi, 'obtener').mockRejectedValue(
      new ApiError({ status: 404, code: 'NO_ENCONTRADO', message: 'Reserva no encontrada' })
    )
    renderModulo('/app/reservas/no-existe')
    expect(await screen.findByRole('heading', { name: 'No se encontró la reserva' })).toBeInTheDocument()
  })
})
