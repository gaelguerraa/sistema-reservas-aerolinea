import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/http/client'
import type { VueloResumen } from './types'
import { vuelosApi } from './vuelosApi'
import { VuelosListPage } from './VuelosListPage'

const vuelos: VueloResumen[] = [
  { id: 'V100', origen: 'Monterrey', destino: 'Cancún', fecha: '2026-12-01T00:00:00.000Z', hora: '08:30', capacidadTotal: 72 },
  { id: 'V200', origen: 'Guadalajara', destino: 'Tijuana', fecha: '2026-12-05T00:00:00.000Z', hora: '11:00', capacidadTotal: 60 },
]

afterEach(() => window.history.replaceState(null, '', '/'))

function renderLista() {
  const router = createMemoryRouter([{ path: '/app/vuelos', element: <VuelosListPage /> }], { initialEntries: ['/app/vuelos'] })
  render(<RouterProvider router={router} />)
  return router
}

describe('VuelosListPage', () => {
  it('muestra los vuelos y filtra por texto conservando el filtro en la URL', async () => {
    vi.spyOn(vuelosApi, 'listar').mockResolvedValue(vuelos)
    renderLista()
    expect(await screen.findByRole('link', { name: 'V100' })).toBeInTheDocument()
    expect(screen.getByText('01/12/2026')).toBeInTheDocument()

    const buscar = screen.getByLabelText('Buscar')
    await userEvent.type(buscar, 'tijuana')
    expect(buscar).toHaveValue('tijuana')
    expect(buscar).toHaveFocus()
    expect(screen.queryByRole('link', { name: 'V100' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'V200' })).toBeInTheDocument()
    expect(window.location.search).toBe('?q=tijuana')
  })

  it('muestra mensaje cuando los filtros no devuelven resultados', async () => {
    vi.spyOn(vuelosApi, 'listar').mockResolvedValue(vuelos)
    renderLista()
    await screen.findByRole('link', { name: 'V100' })
    await userEvent.type(screen.getByLabelText('Buscar'), 'zzz')
    expect(screen.getByText('Ningún vuelo coincide con los filtros aplicados.')).toBeInTheDocument()
  })

  it('muestra estado vacío', async () => {
    vi.spyOn(vuelosApi, 'listar').mockResolvedValue([])
    renderLista()
    expect(await screen.findByText(/Todavía no hay vuelos registrados/)).toBeInTheDocument()
  })

  it('muestra el error del servicio y permite reintentar', async () => {
    const listar = vi.spyOn(vuelosApi, 'listar').mockRejectedValueOnce(new ApiError({ status: 500, code: 'ERROR_INTERNO', message: 'Falla del servicio' })).mockResolvedValue(vuelos)
    renderLista()
    expect(await screen.findByRole('alert')).toHaveTextContent('Falla del servicio')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByRole('link', { name: 'V100' })).toBeInTheDocument())
    expect(listar).toHaveBeenCalledTimes(2)
  })
})