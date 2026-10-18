/**
 * Errores de la capa HTTP (no son reglas de negocio; esas siguen siendo
 * DomainError y se traducen en mapearError.ts). Sirven para que cualquier
 * parte del servicio (validación, autenticación, roles) pueda "lanzar" una
 * respuesta con el código de estado correcto.
 */
export interface DetalleValidacion {
  /** Dónde falló: cuerpo, parámetros de la ruta o query string. */
  donde: "body" | "params" | "query";
  /** Campo que falló (ej. "asientoId"). Vacío si falló el objeto completo. */
  campo: string;
  mensaje: string;
}

export class AppError extends Error {
  constructor(
    public readonly estado: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles?: unknown
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/** 400: la petición llegó mal formada o con datos inválidos. */
export class ErrorValidacion extends AppError {
  constructor(detalles: DetalleValidacion[], mensaje = "Los datos enviados no son válidos.") {
    super(400, "VALIDACION_FALLIDA", mensaje, detalles);
  }
}

/** 401: no hay credencial, está vencida, fue alterada o el login es incorrecto. */
export class NoAutenticadoError extends AppError {
  constructor(mensaje = "Se requiere una credencial válida.") {
    super(401, "NO_AUTENTICADO", mensaje);
  }
}

/** 403: hay credencial válida pero el rol no alcanza para esta operación. */
export class SinPermisoError extends AppError {
  constructor(mensaje = "No tienes permiso para realizar esta operación.") {
    super(403, "SIN_PERMISO", mensaje);
  }
}

/** 409: conflicto que no viene del dominio (ej. correo ya registrado). */
export class ConflictoError extends AppError {
  constructor(codigo: string, mensaje: string) {
    super(409, codigo, mensaje);
  }
}

/** 404: la ruta pedida no existe en el servicio. */
export class RutaNoEncontradaError extends AppError {
  constructor(metodo: string, ruta: string) {
    super(404, "RUTA_NO_ENCONTRADA", `No existe la ruta ${metodo} ${ruta}.`);
  }
}