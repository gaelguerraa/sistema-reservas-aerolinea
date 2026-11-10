import { useState } from 'react'
import { ApiError } from '../../shared/http/client'
import { reservasApi } from './reservasApi'
import type { Reserva } from './types'

export interface AvisoReserva {
  tipo: 'exito' | 'error'
  texto: string
}

/**
 * Lógica compartida de "cancelar" para la lista y el detalle:
 * pedir confirmación -> llamar al servicio -> avisar el resultado.
 * `alFallar` permite recargar los datos si el servicio dice que algo cambió (409).
 */
export function useCancelacion(alCancelar: (actualizada: Reserva) => void, alFallar?: (error: ApiError) => void) {
  const [porConfirmar, setPorConfirmar] = useState<Reserva | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [aviso, setAviso] = useState<AvisoReserva | null>(null)

  function pedirConfirmacion(reserva: Reserva) {
    setAviso(null)
    setPorConfirmar(reserva)
  }

  function cerrarDialogo() {
    if (!cancelando) setPorConfirmar(null)
  }

  async function confirmar() {
    if (!porConfirmar || cancelando) return
    setCancelando(true)
    try {
      const actualizada = await reservasApi.cancelar(porConfirmar.id)
      alCancelar(actualizada)
      setAviso({ tipo: 'exito', texto: `Cancelaste tu reservación del vuelo ${actualizada.vueloId}. El asiento quedó libre.` })
    } catch (reason) {
      const apiError = reason instanceof ApiError ? reason : null
      // El 401 lo atiende la sesión (cierra sesión y manda al login).
      if (apiError?.kind !== 'NO_AUTENTICADO') {
        setAviso({ tipo: 'error', texto: apiError?.userMessage ?? 'No pudimos cancelar la reservación. Inténtalo de nuevo.' })
        if (apiError) alFallar?.(apiError)
      }
    } finally {
      setCancelando(false)
      setPorConfirmar(null)
    }
  }

  return { porConfirmar, cancelando, aviso, cerrarAviso: () => setAviso(null), pedirConfirmacion, cerrarDialogo, confirmar }
}
