import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AsyncState } from './AsyncState'

describe('AsyncState', () => {
  it('renderiza cargando, datos, vacío y error con reintento', async () => {
    const retry = vi.fn()
    const { rerender } = render(<AsyncState state={{ status: 'loading' }}>{() => <p>Datos</p>}</AsyncState>)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')

    rerender(<AsyncState state={{ status: 'data', data: ['V100'] }}>{(data) => <p>{data.join(',')}</p>}</AsyncState>)
    expect(screen.getByText('V100')).toBeInTheDocument()

    rerender(<AsyncState state={{ status: 'empty' }}>{() => <p>Datos</p>}</AsyncState>)
    expect(screen.getByRole('status')).toHaveTextContent('No hay información')

    rerender(<AsyncState state={{ status: 'error', error: new Error('No conecta') }} onRetry={retry}>{() => <p>Datos</p>}</AsyncState>)
    expect(screen.getByRole('alert')).toHaveTextContent('No conecta')
    screen.getByRole('button', { name: 'Reintentar' }).click()
    expect(retry).toHaveBeenCalledOnce()
  })
})
