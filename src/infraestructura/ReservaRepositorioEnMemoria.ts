import { Asiento } from "../entities/Asiento";
import { Pasajero } from "../entities/Pasajero";
import { Reserva } from "../entities/Reserva";
import { Vuelo } from "../entities/Vuelo";
import { IReservaRepositorio } from "../puertos/IReservaRepositorio";

/**
 * Guarda todo en Maps en memoria. Sirve para probar el dominio sin base de
 * datos. Cumple el mismo contrato (asíncrono) que la implementación con Prisma.
 */
export class ReservaRepositorioEnMemoria implements IReservaRepositorio {
  private vuelos = new Map<string, Vuelo>();
  private pasajeros = new Map<string, Pasajero>();
  private reservas = new Map<string, Reserva>();

  async obtenerVuelo(vueloId: string): Promise<Vuelo | undefined> {
    return this.vuelos.get(vueloId);
  }

  async obtenerAsiento(asientoId: string): Promise<Asiento | undefined> {
    for (const vuelo of this.vuelos.values()) {
      const asiento = vuelo.asientos.find((a) => a.id === asientoId);
      if (asiento) return asiento;
    }
    return undefined;
  }

  async obtenerPasajero(pasajeroId: string): Promise<Pasajero | undefined> {
    return this.pasajeros.get(pasajeroId);
  }

  async obtenerReserva(reservaId: string): Promise<Reserva | undefined> {
    return this.reservas.get(reservaId);
  }

  async listarReservasActivasPorVuelo(vueloId: string): Promise<Reserva[]> {
    return [...this.reservas.values()].filter(
      (r) => r.vueloId === vueloId && r.estaActiva()
    );
  }

  async listarReservasActivasPorAsiento(asientoId: string): Promise<Reserva[]> {
    return [...this.reservas.values()].filter(
      (r) => r.asientoId === asientoId && r.estaActiva()
    );
  }

  async listarReservasActivasPorPasajeroYAsiento(
    pasajeroId: string,
    asientoId: string
  ): Promise<Reserva[]> {
    return [...this.reservas.values()].filter(
      (r) =>
        r.pasajeroId === pasajeroId && r.asientoId === asientoId && r.estaActiva()
    );
  }

  async listarReservasPorPasajero(pasajeroId: string): Promise<Reserva[]> {
    return [...this.reservas.values()].filter((r) => r.pasajeroId === pasajeroId);
  }

  async guardarVuelo(vuelo: Vuelo): Promise<void> {
    this.vuelos.set(vuelo.id, vuelo);
  }

  async guardarPasajero(pasajero: Pasajero): Promise<void> {
    this.pasajeros.set(pasajero.id, pasajero);
  }

  async guardarReserva(reserva: Reserva): Promise<void> {
    this.reservas.set(reserva.id, reserva);
  }

  async actualizarReserva(reserva: Reserva): Promise<void> {
    this.reservas.set(reserva.id, reserva);
  }
}