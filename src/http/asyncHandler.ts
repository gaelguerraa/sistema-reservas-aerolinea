import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Envuelve un handler async para que cualquier error (rechazo de promesa)
 * llegue al manejador de errores. Sirve en Express 4 y en Express 5.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}