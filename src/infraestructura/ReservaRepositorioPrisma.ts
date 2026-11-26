import { PrismaClient, Prisma } from "../generated/prisma/client";
import { Asiento } from "../entities/Asiento";
import { Pasajero } from "../entities/Pasajero";
import { Reserva } from "../entities/Reserva";
import { Vuelo } from "../entities/Vuelo";
import { ClaseAsiento, EstadoReserva } from "../entities/enums";
import { FiltroReservas, IReservaRepositorio, ReservaAgenda } from "../puertos/IReservaRepositorio";

const ACTIVOS: EstadoReserva[] = [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA];

/**
 * Implementación del contrato IReservaRepositorio con Prisma + MySQL.
 * Hace lo mismo que ReservaRepositorioEnMemoria; el dominio no se entera.
 */
export class ReservaRepositorioPrisma implements IReservaRepositorio {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  async ejecutarEnVuelo<T>(vueloId: string, trabajo: (repo: IReservaRepositorio) => Promise<T>): Promise<T> {
    if (!("$transaction" in this.prisma)) return trabajo(this);
    return this.prisma.$transaction(async tx => {
      // Las operaciones del mismo vuelo esperan su turno, incluso en procesos distintos.
      await tx.$queryRaw`SELECT id FROM vuelos WHERE id = ${vueloId} FOR UPDATE`;
      return trabajo(new ReservaRepositorioPrisma(tx));
    }, { isolationLevel: "ReadCommitted", maxWait: 10000, timeout: 15000 });
  }

  // ---------- Mapeos fila -> entidad de dominio ----------
  private aAsiento(r: { id: string; vueloId: string; numero: string; clase: string }): Asiento {
    return new Asiento(r.id, r.vueloId, r.numero, r.clase as ClaseAsiento);
  }

  private aReserva(r: {
    id: string;
    vueloId: string;
    asientoId: string;
    pasajeroId: string;
    estado: string;
    fechaCreacion: Date;
  }): Reserva {
    return new Reserva(
      r.id,
      r.vueloId,
      r.asientoId,
      r.pasajeroId,
      r.estado as EstadoReserva,
      r.fechaCreacion
    );
  }

  
  private aVuelo(fila: {
    id: string;
    origen: string;
    destino: string;
    fecha: Date;
    hora: string;
    activo: boolean;
    asientos: { id: string; vueloId: string; numero: string; clase: string }[];
  }): Vuelo {
    return new Vuelo(
      fila.id,
      fila.origen,
      fila.destino,
      fila.fecha,
      fila.hora,
      fila.asientos.map((a) => this.aAsiento(a)),
      fila.activo
    );
  }

  // ---------- Lectura ----------
  async obtenerVuelo(vueloId: string): Promise<Vuelo | undefined> {
    const fila = await this.prisma.vuelo.findUnique({
      where: { id: vueloId },
      include: { asientos: { orderBy: { numero: "asc" } } },
    });
    return fila ? this.aVuelo(fila) : undefined;
  }

  async listarVuelos(): Promise<Vuelo[]> {
    const filas = await this.prisma.vuelo.findMany({
      where: { activo: true },
      include: { asientos: { orderBy: { numero: "asc" } } },
      orderBy: [{ fecha: "asc" }, { hora: "asc" }],
    });
    return filas.map((fila) => this.aVuelo(fila));
  }

  async listarVuelosPorPeriodo(desde: Date, hasta: Date): Promise<Vuelo[]> {
    const filas = await this.prisma.vuelo.findMany({
      where: { activo: true, fecha: { gte: desde, lte: hasta } },
      include: { asientos: { orderBy: { numero: "asc" } } },
      orderBy: [{ fecha: "asc" }, { hora: "asc" }],
    });
    return filas.map((fila) => this.aVuelo(fila));
  }

  async listarPasajeros(texto?: string): Promise<Pasajero[]> {
    // Prisma no escapa los comodines de LIKE: sin esto, buscar "%" o "_" traería a todos los pasajeros.
    const literal = texto?.replace(/[\\%_]/g, "\\$&");
    const filas = await this.prisma.pasajero.findMany({
      // Mayúsculas y acentos dependen de la colación de la base (en MySQL por defecto no distingue).
      where: literal ? { OR: [{ nombre: { contains: literal } }, { contacto: { contains: literal } }] } : undefined,
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
    });
    return filas.map((f) => new Pasajero(f.id, f.nombre, f.contacto));
  }

  async listarReservasAgenda(filtro: FiltroReservas): Promise<ReservaAgenda[]> {
    const fecha = {
      ...(filtro.desde ? { gte: filtro.desde } : {}),
      ...(filtro.hasta ? { lte: filtro.hasta } : {}),
    };
    const filas = await this.prisma.reserva.findMany({
      where: {
        ...(filtro.vueloId ? { vueloId: filtro.vueloId } : {}),
        ...(filtro.estado ? { estado: filtro.estado } : {}),
        ...(filtro.pasajeroId ? { pasajeroId: filtro.pasajeroId } : {}),
        ...(Object.keys(fecha).length > 0 ? { vuelo: { fecha } } : {}),
      },
      include: { vuelo: true, asiento: true, pasajero: true },
      orderBy: [{ vuelo: { fecha: "asc" } }, { vuelo: { hora: "asc" } }, { fechaCreacion: "asc" }, { id: "asc" }],
    });
    return filas.map((f) => ({
      id: f.id,
      estado: f.estado as EstadoReserva,
      fechaCreacion: f.fechaCreacion,
      vuelo: { id: f.vuelo.id, origen: f.vuelo.origen, destino: f.vuelo.destino, fecha: f.vuelo.fecha, hora: f.vuelo.hora },
      asiento: { id: f.asiento.id, numero: f.asiento.numero, clase: f.asiento.clase as ClaseAsiento },
      pasajero: { id: f.pasajero.id, nombre: f.pasajero.nombre },
    }));
  }

  async listarVuelosEnPeriodo(desde: Date, hastaExclusiva: Date): Promise<Vuelo[]> {
    const filas = await this.prisma.vuelo.findMany({
      where: { fecha: { gte: desde, lt: hastaExclusiva } },
      include: { asientos: { orderBy: { numero: "asc" } } },
      orderBy: [{ fecha: "asc" }, { hora: "asc" }],
    });
    return filas.map((fila) => new Vuelo(
      fila.id,
      fila.origen,
      fila.destino,
      fila.fecha,
      fila.hora,
      fila.asientos.map((a) => this.aAsiento(a))
    ));
  }

  async obtenerAsiento(asientoId: string): Promise<Asiento | undefined> {
    const fila = await this.prisma.asiento.findUnique({ where: { id: asientoId } });
    return fila ? this.aAsiento(fila) : undefined;
  }

  async obtenerPasajero(pasajeroId: string): Promise<Pasajero | undefined> {
    const fila = await this.prisma.pasajero.findUnique({ where: { id: pasajeroId } });
    return fila ? new Pasajero(fila.id, fila.nombre, fila.contacto) : undefined;
  }

  async obtenerReserva(reservaId: string): Promise<Reserva | undefined> {
    const fila = await this.prisma.reserva.findUnique({ where: { id: reservaId } });
    return fila ? this.aReserva(fila) : undefined;
  }

  async listarReservasActivasPorVuelo(vueloId: string): Promise<Reserva[]> {
    const filas = await this.prisma.reserva.findMany({
      where: { vueloId, estado: { in: ACTIVOS } },
    });
    return filas.map((f) => this.aReserva(f));
  }

  async listarReservasActivasPorAsiento(asientoId: string): Promise<Reserva[]> {
    const filas = await this.prisma.reserva.findMany({
      where: { asientoId, estado: { in: ACTIVOS } },
    });
    return filas.map((f) => this.aReserva(f));
  }

  async listarReservasActivasPorPasajeroYAsiento(
    pasajeroId: string,
    asientoId: string
  ): Promise<Reserva[]> {
    const filas = await this.prisma.reserva.findMany({
      where: { pasajeroId, asientoId, estado: { in: ACTIVOS } },
    });
    return filas.map((f) => this.aReserva(f));
  }

  async listarReservasPorPasajero(pasajeroId: string): Promise<Reserva[]> {
    const filas = await this.prisma.reserva.findMany({
      where: { pasajeroId },
      orderBy: { fechaCreacion: "asc" },
    });
    return filas.map((f) => this.aReserva(f));
  }

  async listarReservasPorVuelos(vueloIds: readonly string[]): Promise<Reserva[]> {
    if (vueloIds.length === 0) return [];
    const filas = await this.prisma.reserva.findMany({
      where: { vueloId: { in: [...vueloIds] } },
    });
    return filas.map((fila) => this.aReserva(fila));
  }

  // ---------- Escritura ----------
  async guardarVuelo(vuelo: Vuelo, soloNuevo = false): Promise<void> {
    const guardar = async (tx: Prisma.TransactionClient) => {
      const datos = {
        origen: vuelo.origen,
        destino: vuelo.destino,
        fecha: vuelo.fecha,
        hora: vuelo.hora,
        activo: vuelo.activo,
      };
      if (soloNuevo) await tx.vuelo.create({ data: { id: vuelo.id, ...datos } });
      else await tx.vuelo.upsert({
        where: { id: vuelo.id },
        create: { id: vuelo.id, ...datos },
        update: datos,
      });

      await tx.asiento.deleteMany({ where: { vueloId: vuelo.id, id: { notIn: vuelo.asientos.map(a => a.id) } } });
      for (const a of vuelo.asientos) {
        await tx.asiento.upsert({
          where: { id: a.id },
          create: { id: a.id, vueloId: vuelo.id, numero: a.numero, clase: a.clase },
          update: { numero: a.numero, clase: a.clase },
        });
      }
    };
    if ("$transaction" in this.prisma) await this.prisma.$transaction(guardar);
    else await guardar(this.prisma);
  }

    async actualizarVuelo(vuelo: Vuelo): Promise<void> {
    // update lanza P2025 si el vuelo no existe (el manejador de errores lo traduce a 404).
    await this.prisma.vuelo.update({
      where: { id: vuelo.id },
      data: { origen: vuelo.origen, destino: vuelo.destino, fecha: vuelo.fecha, hora: vuelo.hora, activo: vuelo.activo },
    });
  }

  async guardarPasajero(pasajero: Pasajero): Promise<void> {
    await this.prisma.pasajero.upsert({
      where: { id: pasajero.id },
      create: { id: pasajero.id, nombre: pasajero.nombre, contacto: pasajero.contacto },
      update: { nombre: pasajero.nombre, contacto: pasajero.contacto },
    });
  }

  async guardarReserva(reserva: Reserva): Promise<void> {
    const datos = {
      vueloId: reserva.vueloId,
      asientoId: reserva.asientoId,
      pasajeroId: reserva.pasajeroId,
      estado: reserva.estado,
      fechaCreacion: reserva.fechaCreacion,
    };
    await this.prisma.reserva.upsert({
      where: { id: reserva.id },
      create: { id: reserva.id, ...datos },
      update: datos,
    });
  }

  async actualizarReserva(reserva: Reserva): Promise<void> {
    await this.prisma.reserva.update({
      where: { id: reserva.id },
      data: { estado: reserva.estado },
    });
  }
}
