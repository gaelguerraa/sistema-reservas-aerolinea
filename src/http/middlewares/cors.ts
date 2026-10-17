import cors from "cors";
import type { RequestHandler } from "express";
import { AppError } from "../errores/AppError";

/** Lee CORS_ORIGIN ("http://a,http://b") y devuelve la lista de orígenes permitidos. */
export function leerOrigenesPermitidos(valor = process.env.CORS_ORIGIN): string[] {
  const origenes = (valor ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (origenes.length === 0) {
    throw new Error("Falta la variable CORS_ORIGIN en el .env (origen del front).");
  }
  return origenes;
}

/**
 * CORS restringido: solo los orígenes de CORS_ORIGIN pueden llamar al
 * servicio desde un navegador. Cualquier otro origen recibe 403
 * ORIGEN_NO_PERMITIDO con el formato uniforme (lo arma manejadorErrores).
 *
 * Las peticiones SIN cabecera Origin (curl, Postman, servidor a servidor)
 * pasan: no son peticiones cruzadas de navegador y CORS no aplica a ellas.
 */
export function corsRestringido(origenesPermitidos: string[]): RequestHandler {
  return cors({
    origin(origen, callback) {
      if (!origen || origenesPermitidos.includes(origen)) return callback(null, true);
      callback(
        new AppError(403, "ORIGEN_NO_PERMITIDO", `El origen ${origen} no tiene permiso para usar este servicio.`)
      );
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
}
