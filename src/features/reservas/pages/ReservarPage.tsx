import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../../shared/http/client'
import { useAuth } from '../../auth/useAuth'
import { AsyncState } from '../../vuelos/components/AsyncState'
import { classLabel } from '../../vuelos/utils'
import type { Asiento, VueloDetalle } from '../../vuelos/types'
import { formatFechaLarga, formatHora, isPasada } from '../../vuelos/utils'
import { getApiErrorStatus, isAbortError, vuelosApi } from '../../vuelos/vuelosApi'
import { pasajerosApi } from '../pasajerosApi'
import { reservasApi } from '../reservasApi'
import type { Pasajero } from '../types'
import '../reservas.css'

interface DatosReserva {
  vuelo: VueloDetalle
  asientos: Asiento[]

  pasajero: Pasajero | null
}

type Errores = Partial<Record<'asiento' | 'confirmacion', string>>

const CLASES = ['EJECUTIVA', 'ECONOMICA'] as const

export function ReservarPage() {
  const { user } = useAuth()
  const pasajeroId = user?.pasajeroId ?? null
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const vueloId = searchParams.get('vueloId') ?? ''
  const asientoId = searchParams.get('asientoId') ?? ''

  const [datos, setDatos] = useState<DatosReserva | null>(null)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const [ocupadosRecientes, setOcupadosRecientes] = useState<string[]>([])
  const [confirmado, setConfirmado] = useState(false)
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const asientoRef = useRef<HTMLSelectElement>(null)
  const confirmacionRef = useRef<HTMLInputElement>(null)
  const ids = { asiento: useId(), asientoAyuda: useId(), asientoError: useId(), confirmacionError: useId() }

  useEffect(() => {
    if (!vueloId || !pasajeroId) return
    const controller = new AbortController()
    const pasajero = pasajerosApi.obtener(pasajeroId, controller.signal).catch((reason: unknown) => {
      const status = getApiErrorStatus(reason)
      if (status === 404 || status === 403) return null
      throw reason
    })
    Promise.all([vuelosApi.get(vueloId, controller.signal), vuelosApi.seats(vueloId, controller.signal), pasajero])
      .then(([vuelo, asientos, perfil]) => {
        if (controller.signal.aborted) return
        setDatos({ vuelo, asientos, pasajero: perfil })
        setError(false)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || isAbortError(reason)) return
        if (reason instanceof ApiError && reason.kind === 'NO_AUTENTICADO') return
        if (getApiErrorStatus(reason) === 404) navigate('/no-encontrado', { replace: true })
        else setError(true)
      })
    return () => controller.abort()
  }, [vueloId, pasajeroId, navigate, reload])

  const libres = useMemo(
    () => datos?.asientos.filter((asiento) => !asiento.ocupado && !ocupadosRecientes.includes(asiento.id)) ?? [],
    [datos, ocupadosRecientes],
  )
  const seleccionado = libres.find((asiento) => asiento.id === asientoId) ?? null
  const asientoYaNoDisponible = Boolean(asientoId && datos && !seleccionado)

  if (!vueloId) {
    return <main className="page-content"><AsyncState kind="empty" title="Primero elige un vuelo" message="Para reservar, explora los vuelos disponibles y selecciona un asiento libre." action={<Link className="button button-primary" to="/vuelos">Explorar vuelos</Link>} /></main>
  }
  if (!pasajeroId) {
    return <main className="page-content"><AsyncState kind="empty" title="Tu cuenta no puede reservar" message="Solo las cuentas de cliente con perfil de pasajero pueden hacer reservaciones." action={<Link className="button button-secondary" to="/vuelos">Volver a vuelos</Link>} /></main>
  }
  if (error) {
    return <main className="page-content"><AsyncState kind="error" title="No pudimos preparar tu reservación" message="No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo." retry={() => { setError(false); setDatos(null); setReload((value) => value + 1) }} /></main>
  }
  if (!datos) {
    return <main className="page-content"><AsyncState kind="loading" title="Preparando tu reservación" message="Estamos consultando el vuelo, los asientos libres y tus datos." /></main>
  }

  const { vuelo, pasajero } = datos
  const pasado = isPasada(vuelo.fecha, vuelo.hora)

  if (!libres.length) {
    return <main className="page-content"><AsyncState kind="empty" title="No quedan asientos disponibles" message={errores.asiento ?? "Este vuelo no tiene asientos libres para reservar. Puedes elegir otra ruta."} action={<Link className="button button-primary" to="/vuelos">Explorar otros vuelos</Link>} /></main>
  }

  function elegirAsiento(id: string) {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('asientoId', id)
    else next.delete('asientoId')
    setSearchParams(next, { replace: true })
    setErrores((actuales) => ({ ...actuales, asiento: undefined }))
    setErrorGeneral('')
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (enviando || !pasajeroId || !pasajero || pasado) return
    setErrorGeneral('')
    const asiento = seleccionado
    const nuevos: Errores = {}
    if (!asiento) nuevos.asiento = asientoYaNoDisponible ? 'El asiento que elegiste ya no está disponible. Elige otro asiento libre.' : 'Elige un asiento libre para continuar.'
    if (!confirmado) nuevos.confirmacion = 'Confirma que tus datos de contacto son correctos.'
    setErrores(nuevos)
    if (!asiento) { asientoRef.current?.focus(); return }
    if (!confirmado) { confirmacionRef.current?.focus(); return }

    setEnviando(true)
    try {
      const reserva = await reservasApi.crear({ pasajeroId, vueloId: vuelo.id, asientoId: asiento.id })
      navigate(`/reservas/${encodeURIComponent(reserva.id)}`, {
        state: { aviso: `¡Listo! Reservaste el asiento ${asiento.numero} del vuelo ${vuelo.id}. Tu reservación quedó pendiente de confirmación.` },
      })
    } catch (reason) {
      const apiError = reason instanceof ApiError ? reason : null
      if (apiError?.kind === 'NO_AUTENTICADO') return
      if (apiError?.code === 'ASIENTO_OCUPADO') {
        setOcupadosRecientes((actuales) => [...actuales, asiento.id])
        elegirAsiento('')
        setErrores({ asiento: apiError.userMessage })
        setReload((value) => value + 1)
        asientoRef.current?.focus()
      } else if (apiError?.fieldErrors.asientoId) {
        setErrores({ asiento: apiError.fieldErrors.asientoId })
      } else {
        setErrorGeneral(apiError?.userMessage ?? 'No pudimos completar tu reservación. Inténtalo de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  const ayudaAsiento = asientoYaNoDisponible && !errores.asiento
    ? 'El asiento que habías elegido ya se ocupó. Elige otro.'
    : `${libres.length} ${libres.length === 1 ? 'asiento libre' : 'asientos libres'} en este vuelo.`

  return (
    <main className="page-content reservar-page">
      <Link className="back-link" to={`/vuelos/${encodeURIComponent(vuelo.id)}`}><span aria-hidden="true">←</span> Volver al vuelo</Link>
      <form className="reservar-form" noValidate onSubmit={enviar} aria-labelledby="reservar-title">
        <span className="eyebrow">NUEVA RESERVACIÓN</span>
        <h1 id="reservar-title">Confirma tu reservación</h1>
        <p className="reservar-intro">Revisa tu vuelo, elige tu asiento y confirma tus datos de contacto.</p>

        {errorGeneral && <div className="form-alert" role="alert">{errorGeneral}</div>}
        {pasado && <div className="notice" role="status">Este vuelo ya salió y no admite reservaciones.</div>}

        <fieldset className="reservar-fieldset">
          <legend>1. Tu vuelo</legend>
          <div className="reservar-vuelo">
            <span className="flight-number">{vuelo.id}</span>
            <p className="reservar-ruta">{vuelo.origen} <span aria-hidden="true">→</span><span className="sr-only">a</span> {vuelo.destino}</p>
            <dl className="reserva-datos">
              <div><dt>Fecha</dt><dd>{formatFechaLarga(vuelo.fecha)}</dd></div>
              <div><dt>Hora</dt><dd>{formatHora(vuelo.hora)} h</dd></div>
            </dl>
          </div>
        </fieldset>

        <fieldset className="reservar-fieldset">
          <legend>2. Tu asiento</legend>
          <label className="field-label" htmlFor={ids.asiento}>Asiento</label>
          <select
            id={ids.asiento}
            ref={asientoRef}
            className="field-input"
            value={seleccionado?.id ?? ''}
            onChange={(event) => elegirAsiento(event.target.value)}
            disabled={pasado || enviando}
            aria-invalid={Boolean(errores.asiento)}
            aria-describedby={errores.asiento ? `${ids.asientoError} ${ids.asientoAyuda}` : ids.asientoAyuda}
          >
            <option value="">Selecciona un asiento</option>
            {CLASES.map((clase) => {
              const opciones = libres.filter((asiento) => asiento.clase === clase)
              if (!opciones.length) return null
              return (
                <optgroup key={clase} label={classLabel(clase)}>
                  {opciones.map((asiento) => <option key={asiento.id} value={asiento.id}>{asiento.numero} · {classLabel(asiento.clase)}</option>)}
                </optgroup>
              )
            })}
          </select>
          {errores.asiento && <p id={ids.asientoError} className="field-error">{errores.asiento}</p>}
          <p id={ids.asientoAyuda} className="field-help">{ayudaAsiento}</p>
        </fieldset>

        <fieldset className="reservar-fieldset">
          <legend>3. Datos de contacto</legend>
          {pasajero ? (
            <dl className="reserva-datos contacto-datos">
              <div><dt>Nombre</dt><dd>{pasajero.nombre}</dd></div>
              <div><dt>Contacto</dt><dd>{pasajero.contacto}</dd></div>
            </dl>
          ) : (
            <p className="field-error">No encontramos tu perfil de pasajero. Contacta a la aerolínea para completarlo antes de reservar.</p>
          )}
          <p className="field-help">Estos datos vienen de tu perfil de pasajero.</p>
          <label className="checkbox-field">
            <input
              ref={confirmacionRef}
              type="checkbox"
              checked={confirmado}
              onChange={(event) => { setConfirmado(event.target.checked); setErrores((actuales) => ({ ...actuales, confirmacion: undefined })) }}
              disabled={!pasajero || enviando}
              aria-invalid={Boolean(errores.confirmacion)}
              aria-describedby={errores.confirmacion ? ids.confirmacionError : undefined}
            />
            <span>Confirmo que mis datos de contacto son correctos</span>
          </label>
          {errores.confirmacion && <p id={ids.confirmacionError} className="field-error">{errores.confirmacion}</p>}
        </fieldset>

        <button className="button button-primary reservar-submit" type="submit" disabled={enviando || pasado || !pasajero}>
          {enviando ? 'Reservando…' : 'Confirmar reservación'}
        </button>
      </form>
    </main>
  )
}
