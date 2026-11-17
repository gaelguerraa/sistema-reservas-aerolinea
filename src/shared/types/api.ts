export type Rol = 'ADMIN' | 'CLIENTE'

export interface RespuestaOk<T> {
  ok: true
  data: T
}

export interface DetalleValidacion {
  donde: 'body' | 'params' | 'query'
  campo: string
  mensaje: string
}

export interface ErrorServicio {
  codigo: string
  mensaje: string
  detalles?: unknown
}

export interface RespuestaError {
  ok: false
  error: ErrorServicio
}

export interface Usuario {
  id: string
  email: string
  rol: Rol
  pasajeroId: string | null
}

export interface Sesion {
  accessToken: string
  usuario: Usuario
}

export interface LoginBody {
  email: string
  password: string
}

export interface LoginRespuesta {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  usuario: Usuario
}
