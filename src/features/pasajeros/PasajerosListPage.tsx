import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AsyncState } from '../../shared/components/AsyncState'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { DataTable, type DataColumn } from '../../shared/components/DataTable'
import { FormField } from '../../shared/components/FormField'
import { useAsyncQuery } from '../../shared/components/useAsyncQuery'
import { OperationError } from './components/OperationError'
import type { FiltrosPasajeros, Pasajero } from './types'
import { pasajerosApi } from './pasajerosApi'
import { pasajerosCapabilities } from './pasajerosConfig'
import { avisoDesdeEstado, filtrarPasajeros, ordenarPasajeros } from './pasajerosFormato'
import './pasajeros.css'

const FILTROS_VACIOS: FiltrosPasajeros = { q: '' }
const POR_PAGINA = 10

function filtrosDesdeBusqueda(search: string): FiltrosPasajeros {
  const params = new URLSearchParams(search)
  return { q: params.get('q') ?? '' }
}

function busquedaDesdeFiltros(filtros: FiltrosPasajeros): string {
  const params = new URLSearchParams()
  if (filtros.q) params.set('q', filtros.q)
  const texto = params.toString()
  return texto ? `?${texto}` : ''
}

export function PasajerosListPage() {
  const location = useLocation()
  const [aviso, setAviso] = useState<string | null>(() => avisoDesdeEstado(location.state))
  const load = useCallback((signal: AbortSignal) => pasajerosApi.listar(signal), [])
  const { state, retry } = useAsyncQuery(load)

  const [filtros, setFiltros] = useState<FiltrosPasajeros>(() => filtrosDesdeBusqueda(location.search))
  const [pagina, setPagina] = useState(1)
  const [pasajeroBaja, setPasajeroBaja] = useState<Pasajero | null>(null)
  const [errorBaja, setErrorBaja] = useState<unknown>(null)

  const hayFiltros = Boolean(filtros.q)
  const from = busquedaDesdeFiltros(filtros)

  useEffect(() => {
    if (window.location.search === from) return
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${from}`)
  }, [from])

  function cambiarBusqueda(valor: string) {
    setFiltros({ q: valor })
    setPagina(1)
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS)
    setPagina(1)
  }

  async function confirmarBaja() {
    if (!pasajeroBaja) return
    const objetivo = pasajeroBaja
    await pasajerosApi.darDeBaja(objetivo.id)
    setPasajeroBaja(null)
    setErrorBaja(null)
    setAviso(`El pasajero ${objetivo.nombre} se dio de baja correctamente.`)
    retry()
  }

  const columnas: DataColumn<Pasajero>[] = useMemo(() => [
    {
      key: 'nombre',
      header: 'Nombre',
      isRowHeader: true,
      render: (p) => <Link to={`/app/pasajeros/${encodeURIComponent(p.id)}`} state={{ from }}>{p.nombre}</Link>,
    },
    { key: 'contacto', header: 'Correo de contacto', render: (p) => p.contacto },
    { key: 'id', header: 'Id', render: (p) => p.id },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (p) => <span className="pasajeros-actions">
        <Link to={`/app/pasajeros/${encodeURIComponent(p.id)}`} state={{ from }} aria-label={`Ver detalle de ${p.nombre}`}>Ver</Link>
        {pasajerosCapabilities.editar && (
          <Link to={`/app/pasajeros/${encodeURIComponent(p.id)}/editar`} state={{ from }} aria-label={`Editar a ${p.nombre}`}>Editar</Link>
        )}
        {pasajerosCapabilities.baja && (
          <button
            type="button"
            className="pasajeros-link-danger"
            aria-label={`Dar de baja a ${p.nombre}`}
            onClick={() => { setErrorBaja(null); setPasajeroBaja(p) }}
          >
            Dar de baja
          </button>
        )}
      </span>,
    },
  ], [from])

  return <>
    <section className="page-heading">
      <div>
        <p className="eyebrow">PASAJEROS</p>
        <h1>Pasajeros</h1>
        <p className="muted">Consulta, registra y administra los pasajeros del sistema.</p>
      </div>
      <Link className="button button-primary" to="/app/pasajeros/nuevo" state={{ from }}>Nuevo pasajero</Link>
    </section>

    {aviso && <div className="notice pasajeros-notice" role="status">{aviso}</div>}
    <OperationError error={errorBaja} />

    <form className="pasajeros-filters" role="search" aria-label="Filtrar pasajeros" onSubmit={(event) => event.preventDefault()}>
      <FormField
        id="filtro-pasajero-q"
        label="Buscar"
        type="search"
        placeholder="Nombre, correo o id"
        value={filtros.q}
        onChange={(e) => cambiarBusqueda(e.target.value)}
      />
      <button className="button button-secondary" type="button" disabled={!hayFiltros} onClick={limpiarFiltros}>Limpiar</button>
    </form>

    <AsyncState
      state={state}
      onRetry={retry}
      isEmpty={(pasajeros) => pasajeros.length === 0}
      emptyMessage="Todavía no hay pasajeros registrados. Crea el primero con «Nuevo pasajero»."
    >
      {(pasajeros) => {
        const visibles = ordenarPasajeros(filtrarPasajeros(pasajeros, filtros))
        if (visibles.length === 0) {
          return <div className="async-state" role="status">
            <p>Ningún pasajero coincide con la búsqueda aplicada.</p>
            <button className="button button-secondary" type="button" onClick={limpiarFiltros}>Limpiar búsqueda</button>
          </div>
        }

        const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA))
        const paginaActual = Math.min(pagina, totalPaginas)
        const inicio = (paginaActual - 1) * POR_PAGINA
        const paginados = visibles.slice(inicio, inicio + POR_PAGINA)

        return <>
          <p className="pasajeros-count" role="status">Mostrando {paginados.length} de {visibles.length} pasajeros</p>
          <DataTable rows={paginados} columns={columnas} caption="Listado de pasajeros" />
          {totalPaginas > 1 && (
            <nav className="pasajeros-pagination" aria-label="Paginación de pasajeros">
              <button
                className="button button-secondary"
                type="button"
                disabled={paginaActual <= 1}
                onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
              >
                Anterior
              </button>
              <span className="muted">Página {paginaActual} de {totalPaginas}</span>
              <button
                className="button button-secondary"
                type="button"
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      }}
    </AsyncState>

    <ConfirmDialog
      open={Boolean(pasajeroBaja)}
      title="Dar de baja al pasajero"
      description={pasajeroBaja
        ? `Vas a dar de baja a ${pasajeroBaja.nombre} (${pasajeroBaja.contacto}). Esta acción no se puede deshacer.`
        : ''}
      confirmLabel="Dar de baja"
      destructive
      onConfirm={confirmarBaja}
      onError={(error) => { setPasajeroBaja(null); setErrorBaja(error) }}
      onCancel={() => setPasajeroBaja(null)}
    />
  </>
}
