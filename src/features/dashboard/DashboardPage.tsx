import { useCallback } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { useAsyncQuery } from '../../shared/components/useAsyncQuery'
import { dashboardApi } from './dashboardApi'

export function DashboardPage() {
  const load = useCallback((signal: AbortSignal) => dashboardApi.get(signal), [])
  const { state, retry } = useAsyncQuery(load)
  const fixtures = import.meta.env.VITE_USE_FIXTURES === 'true'

  return <div className="dashboard-page">
    <div className="page-heading"><div><p className="eyebrow">RESUMEN OPERATIVO</p><h1>Tablero</h1><p className="muted">Resumen de información para la operación administrativa.</p></div></div>
    {fixtures && <p className="fixture-banner" role="status">Datos de ejemplo · no representan información real del servicio.</p>}
    {!fixtures && <p className="pending-banner" role="note">El endpoint y las métricas del tablero están pendientes de definición con el catálogo de casos de uso.</p>}
    <AsyncState state={state} isEmpty={(metrics) => metrics.length === 0} emptyMessage="Todavía no hay indicadores para mostrar." onRetry={retry}>
      {(metrics) => <section className="metric-grid" aria-label="Indicadores del tablero">
        {metrics.map((metric) => <article className="metric-card" key={metric.id}>
          <h2>{metric.label}</h2><p className="metric-value">{metric.value}</p>{metric.description && <p className="muted">{metric.description}</p>}
        </article>)}
      </section>}
    </AsyncState>
  </div>
}
