import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../shared/http/client'
import { useAuth } from '../../auth/useAuth'
import { AsyncState } from '../../vuelos/components/AsyncState'
import { isAbortError } from '../../vuelos/vuelosApi'
import { conVuelos } from '../cargarVuelos'
import { Aviso } from '../components/Aviso'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { MensajeCancelacion } from '../components/MensajeCancelacion'
import { ReservaCard } from '../components/ReservaCard'
import { reservasApi } from '../reservasApi'
import type { ReservaConVuelo } from '../types'
import { useCancelacion } from '../useCancelacion'
import { esActiva, puedeCancelar, separarReservas } from '../utils'
import '../reservas.css'

export function MisReservasPage() {
  const { user } = useAuth()
  const pasajeroId = user?.pasajeroId ?? null
  const [items, setItems] = useState<ReservaConVuelo[] | null>(null)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)

  const cancelacion = useCancelacion(
    (actualizada) => setItems((actuales) => actuales?.map((item) => (item.reserva.id === actualizada.id ? { ...item, reserva: actualizada } : item)) ?? actuales),
    // Si el servicio dice que algo cambió (409) o ya no existe (404), se vuelve a pedir la lista.
    (apiError) => { if (apiError.kind === 'CONFLICTO' || apiError.kind === 'NO_ENCONTRADO') setReload((value) => value + 1) },
  )

  useEffect(() => {
    if (!pasajeroId) return
    const controller = new AbortController()
    reservasApi.delPasajero(pasajeroId, undefined, controller.signal)
      .then((reservas) => conVuelos(reservas, controller.signal))
      .then((data) => {
        if (controller.signal.aborted) return
        setItems(data)
        setError(false)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || isAbortError(reason)) return
        if (reason instanceof ApiError && reason.kind === 'NO_AUTENTICADO') return
        setError(true)
      })
    return () => controller.abort()
  }, [pasajeroId, reload])

  if (!pasajeroId) {
    return <main className="page-content"><AsyncState kind="empty" title="Tu cuenta no tiene reservaciones" message="Las reservaciones están disponibles para cuentas de cliente con perfil de pasajero." action={<Link className="button button-secondary" to="/vuelos">Explorar vuelos</Link>} /></main>
  }
  if (error) {
    return <main className="page-content"><AsyncState kind="error" title="No pudimos cargar tus reservaciones" message="No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo." retry={() => { setError(false); setItems(null); setReload((value) => value + 1) }} /></main>
  }
  if (!items) {
    return <main className="page-content"><AsyncState kind="loading" title="Cargando tus reservaciones" message="Estamos consultando tus viajes y sus asientos." /></main>
  }
  if (!items.length) {
    return <main className="page-content"><AsyncState kind="empty" title="Aún no tienes reservaciones" message="Explora los vuelos disponibles y elige tu asiento para hacer tu primera reservación." action={<Link className="button button-primary" to="/vuelos">Explorar vuelos</Link>} /></main>
  }

  const { proximas, pasadas } = separarReservas(items)
  const porViajar = proximas.filter((item) => esActiva(item.reserva.estado)).length
  const porConfirmar = items.find((item) => item.reserva.id === cancelacion.porConfirmar?.id) ?? null

  return (
    <main className="page-content reservas-page">
      <header className="reservas-heading">
        <span className="eyebrow">TU CUENTA</span>
        <h1>Mis reservaciones</h1>
        <p>{items.length} {items.length === 1 ? 'reservación' : 'reservaciones'} · {porViajar} por viajar</p>
      </header>

      {cancelacion.aviso && <Aviso aviso={cancelacion.aviso} onCerrar={cancelacion.cerrarAviso} />}

      <section className="reservas-section" aria-labelledby="proximas-title">
        <h2 id="proximas-title">Próximos viajes</h2>
        {proximas.length ? (
          <div className="reservas-grid">
            {proximas.map((item) => (
              <ReservaCard key={item.reserva.id} item={item} onCancelar={puedeCancelar(item) ? () => cancelacion.pedirConfirmacion(item.reserva) : undefined} />
            ))}
          </div>
        ) : (
          <p className="reservas-vacio">No tienes viajes próximos. <Link to="/vuelos">Explora los vuelos</Link></p>
        )}
      </section>

      <section className="reservas-section" aria-labelledby="pasadas-title">
        <h2 id="pasadas-title">Viajes pasados</h2>
        {pasadas.length ? (
          <div className="reservas-grid">
            {pasadas.map((item) => <ReservaCard key={item.reserva.id} item={item} />)}
          </div>
        ) : (
          <p className="reservas-vacio">Aquí aparecerán tus viajes cuando ya hayan salido.</p>
        )}
      </section>

      {porConfirmar && (
        <ConfirmDialog
          titulo="¿Cancelar esta reservación?"
          confirmarTexto="Sí, cancelar reservación"
          cancelarTexto="No, conservarla"
          ocupado={cancelacion.cancelando}
          onConfirmar={cancelacion.confirmar}
          onCerrar={cancelacion.cerrarDialogo}
        >
          <MensajeCancelacion item={porConfirmar} />
        </ConfirmDialog>
      )}
    </main>
  )
}
