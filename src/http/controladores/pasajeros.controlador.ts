import type { Request, Response } from "express";
import { exigirPasajeroPropio } from "../seguridad";
import { CatalogoService } from "../../aplicacion/CatalogoService";
import { consulta, cuerpo, parametros } from "../entrada";
import { enviarCreado, enviarOk } from "../respuestas";
import type { CrearPasajeroBody, ParamsId, QueryFiltroEstado } from "../validacion/esquemas";

export function crearControladorPasajeros(catalogo: CatalogoService) {
  return {
    async registrar(req: Request, res: Response) {
      const pasajero = await catalogo.registrarPasajero(cuerpo<CrearPasajeroBody>(req, res));
      enviarCreado(res, pasajero, `/pasajeros/${pasajero.id}`);
    },

    async obtener(req: Request, res: Response) {
      const { id } = parametros<ParamsId>(req, res);
      exigirPasajeroPropio(res, id);
      enviarOk(res, await catalogo.obtenerPasajero(id));
    },

    async reservas(req: Request, res: Response) {
      const { id } = parametros<ParamsId>(req, res);
      exigirPasajeroPropio(res, id);
      const { estado } = consulta<QueryFiltroEstado>(req, res);
      enviarOk(res, await catalogo.historialDePasajero(id, estado));
    },
  };
}

export type ControladorPasajeros = ReturnType<typeof crearControladorPasajeros>;
