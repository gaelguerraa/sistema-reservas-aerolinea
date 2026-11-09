import axios from 'axios'
import type { DetalleValidacion, RespuestaError } from '../types/api'

export type ApiErrorKind =
  | 'RED'
  | 'TIMEOUT'
  | 'VALIDACION'
  | 'NO_AUTENTICADO'
  | 'SIN_PERMISO'
  | 'NO_ENCONTRADO'
  | 'CONFLICTO'
  | 'SERVIDOR'
  | 'DESCONOCIDO'

interface ApiErrorInit {
  kind: ApiErrorKind
  message?: string
  status?: number
  code?: string
  details?: unknown
}

/** Error único que entiende el resto de la app. */
export class ApiError extends Error {
  kind: ApiErrorKind
  status?: number
  code?: string
  details?: unknown
  /** Mensaje listo para mostrar al usuario (nunca el técnico). */
  userMessage: string
  /** campo -> mensaje, para pintar errores junto a cada input (400). */
  fieldErrors: Record<string, string>

  constructor(init: ApiErrorInit) {
    super(init.message || 'Error de comunicación con el servicio')
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status
    this.code = init.code
    this.details = init.details
    this.fieldErrors = extraerCampos(init.details)
    this.userMessage = mensajeUsuario(init.kind, init.code, init.message)
  }
}

/** Reglas de negocio del servicio -> lenguaje del usuario. */
const MENSAJES_POR_CODIGO: Record<string, string> = {
  ASIENTO_OCUPADO: 'Ese asiento acaba de ser reservado por otra persona. Elige otro.',
  VUELO_SIN_DISPONIBILIDAD: 'Este vuelo ya no tiene asientos disponibles.',
  CAPACIDAD_MAXIMA_ALCANZADA: 'Este vuelo alcanzó su capacidad máxima.',
  RESERVA_COMPLETADA: 'Esta reservación ya fue completada y no se puede modificar.',
  RESERVA_DUPLICADA: 'Ya tienes una reservación activa para ese asiento.',
  TRANSICION_INVALIDA: 'Esta reservación ya no admite ese cambio (por ejemplo, ya está cancelada).',
  REGLA_DE_NEGOCIO: 'No se pudo completar la operación por una regla del servicio.',
  EMAIL_DUPLICADO: 'Ese correo ya está registrado. Inicia sesión.',
  REGISTRO_DUPLICADO: 'Ya existe un registro con esos datos.',
  REFERENCIA_INVALIDA: 'La operación depende de información que ya no existe.',
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  NO_ENCONTRADO: 'No encontramos lo que buscas.',
  RUTA_NO_ENCONTRADA: 'No encontramos lo que buscas.',
  ORIGEN_NO_PERMITIDO: 'El portal no está autorizado para conectarse con el servicio.',
}

const MENSAJES_POR_TIPO: Partial<Record<ApiErrorKind, string>> = {
  RED: 'No pudimos conectar con el servicio. Revisa tu conexión o inténtalo más tarde.',
  TIMEOUT: 'El servicio tardó demasiado en responder. Inténtalo de nuevo.',
  SERVIDOR: 'El servicio tuvo un problema. Inténtalo de nuevo en unos minutos.',
}

function mensajeUsuario(kind: ApiErrorKind, code?: string, servidor?: string): string {
  if (code && MENSAJES_POR_CODIGO[code]) return MENSAJES_POR_CODIGO[code]
  const porTipo = MENSAJES_POR_TIPO[kind]
  if (porTipo) return porTipo
  // 400/401 (login incorrecto), 429, etc.: el servicio ya responde en español para personas.
  return servidor || 'No fue posible completar la solicitud.'
}

function extraerCampos(details: unknown): Record<string, string> {
  const campos: Record<string, string> = {}
  if (!Array.isArray(details)) return campos
  for (const item of details as Partial<DetalleValidacion>[]) {
    if (item?.campo && item.mensaje && !(item.campo in campos)) campos[item.campo] = item.mensaje
  }
  return campos
}

export function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'VALIDACION'
  if (status === 401) return 'NO_AUTENTICADO'
  if (status === 403) return 'SIN_PERMISO'
  if (status === 404) return 'NO_ENCONTRADO'
  if (status === 409) return 'CONFLICTO'
  if (status >= 500) return 'SERVIDOR'
  return 'DESCONOCIDO'
}

/** Convierte cualquier fallo (axios, red, envoltura inválida) en ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    const { response } = error
    if (!response) {
      const timeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      return new ApiError({ kind: timeout ? 'TIMEOUT' : 'RED', code: error.code, message: error.message })
    }
    const cuerpo = response.data as Partial<RespuestaError> | undefined
    return new ApiError({
      kind: kindFromStatus(response.status),
      status: response.status,
      code: cuerpo?.error?.codigo,
      message: cuerpo?.error?.mensaje,
      details: cuerpo?.error?.detalles,
    })
  }

  return new ApiError({ kind: 'DESCONOCIDO', message: error instanceof Error ? error.message : undefined })
}