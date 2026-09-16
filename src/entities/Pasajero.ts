/**
 * Persona que registra sus datos de contacto para reservar uno o más
 * asientos en un vuelo.
 */
export class Pasajero {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly contacto: string
  ) {}
}
