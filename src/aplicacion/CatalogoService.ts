import { randomUUID } from "node:crypto";
import { Asiento } from "../entities/Asiento";
import { ClaseAsiento, EstadoReserva } from "../entities/enums";
import { Pasajero } from "../entities/Pasajero";
import { Reserva } from "../entities/Reserva";
import { Vuelo } from "../entities/Vuelo";
import { RecursoNoEncontradoError } from "../errores/erroresDeNegocio";
import { VueloDuplicadoError } from "../errores/erroresDeNegocio";
import { IReservaRepositorio } from "../puertos/IReservaRepositorio";
import { ReservaService } from "../servicios/ReservaService";

export interface DatosVuelo {
  id: string;
  origen: string;
  destino: string;
  fecha: Date;
  hora: string;
  asientos: { numero: string; clase: `${ClaseAsiento}` }[];
}

export interface DatosPasajero {
  nombre: string;
  contacto: string;
}

export interface AsientoConEstado {
  id: string;
  vueloId: string;
  numero: string;
  clase: ClaseAsiento;
  /** true si alguna reserva activa (pendiente o confirmada) lo ocupa. */
  ocupado: boolean;
}

/**
 * Consultas y altas que el servicio HTTP necesita y que el dominio no tiene
 * como caso de uso (buscar por id, registrar vuelos y pasajeros). NO contiene
 * reglas de negocio: esas siguen en ReservaService. Usa el mismo contrato
 * IReservaRepositorio, así que funciona igual en memoria y en MySQL.
 */
export class CatalogoService {
  constructor(
    private readonly repositorio: IReservaRepositorio,
    private readonly reservas: ReservaService
  ) {}

    async listarVuelos(): Promise<Vuelo[]> {
    return this.repositorio.listarVuelos();
  }
  
  // ---------- Vuelos y asientos ----------
  async obtenerVuelo(vueloId: string): Promise<Vuelo> {
    const vuelo = await this.repositorio.obtenerVuelo(vueloId);
    if (!vuelo) throw new RecursoNoEncontradoError("Vuelo", vueloId);
    return vuelo;
  }

  async asientosDeVuelo(vueloId: string): Promise<AsientoConEstado[]> {
    const vuelo = await this.obtenerVuelo(vueloId);
    const activas = await this.repositorio.listarReservasActivasPorVuelo(vueloId);
    const ocupados = new Set(activas.map((r) => r.asientoId));
    return vuelo.asientos.map((a) => ({ ...a, ocupado: ocupados.has(a.id) }));
  }

  async registrarVuelo(datos: DatosVuelo): Promise<Vuelo> {
    return this.repositorio.ejecutarEnVuelo(datos.id, async repo => {
    // guardarVuelo es un upsert: sin esta revisión un id repetido sobrescribiría el vuelo.
    if (await repo.obtenerVuelo(datos.id)) {
      throw new VueloDuplicadoError(datos.id);
    }

    // Mismo formato de id que usa el seeder: "<vuelo>-<numero>" (ej. V100-12A).
    const asientos = datos.asientos.map(
      (a) => new Asiento(`${datos.id}-${a.numero}`, datos.id, a.numero, a.clase as ClaseAsiento)
    );
    const vuelo = new Vuelo(datos.id, datos.origen, datos.destino, datos.fecha, datos.hora, asientos);
    await repo.guardarVuelo(vuelo, true);
    return vuelo;
    });
  }

  // ---------- Pasajeros ----------
  async obtenerPasajero(pasajeroId: string): Promise<Pasajero> {
    const pasajero = await this.repositorio.obtenerPasajero(pasajeroId);
    if (!pasajero) throw new RecursoNoEncontradoError("Pasajero", pasajeroId);
    return pasajero;
  }

  async registrarPasajero(datos: DatosPasajero): Promise<Pasajero> {
    const pasajero = new Pasajero(`pas-${randomUUID()}`, datos.nombre, datos.contacto);
    await this.repositorio.guardarPasajero(pasajero);
    return pasajero;
  }

  /** Historial del caso de uso del dominio, con 404 si el pasajero no existe y filtro opcional por estado. */
  async historialDePasajero(pasajeroId: string, estado?: `${EstadoReserva}`): Promise<Reserva[]> {
    await this.obtenerPasajero(pasajeroId);
    const historial = await this.reservas.historialDePasajero(pasajeroId);
    return estado ? historial.filter((r) => r.estado === estado) : historial;
  }

  // ---------- Reservas ----------
  async obtenerReserva(reservaId: string): Promise<Reserva> {
    const reserva = await this.repositorio.obtenerReserva(reservaId);
    if (!reserva) throw new RecursoNoEncontradoError("Reserva", reservaId);
    return reserva;
  }
}
