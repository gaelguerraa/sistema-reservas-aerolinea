import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
  onError?: (error: unknown) => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', destructive = false, onConfirm, onError, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
      confirmRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
      restoreFocusRef.current?.focus()
    }
  }, [open])

  async function confirm() {
    if (processing) return
    setProcessing(true)
    try {
      await onConfirm()
    } catch (error: unknown) {
      onError?.(error)
    } finally {
      setProcessing(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape' && !processing) {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key === 'Tab') {
      const dialog = dialogRef.current
      const controls = dialog?.querySelectorAll<HTMLElement>('button:not([disabled])')
      if (!controls?.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus()
      }
    }
  }

  return <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-description" onKeyDown={handleKeyDown} onCancel={(event) => { event.preventDefault(); if (!processing) onCancel() }}>
    <h2 id="confirm-title">{title}</h2>
    <p id="confirm-description">{description}</p>
    <div className="dialog-actions">
      <button className="button button-secondary" type="button" onClick={onCancel} disabled={processing}>{cancelLabel}</button>
      <button ref={confirmRef} className={destructive ? 'button button-danger' : 'button button-primary'} type="button" onClick={() => void confirm()} disabled={processing}>
        {processing ? 'Procesando…' : confirmLabel}
      </button>
    </div>
  </dialog>
}
