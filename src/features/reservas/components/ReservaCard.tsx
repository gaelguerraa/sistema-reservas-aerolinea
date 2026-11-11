import { Link } from 'react-router-dom'
import { formatFechaLarga, formatHora } from '../../vuelos/utils'
import { etiquetaAsiento } from '../utils'
import type { ReservaConVuelo } from '../types'
import { EstadoBadge } from './EstadoBadge'

type ReservaCardProps = {
  item: ReservaConVuelo
  /** Solo llega si la reservación se puede cancelar. */
  onCancelar?: () => void
}

export function ReservaCard({ item, onCancelar }: ReservaCardProps) {
  const { reserva, vuelo } = item
  const tituloId = `reserva-${reserva.id}`

  return (
    <article className="reserva-card" aria-labelledby={tituloId}>
      <div className="reserva-card-top">
        <span className="flight-number">{reserva.vueloId}</span>
        <EstadoBadge estado={reserva.estado} />
      </div>
      <h3 id={tituloId} className="reserva-ruta">
        {vuelo ? <>{vuelo.origen} <span aria-hidden="true">→</span><span className="sr-only">a</span> {vuelo.destino}</> : `Vuelo ${reserva.vueloId}`}
      </h3>
      <dl className="reserva-datos">
        <div><dt>Fecha</dt><dd>{vuelo ? formatFechaLarga(vuelo.fecha) : 'Por confirmar'}</dd></div>
        <div><dt>Hora</dt><dd>{vuelo ? `${formatHora(vuelo.hora)} h` : '—'}</dd></div>
        <div><dt>Asiento</dt><dd>{etiquetaAsiento(item)}</dd></div>
      </dl>
      <div className="reserva-card-actions">
        <Link className="button button-secondary" to={`/reservas/${encodeURIComponent(reserva.id)}`}>
          Ver detalle<span className="sr-only"> de la reservación del vuelo {reserva.vueloId}</span>
        </Link>
        {onCancelar && (
          <button className="button button-danger-outline" type="button" onClick={onCancelar}>
            Cancelar reservación<span className="sr-only"> del vuelo {reserva.vueloId}</span>
          </button>
        )}
      </div>
    </article>
  )
}
