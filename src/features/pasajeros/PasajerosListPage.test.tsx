import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/http/client'
import type { Pasajero } from './types'
import { pasajerosApi } from './pasajerosApi'
import { PasajerosListPage } from './PasajerosListPage'

const pasajeros: Pasajero[] = [
  { id: 'pas-101', nombre: 'Carlos Mendoza', contacto: 'carlos@correo.com' },
  { id: 'pas-202', nombre: 'Valeria Torres', contacto: 'valeria@correo.com' },
]

afterEach(() => window.history.replaceState(null, '', '/'))

function renderLista() {
  const router = createMemoryRouter([{ path: '/app/pasajeros', element: <PasajerosListPage /> }], {
    initialEntries: ['/app/pasajeros'],
  })
  render(<RouterProvider router={router} />)
  return router
}

describe('PasajerosListPage', () => {
  it('muestra los pasajeros y filtra por nombre o correo conservando el filtro en la URL', async () => {
    vi.spyOn(pasajerosApi, 'listar').mockResolvedValue(pasajeros)
    renderLista()

    expect(await screen.findByRole('link', { name: 'Carlos Mendoza' })).toBeInTheDocument()
    expect(screen.getByText('carlos@correo.com')).toBeInTheDocument()

    const buscar = screen.getByLabelText('Buscar')
    await userEvent.type(buscar, 'valeria')
    expect(buscar).toHaveValue('valeria')
    expect(screen.queryByRole('link', { name: 'Carlos Mendoza' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Valeria Torres' })).toBeInTheDocument()
    expect(window.location.search).toBe('?q=valeria')
  })

  it('muestra mensaje cuando la búsqueda no devuelve resultados', async () => {
    vi.spyOn(pasajerosApi, 'listar').mockResolvedValue(pasajeros)
    renderLista()
    await screen.findByRole('link', { name: 'Carlos Mendoza' })
    await userEvent.type(screen.getByLabelText('Buscar'), 'inexistente')
    expect(screen.getByText('Ningún pasajero coincide con la búsqueda aplicada.')).toBeInTheDocument()
  })

  it('muestra estado vacío', async () => {
    vi.spyOn(pasajerosApi, 'listar').mockResolvedValue([])
    renderLista()
    expect(await screen.findByText(/Todavía no hay pasajeros registrados/)).toBeInTheDocument()
  })

  it('muestra el error del servicio y permite reintentar', async () => {
    const listar = vi
      .spyOn(pasajerosApi, 'listar')
      .mockRejectedValueOnce(new ApiError({ status: 500, code: 'ERROR_INTERNO', message: 'Falla del servicio' }))
      .mockResolvedValue(pasajeros)
    renderLista()
    expect(await screen.findByRole('alert')).toHaveTextContent('Falla del servicio')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByRole('link', { name: 'Carlos Mendoza' })).toBeInTheDocument())
    expect(listar).toHaveBeenCalledTimes(2)
  })
})
