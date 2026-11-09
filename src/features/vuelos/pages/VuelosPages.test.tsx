import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { VuelosListPage } from './VuelosListPage'
import { VueloDetallePage } from './VueloDetallePage'
import type { Asiento, VueloDetalle } from '../types'

vi.mock('../vuelosApi', () => ({
  vuelosApi: { list: vi.fn(), get: vi.fn(), seats: vi.fn() },
  isAbortError: () => false,
  getApiErrorStatus: (error: { status?: number }) => error.status,
}))

import { vuelosApi } from '../vuelosApi'

const vuelo: VueloDetalle = { id: 'V100', origen: 'Hermosillo', destino: 'Ciudad de México', fecha: '2099-06-10T00:00:00.000Z', hora: '12:30', capacidadTotal: 2 }
const asientos: Asiento[] = [
  { id: 'V100-1A', vueloId: 'V100', numero: '1A', clase: 'EJECUTIVA', ocupado: false },
  { id: 'V100-12A', vueloId: 'V100', numero: '12A', clase: 'ECONOMICA', ocupado: true },
]

function LocationText() {
  const location = useLocation()
  return <output data-testid="current-url">{location.pathname}{location.search}</output>
}

function mountList(entry = '/vuelos') {
  return render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/vuelos" element={<VuelosListPage />} /><Route path="*" element={<LocationText />} /></Routes></MemoryRouter>)
}

function mountDetail(entry = '/vuelos/V100') {
  return render(<MemoryRouter initialEntries={[entry]}><Routes>
    <Route path="/vuelos/:id" element={<VueloDetallePage />} />
    <Route path="/no-encontrado" element={<p>No encontramos esta página</p>} />
    <Route path="/reservar" element={<LocationText />} />
    <Route path="*" element={<LocationText />} />
  </Routes></MemoryRouter>)
}

describe('pantallas de vuelos', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => cleanup())

  it('muestra carga, catálogo y vacío por filtros', async () => {
    vi.mocked(vuelosApi.list).mockImplementation(() => new Promise(() => undefined))
    mountList()
    expect(screen.getByText('Preparando tus opciones')).toBeInTheDocument()
    cleanup()

    vi.mocked(vuelosApi.list).mockResolvedValue([vuelo])
    mountList()
    expect(await screen.findByRole('link', { name: /Vuelo V100/ })).toHaveAttribute('href', '/vuelos/V100')
    cleanup()

    mountList('/vuelos?destino=Tokio')
    expect(await screen.findByText('No encontramos vuelos con esos filtros')).toBeInTheDocument()
  })

  it('muestra error reintentable y permite recuperar el catálogo', async () => {
    vi.mocked(vuelosApi.list).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([vuelo])
    mountList()
    expect(await screen.findByText('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('link', { name: /Vuelo V100/ })).toBeInTheDocument()
  })

  it('muestra el mapa, bloquea ocupados y navega a reservar con los parámetros correctos', async () => {
    vi.mocked(vuelosApi.get).mockResolvedValue(vuelo)
    vi.mocked(vuelosApi.seats).mockResolvedValue(asientos)
    mountDetail()
    expect(await screen.findByText('Disponibilidad de asientos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Asiento 12A, económica, ocupado' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Asiento 1A, ejecutiva, libre' }))
    expect(screen.getByRole('button', { name: /Reservar este asiento/ })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: /Reservar este asiento/ }))
    await waitFor(() => expect(screen.getByTestId('current-url')).toHaveTextContent('/reservar?vueloId=V100&asientoId=V100-1A'))
  })

  it('muestra error reintentable en el detalle y comunica el vuelo lleno', async () => {
    vi.mocked(vuelosApi.get).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(vuelo)
    vi.mocked(vuelosApi.seats).mockResolvedValue(asientos)
    mountDetail()
    expect(await screen.findByText('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Disponibilidad de asientos')).toBeInTheDocument()
    cleanup()

    vi.mocked(vuelosApi.seats).mockResolvedValue(asientos.map((seat) => ({ ...seat, ocupado: true })))
    mountDetail()
    expect(await screen.findByText('Este vuelo está lleno')).toBeInTheDocument()
  })

  it('resuelve vuelos inexistentes como no encontrado y enseña mapa vacío', async () => {
    vi.mocked(vuelosApi.get).mockRejectedValue({ status: 404 })
    vi.mocked(vuelosApi.seats).mockResolvedValue([])
    mountDetail('/vuelos/NOEXISTE')
    expect(await screen.findByText('No encontramos esta página')).toBeInTheDocument()
    cleanup()

    vi.mocked(vuelosApi.get).mockResolvedValue({ ...vuelo, capacidadTotal: 0 })
    mountDetail()
    expect(await screen.findByText('Este vuelo no tiene asientos configurados')).toBeInTheDocument()
  })

  it('ignora la selección de asiento ocupado reflejada en la URL', async () => {
    vi.mocked(vuelosApi.get).mockResolvedValue(vuelo)
    vi.mocked(vuelosApi.seats).mockResolvedValue(asientos)
    mountDetail('/vuelos/V100?asiento=12A')
    expect(await screen.findByText('Disponibilidad de asientos')).toBeInTheDocument()
    expect(screen.getByText('Selecciona un asiento libre')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reservar este asiento/ })).toBeDisabled()
  })

  it('quita y anuncia el asiento seleccionado si se ocupa durante la actualización', async () => {
    vi.mocked(vuelosApi.get).mockResolvedValue(vuelo)
    vi.mocked(vuelosApi.seats).mockResolvedValueOnce(asientos).mockResolvedValueOnce(asientos.map((seat) => seat.numero === '1A' ? { ...seat, ocupado: true } : seat))
    mountDetail()
    await screen.findByText('Disponibilidad de asientos')
    fireEvent.click(screen.getByRole('button', { name: 'Asiento 1A, ejecutiva, libre' }))
    fireEvent.click(screen.getByRole('button', { name: /Actualizar disponibilidad/ }))
    expect(await screen.findByText('Ese asiento se acaba de ocupar, elige otro')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reservar este asiento/ })).toBeDisabled()
  })

  it('resuelve un ID con formato inválido sin pedirlo al servicio', async () => {
    mountDetail('/vuelos/bad$id')
    expect(await screen.findByText('No encontramos esta página')).toBeInTheDocument()
    expect(vuelosApi.get).not.toHaveBeenCalled()
  })
})
