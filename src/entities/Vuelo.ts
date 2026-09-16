import { Asiento } from "./Asiento";

/**
 * Viaje programado entre un origen y un destino, en una fecha y hora
 * específicas, con una capacidad total de asientos.
 */
export class Vuelo {
  constructor(
    public readonly id: string,
    public readonly origen: string,
    public readonly destino: string,
    public readonly fecha: Date,
    public readonly hora: string,
    public readonly asientos: Asiento[]
  ) {
    if (asientos.length === 0) {
      throw new Error("Un vuelo debe tener al menos un asiento definido");
    }
  }

  get capacidadTotal(): number {
    return this.asientos.length;
  }
}
