import { Asiento } from "../entities/Asiento";
import { Pasajero } from "../entities/Pasajero";
import { Reserva } from "../entities/Reserva";
import { Vuelo } from "../entities/Vuelo";

/**
 * Operaciones que el dominio necesita para leer y persistir sus entidades.
 * Al servicio de dominio no le importa de dónde salen los datos ni cómo se
 * guardan: solo conoce esta interfaz.
 *
 * Avance 2: el contrato pasa a ser asíncrono (Promise) porque una base de
 * datos real no puede responder de forma síncrona. Las operaciones y las
 * reglas de negocio son exactamente las mismas del avance 1.
 */
export interface IReservaRepositorio {
  // --- Lectura ---
  obtenerVuelo(vueloId: string): Promise<Vuelo | undefined>;
  obtenerAsiento(asientoId: string): Promise<Asiento | undefined>;
  obtenerPasajero(pasajeroId: string): Promise<Pasajero | undefined>;
  obtenerReserva(reservaId: string): Promise<Reserva | undefined>;

  listarReservasActivasPorVuelo(vueloId: string): Promise<Reserva[]>;
  listarReservasActivasPorAsiento(asientoId: string): Promise<Reserva[]>;
  listarReservasActivasPorPasajeroYAsiento(
    pasajeroId: string,
    asientoId: string
  ): Promise<Reserva[]>;
  listarReservasPorPasajero(pasajeroId: string): Promise<Reserva[]>;

  // --- Escritura ---
  guardarVuelo(vuelo: Vuelo): Promise<void>;
  guardarPasajero(pasajero: Pasajero): Promise<void>;
  guardarReserva(reserva: Reserva): Promise<void>;
  actualizarReserva(reserva: Reserva): Promise<void>;
}