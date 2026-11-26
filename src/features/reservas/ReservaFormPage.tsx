import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../shared/http/client'
import { pasajerosApi } from '../pasajeros/pasajerosApi'
import type { Pasajero } from '../pasajeros/types'
import { vuelosApi } from '../vuelos/vuelosApi'
import type { AsientoConEstado, VueloResumen } from '../vuelos/types'
import { reservasApi } from './reservasApi'
import './reservas.css'

export function ReservaFormPage() {
  const navigate = useNavigate()
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([])
  const [vuelos, setVuelos] = useState<VueloResumen[]>([])
  const [asientos, setAsientos] = useState<AsientoConEstado[]>([])
  const [pasajeroId, setPasajeroId] = useState('')
  const [vueloId, setVueloId] = useState('')
  const [asientoId, setAsientoId] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [guardando, setGuardando] = useState(false)
  const [cargandoDatos, setCargandoDatos] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      pasajerosApi.listar(controller.signal),
      vuelosApi.listar(controller.signal),
    ]).then(([listaPasajeros, listaVuelos]) => {
      setPasajeros(listaPasajeros)
      setVuelos(listaVuelos)
    }).catch((reason) => setError(reason)).finally(() => setCargandoDatos(false))
    return () => controller.abort()
  }, [])

  const cargarAsientos = useCallback(async (id: string) => {
    setAsientoId('')
    setAsientos([])
    if (!id) return
    try {
      setAsientos(await vuelosApi.asientos(id))
    } catch (reason) {
      setError(reason)
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pasajeroId || !vueloId || !asientoId) {
      setError(new ApiError({
        status: 400,
        code: 'VALIDACION_FALLIDA',
        message: 'Selecciona pasajero, vuelo y asiento.',
      }))
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await reservasApi.crear({ pasajeroId, vueloId, asientoId })
      navigate('/app/reservas', { replace: true, state: { aviso: 'La reserva se creó correctamente.' } })
    } catch (reason) {
      setError(reason)
    } finally {
      setGuardando(false)
    }
  }

  return <>
    <section className="page-heading">
      <div><p className="eyebrow">RESERVAS</p><h1>Nueva reserva</h1></div>
      <Link className="button button-secondary" to="/app/reservas">Cancelar</Link>
    </section>

    {error && <div className="async-state async-state-error" role="alert">
      {error instanceof ApiError ? error.message : 'No fue posible cargar o crear la reserva.'}
    </div>}

    <form className="reservas-form" onSubmit={submit}>
      <div className="form-field">
        <label htmlFor="reserva-pasajero">Pasajero *</label>
        <select id="reserva-pasajero" value={pasajeroId} required disabled={cargandoDatos} onChange={(event) => setPasajeroId(event.target.value)}>
          <option value="">Selecciona un pasajero</option>
          {pasajeros.map((pasajero) => <option key={pasajero.id} value={pasajero.id}>{pasajero.nombre} — {pasajero.contacto}</option>)}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="reserva-vuelo">Vuelo *</label>
        <select
          id="reserva-vuelo"
          value={vueloId}
          required
          disabled={cargandoDatos}
          onChange={(event) => {
            const id = event.target.value
            setVueloId(id)
            void cargarAsientos(id)
          }}
        >
          <option value="">Selecciona un vuelo</option>
          {vuelos.map((vuelo) => <option key={vuelo.id} value={vuelo.id}>{vuelo.id}: {vuelo.origen} → {vuelo.destino}, {vuelo.fecha} {vuelo.hora}</option>)}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="reserva-asiento">Asiento *</label>
        <select id="reserva-asiento" value={asientoId} required disabled={!vueloId} onChange={(event) => setAsientoId(event.target.value)}>
          <option value="">Selecciona un asiento disponible</option>
          {asientos.filter((asiento) => !asiento.ocupado).map((asiento) =>
            <option key={asiento.id} value={asiento.id}>{asiento.numero} — {asiento.clase}</option>)}
        </select>
      </div>

      <button className="button button-primary" type="submit" disabled={guardando || cargandoDatos}>
        {guardando ? 'Guardando…' : 'Crear reserva'}
      </button>
    </form>
  </>
}
