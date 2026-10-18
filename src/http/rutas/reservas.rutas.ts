import { Router } from "express";
import type { ControladorReservas } from "../controladores/reservas.controlador";
import { validar } from "../middlewares/validar";
import type { Seguridad } from "../seguridad";
import { cambiarEstadoReservaBody, crearReservaBody, paramsId } from "../validacion/esquemas";

/** /reservas — orden en cada ruta: seguridad -> validación -> controlador. */
export function rutasReservas(ctrl: ControladorReservas, seguridad: Seguridad): Router {
  const rutas = Router();

  rutas.post("/", seguridad.autenticar, validar({ body: crearReservaBody }), ctrl.crear);
  rutas.get("/:id", seguridad.autenticar, validar({ params: paramsId }), ctrl.obtener);
  rutas.patch(
    "/:id",
    seguridad.autenticar,
    validar({ params: paramsId, body: cambiarEstadoReservaBody }),
    ctrl.cambiarEstado
  );

  return rutas;
}
