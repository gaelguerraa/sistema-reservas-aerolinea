import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { ConfirmDialog } from './ConfirmDialog'

export function useUnsavedChangesWarning(isDirty: boolean) {
  const blocker = useBlocker(isDirty)

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [isDirty])

  const dialog = <ConfirmDialog
    open={blocker.state === 'blocked'}
    title="Hay cambios sin guardar"
    description="Si sales ahora, perderás los cambios que hiciste en este formulario."
    confirmLabel="Salir sin guardar"
    destructive
    onCancel={() => blocker.reset?.()}
    onConfirm={() => blocker.proceed?.()}
  />
  return { dialog, isBlocked: blocker.state === 'blocked' }
}
