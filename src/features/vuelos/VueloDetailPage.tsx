import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AsyncState } from '../../shared/components/AsyncState'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { useAsyncQuery } from '../../shared/components/useAsyncQuery'
import { isApiError } from '../../shared/http/client'
import { OperationError } from './components/OperationError'
import { VueloNoEncontrado } from './components/VueloNoEncontrado'
import type { AsientoConEstado, ClaseAsiento, Vuelo } from './types'
import { vuelosApi } from './vuelosApi'
import { vuelosCapabilities } from './vuelosConfig'
import { avisoDesdeEstado, filtrosDesdeEstado, formatearFecha } from './vuelosFormato'
import './vuelos.css'

type Carga = { encontrado: false } | { encontrado: true; vuelo: Vuelo; disponibles: number; asientos: AsientoConEstado[] }

const CLASES: { clase: ClaseAsiento; titulo: string }[] = [
    { clase: 'EJECUTIVA', titulo: 'Clase ejecutiva' },
    { clase: 'ECONOMICA', titulo: 'Clase económica' },
]

export function VueloDetailPage() {
    const { id = '' } = useParams()
    const location = useLocation()
    const volverA = `/app/vuelos${filtrosDesdeEstado(location.state)}`

    const load = useCallback(async (signal: AbortSignal): Promise<Carga> => {
        try {
            const [vuelo, disponibilidad, asientos] = await Promise.all([
                vuelosApi.obtener(id, signal),
                vuelosApi.disponibilidad(id, signal),
                vuelosApi.asientos(id, signal),
            ])
            return { encontrado: true, vuelo, disponibles: disponibilidad.asientosDisponibles, asientos }
        } catch (error) {
            if (isApiError(error) && error.status === 404) return { encontrado: false }
            throw error
        }
    }, [id])
    const { state, retry } = useAsyncQuery(load)

    return <AsyncState state={state} onRetry={retry}>
        {(carga) => carga.encontrado
            ? <DetalleVuelo vuelo={carga.vuelo} disponibles={carga.disponibles} asientos={carga.asientos} volverA={volverA} />
            : <VueloNoEncontrado id={id} volverA={volverA} />}
    </AsyncState>
}

function DetalleVuelo({ vuelo, disponibles, asientos, volverA }: { vuelo: Vuelo; disponibles: number; asientos: AsientoConEstado[]; volverA: string }) {
    const navigate = useNavigate()
    const location = useLocation()
    const aviso = avisoDesdeEstado(location.state)
    const [confirmarBaja, setConfirmarBaja] = useState(false)
    const [errorBaja, setErrorBaja] = useState<unknown>(null)
    const idRuta = encodeURIComponent(vuelo.id)

    async function darDeBaja() {
        await vuelosApi.darDeBaja(vuelo.id)
        setConfirmarBaja(false)
        navigate(volverA, { state: { notice: `El vuelo ${vuelo.id} se dio de baja correctamente.` } })
    }

    return <>
        <section className="page-heading">
            <div><p className="eyebrow">VUELO {vuelo.id}</p><h1>{vuelo.origen} → {vuelo.destino}</h1></div>
            <div className="vuelos-actions">
                <Link className="button button-secondary" to={volverA}>Volver al listado</Link>
                {vuelosCapabilities.editar && <Link className="button button-secondary" to={`/app/vuelos/${idRuta}/editar`} state={{ from: filtrosDesdeEstado(location.state) }}>Editar</Link>}
                {vuelosCapabilities.baja && <button className="button button-danger" type="button" onClick={() => { setErrorBaja(null); setConfirmarBaja(true) }}>Dar de baja</button>}
            </div>
        </section>

        {aviso && <div className="notice vuelos-notice" role="status">{aviso}</div>}
        <OperationError error={errorBaja} />

        <dl className="vuelos-summary">
            <div><dt>Id</dt><dd>{vuelo.id}</dd></div>
            <div><dt>Fecha</dt><dd>{formatearFecha(vuelo.fecha)}</dd></div>
            <div><dt>Hora</dt><dd>{vuelo.hora}</dd></div>
            <div><dt>Capacidad total</dt><dd>{vuelo.capacidadTotal}</dd></div>
            <div><dt>Asientos disponibles</dt><dd>{disponibles}</dd></div>
            <div><dt>Asientos ocupados</dt><dd>{vuelo.capacidadTotal - disponibles}</dd></div>
        </dl>

        <h2>Asientos</h2>
        {asientos.length === 0
            ? <div className="async-state" role="status">Este vuelo no tiene asientos para mostrar.</div>
            : CLASES.map(({ clase, titulo }) => {
                const deClase = asientos.filter((asiento) => asiento.clase === clase)
                if (deClase.length === 0) return null
                return <section className="vuelos-seats-group" key={clase} aria-label={titulo}>
                    <h3>{titulo} ({deClase.filter((a) => !a.ocupado).length} libres de {deClase.length})</h3>
                    <ul className="vuelos-seats">
                        {deClase.map((asiento) => <li key={asiento.id} className={asiento.ocupado ? 'vuelos-seat is-taken' : 'vuelos-seat'}>
                            <strong>{asiento.numero}</strong><small>{asiento.ocupado ? 'Ocupado' : 'Libre'}</small>
                        </li>)}
                    </ul>
                </section>
            })}

        <ConfirmDialog
            open={confirmarBaja}
            title="Dar de baja el vuelo"
            description={`Vas a dar de baja el vuelo ${vuelo.id} (${vuelo.origen} → ${vuelo.destino}, ${formatearFecha(vuelo.fecha)}). Esta acción no se puede deshacer.`}
            confirmLabel="Dar de baja"
            destructive
            onConfirm={darDeBaja}
            onError={(error) => { setConfirmarBaja(false); setErrorBaja(error) }}
            onCancel={() => setConfirmarBaja(false)}
        />
    </>
}