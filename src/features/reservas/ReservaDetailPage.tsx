import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AsyncState } from '../../shared/components/AsyncState'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { useAsyncQuery } from '../../shared/components/useAsyncQuery'
import { isApiError } from '../../shared/http/client'
import { OperationError } from './components/OperationError'
import { ReservaNoEncontrada } from './components/ReservaNoEncontrada'
import { reservasApi } from './reservasApi'
import { etiquetaEstadoReserva, formatearFecha } from './reservasFormato'
import type { CambioEstadoReserva, Reserva } from './types'
import './reservas.css'

type Carga = { encontrado: false } | { encontrado: true; reserva: Reserva }

export function ReservaDetailPage() {
  const { id = '' } = useParams()
  const load = useCallback(async (signal: AbortSignal): Promise<Carga> => {
    try {
      return { encontrado: true, reserva: await reservasApi.obtener(id, signal) }
    } catch (error) {
      if (isApiError(error) && error.status === 404) return { encontrado: false }
      throw error
    }
  }, [id])
  const { state, retry } = useAsyncQuery(load)

  return <AsyncState state={state} onRetry={retry}>
    {(carga) => carga.encontrado
      ? <DetalleReserva key={carga.reserva.id} reserva={carga.reserva} onActualizar={retry} />
      : <ReservaNoEncontrada id={id} />}
  </AsyncState>
}

function DetalleReserva({ reserva, onActualizar }: { reserva: Reserva; onActualizar: () => void }) {
  const [cambioPendiente, setCambioPendiente] = useState<CambioEstadoReserva | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [aviso, setAviso] = useState('')
  const permiteCambios = reserva.estado === 'PENDIENTE'

  async function cambiarEstado() {
    if (!cambioPendiente) return
    const estado = cambioPendiente
    await reservasApi.cambiarEstado(reserva.id, estado)
    setCambioPendiente(null)
    setError(null)
    setAviso(estado === 'CONFIRMADA' ? 'La reserva se confirmó correctamente.' : 'La reserva se canceló correctamente.')
    onActualizar()
  }

  return <>
    <section className="page-heading">
      <div>
        <p className="eyebrow">RESERVA {reserva.id}</p>
        <h1>Detalle de reserva</h1>
      </div>
      <Link className="button button-secondary" to="/app/reservas">Buscar otra</Link>
    </section>

    {aviso && <div className="notice reservas-notice" role="status">{aviso}</div>}
    <OperationError error={error} />

    <dl className="reservas-summary">
      <div><dt>Identificador</dt><dd>{reserva.id}</dd></div>
      <div><dt>Estado</dt><dd><span className={`reservas-status is-${reserva.estado.toLowerCase()}`}>{etiquetaEstadoReserva(reserva.estado)}</span></dd></div>
      <div><dt>Pasajero</dt><dd>{reserva.pasajeroId}</dd></div>
      <div><dt>Vuelo</dt><dd>{reserva.vueloId}</dd></div>
      <div><dt>Asiento</dt><dd>{reserva.asientoId}</dd></div>
      <div><dt>Fecha de creación</dt><dd>{formatearFecha(reserva.fechaCreacion)}</dd></div>
    </dl>

    {permiteCambios && <section className="reservas-actions" aria-label="Acciones de reserva">
      <h2>Acciones disponibles</h2>
      <p className="muted">El servicio decide si el cambio procede y devuelve el motivo cuando una regla lo impide.</p>
      <div>
        <button className="button button-primary" type="button" onClick={() => { setError(null); setCambioPendiente('CONFIRMADA') }}>
          Confirmar reserva
        </button>
        <button className="button button-danger" type="button" onClick={() => { setError(null); setCambioPendiente('CANCELADA') }}>
          Cancelar reserva
        </button>
      </div>
    </section>}

    {!permiteCambios && <p className="reservas-locked" role="status">
      No hay acciones disponibles para una reserva en estado {etiquetaEstadoReserva(reserva.estado).toLowerCase()}.
    </p>}

    <ConfirmDialog
      open={cambioPendiente !== null}
      title={cambioPendiente === 'CONFIRMADA' ? 'Confirmar reserva' : 'Cancelar reserva'}
      description={cambioPendiente === 'CONFIRMADA'
        ? `Vas a confirmar la reserva ${reserva.id}. El servicio validará que la operación esté permitida.`
        : `Vas a cancelar la reserva ${reserva.id}. Esta acción puede no ser reversible.`}
      confirmLabel={cambioPendiente === 'CONFIRMADA' ? 'Confirmar reserva' : 'Cancelar reserva'}
      destructive={cambioPendiente === 'CANCELADA'}
      onConfirm={cambiarEstado}
      onError={(operationError) => { setCambioPendiente(null); setError(operationError) }}
      onCancel={() => setCambioPendiente(null)}
    />
  </>
}
