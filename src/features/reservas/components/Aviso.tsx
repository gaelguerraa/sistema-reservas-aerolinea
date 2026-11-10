import type { AvisoReserva } from '../useCancelacion'

export function Aviso({ aviso, onCerrar }: { aviso: AvisoReserva; onCerrar: () => void }) {
  return (
    <div className={`reserva-aviso reserva-aviso-${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{aviso.tipo === 'error' ? '!' : '✓'}</span>
      <p>{aviso.texto}</p>
      <button type="button" onClick={onCerrar} aria-label="Cerrar aviso">×</button>
    </div>
  )
}
