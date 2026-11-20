import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AsyncState } from '../../shared/components/AsyncState'
import { DataTable, type DataColumn } from '../../shared/components/DataTable'
import { FormField } from '../../shared/components/FormField'
import { useAsyncQuery } from '../../shared/components/useAsyncQuery'
import type { FiltrosVuelos, VueloResumen } from './types'
import { vuelosApi } from './vuelosApi'
import { vuelosCapabilities } from './vuelosConfig'
import { filtrarVuelos, ordenarVuelos } from './vuelosFiltros'
import { avisoDesdeEstado, formatearFecha } from './vuelosFormato'
import './vuelos.css'

const FILTROS_VACIOS: FiltrosVuelos = { q: '', desde: '', hasta: '' }

function filtrosDesdeBusqueda(search: string): FiltrosVuelos {
  const params = new URLSearchParams(search)
  return { q: params.get('q') ?? '', desde: params.get('desde') ?? '', hasta: params.get('hasta') ?? '' }
}

function busquedaDesdeFiltros(filtros: FiltrosVuelos): string {
  const params = new URLSearchParams()
  if (filtros.q) params.set('q', filtros.q)
  if (filtros.desde) params.set('desde', filtros.desde)
  if (filtros.hasta) params.set('hasta', filtros.hasta)
  const texto = params.toString()
  return texto ? `?${texto}` : ''
}

export function VuelosListPage() {
  const location = useLocation()
  const aviso = avisoDesdeEstado(location.state)
  const load = useCallback((signal: AbortSignal) => vuelosApi.listar(signal), [])
  const { state, retry } = useAsyncQuery(load)

  const [filtros, setFiltros] = useState<FiltrosVuelos>(() => filtrosDesdeBusqueda(location.search))
  const hayFiltros = Boolean(filtros.q || filtros.desde || filtros.hasta)
  const from = busquedaDesdeFiltros(filtros)

  useEffect(() => {
    if (window.location.search === from) return
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${from}`)
  }, [from])

  function cambiarFiltro(clave: keyof FiltrosVuelos, valor: string) {
    setFiltros((actuales) => ({ ...actuales, [clave]: valor }))
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS)
  }

  const columnas: DataColumn<VueloResumen>[] = useMemo(() => [
    { key: 'id', header: 'Vuelo', isRowHeader: true, render: (v) => <Link to={`/app/vuelos/${encodeURIComponent(v.id)}`} state={{ from }}>{v.id}</Link> },
    { key: 'origen', header: 'Origen', render: (v) => v.origen },
    { key: 'destino', header: 'Destino', render: (v) => v.destino },
    { key: 'fecha', header: 'Fecha', render: (v) => formatearFecha(v.fecha) },
    { key: 'hora', header: 'Hora', render: (v) => v.hora },
    { key: 'capacidad', header: 'Asientos', render: (v) => v.capacidadTotal },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (v) => <span className="vuelos-actions">
        <Link to={`/app/vuelos/${encodeURIComponent(v.id)}`} state={{ from }} aria-label={`Ver detalle del vuelo ${v.id}`}>Ver</Link>
        {vuelosCapabilities.editar && <Link to={`/app/vuelos/${encodeURIComponent(v.id)}/editar`} state={{ from }} aria-label={`Editar vuelo ${v.id}`}>Editar</Link>}
      </span>,
    },
  ], [from])

  return <>
    <section className="page-heading">
      <div><p className="eyebrow">VUELOS</p><h1>Vuelos</h1><p className="muted">Consulta y registra los vuelos disponibles en el sistema.</p></div>
      <Link className="button button-primary" to="/app/vuelos/nuevo" state={{ from }}>Nuevo vuelo</Link>
    </section>

    {aviso && <div className="notice vuelos-notice" role="status">{aviso}</div>}

    <form className="vuelos-filters" role="search" aria-label="Filtrar vuelos" onSubmit={(event) => event.preventDefault()}>
      <FormField id="filtro-q" label="Buscar" type="search" placeholder="Id, origen o destino" value={filtros.q} onChange={(e) => cambiarFiltro('q', e.target.value)} />
      <FormField id="filtro-desde" label="Fecha desde" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => cambiarFiltro('desde', e.target.value)} />
      <FormField id="filtro-hasta" label="Fecha hasta" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => cambiarFiltro('hasta', e.target.value)} />
      <button className="button button-secondary" type="button" disabled={!hayFiltros} onClick={limpiarFiltros}>Limpiar filtros</button>
    </form>

    <AsyncState state={state} onRetry={retry} isEmpty={(vuelos) => vuelos.length === 0} emptyMessage="Todavía no hay vuelos registrados. Crea el primero con «Nuevo vuelo».">
      {(vuelos) => {
        const visibles = ordenarVuelos(filtrarVuelos(vuelos, filtros))
        if (visibles.length === 0) {
          return <div className="async-state" role="status">
            <p>Ningún vuelo coincide con los filtros aplicados.</p>
            <button className="button button-secondary" type="button" onClick={limpiarFiltros}>Limpiar filtros</button>
          </div>
        }
        return <>
          <p className="vuelos-count" role="status">Mostrando {visibles.length} de {vuelos.length} vuelos</p>
          <DataTable rows={visibles} columns={columnas} caption="Listado de vuelos" />
        </>
      }}
    </AsyncState>
  </>
}