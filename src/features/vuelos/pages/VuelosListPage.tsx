import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AsyncState } from '../components/AsyncState'
import { isAbortError, vuelosApi } from '../vuelosApi'
import type { Vuelo } from '../types'
import { formatFechaLarga, formatHora, isPasada, ordenarVuelos, toYmd } from '../utils'

export function VuelosListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [flights, setFlights] = useState<Vuelo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const origin = searchParams.get('origen') ?? ''
  const destination = searchParams.get('destino') ?? ''
  const date = searchParams.get('fecha') ?? ''

  useEffect(() => {
    const controller = new AbortController()
    vuelosApi.list(controller.signal).then((data) => { if (!controller.signal.aborted) setFlights(data) }).catch((reason: unknown) => {
      if (!controller.signal.aborted && !isAbortError(reason)) setError(true)
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])

  const visibleFlights = useMemo(() => ordenarVuelos(flights.filter((flight) =>
    !isPasada(flight.fecha, flight.hora) &&
    flight.origen.toLocaleLowerCase('es-MX').includes(origin.trim().toLocaleLowerCase('es-MX')) &&
    flight.destino.toLocaleLowerCase('es-MX').includes(destination.trim().toLocaleLowerCase('es-MX')) &&
    (!date || flight.fecha.slice(0, 10) === date),
  )), [flights, origin, destination, date])

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const hasFilters = Boolean(origin || destination || date)

  return (
    <main className="page-content">
      <section className="catalog-hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-line" /> TU PRÓXIMA HISTORIA COMIENZA AQUÍ</span>
          <h1>Encuentra tu<br /><em>próximo destino.</em></h1>
          <p>Explora rutas, compara horarios y elige el asiento que hará tu viaje aún mejor.</p>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="sun-disc" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="plane-mark">✈</span><span className="hero-coordinate">MX · WORLD</span></div>
        <div className="hero-bottom"><span>VIAJES QUE TE ACERCAN</span><span>01 — 07</span></div>
      </section>

      <section className="catalog-section" aria-labelledby="flights-title">
        <div className="section-heading">
          <div><span className="eyebrow">CATÁLOGO DE RUTAS</span><h2 id="flights-title">Vuelos programados</h2></div>
          <span className="catalog-note">Encuentra la ruta ideal para ti <span aria-hidden="true">↗</span></span>
        </div>
        <form className="filter-panel" onSubmit={(event) => event.preventDefault()} aria-label="Filtrar vuelos">
          <label><span>Origen</span><input value={origin} onChange={(event) => updateFilter('origen', event.target.value)} placeholder="¿Desde dónde?" /></label>
          <label><span>Destino</span><input value={destination} onChange={(event) => updateFilter('destino', event.target.value)} placeholder="¿A dónde vas?" /></label>
          <label><span>Fecha de salida</span><input type="date" value={date} onChange={(event) => updateFilter('fecha', event.target.value)} /></label>
          {hasFilters && <button className="clear-filters" type="button" onClick={() => setSearchParams({}, { replace: true })}>Limpiar filtros <span aria-hidden="true">×</span></button>}
        </form>

        {loading ? <AsyncState kind="loading" title="Preparando tus opciones" message="Estamos buscando vuelos disponibles." /> : error ? <AsyncState kind="error" title="No pudimos cargar los vuelos" message="No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo." retry={() => { setError(false); setLoading(true); setReload((value) => value + 1) }} /> : flights.length === 0 ? <AsyncState kind="empty" title="Aún no hay vuelos programados" message="Vuelve pronto para descubrir nuevas rutas." /> : visibleFlights.length === 0 ? <AsyncState kind="empty" title="No encontramos vuelos con esos filtros" message="Prueba con otro origen, destino o fecha." action={<button className="button button-secondary" type="button" onClick={() => setSearchParams({}, { replace: true })}>Limpiar filtros</button>} /> : (
          <div className="flight-grid">
            {visibleFlights.map((flight) => <Link className="flight-card" to={`/vuelos/${encodeURIComponent(flight.id)}`} key={flight.id} aria-label={`Vuelo ${flight.id}, ${flight.origen} a ${flight.destino}, ${formatFechaLarga(flight.fecha)}, ${formatHora(flight.hora)}`}>
              <div className="flight-card-top"><span className="flight-number">{flight.id}</span><span className="card-arrow" aria-hidden="true">↗</span></div>
              <div className="flight-route"><strong>{flight.origen}</strong><span className="route-line" aria-hidden="true"><i>✈</i></span><strong>{flight.destino}</strong></div>
              <div className="flight-meta"><span><small>FECHA</small>{formatFechaLarga(flight.fecha)}</span><span><small>SALIDA</small>{formatHora(flight.hora)} h</span></div>
              <div className="flight-card-bottom"><span>Ver disponibilidad</span><span aria-hidden="true">→</span></div>
            </Link>)}
          </div>
        )}
        {!loading && !error && visibleFlights.length > 0 && <p className="result-count">{visibleFlights.length} {visibleFlights.length === 1 ? 'vuelo encontrado' : 'vuelos encontrados'} <span>·</span> Actualizado {formatFechaLarga(toYmd(new Date()))}</p>}
      </section>
      <section className="catalog-callout"><span className="callout-icon" aria-hidden="true">✦</span><p>¿Ya sabes a dónde quieres ir? <strong>Tu asiento perfecto te espera.</strong></p><span className="callout-caption">ELIGE TU RUTA, DESPUÉS TU ASIENTO</span></section>
    </main>
  )
}
