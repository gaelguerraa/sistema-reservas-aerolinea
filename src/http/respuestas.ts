import type { Response } from "express";

/**
 * Formato ÚNICO de respuesta del servicio:
 *   éxito:  { "ok": true,  "data": ... }
 *   error:  { "ok": false, "error": { "codigo": "...", "mensaje": "...", "detalles"?: [...] } }
 */
export interface RespuestaOk<T> {
  ok: true;
  data: T;
}

export interface RespuestaError {
  ok: false;
  error: { codigo: string; mensaje: string; detalles?: unknown };
}

/** 200 */
export function enviarOk<T>(res: Response, data: T, estado = 200): void {
  const cuerpo: RespuestaOk<T> = { ok: true, data };
  res.status(estado).json(cuerpo);
}

/** 201 (opcionalmente con cabecera Location apuntando al recurso creado) */
export function enviarCreado<T>(res: Response, data: T, ubicacion?: string): void {
  if (ubicacion) res.location(ubicacion);
  enviarOk(res, data, 201);
}

export function enviarError(
  res: Response,
  estado: number,
  codigo: string,
  mensaje: string,
  detalles?: unknown
): void {
  const cuerpo: RespuestaError = {
    ok: false,
    error: { codigo, mensaje, ...(detalles !== undefined ? { detalles } : {}) },
  };
  res.status(estado).json(cuerpo);
}