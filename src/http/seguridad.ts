import type { RequestHandler } from "express";

/** Mismos valores que el enum Rol de prisma/schema.prisma. */
export type Rol = "ADMIN" | "CLIENTE";

/**
 * Punto de enganche para autenticación y roles. Cada ruta ya declara lo que
 * necesita (seguridad.autenticar, seguridad.permitirRoles("ADMIN")), así que
 * conectar la autenticación real NO requiere reescribir las rutas: basta con
 * implementar esta interfaz y elegirla en src/composicion.ts.
 *
 * Lo que se espera de la implementación real:
 *  - autenticar: valida la credencial y deja el usuario en
 *    res.locals.usuario ({ id, email, rol }); si no hay o no sirve,
 *    next(new NoAutenticadoError()).
 *  - permitirRoles(...roles): si res.locals.usuario.rol no está en la
 *    lista, next(new SinPermisoError()).
 * (NoAutenticadoError y SinPermisoError están en http/errores/AppError.ts.)
 */
export interface Seguridad {
  autenticar: RequestHandler;
  permitirRoles(...roles: Rol[]): RequestHandler;
}

const continuar: RequestHandler = (_req, _res, next) => next();

/** Temporal: deja pasar todo mientras no exista la autenticación real. */
export const seguridadAbierta: Seguridad = {
  autenticar: continuar,
  permitirRoles: () => continuar,
};
