import { Router } from "express";
import type { ControladorPasajeros } from "../controladores/pasajeros.controlador";
import { validar } from "../middlewares/validar";
import type { Seguridad } from "../seguridad";
import { crearPasajeroBody, paramsId, queryFiltroEstado } from "../validacion/esquemas";

/** /pasajeros — orden en cada ruta: seguridad -> validación -> controlador. */
export function rutasPasajeros(ctrl: ControladorPasajeros, seguridad: Seguridad): Router {
  const rutas = Router();

  rutas.post("/", seguridad.autenticar, validar({ body: crearPasajeroBody }), ctrl.registrar);
  rutas.get("/:id", seguridad.autenticar, validar({ params: paramsId }), ctrl.obtener);
  rutas.get(
    "/:id/reservas",
    seguridad.autenticar,
    validar({ params: paramsId, query: queryFiltroEstado }),
    ctrl.reservas
  );

  return rutas;
}
