import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ApiError } from '../../../shared/http/errors'
import type { Asiento, Reserva, Usuario, VueloDetalle } from '../../../shared/types/api'
import { MisReservasPage } from './MisReservasPage'
import { ReservaDetallePage } from './ReservaDetallePage'
import { ReservarPage } from './ReservarPage'

const auth = vi.hoisted(() => ({
  user: { id: 'u1', email: 'cliente@example.com', rol: 'CLIENTE', pasajeroId: 'P1' } as Usuario | null,
}))

vi.mock('../../auth/useAuth', () => ({ useAuth: () => ({ user: auth.user, isAuthenticated: Boolean(auth.user) }) }))
vi.mock('../reservasApi', () => ({ reservasApi: { crear: vi.fn(), obtener: vi.fn(), cancelar: vi.fn(), delPasajero: vi.fn() } }))
vi.mock('../pasajerosApi', () => ({ pasajerosApi: { obtener: vi.fn() } }))
vi.mock('../../vuelos/vuelosApi', () => ({
  vuelosApi: { list: vi.fn(), get: vi.fn(), seats: vi.fn() },
  isAbortError: () => false,
  getApiErrorStatus: (error: { status?: number } | undefined) => error?.status,
}))

import { pasajerosApi } from '../pasajerosApi'
import { reservasApi } from '../reservasApi'
import { vuelosApi } from '../../vuelos/vuelosApi'

const futuro: VueloDetalle = {
  id: 'V100', origen: 'Hermosillo', destino: 'Ciudad de México', fecha: '2099-06-10T00:00:00.000Z', hora: '12:30', capacidadTotal: 3,
  asientos: [
    { id: 'V100-1A', vueloId: 'V100', numero: '1A', clase: 'EJECUTIVA' },
    { id: 'V100-12A', vueloId: 'V100', numero: '12A', clase: 'ECONOMICA' },
    { id: 'V100-12B', vueloId: 'V100', numero: '12B', clase: 'ECONOMICA' },
  ],
}
const pasado: VueloDetalle = {
  id: 'V700', origen: 'Oaxaca', destino: 'Ciudad de México', fecha: '2020-01-10T00:00:00.000Z', hora: '09:00', capacidadTotal: 1,
  asientos: [{ id: 'V700-12A', vueloId: 'V700', numero: '12A', clase: 'ECONOMICA' }],
}
const asientosV100: Asiento[] = [
  { id: 'V100-1A', vueloId: 'V100', numero: '1A', clase: 'EJECUTIVA', ocupado: false },
  { id: 'V100-12A', vueloId: 'V100', numero: '12A', clase: 'ECONOMICA', ocupado: false },
  { id: 'V100-12B', vueloId: 'V100', numero: '12B', clase: 'ECONOMICA', ocupado: true },
]
const confirmada: Reserva = { id: 'res-1', vueloId: 'V100', asientoId: 'V100-1A', pasajeroId: 'P1', estado: 'CONFIRMADA', fechaCreacion: '2026-11-01T10:00:00.000Z' }
const completada: Reserva = { id: 'res-2', vueloId: 'V700', asientoId: 'V700-12A', pasajeroId: 'P1', estado: 'COMPLETADA', fechaCreacion: '2019-12-01T10:00:00.000Z' }

function LocationText() {
  const location = useLocation()
  return <output data-testid="current-url">{location.pathname}{location.search}</output>
}

function mount(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/reservas" element={<MisReservasPage />} />
        <Route path="/reservas/:id" element={<ReservaDetallePage />} />
        <Route path="/reservar" element={<ReservarPage />} />
        <Route path="*" element={<LocationText />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('reservaciones del cliente', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = { id: 'u1', email: 'cliente@example.com', rol: 'CLIENTE', pasajeroId: 'P1' }
    vi.mocked(vuelosApi.get).mockImplementation((id: string) => Promise.resolve(id === 'V100' ? futuro : pasado))
    vi.mocked(vuelosApi.seats).mockResolvedValue(asientosV100)
    vi.mocked(pasajerosApi.obtener).mockResolvedValue({ id: 'P1', nombre: 'Ana López', contacto: 'ana@example.com' })
  })
  afterEach(() => cleanup())

  describe('Mis reservaciones', () => {
    it('muestra carga y luego separa próximas y pasadas con su estado', async () => {
      vi.mocked(reservasApi.delPasajero).mockImplementation(() => new Promise(() => undefined))
      mount('/reservas')
      expect(screen.getByText('Cargando tus reservaciones')).toBeInTheDocument()
      cleanup()

      vi.mocked(reservasApi.delPasajero).mockResolvedValue([completada, confirmada])
      mount('/reservas')
      const proximas = await screen.findByRole('region', { name: 'Próximos viajes' })
      const pasadas = screen.getByRole('region', { name: 'Viajes pasados' })
      expect(within(proximas).getByText('Confirmada')).toBeInTheDocument()
      expect(within(proximas).getByText('1A · Ejecutiva')).toBeInTheDocument()
      expect(within(pasadas).getByText('Completada')).toBeInTheDocument()
      // Solo la futura y activa se puede cancelar.
      expect(screen.getAllByRole('button', { name: /Cancelar reservación/ })).toHaveLength(1)
      expect(within(pasadas).queryByRole('button', { name: /Cancelar/ })).not.toBeInTheDocument()
      expect(within(proximas).getByRole('link', { name: /Ver detalle/ })).toHaveAttribute('href', '/reservas/res-1')
    })

    it('muestra el estado vacío y el error reintentable', async () => {
      vi.mocked(reservasApi.delPasajero).mockResolvedValue([])
      mount('/reservas')
      expect(await screen.findByText('Aún no tienes reservaciones')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Explorar vuelos' })).toHaveAttribute('href', '/vuelos')
      cleanup()

      vi.mocked(reservasApi.delPasajero).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([confirmada])
      mount('/reservas')
      expect(await screen.findByText('No pudimos cargar tus reservaciones')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
      expect(await screen.findByRole('region', { name: 'Próximos viajes' })).toBeInTheDocument()
    })

    it('pide confirmación antes de cancelar, actualiza la lista y avisa', async () => {
      vi.mocked(reservasApi.delPasajero).mockResolvedValue([confirmada])
      vi.mocked(reservasApi.cancelar).mockResolvedValue({ ...confirmada, estado: 'CANCELADA' })
      mount('/reservas')

      fireEvent.click(await screen.findByRole('button', { name: /Cancelar reservación/ }))
      const dialog = screen.getByRole('alertdialog', { name: '¿Cancelar esta reservación?' })
      expect(within(dialog).getByRole('button', { name: 'No, conservarla' })).toHaveFocus()
      fireEvent.click(within(dialog).getByRole('button', { name: 'No, conservarla' }))
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(reservasApi.cancelar).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: /Cancelar reservación/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar reservación' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Cancelaste tu reservación del vuelo V100')
      expect(reservasApi.cancelar).toHaveBeenCalledWith('res-1')
      expect(screen.getByText('Cancelada')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Cancelar reservación/ })).not.toBeInTheDocument()
    })

    it('si el servicio rechaza la cancelación muestra el motivo en lenguaje del usuario', async () => {
      vi.mocked(reservasApi.delPasajero).mockResolvedValue([confirmada])
      vi.mocked(reservasApi.cancelar).mockRejectedValue(new ApiError({ kind: 'CONFLICTO', status: 409, code: 'TRANSICION_INVALIDA', message: 'Transición inválida: CANCELADA -> CANCELADA' }))
      mount('/reservas')

      fireEvent.click(await screen.findByRole('button', { name: /Cancelar reservación/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar reservación' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Esta reservación ya no admite ese cambio')
      expect(screen.queryByText(/Transición inválida/)).not.toBeInTheDocument()
      await waitFor(() => expect(reservasApi.delPasajero).toHaveBeenCalledTimes(2))
    })
  })

  describe('Reservar', () => {
    it('sin vuelo elegido manda a explorar vuelos', () => {
      mount('/reservar')
      expect(screen.getByText('Primero elige un vuelo')).toBeInTheDocument()
    })

    it('valida cada campo antes de enviar', async () => {
      mount('/reservar?vueloId=V100')
      const submit = await screen.findByRole('button', { name: 'Confirmar reservación' })
      expect(screen.getByText('Ana López')).toBeInTheDocument()
      // El asiento ocupado no se ofrece.
      expect(screen.queryByRole('option', { name: /12B/ })).not.toBeInTheDocument()

      fireEvent.click(submit)
      expect(screen.getByText('Elige un asiento libre para continuar.')).toBeInTheDocument()
      expect(screen.getByText('Confirma que tus datos de contacto son correctos.')).toBeInTheDocument()
      expect(screen.getByLabelText('Asiento')).toHaveFocus()
      expect(reservasApi.crear).not.toHaveBeenCalled()
    })

    it('crea la reservación con el asiento de la URL y abre su detalle', async () => {
      const nueva: Reserva = { ...confirmada, id: 'res-9', estado: 'PENDIENTE' }
      vi.mocked(reservasApi.crear).mockResolvedValue(nueva)
      vi.mocked(reservasApi.obtener).mockResolvedValue(nueva)
      mount('/reservar?vueloId=V100&asientoId=V100-1A')
      expect(await screen.findByLabelText('Asiento')).toHaveValue('V100-1A')

      fireEvent.click(screen.getByLabelText('Confirmo que mis datos de contacto son correctos'))
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar reservación' }))
      await waitFor(() => expect(reservasApi.crear).toHaveBeenCalledWith({ pasajeroId: 'P1', vueloId: 'V100', asientoId: 'V100-1A' }))
      expect(await screen.findByText(/¡Listo! Reservaste el asiento 1A del vuelo V100/)).toBeInTheDocument()
      expect(reservasApi.obtener).toHaveBeenCalledWith('res-9', expect.anything())
      expect(screen.getAllByText('Pendiente')).toHaveLength(2) // insignia y dato "Estado"
    })

    it('ante un 409 explica el conflicto y quita el asiento ganado por otra persona', async () => {
      vi.mocked(reservasApi.crear).mockRejectedValue(new ApiError({ kind: 'CONFLICTO', status: 409, code: 'ASIENTO_OCUPADO', message: 'El asiento V100-1A ya está ocupado por otra reserva activa.' }))
      mount('/reservar?vueloId=V100&asientoId=V100-1A')
      await screen.findByLabelText('Asiento')

      fireEvent.click(screen.getByLabelText('Confirmo que mis datos de contacto son correctos'))
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar reservación' }))
      expect(await screen.findByText('Ese asiento acaba de ser reservado por otra persona. Elige otro.')).toBeInTheDocument()
      expect(screen.queryByText(/ya está ocupado por otra reserva activa/)).not.toBeInTheDocument()
      expect(screen.queryByRole('option', { name: /1A · Ejecutiva/ })).not.toBeInTheDocument()
      expect(screen.getByLabelText('Asiento')).toHaveValue('')
    })

    it('una cuenta sin perfil de pasajero no puede reservar', () => {
      auth.user = { id: 'u2', email: 'admin@example.com', rol: 'ADMIN', pasajeroId: null }
      mount('/reservar?vueloId=V100')
      expect(screen.getByText('Tu cuenta no puede reservar')).toBeInTheDocument()
    })
  })

  describe('Detalle', () => {
    it('muestra la reservación y permite cancelarla si es futura', async () => {
      vi.mocked(reservasApi.obtener).mockResolvedValue(confirmada)
      mount('/reservas/res-1')
      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Hermosillo')
      expect(screen.getByText('1A · Ejecutiva')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancelar reservación' })).toBeInTheDocument()
    })

    it('explica por qué una completada no se puede cancelar', async () => {
      vi.mocked(reservasApi.obtener).mockResolvedValue(completada)
      mount('/reservas/res-2')
      expect(await screen.findByText('Las reservaciones completadas no se pueden cancelar.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cancelar reservación' })).not.toBeInTheDocument()
    })

    it('una reservación inexistente lleva a la página 404', async () => {
      vi.mocked(reservasApi.obtener).mockRejectedValue(new ApiError({ kind: 'NO_ENCONTRADO', status: 404, code: 'NO_ENCONTRADO' }))
      mount('/reservas/res-9999')
      await waitFor(() => expect(screen.getByTestId('current-url')).toHaveTextContent('/no-encontrado'))
    })
  })
})
