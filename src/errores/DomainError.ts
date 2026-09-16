/**
 * Error base de todas las reglas de negocio del dominio. No representa
 * un error de comunicación ni de infraestructura: aquí todavía no existe
 * ninguna de las dos cosas.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
