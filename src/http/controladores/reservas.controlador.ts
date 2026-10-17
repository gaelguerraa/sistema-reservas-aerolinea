import type { Request, Response } from "express";
import { CatalogoService } from "../../aplicacion/CatalogoService";
import { Reserva } from "../../entities/Reserva";
import { ReservaService } from "../../servicios/ReservaService";
import { cuerpo, parametros } from "../entrada";
import { enviarCreado, enviarOk } from "../respuestas";
import type { CambiarEstadoReservaBody, CrearReservaBody, ParamsId } from "../validacion/esquemas";

export function crearControladorReservas(reservas: ReservaService, catalogo: CatalogoService) {
  /** Cada estado que se puede pedir desde afuera es un caso de uso del dominio. */
  const casoDeUsoPorEstado: Record<CambiarEstadoReservaBody["estado"], (id: string) => Promise<Reserva>> = {
    CONFIRMADA: (id) => reservas.confirmarReserva(id),
    CANCELADA: (id) => reservas.cancelarReserva(id),
  };

  return {
    async crear(req: Request, res: Response) {
      const { pasajeroId, vueloId, asientoId } = cuerpo<CrearReservaBody>(req, res);
      const reserva = await reservas.crearReserva(pasajeroId, vueloId, asientoId);
      enviarCreado(res, reserva, `/reservas/${reserva.id}`);
    },

    async obtener(req: Request, res: Response) {
      const { id } = parametros<ParamsId>(req, res);
      enviarOk(res, await catalogo.obtenerReserva(id));
    },

    async cambiarEstado(req: Request, res: Response) {
      const { id } = parametros<ParamsId>(req, res);
      const { estado } = cuerpo<CambiarEstadoReservaBody>(req, res);
      enviarOk(res, await casoDeUsoPorEstado[estado](id));
    },
  };
}

export type ControladorReservas = ReturnType<typeof crearControladorReservas>;
