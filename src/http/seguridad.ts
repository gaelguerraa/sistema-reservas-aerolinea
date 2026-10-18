import type { RequestHandler, Response } from "express";
import { AutenticacionService } from "../seguridad/AutenticacionService";
import { Rol, usuarioPublico } from "../seguridad/Usuario";
import { NoAutenticadoError, SinPermisoError } from "./errores/AppError";
export { Rol } from "../seguridad/Usuario";
export interface Seguridad {
  autenticar: RequestHandler;
  permitirRoles(...roles: Rol[]): RequestHandler;
}
export function crearSeguridad(auth: AutenticacionService): Seguridad {
  return {
    autenticar: async (req, res, next) => {
      try {
        const partes = /^Bearer ([^ ]+)$/i.exec(req.headers.authorization ?? "");
        if (!partes) throw new NoAutenticadoError();
        res.locals.usuario = await auth.verificar(partes[1]);
        next();
      } catch (e) { next(e); }
    },
    permitirRoles: (...roles) => (_req, res, next) => {
      const u = res.locals.usuario;
      if (!u) return next(new NoAutenticadoError());
      if (!roles.includes(u.rol)) return next(new SinPermisoError());
      next();
    }
  };
}
export function exigirPasajeroPropio(res: Response, pasajeroId: string) {
  const u = res.locals.usuario as ReturnType<typeof usuarioPublico> | undefined;
  if (!u) throw new NoAutenticadoError();
  if (u.rol !== "ADMIN" && u.pasajeroId !== pasajeroId) throw new SinPermisoError();
}
