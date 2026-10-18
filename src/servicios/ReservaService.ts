import { randomUUID } from "node:crypto";
import { EstadoReserva } from "../entities/enums";
import { Reserva } from "../entities/Reserva";
import {
  AsientoOcupadoError,
  CapacidadMaximaAlcanzadaError,
  RecursoNoEncontradoError,
  ReservaCompletadaError,
  ReservaDuplicadaError,
  TransicionInvalidaError,
  VueloSinDisponibilidadError,
} from "../errores/erroresDeNegocio";
import { IReservaRepositorio } from "../puertos/IReservaRepositorio";

function generarId(prefijo: string): string { return `${prefijo}-${randomUUID()}`; }

/**
 * Servicio con las reglas de negocio del dominio de reservas. Recibe el
 * acceso a datos únicamente por su contrato (IReservaRepositorio) y nunca
 * por una implementación concreta.
 */
export class ReservaService {
  constructor(private readonly repositorio: IReservaRepositorio, private readonly dentroDeTransaccion = false) {}

  /** Asientos de un vuelo que aún no están ocupados por ninguna reserva activa. */
  async consultarDisponibilidad(vueloId: string): Promise<number> {
    const vuelo = await this.repositorio.obtenerVuelo(vueloId);
    if (!vuelo) throw new RecursoNoEncontradoError("Vuelo", vueloId);

    const activas = await this.repositorio.listarReservasActivasPorVuelo(vueloId);
    return vuelo.capacidadTotal - activas.length;
  }

  async crearReserva(
    pasajeroId: string,
    vueloId: string,
    asientoId: string
  ): Promise<Reserva> {
    if (!this.dentroDeTransaccion)
      return this.repositorio.ejecutarEnVuelo(vueloId, repo => new ReservaService(repo, true).crearReserva(pasajeroId, vueloId, asientoId));
    const vuelo = await this.repositorio.obtenerVuelo(vueloId);
    if (!vuelo) throw new RecursoNoEncontradoError("Vuelo", vueloId);

    const asiento = await this.repositorio.obtenerAsiento(asientoId);
    if (!asiento || asiento.vueloId !== vueloId) {
      throw new RecursoNoEncontradoError("Asiento", asientoId);
    }

    const pasajero = await this.repositorio.obtenerPasajero(pasajeroId);
    if (!pasajero) throw new RecursoNoEncontradoError("Pasajero", pasajeroId);

    // Regla: toda reserva debe crearse sobre un vuelo con al menos un asiento disponible.
    if ((await this.consultarDisponibilidad(vueloId)) <= 0) {
      throw new VueloSinDisponibilidadError(vueloId);
    }

    // Regla: no se puede reservar un asiento ya ocupado por otra reserva activa.
    const ocupadas = await this.repositorio.listarReservasActivasPorAsiento(asientoId);
    if (ocupadas.length > 0) {
      throw new AsientoOcupadoError(asientoId);
    }

    // Regla: un pasajero no puede tener dos reservas activas para el mismo asiento del mismo vuelo.
    const duplicadas = await this.repositorio.listarReservasActivasPorPasajeroYAsiento(
      pasajeroId,
      asientoId
    );
    if (duplicadas.length > 0) {
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
    await this.repositorio.guardarReserva(reserva);
    return reserva;
  }

  async confirmarReserva(reservaId: string): Promise<Reserva> {
    const reserva = await this.repositorio.obtenerReserva(reservaId);
    if (!reserva) throw new RecursoNoEncontradoError("Reserva", reservaId);
    if (!this.dentroDeTransaccion)
      return this.repositorio.ejecutarEnVuelo(reserva.vueloId, repo => new ReservaService(repo, true).confirmarReserva(reservaId));


    const vuelo = await this.repositorio.obtenerVuelo(reserva.vueloId);
    if (!vuelo) throw new RecursoNoEncontradoError("Vuelo", reserva.vueloId);

    // Regla: solo se puede confirmar desde un estado que lo permita (PENDIENTE).
    if (!reserva.puedePasarA(EstadoReserva.CONFIRMADA)) {
      throw new TransicionInvalidaError(reserva.id, reserva.estado, EstadoReserva.CONFIRMADA);
    }

    // Regla: no se puede confirmar una reserva si el vuelo ya alcanzó su
    // capacidad máxima de asientos confirmados.
    const activas = await this.repositorio.listarReservasActivasPorVuelo(reserva.vueloId);
    const confirmadas = activas.filter((r) => r.estado === EstadoReserva.CONFIRMADA);
    if (confirmadas.length >= vuelo.capacidadTotal) {
      throw new CapacidadMaximaAlcanzadaError(reserva.vueloId);
    }

    reserva.cambiarEstado(EstadoReserva.CONFIRMADA);
    await this.repositorio.actualizarReserva(reserva);
    return reserva;
  }

  async cancelarReserva(reservaId: string): Promise<Reserva> {
    const reserva = await this.repositorio.obtenerReserva(reservaId);
    if (!reserva) throw new RecursoNoEncontradoError("Reserva", reservaId);
    if (!this.dentroDeTransaccion)
      return this.repositorio.ejecutarEnVuelo(reserva.vueloId, repo => new ReservaService(repo, true).cancelarReserva(reservaId));


    // Regla: no se puede cancelar una reserva que ya se encuentre en estado "completada".
    if (reserva.estado === EstadoReserva.COMPLETADA) {
      throw new ReservaCompletadaError(reservaId);
    }

    // Regla: solo se puede cancelar desde un estado que lo permita
    // (una reserva ya cancelada no se vuelve a cancelar).
    reserva.cambiarEstado(EstadoReserva.CANCELADA);
    await this.repositorio.actualizarReserva(reserva);
    return reserva;
  }

  async historialDePasajero(pasajeroId: string): Promise<Reserva[]> {
    return await this.repositorio.listarReservasPorPasajero(pasajeroId);
  }
}