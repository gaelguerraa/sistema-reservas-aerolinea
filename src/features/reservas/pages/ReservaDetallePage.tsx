import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../shared/http/client'
import { AsyncState } from '../../vuelos/components/AsyncState'
import { formatFechaLarga, formatHora } from '../../vuelos/utils'
import { getApiErrorStatus, isAbortError } from '../../vuelos/vuelosApi'
import { conVuelos } from '../cargarVuelos'
import { Aviso } from '../components/Aviso'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EstadoBadge } from '../components/EstadoBadge'
import { MensajeCancelacion } from '../components/MensajeCancelacion'
import { reservasApi } from '../reservasApi'
import type { ReservaConVuelo } from '../types'
import { useCancelacion, type AvisoReserva } from '../useCancelacion'
import { ESTADO_ETIQUETA, etiquetaAsiento, formatFechaCreacion, motivoNoCancelable, puedeCancelar } from '../utils'
import '../reservas.css'

export function ReservaDetallePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const avisoAlLlegar = (location.state as { aviso?: string } | null)?.aviso
  const [avisoCreacion, setAvisoCreacion] = useState<AvisoReserva | null>(avisoAlLlegar ? { tipo: 'exito', texto: avisoAlLlegar } : null)
  const [item, setItem] = useState<ReservaConVuelo | null>(null)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)

  const cancelacion = useCancelacion(
    (actualizada) => setItem((actual) => (actual ? { ...actual, reserva: actualizada } : actual)),
    (apiError) => { if (apiError.kind === 'CONFLICTO') setReload((value) => value + 1) },
  )

  // El aviso de "reservación creada" se muestra una vez; al recargar ya no aparece.
  useEffect(() => {
    if (avisoAlLlegar) navigate(location.pathname, { replace: true, state: null })
  }, [avisoAlLlegar, location.pathname, navigate])

  useEffect(() => {
    const controller = new AbortController()
    reservasApi.obtener(id, controller.signal)
      .then((reserva) => conVuelos([reserva], controller.signal))
      .then(([data]) => {
        if (controller.signal.aborted) return
        setItem(data)
        setError(false)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || isAbortError(reason)) return
        if (reason instanceof ApiError && reason.kind === 'NO_AUTENTICADO') return
        // Inexistente, de otra persona o con id inválido: para el cliente es "no encontrada".
        const status = getApiErrorStatus(reason)
        if (status === 404 || status === 403 || status === 400) navigate('/no-encontrado', { replace: true })
        else setError(true)
      })
    return () => controller.abort()
  }, [id, navigate, reload])

  if (error) {
    return <main className="page-content"><AsyncState kind="error" title="No pudimos cargar tu reservación" message="No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo." retry={() => { setError(false); setItem(null); setReload((value) => value + 1) }} /></main>
  }
  if (!item) {
    return <main className="page-content"><AsyncState kind="loading" title="Cargando tu reservación" message="Estamos consultando los datos de tu viaje." /></main>
  }

  const { reserva, vuelo } = item
  const cancelable = puedeCancelar(item)
  const aviso = cancelacion.aviso ?? avisoCreacion

  return (
    <main className="page-content reserva-detalle">
      <Link className="back-link" to="/reservas"><span aria-hidden="true">←</span> Mis reservaciones</Link>

      {aviso && <Aviso aviso={aviso} onCerrar={() => { cancelacion.cerrarAviso(); setAvisoCreacion(null) }} />}

      <section className="reserva-hero">
        <div className="reserva-hero-top">
          <span className="eyebrow">RESERVACIÓN {reserva.id}</span>
          <EstadoBadge estado={reserva.estado} />
        </div>
        <h1>
          {vuelo ? <>{vuelo.origen} <span aria-hidden="true">→</span><span className="sr-only">a</span> {vuelo.destino}</> : `Vuelo ${reserva.vueloId}`}
        </h1>
        <dl className="reserva-hero-meta">
          <div><dt>Vuelo</dt><dd>{reserva.vueloId}</dd></div>
          <div><dt>Fecha de salida</dt><dd>{vuelo ? formatFechaLarga(vuelo.fecha) : 'Por confirmar'}</dd></div>
          <div><dt>Hora local</dt><dd>{vuelo ? `${formatHora(vuelo.hora)} h` : '—'}</dd></div>
        </dl>
      </section>

      <section className="reserva-info" aria-labelledby="info-title">
        <h2 id="info-title">Datos de la reservación</h2>
        <dl className="reserva-datos reserva-datos-detalle">
          <div><dt>Asiento</dt><dd>{etiquetaAsiento(item)}</dd></div>
          <div><dt>Estado</dt><dd>{ESTADO_ETIQUETA[reserva.estado]}</dd></div>
          <div><dt>Creada el</dt><dd>{formatFechaCreacion(reserva.fechaCreacion)}</dd></div>
          <div><dt>Número de reservación</dt><dd>{reserva.id}</dd></div>
        </dl>
        <div className="reserva-acciones">
          {cancelable
            ? <button className="button button-danger-outline" type="button" onClick={() => { setAvisoCreacion(null); cancelacion.pedirConfirmacion(reserva) }}>Cancelar reservación</button>
            : <p className="reserva-nota">{motivoNoCancelable(item)}</p>}
          {vuelo && <Link className="button button-secondary" to={`/vuelos/${encodeURIComponent(vuelo.id)}`}>Ver el vuelo</Link>}
        </div>
      </section>

      {cancelacion.porConfirmar && (
        <ConfirmDialog
          titulo="¿Cancelar esta reservación?"
          confirmarTexto="Sí, cancelar reservación"
          cancelarTexto="No, conservarla"
          ocupado={cancelacion.cancelando}
          onConfirmar={cancelacion.confirmar}
          onCerrar={cancelacion.cerrarDialogo}
        >
          <MensajeCancelacion item={item} />
        </ConfirmDialog>
      )}
    </main>
  )
}
