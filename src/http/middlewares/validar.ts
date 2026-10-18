import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { DetalleValidacion, ErrorValidacion } from "../errores/AppError";

interface Esquemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Valida body, params y query contra esquemas de zod ANTES de llegar al
 * controlador. Si todo es válido, los datos ya limpios (sin espacios,
 * con tipos correctos) quedan en res.locals.validado.{body,params,query}.
 * Si algo falla responde 400 con la lista completa de problemas.
 */
export function validar(esquemas: Esquemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const detalles: DetalleValidacion[] = [];
    const validado: { body?: any; params?: any; query?: any } = {};

    for (const donde of ["params", "query", "body"] as const) {
      const esquema = esquemas[donde];
      if (!esquema) continue;

      const resultado = esquema.safeParse(req[donde]);
      if (resultado.success) {
        validado[donde] = resultado.data;
        continue;
      }

      for (const issue of resultado.error.issues) {
        const campo =
          issue.code === "unrecognized_keys"
            ? (issue as any).keys.join(", ")
            : issue.path.join(".");
        detalles.push({
          donde,
          campo,
          mensaje: issue.code === "unrecognized_keys" ? "Campo no permitido." : issue.message,
        });
      }
    }

    if (detalles.length > 0) return next(new ErrorValidacion(detalles));

    res.locals.validado = validado;
    next();
  };
}