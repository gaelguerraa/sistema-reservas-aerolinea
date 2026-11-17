import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('confirma y muestra el texto de la acción', async () => {
    const confirm = vi.fn()
    render(<ConfirmDialog open title="Dar de baja" description="¿Continuar?" onConfirm={confirm} onCancel={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(confirm).toHaveBeenCalledOnce()
  })

  it('cancela con botón o Escape', () => {
    const cancel = vi.fn()
    render(<ConfirmDialog open title="Confirmación" description="¿Continuar?" onConfirm={() => {}} onCancel={cancel} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('permite cancelar con el botón', () => {
    const cancel = vi.fn()
    render(<ConfirmDialog open title="Confirmación" description="¿Continuar?" onConfirm={() => {}} onCancel={cancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(cancel).toHaveBeenCalledOnce()
  })
})
