import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { dashboardApi, type DashboardSummary } from './dashboardApi'
import { DashboardPage } from './DashboardPage'

const summary: DashboardSummary = {
  periodo: { desde: '2026-11-01', hasta: '2026-11-30' },
  ocupacion: { asientosTotales: 3, asientosOcupados: 2, porcentaje: 66.7 },
  masSolicitados: [{ vueloId: 'V1', origen: 'Hermosillo', destino: 'CDMX', reservas: 2 }],
  canceladas: 1,
}

describe('Tablero', () => {
  it('muestra las métricas reales y permite cambiar el periodo consultado', async () => {
    const get = vi.spyOn(dashboardApi, 'get').mockResolvedValue(summary)
    render(<DashboardPage />)

    expect(await screen.findByText('66.7%')).toBeInTheDocument()
    expect(screen.getByText('Hermosillo')).toBeInTheDocument()
    expect(screen.getByText('Reservas canceladas')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Desde'))
    await userEvent.type(screen.getByLabelText('Desde'), '2026-11-01')
    await userEvent.clear(screen.getByLabelText('Hasta'))
    await userEvent.type(screen.getByLabelText('Hasta'), '2026-11-30')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar periodo' }))

    await waitFor(() => expect(get).toHaveBeenLastCalledWith(
      { desde: '2026-11-01', hasta: '2026-11-30' },
      expect.any(AbortSignal),
    ))
  })

  it('rechaza un periodo invertido antes de consultar', async () => {
    const get = vi.spyOn(dashboardApi, 'get').mockResolvedValue(summary)
    render(<DashboardPage />)
    await screen.findByText('66.7%')
    const callCount = get.mock.calls.length

    await userEvent.clear(screen.getByLabelText('Desde'))
    await userEvent.type(screen.getByLabelText('Desde'), '2026-11-30')
    await userEvent.clear(screen.getByLabelText('Hasta'))
    await userEvent.type(screen.getByLabelText('Hasta'), '2026-11-01')
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar periodo' }))

    expect(screen.getByRole('alert')).toHaveTextContent('La fecha de inicio debe ser anterior o igual a la fecha de fin.')
    expect(get).toHaveBeenCalledTimes(callCount)
  })
})
