import { Asiento } from "../entities/Asiento";
import { Pasajero } from "../entities/Pasajero";
import { Reserva } from "../entities/Reserva";
import { Vuelo } from "../entities/Vuelo";
import { IReservaRepositorio } from "../puertos/IReservaRepositorio";

/**
 * Guarda todo en Maps en memoria. Sirve únicamente para poder probar el
 * dominio sin depender de ninguna base de datos real. Más adelante esta
 * clase se sustituye por una implementación con Prisma/TypeORM/lo que sea,
 * sin tocar el servicio de dominio.
 */
export class ReservaRepositorioEnMemoria implements IReservaRepositorio {
  private vuelos = new Map<string, Vuelo>();
  private pasajeros = new Map<string, Pasajero>();
  private reservas = new Map<string, Reserva>();

  obtenerVuelo(vueloId: string): Vuelo | undefined {
    return this.vuelos.get(vueloId);
  }

  obtenerAsiento(asientoId: string): Asiento | undefined {
    for (const vuelo of this.vuelos.values()) {
      const asiento = vuelo.asientos.find((a) => a.id === asientoId);
      if (asiento) return asiento;
    }
    return undefined;
  }

  obtenerPasajero(pasajeroId: string): Pasajero | undefined {
    return this.pasajeros.get(pasajeroId);
  }

  obtenerReserva(reservaId: string): Reserva | undefined {
    return this.reservas.get(reservaId);
  }

  listarReservasActivasPorVuelo(vueloId: string): Reserva[] {
    return [...this.reservas.values()].filter(
      (r) => r.vueloId === vueloId && r.estaActiva()
    );
  }

  listarReservasActivasPorAsiento(asientoId: string): Reserva[] {
    return [...this.reservas.values()].filter(
      (r) => r.asientoId === asientoId && r.estaActiva()
    );
  }

  listarReservasActivasPorPasajeroYAsiento(
    pasajeroId: string,
    asientoId: string
  ): Reserva[] {
    return [...this.reservas.values()].filter(
      (r) =>
        r.pasajeroId === pasajeroId && r.asientoId === asientoId && r.estaActiva()
    );
  }

  listarReservasPorPasajero(pasajeroId: string): Reserva[] {
    return [...this.reservas.values()].filter((r) => r.pasajeroId === pasajeroId);
  }

  guardarVuelo(vuelo: Vuelo): void {
    this.vuelos.set(vuelo.id, vuelo);
  }

  guardarPasajero(pasajero: Pasajero): void {
    this.pasajeros.set(pasajero.id, pasajero);
  }

  guardarReserva(reserva: Reserva): void {
    this.reservas.set(reserva.id, reserva);
  }

  actualizarReserva(reserva: Reserva): void {
    this.reservas.set(reserva.id, reserva);
  }
}
