import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AsyncState } from '../components/AsyncState'
import { classLabel } from '../mocks'
import { getApiErrorStatus, isAbortError, vuelosApi } from '../vuelosApi'
import type { Asiento, VueloDetalle } from '../types'
import { agruparAsientos, buildReservarUrl, formatFechaLarga, formatHora, isPasada, parseNumeroAsiento } from '../utils'

const validId = /^[A-Za-z0-9_-]{1,20}$/
type ClassFilter = 'TODAS' | Asiento['clase']

export function VueloDetallePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [flight, setFlight] = useState<VueloDetalle | null>(null)
  const [seats, setSeats] = useState<Asiento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<ClassFilter>('TODAS')
  const [notice, setNotice] = useState('')
  const [reload, setReload] = useState(0)
  const refreshController = useRef<AbortController | null>(null)
  const past = Boolean(flight && isPasada(flight.fecha, flight.hora))
  const requestedSeat = searchParams.get('asiento')
  const validSelection = seats.find((seat) => seat.numero.toUpperCase() === requestedSeat?.toUpperCase() && !seat.ocupado)
  const selected = validSelection && !past ? validSelection.numero : null

  useEffect(() => {
    if (!validId.test(id)) { navigate('/no-encontrado', { replace: true }); return }
    const controller = new AbortController()
    Promise.all([vuelosApi.get(id, controller.signal), vuelosApi.seats(id, controller.signal)]).then(([flightData, seatData]) => {
      if (controller.signal.aborted) return
      setFlight(flightData)
      setSeats(seatData)
    }).catch((reason: unknown) => {
      if (controller.signal.aborted || isAbortError(reason)) return
      if (getApiErrorStatus(reason) === 404) navigate('/no-encontrado', { replace: true })
      else setError(true)
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, navigate, reload])

  useEffect(() => {
    if (!requestedSeat || !seats.length) return
    if (!validSelection || past) {
      const next = new URLSearchParams(searchParams)
      next.delete('asiento')
      setSearchParams(next, { replace: true })
    }
  }, [seats, requestedSeat, validSelection, past, searchParams, setSearchParams])

  useEffect(() => () => refreshController.current?.abort(), [id])

  const refresh = useCallback(async () => {
    const previous = selected
    refreshController.current?.abort()
    const controller = new AbortController()
    refreshController.current = controller
    setRefreshing(true)
    setNotice('')
    try {
      const nextSeats = await vuelosApi.seats(id, controller.signal)
      if (controller.signal.aborted) return
      setSeats(nextSeats)
      if (previous && !nextSeats.some((seat) => seat.numero === previous && !seat.ocupado)) {
        const query = new URLSearchParams(searchParams)
        query.delete('asiento')
        setSearchParams(query, { replace: true })
        setNotice('Ese asiento se acaba de ocupar, elige otro')
      }
    } catch (reason) {
      if (!controller.signal.aborted && !isAbortError(reason)) setNotice('No pudimos actualizar la disponibilidad. Inténtalo de nuevo.')
    } finally { if (!controller.signal.aborted) setRefreshing(false) }
  }, [id, selected, searchParams, setSearchParams])

  const grouped = useMemo(() => agruparAsientos(seats).filter((group) => filter === 'TODAS' || filter === group.clase), [seats, filter])
  const available = seats.filter((seat) => !seat.ocupado).length
  const occupied = seats.length - available
  const selectedSeat = seats.find((seat) => seat.numero === selected)

  function choose(seat: Asiento) {
    if (seat.ocupado || past) return
    const query = new URLSearchParams(searchParams)
    query.set('asiento', seat.numero)
    setSearchParams(query, { replace: true })
    setNotice('')
  }

  if (loading) return <main className="page-content"><AsyncState kind="loading" title="Cargando detalles del vuelo" message="Estamos consultando la ruta y sus asientos." /></main>
  if (error) return <main className="page-content"><AsyncState kind="error" title="No pudimos cargar este vuelo" message="No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo." retry={() => { setError(false); setLoading(true); setReload((value) => value + 1) }} /></main>
  if (!flight) return null

  return (
    <main className="page-content detail-page">
      <Link className="back-link" to="/vuelos"><span aria-hidden="true">←</span> Volver a vuelos</Link>
      <section className="detail-hero">
        <div className="detail-topline"><span className="eyebrow">DETALLE DE VUELO</span><span className="flight-number">{flight.id}</span></div>
        <div className="detail-route"><div><small>ORIGEN</small><h1>{flight.origen}</h1></div><div className="detail-route-line" aria-hidden="true"><span>✈</span></div><div><small>DESTINO</small><h1>{flight.destino}</h1></div></div>
        <div className="detail-meta"><span><small>FECHA DE SALIDA</small><strong>{formatFechaLarga(flight.fecha)}</strong></span><span><small>HORA LOCAL</small><strong>{formatHora(flight.hora)} h</strong></span></div>
      </section>

      {past && <div className="notice notice-past" role="status"><span aria-hidden="true">ⓘ</span> Este vuelo ya no admite reservaciones.</div>}
      <section className="availability-section" aria-labelledby="availability-title">
        <div className="section-heading availability-heading"><div><span className="eyebrow">ELIGE TU LUGAR</span><h2 id="availability-title">Disponibilidad de asientos</h2></div><button className="button button-secondary refresh-button" type="button" onClick={refresh} disabled={refreshing}><span aria-hidden="true">↻</span> {refreshing ? 'Actualizando…' : 'Actualizar disponibilidad'}</button></div>
        <div className="stats-grid" aria-live="polite"><div className="stat-card"><small>CAPACIDAD TOTAL</small><strong>{flight.capacidadTotal ?? seats.length}</strong><span>asientos</span></div><div className="stat-card stat-available"><small>DISPONIBLES</small><strong>{available}</strong><span>para elegir</span></div><div className="stat-card"><small>OCUPADOS</small><strong>{occupied}</strong><span>reservados</span></div><div className="stat-card class-stat"><small>EJECUTIVA <b>{seats.filter((seat) => seat.clase === 'EJECUTIVA' && !seat.ocupado).length} libres</b></small><small>ECONÓMICA <b>{seats.filter((seat) => seat.clase === 'ECONOMICA' && !seat.ocupado).length} libres</b></small></div></div>
        <div className="seat-tools"><div className="seat-legend" aria-label="Leyenda de asientos"><span><i className="legend-seat" /> Libre</span><span><i className="legend-seat legend-occupied">×</i> Ocupado</span><span><i className="legend-seat legend-selected">✓</i> Seleccionado</span></div><label className="class-select">Clase <select value={filter} onChange={(event) => setFilter(event.target.value as ClassFilter)}><option value="TODAS">Todas</option><option value="EJECUTIVA">Ejecutiva</option><option value="ECONOMICA">Económica</option></select></label></div>
        {notice && <p className="availability-notice" role="status">{notice}</p>}

        {seats.length === 0 ? <AsyncState kind="empty" title="Este vuelo no tiene asientos configurados" message="No hay asientos para mostrar. Vuelve a consultar otros vuelos." action={<Link className="button button-secondary" to="/vuelos">Explorar otros vuelos</Link>} /> : available === 0 ? <AsyncState kind="empty" title="Este vuelo está lleno" message="Por ahora no quedan asientos disponibles en esta ruta." action={<Link className="button button-secondary" to="/vuelos">Ver otros vuelos</Link>} /> : (
          <div className="seat-map-wrap">
            {grouped.map((group) => <section className="seat-class" key={group.clase} aria-label={`Clase ${classLabel(group.clase)}`}><div className="seat-class-heading"><h3>{classLabel(group.clase)}</h3><span>{seats.filter((seat) => seat.clase === group.clase && !seat.ocupado).length} disponibles</span></div><div className="seat-map-scroll"><div className="seat-map">{group.filas.map(({ fila, asientos: row }) => <div className="seat-row" key={`${group.clase}-${fila}`}><span className="row-number">{fila}</span><div className="seat-group">{row.map((seat) => {
              const chosen = seat.numero === selected
              const { columna } = parseNumeroAsiento(seat.numero)
              return <button key={seat.id} className={`seat ${seat.ocupado ? 'seat-occupied' : ''} ${chosen ? 'seat-selected' : ''}`} type="button" disabled={seat.ocupado || past} aria-pressed={chosen} aria-label={`Asiento ${seat.numero}, ${classLabel(seat.clase).toLowerCase()}, ${seat.ocupado ? 'ocupado' : chosen ? 'seleccionado' : 'libre'}`} onClick={() => choose(seat)}>{seat.ocupado ? <span aria-hidden="true">×</span> : chosen ? <span aria-hidden="true">✓</span> : columna}</button>
            })}</div></div>)}</div></div></section>)}
          </div>
        )}

        <div className="reservation-bar"><div className="selection-summary"><span className="selection-icon" aria-hidden="true">⌖</span><span><small>ASIENTO ELEGIDO</small><strong>{selectedSeat ? `${selectedSeat.numero} · ${classLabel(selectedSeat.clase)}` : 'Selecciona un asiento libre'}</strong></span></div><button className="button button-primary" type="button" disabled={!selectedSeat || past} onClick={() => selectedSeat && navigate(buildReservarUrl(flight.id, selectedSeat.id))}>Reservar este asiento <span aria-hidden="true">→</span></button></div>
      </section>
    </main>
  )
}
