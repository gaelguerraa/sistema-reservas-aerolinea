import { useCallback, useState, type FormEvent } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { useAsyncQuery } from '../../shared/components/useAsyncQuery'
import { dashboardApi, type DashboardPeriod, type DashboardSummary } from './dashboardApi'

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentMonthPeriod(): DashboardPeriod {
  const now = new Date()
  return {
    desde: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    hasta: formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

function isEmptySummary(summary: DashboardSummary): boolean {
  return summary.ocupacion.asientosTotales === 0 && summary.masSolicitados.length === 0 && summary.canceladas === 0
}

export function DashboardPage() {
  const [period, setPeriod] = useState(getCurrentMonthPeriod)
  const [draft, setDraft] = useState(period)
  const [periodError, setPeriodError] = useState('')
  const load = useCallback((signal: AbortSignal) => dashboardApi.get(period, signal), [period])
  const { state, retry } = useAsyncQuery(load)
  const fixtures = import.meta.env.VITE_USE_FIXTURES === 'true'

  function applyPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.desde || !draft.hasta) {
      setPeriodError('Selecciona una fecha de inicio y una fecha de fin.')
      return
    }
    if (draft.desde > draft.hasta) {
      setPeriodError('La fecha de inicio debe ser anterior o igual a la fecha de fin.')
      return
    }
    setPeriodError('')
    setPeriod({ ...draft })
  }

  return <div className="dashboard-page">
    <section className="page-heading">
      <div>
        <p className="eyebrow">RESUMEN OPERATIVO</p>
        <h1>Tablero</h1>
        <p className="muted">Ocupación, vuelos con más reservas y cancelaciones del periodo.</p>
      </div>
    </section>

    {fixtures && <p className="fixture-banner" role="status">Datos de ejemplo · no representan información real del servicio.</p>}

    <form className="dashboard-period" onSubmit={applyPeriod} aria-label="Filtrar resumen por fechas">
      <div className="form-field">
        <label htmlFor="dashboard-desde">Desde</label>
        <input id="dashboard-desde" type="date" required value={draft.desde} onChange={(event) => setDraft({ ...draft, desde: event.target.value })} />
      </div>
      <div className="form-field">
        <label htmlFor="dashboard-hasta">Hasta</label>
        <input id="dashboard-hasta" type="date" required value={draft.hasta} onChange={(event) => setDraft({ ...draft, hasta: event.target.value })} />
      </div>
      <button className="button button-primary" type="submit">Aplicar periodo</button>
      {periodError && <p className="field-error" role="alert">{periodError}</p>}
    </form>

    <AsyncState state={state} isEmpty={isEmptySummary} emptyMessage="No hay vuelos ni reservas para el periodo seleccionado." onRetry={retry}>
      {(summary) => <div className="dashboard-results">
        <p className="muted" aria-live="polite">Periodo: {summary.periodo.desde} al {summary.periodo.hasta}</p>
        <section className="metric-grid" aria-label="Indicadores del periodo">
          <article className="metric-card">
            <h2>Ocupación</h2>
            <p className="metric-value">{summary.ocupacion.porcentaje.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%</p>
            <p className="muted">Asientos reservados activamente sobre la capacidad total.</p>
          </article>
          <article className="metric-card">
            <h2>Asientos ocupados</h2>
            <p className="metric-value">{summary.ocupacion.asientosOcupados.toLocaleString('es-MX')}</p>
            <p className="muted">de {summary.ocupacion.asientosTotales.toLocaleString('es-MX')} asientos disponibles en los vuelos del periodo.</p>
          </article>
          <article className="metric-card">
            <h2>Reservas canceladas</h2>
            <p className="metric-value">{summary.canceladas.toLocaleString('es-MX')}</p>
            <p className="muted">Cancelaciones asociadas a vuelos del periodo.</p>
          </article>
        </section>

        <section className="dashboard-top-flights" aria-labelledby="dashboard-top-flights-title">
          <div className="section-heading">
            <div><p className="eyebrow">DEMANDA</p><h2 id="dashboard-top-flights-title">Vuelos más solicitados</h2></div>
          </div>
          {summary.masSolicitados.length === 0
            ? <p className="empty-inline">No hay reservas para comparar en este periodo.</p>
            : <div className="table-scroll"><table className="data-table">
              <thead><tr><th scope="col">Vuelo</th><th scope="col">Origen</th><th scope="col">Destino</th><th scope="col">Reservas</th></tr></thead>
              <tbody>{summary.masSolicitados.map((flight) => <tr key={flight.vueloId}>
                <td>{flight.vueloId}</td><td>{flight.origen}</td><td>{flight.destino}</td><td>{flight.reservas.toLocaleString('es-MX')}</td>
              </tr>)}</tbody>
            </table></div>}
        </section>
      </div>}
    </AsyncState>
  </div>
}
