import type { NextFunction, Request, Response } from "express";

/**
 * Registra cada petición atendida con método, ruta, código de estado y
 * tiempo en ms. Va PRIMERO en la app para medir también las peticiones que
 * se rechazan antes de llegar a una ruta (CORS, validación, errores).
 */
export function registrarPeticiones(req: Request, res: Response, next: NextFunction): void {
  const inicio = process.hrtime.bigint();
  let registrada = false;

  const registrar = (nota = "") => {
    if (registrada) return;
    registrada = true;
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)} ms${nota}`
    );
  };

  res.on("finish", () => registrar());
  // "close" sin "finish": el cliente cortó la conexión antes de recibir la respuesta.
  res.on("close", () => registrar(" (conexión cerrada antes de responder)"));
  next();
}
