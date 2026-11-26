import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AsyncState } from '../../shared/components/AsyncState'
import { DataTable, type DataColumn } from '../../shared/components/DataTable'
import { FormField } from '../../shared/components/FormField'
import { useAsyncQuery } from '../../shared/components/useAsyncQuery'
import { etiquetaEstadoReserva, formatearFecha } from './reservasFormato'
import { reservasApi } from './reservasApi'
import type { FiltrosReservas, ReservaAgenda } from './types'
import './reservas.css'

const FILTROS_VACIOS: FiltrosReservas = {
  desde: '',
  hasta: '',
  vueloId: '',
  estado: '',
  pasajeroId: '',
}

function filtrosDesdeBusqueda(search: string): FiltrosReservas {
  const params = new URLSearchParams(search)
  return {
    desde: params.get('desde') ?? '',
    hasta: params.get('hasta') ?? '',
    vueloId: params.get('vueloId') ?? '',
    estado: (params.get('estado') as FiltrosReservas['estado']) ?? '',
    pasajeroId: params.get('pasajeroId') ?? '',
  }
}

function busquedaDesdeFiltros(filtros: FiltrosReservas): string {
  const params = new URLSearchParams()
  if (filtros.desde) params.set('desde', filtros.desde)
  if (filtros.hasta) params.set('hasta', filtros.hasta)
  if (filtros.vueloId) params.set('vueloId', filtros.vueloId)
  if (filtros.estado) params.set('estado', filtros.estado)
  if (filtros.pasajeroId) params.set('pasajeroId', filtros.pasajeroId)
  const texto = params.toString()
  return texto ? `?${texto}` : ''
}

export function ReservasListPage() {
  const location = useLocation()
  const aviso = typeof location.state === 'object' && location.state !== null
    && 'aviso' in location.state
    ? String(location.state.aviso)
    : ''
  const [filtros, setFiltros] = useState<FiltrosReservas>(() => filtrosDesdeBusqueda(location.search))
  const load = useCallback((signal: AbortSignal) => reservasApi.listar(filtros, signal), [filtros])
  const { state, retry } = useAsyncQuery(load)
  const hayFiltros = Object.values(filtros).some(Boolean)
  const from = busquedaDesdeFiltros(filtros)

  useEffect(() => {
    if (window.location.search === from) return
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${from}`)
  }, [from])

  function cambiarFiltro(clave: keyof FiltrosReservas, valor: string) {
    setFiltros((actuales) => ({ ...actuales, [clave]: valor }))
  }

  const columnas: DataColumn<ReservaAgenda>[] = useMemo(() => [
    { key: 'id', header: 'Reserva', isRowHeader: true, render: (r) => <Link to={`/app/reservas/${encodeURIComponent(r.id)}`} state={{ from }}>{r.id}</Link> },
    { key: 'pasajero', header: 'Pasajero', render: (r) => r.pasajero.nombre },
    { key: 'vuelo', header: 'Vuelo', render: (r) => `${r.vuelo.origen} → ${r.vuelo.destino}` },
    { key: 'fecha', header: 'Fecha', render: (r) => formatearFecha(r.vuelo.fecha) },
    { key: 'hora', header: 'Hora', render: (r) => r.vuelo.hora },
    { key: 'asiento', header: 'Asiento', render: (r) => r.asiento.numero },
    { key: 'estado', header: 'Estado', render: (r) => etiquetaEstadoReserva(r.estado) },
  ], [from])

  return <>
    <section className="page-heading">
      <div>
        <p className="eyebrow">RESERVAS</p>
        <h1>Agenda de reservas</h1>
        <p className="muted">Consulta reservas por periodo, vuelo, pasajero y estado.</p>
      </div>
      <Link className="button button-primary" to="/app/reservas/nueva" state={{ from }}>Nueva reserva</Link>
    </section>

    {aviso && <div className="notice reservas-notice" role="status">{aviso}</div>}

    <form className="reservas-filters" role="search" aria-label="Filtrar reservas" onSubmit={(event) => event.preventDefault()}>
      <FormField id="reserva-desde" label="Fecha desde" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(event) => cambiarFiltro('desde', event.target.value)} />
      <FormField id="reserva-hasta" label="Fecha hasta" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(event) => cambiarFiltro('hasta', event.target.value)} />
      <FormField id="reserva-vuelo" label="Vuelo" placeholder="ID del vuelo" value={filtros.vueloId} onChange={(event) => cambiarFiltro('vueloId', event.target.value)} />
      <FormField id="reserva-pasajero" label="Pasajero" placeholder="ID del pasajero" value={filtros.pasajeroId} onChange={(event) => cambiarFiltro('pasajeroId', event.target.value)} />
      <div className="form-field">
        <label htmlFor="reserva-estado">Estado</label>
        <select id="reserva-estado" value={filtros.estado} onChange={(event) => cambiarFiltro('estado', event.target.value)}>
          <option value="">Todos</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="CONFIRMADA">Confirmada</option>
          <option value="CANCELADA">Cancelada</option>
          <option value="COMPLETADA">Completada</option>
        </select>
      </div>
      <button className="button button-secondary" type="button" disabled={!hayFiltros} onClick={() => setFiltros(FILTROS_VACIOS)}>Limpiar filtros</button>
    </form>

    <AsyncState
      state={state}
      onRetry={retry}
      isEmpty={(reservas) => reservas.length === 0}
      emptyMessage="No hay reservas que coincidan con los filtros."
    >
      {(reservas) => <>
        <p className="reservas-count" role="status">Mostrando {reservas.length} reservas</p>
        <DataTable rows={reservas} columns={columnas} caption="Listado de reservas" />
      </>}
    </AsyncState>
  </>
}
