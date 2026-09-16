import { Asiento } from "../entities/Asiento";
import { Pasajero } from "../entities/Pasajero";
import { Reserva } from "../entities/Reserva";
import { Vuelo } from "../entities/Vuelo";

/**
 * Operaciones que el dominio necesita para leer y persistir sus entidades.
 * Al servicio de dominio no le importa de dónde salen los datos ni cómo se
 * guardan: solo conoce esta interfaz.
 */
export interface IReservaRepositorio {
  // --- Lectura ---
  obtenerVuelo(vueloId: string): Vuelo | undefined;
  obtenerAsiento(asientoId: string): Asiento | undefined;
  obtenerPasajero(pasajeroId: string): Pasajero | undefined;
  obtenerReserva(reservaId: string): Reserva | undefined;

  listarReservasActivasPorVuelo(vueloId: string): Reserva[];
  listarReservasActivasPorAsiento(asientoId: string): Reserva[];
  listarReservasActivasPorPasajeroYAsiento(
    pasajeroId: string,
    asientoId: string
  ): Reserva[];
  listarReservasPorPasajero(pasajeroId: string): Reserva[];

  // --- Escritura ---
  guardarVuelo(vuelo: Vuelo): void;
  guardarPasajero(pasajero: Pasajero): void;
  guardarReserva(reserva: Reserva): void;
  actualizarReserva(reserva: Reserva): void;
}
