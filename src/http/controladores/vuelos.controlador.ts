import type { Request, Response } from "express";
import { CatalogoService } from "../../aplicacion/CatalogoService";
import { Vuelo } from "../../entities/Vuelo";
import { ReservaService } from "../../servicios/ReservaService";
import { cuerpo, parametros } from "../entrada";
import { enviarCreado, enviarOk } from "../respuestas";
import type { CrearVueloBody, ParamsId } from "../validacion/esquemas";

/** capacidadTotal es un getter y JSON.stringify no lo incluye solo. */
function vueloAJson(vuelo: Vuelo) {
  return { ...vuelo, capacidadTotal: vuelo.capacidadTotal };
}

export function crearControladorVuelos(reservas: ReservaService, catalogo: CatalogoService) {
  return {
    async registrar(req: Request, res: Response) {
      const vuelo = await catalogo.registrarVuelo(cuerpo<CrearVueloBody>(req, res));
      enviarCreado(res, vueloAJson(vuelo), `/vuelos/${vuelo.id}`);
    },

    async obtener(req: Request, res: Response) {
      const { id } = parametros<ParamsId>(req, res);
      enviarOk(res, vueloAJson(await catalogo.obtenerVuelo(id)));
    },

    async disponibilidad(req: Request, res: Response) {
      const { id } = parametros<ParamsId>(req, res);
      const asientosDisponibles = await reservas.consultarDisponibilidad(id);
      enviarOk(res, { vueloId: id, asientosDisponibles });
    },

    async asientos(req: Request, res: Response) {
      const { id } = parametros<ParamsId>(req, res);
      enviarOk(res, await catalogo.asientosDeVuelo(id));
    },
  };
}

export type ControladorVuelos = ReturnType<typeof crearControladorVuelos>;
