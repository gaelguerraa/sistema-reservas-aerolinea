import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

type ConfirmDialogProps = {
  titulo: string
  children: ReactNode
  confirmarTexto: string
  cancelarTexto: string
  ocupado?: boolean
  onConfirmar: () => void
  onCerrar: () => void
}

/**
 * Diálogo modal para acciones que no se pueden deshacer.
 * El foco empieza en la opción segura, Escape cierra y Tab no sale del diálogo.
 */
export function ConfirmDialog({ titulo, children, confirmarTexto, cancelarTexto, ocupado = false, onConfirmar, onCerrar }: ConfirmDialogProps) {
  const tituloId = useId()
  const mensajeId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const opcionSegura = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    opcionSegura.current?.focus()
    return () => anterior?.focus()
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !ocupado) {
      event.stopPropagation()
      onCerrar()
      return
    }
    if (event.key !== 'Tab') return
    const botones = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
    if (!botones.length) return
    const primero = botones[0]
    const ultimo = botones[botones.length - 1]
    if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo.focus() }
    else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero.focus() }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !ocupado) onCerrar() }}>
      <div ref={dialogRef} className="dialog-card" role="alertdialog" aria-modal="true" aria-labelledby={tituloId} aria-describedby={mensajeId} onKeyDown={onKeyDown}>
        <h2 id={tituloId}>{titulo}</h2>
        <div id={mensajeId} className="dialog-message">{children}</div>
        <div className="dialog-actions">
          <button ref={opcionSegura} className="button button-secondary" type="button" onClick={onCerrar} disabled={ocupado}>{cancelarTexto}</button>
          <button className="button button-danger" type="button" onClick={onConfirmar} disabled={ocupado}>{ocupado ? 'Cancelando…' : confirmarTexto}</button>
        </div>
      </div>
    </div>
  )
}
