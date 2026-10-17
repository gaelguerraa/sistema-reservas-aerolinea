import type { Request, Response } from "express";

/*
 * Datos de entrada para los controladores. Si la ruta pasó por validar(...),
 * se usan los datos ya limpios de res.locals.validado; si no, los de req.
 * Así los controladores no cambian cuando se agrega o ajusta la validación.
 */

export function cuerpo<T>(req: Request, res: Response): T {
  return (res.locals.validado?.body ?? req.body) as T;
}

export function parametros<T>(req: Request, res: Response): T {
  return (res.locals.validado?.params ?? req.params) as T;
}

export function consulta<T>(req: Request, res: Response): T {
  return (res.locals.validado?.query ?? req.query) as T;
}
