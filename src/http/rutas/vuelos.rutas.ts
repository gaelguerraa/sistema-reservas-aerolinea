import { Router } from "express";
import type { ControladorVuelos } from "../controladores/vuelos.controlador";
import { validar } from "../middlewares/validar";
import type { Seguridad } from "../seguridad";
import { crearVueloBody, paramsId } from "../validacion/esquemas";

/** /vuelos — orden en cada ruta: seguridad -> validación -> controlador. */
export function rutasVuelos(ctrl: ControladorVuelos, seguridad: Seguridad): Router {
  const rutas = Router();

  rutas.post(
    "/",
    seguridad.autenticar,
    seguridad.permitirRoles("ADMIN"),
    validar({ body: crearVueloBody }),
    ctrl.registrar
  );
  rutas.get("/", ctrl.listar);
  rutas.get("/:id", validar({ params: paramsId }), ctrl.obtener);
  rutas.get("/:id/disponibilidad", validar({ params: paramsId }), ctrl.disponibilidad);
  rutas.get("/:id/asientos", validar({ params: paramsId }), ctrl.asientos);

  return rutas;
}
