import { useAuth } from '../../features/auth/useAuth'

export function SessionNotice() {
  const { notice, dismissNotice } = useAuth()
  if (!notice) return null

  return (
    <div className="session-notice" role="alert">
      <span>{notice}</span>
      <button type="button" onClick={dismissNotice} aria-label="Cerrar aviso">×</button>
    </div>
  )
}
