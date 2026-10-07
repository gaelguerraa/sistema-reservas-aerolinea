import { DomainError } from "./DomainError";

/** Regla: no se puede reservar un asiento ya ocupado por otra reserva activa del mismo vuelo. */
export class AsientoOcupadoError extends DomainError {
  constructor(asientoId: string) {
    super(`El asiento ${asientoId} ya está ocupado por otra reserva activa.`);
  }
}

/** Regla: toda reserva debe crearse sobre un vuelo con al menos un asiento disponible. */
export class VueloSinDisponibilidadError extends DomainError {
  constructor(vueloId: string) {
    super(`El vuelo ${vueloId} no tiene asientos disponibles en este momento.`);
  }
}

/** Regla: no se puede confirmar una reserva si el vuelo alcanzó su capacidad máxima. */
export class CapacidadMaximaAlcanzadaError extends DomainError {
  constructor(vueloId: string) {
    super(`El vuelo ${vueloId} ya alcanzó su capacidad máxima de asientos confirmados.`);
  }
}

/** Regla: no se puede cancelar una reserva que ya está en estado "completada". */
export class ReservaCompletadaError extends DomainError {
  constructor(reservaId: string) {
    super(`La reserva ${reservaId} ya está completada y no se puede cancelar.`);
  }
}

/** Regla: un pasajero no puede tener dos reservas activas para el mismo asiento del mismo vuelo. */
export class ReservaDuplicadaError extends DomainError {
  constructor(pasajeroId: string, asientoId: string) {
    super(
      `El pasajero ${pasajeroId} ya tiene una reserva activa para el asiento ${asientoId}.`
    );
  }
}

/** No es una regla de negocio "que impide algo", pero es necesaria para casos de datos inexistentes. */
export class RecursoNoEncontradoError extends DomainError {
  constructor(tipo: string, id: string) {
    super(`${tipo} con id ${id} no fue encontrado.`);
  }
}

/** Regla: solo se permiten ciertos cambios de estado en una reserva. */
export class TransicionInvalidaError extends DomainError {
  constructor(reservaId: string, desde: string, hacia: string) {
    super(`La reserva ${reservaId} no puede pasar de ${desde} a ${hacia}.`);
  }
}
