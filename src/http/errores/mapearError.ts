import { DomainError } from "../../errores/DomainError";
import {
  AsientoOcupadoError,
  CapacidadMaximaAlcanzadaError,
  RecursoNoEncontradoError,
  ReservaCompletadaError,
  ReservaDuplicadaError,
  TransicionInvalidaError,
  VueloSinDisponibilidadError,
} from "../../errores/erroresDeNegocio";
import { AppError } from "./AppError";

export interface ErrorHttp {
  estado: number;
  codigo: string;
  mensaje: string;
  detalles?: unknown;
}

/**
 * Cada regla de negocio del avance 1 que impide algo -> 409 con su propio
 * código. El dominio no se toca: aquí solo se traduce.
 */
const REGLAS_DE_NEGOCIO: Array<[new (...args: any[]) => DomainError, number, string]> = [
  [AsientoOcupadoError, 409, "ASIENTO_OCUPADO"],
  [VueloSinDisponibilidadError, 409, "VUELO_SIN_DISPONIBILIDAD"],
  [CapacidadMaximaAlcanzadaError, 409, "CAPACIDAD_MAXIMA_ALCANZADA"],
  [ReservaCompletadaError, 409, "RESERVA_COMPLETADA"],
  [ReservaDuplicadaError, 409, "RESERVA_DUPLICADA"],
  [TransicionInvalidaError, 409, "TRANSICION_INVALIDA"],
  [RecursoNoEncontradoError, 404, "NO_ENCONTRADO"],
];

function esErrorDePrisma(e: any): e is { code: string; meta?: any } {
  return !!e && typeof e.code === "string" && /^P\d{4}$/.test(e.code);
}

/** Convierte CUALQUIER error en la forma que se manda al cliente. */
export function mapearError(err: unknown): ErrorHttp {
  // 1) Errores de la capa HTTP (validación, 401, 403, 409 genérico, ruta)
  if (err instanceof AppError) {
    return { estado: err.estado, codigo: err.codigo, mensaje: err.message, detalles: err.detalles };
  }

  // 2) Reglas de negocio del dominio
  if (err instanceof DomainError) {
    const regla = REGLAS_DE_NEGOCIO.find(([clase]) => err instanceof clase);
    if (regla) return { estado: regla[1], codigo: regla[2], mensaje: err.message };
    // Regla nueva que aún no está en la tabla: sigue siendo conflicto, no 500.
    return { estado: 409, codigo: "REGLA_DE_NEGOCIO", mensaje: err.message };
  }

  const e = err as any;

  // 3) JSON mal formado o cuerpo demasiado grande (body parser de Express)
  if (e?.type === "entity.parse.failed") {
    return { estado: 400, codigo: "JSON_INVALIDO", mensaje: "El cuerpo de la petición no es un JSON válido." };
  }
  if (e?.type === "entity.too.large") {
    return { estado: 413, codigo: "CUERPO_DEMASIADO_GRANDE", mensaje: "El cuerpo de la petición es demasiado grande." };
  }
  if (e?.type === "encoding.unsupported" || e?.type === "charset.unsupported") {
    return { estado: 415, codigo: "FORMATO_NO_SOPORTADO", mensaje: "Codificación del cuerpo no soportada." };
  }

  // 4) Credencial JWT inválida (por si la librería lanza sus errores directo)
  if (e?.name === "TokenExpiredError") {
    return { estado: 401, codigo: "NO_AUTENTICADO", mensaje: "La credencial expiró. Inicia sesión de nuevo." };
  }
  if (e?.name === "JsonWebTokenError" || e?.name === "NotBeforeError") {
    return { estado: 401, codigo: "NO_AUTENTICADO", mensaje: "La credencial no es válida." };
  }

  // 5) Errores conocidos de la base de datos (Prisma): red de seguridad
  //    por si dos peticiones simultáneas se pisan.
  if (esErrorDePrisma(e)) {
    if (e.code === "P2002") {
      return { estado: 409, codigo: "REGISTRO_DUPLICADO", mensaje: "Ya existe un registro con esos datos." };
    }
    if (e.code === "P2003") {
      return { estado: 409, codigo: "REFERENCIA_INVALIDA", mensaje: "El registro depende de otro que no existe o que aún está en uso." };
    }
    if (e.code === "P2025") {
      return { estado: 404, codigo: "NO_ENCONTRADO", mensaje: "El registro solicitado no fue encontrado." };
    }
  }

  // 6) Todo lo demás es un error nuestro: 500 SIN filtrar detalles internos.
  return { estado: 500, codigo: "ERROR_INTERNO", mensaje: "Ocurrió un error interno. Intenta de nuevo más tarde." };
}