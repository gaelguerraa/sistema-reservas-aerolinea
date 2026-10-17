import type { NextFunction, Request, Response } from "express";
import { RutaNoEncontradaError } from "../errores/AppError";
import { mapearError } from "../errores/mapearError";
import { enviarError } from "../respuestas";

/** Va DESPUÉS de todas las rutas: cualquier ruta que no exista responde 404 con el formato uniforme. */
export function rutaNoEncontrada(req: Request, _res: Response, next: NextFunction): void {
  next(new RutaNoEncontradaError(req.method, req.path));
}

/**
 * Va hasta el FINAL (después de rutaNoEncontrada). Único lugar donde un error
 * se convierte en respuesta. Los 500 se registran en consola con todo el
 * detalle, pero al cliente solo le llega un mensaje genérico.
 */
export function manejadorErrores(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) return next(err);

  const e = mapearError(err);
  if (e.estado >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  }
  enviarError(res, e.estado, e.codigo, e.mensaje, e.detalles);
}