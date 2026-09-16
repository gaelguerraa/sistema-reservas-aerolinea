import { ClaseAsiento } from "./enums";

/**
 * Unidad reservable dentro de un vuelo, identificada por número y clase.
 */
export class Asiento {
  constructor(
    public readonly id: string,
    public readonly vueloId: string,
    public readonly numero: string,
    public readonly clase: ClaseAsiento
  ) {}
}
