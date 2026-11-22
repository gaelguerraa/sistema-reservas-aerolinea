import { useCallback, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AsyncState } from '../../shared/components/AsyncState'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { DataTable, type DataColumn } from '../../shared/components/DataTable'
import { useAsyncQuery } from '../../shared/components/useAsyncQuery'
import { isApiError } from '../../shared/http/client'
import { OperationError } from './components/OperationError'
import { PasajeroNoEncontrado } from './components/PasajeroNoEncontrado'
import type { EstadoReserva, Pasajero, ReservaPasajero } from './types'
import { pasajerosApi } from './pasajerosApi'
import { pasajerosCapabilities } from './pasajerosConfig'
import {
  avisoDesdeEstado,
  etiquetaEstadoReserva,
  filtrosDesdeEstado,
  formatearFecha,
} from './pasajerosFormato'
import './pasajeros.css'

type Carga = { encontrado: false } | { encontrado: true; pasajero: Pasajero; reservas: ReservaPasajero[] }

const ESTADOS_FILTRO: { valor: '' | EstadoReserva; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
  { valor: 'CONFIRMADA', etiqueta: 'Confirmadas' },
  { valor: 'CANCELADA', etiqueta: 'Canceladas' },
  { valor: 'COMPLETADA', etiqueta: 'Completadas' },
]

export function PasajeroDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const volverA = `/app/pasajeros${filtrosDesdeEstado(location.state)}`

  const load = useCallback(async (signal: AbortSignal): Promise<Carga> => {
    try {
      const [pasajero, reservas] = await Promise.all([
        pasajerosApi.obtener(id, signal),
        pasajerosApi.reservas(id, undefined, signal),
      ])
      return { encontrado: true, pasajero, reservas }
    } catch (error) {
      if (isApiError(error) && error.status === 404) return { encontrado: false }
      throw error
    }
  }, [id])

  const { state, retry } = useAsyncQuery(load)

  return <AsyncState state={state} onRetry={retry}>
    {(carga) => carga.encontrado
      ? <DetallePasajero pasajero={carga.pasajero} reservas={carga.reservas} volverA={volverA} />
      : <PasajeroNoEncontrado id={id} volverA={volverA} />}
  </AsyncState>
}

function DetallePasajero({ pasajero, reservas, volverA }: { pasajero: Pasajero; reservas: ReservaPasajero[]; volverA: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const aviso = avisoDesdeEstado(location.state)
  const [estadoFiltro, setEstadoFiltro] = useState<'' | EstadoReserva>('')
  const [confirmarBaja, setConfirmarBaja] = useState(false)
  const [errorBaja, setErrorBaja] = useState<unknown>(null)
  const idRuta = encodeURIComponent(pasajero.id)

  const activas = useMemo(
    () => reservas.filter((r) => r.estado === 'PENDIENTE' || r.estado === 'CONFIRMADA').length,
    [reservas]
  )

  const visibles = useMemo(
    () => (estadoFiltro ? reservas.filter((r) => r.estado === estadoFiltro) : reservas),
    [reservas, estadoFiltro]
  )

  const columnasReservas: DataColumn<ReservaPasajero>[] = useMemo(() => [
    { key: 'id', header: 'Reserva', isRowHeader: true, render: (r) => r.id },
    {
      key: 'vueloId',
      header: 'Vuelo',
      render: (r) => <Link to={`/app/vuelos/${encodeURIComponent(r.vueloId)}`}>{r.vueloId}</Link>,
    },
    { key: 'asientoId', header: 'Asiento', render: (r) => r.asientoId },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => <span className={`pasajeros-estado is-${r.estado.toLowerCase()}`}>{etiquetaEstadoReserva(r.estado)}</span>,
    },
    { key: 'fechaCreacion', header: 'Fecha', render: (r) => formatearFecha(r.fechaCreacion) },
  ], [])

  async function darDeBaja() {
    await pasajerosApi.darDeBaja(pasajero.id)
    setConfirmarBaja(false)
    navigate(volverA, { state: { notice: `El pasajero ${pasajero.nombre} se dio de baja correctamente.` } })
  }

  return <>
    <section className="page-heading">
      <div>
        <p className="eyebrow">PASAJERO {pasajero.id}</p>
        <h1>{pasajero.nombre}</h1>
      </div>
      <div className="pasajeros-actions">
        <Link className="button button-secondary" to={volverA}>Volver al listado</Link>
        {pasajerosCapabilities.editar && (
          <Link
            className="button button-secondary"
            to={`/app/pasajeros/${idRuta}/editar`}
            state={{ from: filtrosDesdeEstado(location.state) }}
          >
            Editar
          </Link>
        )}
        {pasajerosCapabilities.baja && (
          <button
            className="button button-danger"
            type="button"
            onClick={() => { setErrorBaja(null); setConfirmarBaja(true) }}
          >
            Dar de baja
          </button>
        )}
      </div>
    </section>

    {aviso && <div className="notice pasajeros-notice" role="status">{aviso}</div>}
    <OperationError error={errorBaja} />

    <dl className="pasajeros-summary">
      <div><dt>Id</dt><dd>{pasajero.id}</dd></div>
      <div><dt>Nombre</dt><dd>{pasajero.nombre}</dd></div>
      <div><dt>Correo de contacto</dt><dd>{pasajero.contacto}</dd></div>
      <div><dt>Reservas totales</dt><dd>{reservas.length}</dd></div>
      <div><dt>Reservas activas</dt><dd>{activas}</dd></div>
    </dl>

    <div className="pasajeros-reservas-header">
      <h2>Historial de reservas</h2>
      <div className="form-field">
        <label htmlFor="filtro-estado-reserva">Estado de reserva</label>
        <select
          id="filtro-estado-reserva"
          className="pasajeros-select"
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as '' | EstadoReserva)}
        >
          {ESTADOS_FILTRO.map((item) => (
            <option key={item.valor || 'TODAS'} value={item.valor}>{item.etiqueta}</option>
          ))}
        </select>
      </div>
    </div>

    {reservas.length === 0
      ? <div className="async-state" role="status">Este pasajero todavía no tiene reservas registradas.</div>
      : visibles.length === 0
        ? <div className="async-state" role="status">No hay reservas con el estado seleccionado.</div>
        : <DataTable rows={visibles} columns={columnasReservas} caption="Reservas del pasajero" />}

    <ConfirmDialog
      open={confirmarBaja}
      title="Dar de baja al pasajero"
      description={`Vas a dar de baja a ${pasajero.nombre} (${pasajero.contacto}). Esta acción no se puede deshacer.`}
      confirmLabel="Dar de baja"
      destructive
      onConfirm={darDeBaja}
      onError={(error) => { setConfirmarBaja(false); setErrorBaja(error) }}
      onCancel={() => setConfirmarBaja(false)}
    />
  </>
}
