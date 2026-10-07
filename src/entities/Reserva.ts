import { EstadoReserva } from "./enums";
import { TransicionInvalidaError } from "../errores/erroresDeNegocio";

const TRANSICIONES: Record<EstadoReserva, EstadoReserva[]> = {
  [EstadoReserva.PENDIENTE]: [EstadoReserva.CONFIRMADA, EstadoReserva.CANCELADA],
  [EstadoReserva.CONFIRMADA]: [EstadoReserva.COMPLETADA, EstadoReserva.CANCELADA],
  [EstadoReserva.CANCELADA]: [],
  [EstadoReserva.COMPLETADA]: [],
};

/**
 * Solicitud de un pasajero para ocupar un asiento en un vuelo determinado.
 */
export class Reserva {
  constructor(
    public readonly id: string,
    public readonly vueloId: string,
    public readonly asientoId: string,
    public readonly pasajeroId: string,
    public estado: EstadoReserva,
    public readonly fechaCreacion: Date
  ) {}

  /** Una reserva activa es la que ocupa un asiento: pendiente o confirmada. */
estaActiva(): boolean {
    return (
      this.estado === EstadoReserva.PENDIENTE ||
      this.estado === EstadoReserva.CONFIRMADA
    );
  }

  puedePasarA(nuevo: EstadoReserva): boolean {
    return TRANSICIONES[this.estado].includes(nuevo);
  }

  cambiarEstado(nuevo: EstadoReserva): void {
    if (!this.puedePasarA(nuevo)) {
      throw new TransicionInvalidaError(this.id, this.estado, nuevo);
    }
    this.estado = nuevo;
  }
}
