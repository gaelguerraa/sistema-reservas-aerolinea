import { EstadoReserva } from "../entities/enums";
import { Reserva } from "../entities/Reserva";
import {
  AsientoOcupadoError,
  CapacidadMaximaAlcanzadaError,
  RecursoNoEncontradoError,
  ReservaCompletadaError,
  ReservaDuplicadaError,
  VueloSinDisponibilidadError,
} from "../errores/erroresDeNegocio";
import { IReservaRepositorio } from "../puertos/IReservaRepositorio";

let contador = 0;
function generarId(prefijo: string): string {
  contador += 1;
  return `${prefijo}-${Date.now()}-${contador}`;
}

/**
 * Servicio con las reglas de negocio del dominio de reservas. Recibe el
 * acceso a datos únicamente por su contrato (IReservaRepositorio) y nunca
 * por una implementación concreta.
 */
export class ReservaService {
  constructor(private readonly repositorio: IReservaRepositorio) {}

  /** Asientos de un vuelo que aún no están ocupados por ninguna reserva activa. */
  consultarDisponibilidad(vueloId: string): number {
    const vuelo = this.repositorio.obtenerVuelo(vueloId);
    if (!vuelo) throw new RecursoNoEncontradoError("Vuelo", vueloId);

    const activas = this.repositorio.listarReservasActivasPorVuelo(vueloId);
    return vuelo.capacidadTotal - activas.length;
  }

  crearReserva(pasajeroId: string, vueloId: string, asientoId: string): Reserva {
    const vuelo = this.repositorio.obtenerVuelo(vueloId);
    if (!vuelo) throw new RecursoNoEncontradoError("Vuelo", vueloId);

    const asiento = this.repositorio.obtenerAsiento(asientoId);
    if (!asiento || asiento.vueloId !== vueloId) {
      throw new RecursoNoEncontradoError("Asiento", asientoId);
    }

    const pasajero = this.repositorio.obtenerPasajero(pasajeroId);
    if (!pasajero) throw new RecursoNoEncontradoError("Pasajero", pasajeroId);

    // Regla: toda reserva debe crearse sobre un vuelo con al menos un asiento disponible.
    if (this.consultarDisponibilidad(vueloId) <= 0) {
      throw new VueloSinDisponibilidadError(vueloId);
    }

    // Regla: no se puede reservar un asiento ya ocupado por otra reserva activa.
    if (this.repositorio.listarReservasActivasPorAsiento(asientoId).length > 0) {
      throw new AsientoOcupadoError(asientoId);
    }

    // Regla: un pasajero no puede tener dos reservas activas para el mismo asiento del mismo vuelo.
    if (
      this.repositorio.listarReservasActivasPorPasajeroYAsiento(pasajeroId, asientoId)
        .length > 0
    ) {
      throw new ReservaDuplicadaError(pasajeroId, asientoId);
    }

    const reserva = new Reserva(
      generarId("res"),
      vueloId,
      asientoId,
      pasajeroId,
      EstadoReserva.PENDIENTE,
      new Date()
    );
    this.repositorio.guardarReserva(reserva);
    return reserva;
  }

  confirmarReserva(reservaId: string): Reserva {
    const reserva = this.repositorio.obtenerReserva(reservaId);
    if (!reserva) throw new RecursoNoEncontradoError("Reserva", reservaId);

    const vuelo = this.repositorio.obtenerVuelo(reserva.vueloId);
    if (!vuelo) throw new RecursoNoEncontradoError("Vuelo", reserva.vueloId);

    // Regla: no se puede confirmar una reserva si el vuelo ya alcanzó su
    // capacidad máxima de asientos confirmados.
    const confirmadas = this.repositorio
      .listarReservasActivasPorVuelo(reserva.vueloId)
      .filter((r) => r.estado === EstadoReserva.CONFIRMADA);
    if (confirmadas.length >= vuelo.capacidadTotal) {
      throw new CapacidadMaximaAlcanzadaError(reserva.vueloId);
    }

    reserva.estado = EstadoReserva.CONFIRMADA;
    this.repositorio.actualizarReserva(reserva);
    return reserva;
  }

  cancelarReserva(reservaId: string): Reserva {
    const reserva = this.repositorio.obtenerReserva(reservaId);
    if (!reserva) throw new RecursoNoEncontradoError("Reserva", reservaId);

    // Regla: no se puede cancelar una reserva que ya se encuentre en estado "completada".
    if (reserva.estado === EstadoReserva.COMPLETADA) {
      throw new ReservaCompletadaError(reservaId);
    }

    reserva.estado = EstadoReserva.CANCELADA;
    this.repositorio.actualizarReserva(reserva);
    return reserva;
  }

  historialDePasajero(pasajeroId: string): Reserva[] {
    return this.repositorio.listarReservasPorPasajero(pasajeroId);
  }
}
