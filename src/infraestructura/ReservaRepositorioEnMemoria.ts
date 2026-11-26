import { Asiento } from "../entities/Asiento";
import { Pasajero } from "../entities/Pasajero";
import { Reserva } from "../entities/Reserva";
import { Vuelo } from "../entities/Vuelo";
import { FiltroReservas, IReservaRepositorio, ReservaAgenda } from "../puertos/IReservaRepositorio";

/** Minúsculas y sin acentos, para que "lopez" encuentre "López" (como la colación de MySQL). */
const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const porFechaYHora = (a: { fecha: Date; hora: string }, b: { fecha: Date; hora: string }) =>
  +a.fecha - +b.fecha || a.hora.localeCompare(b.hora);

export class ReservaRepositorioEnMemoria implements IReservaRepositorio {
  private vuelos = new Map<string, Vuelo>();
  private pasajeros = new Map<string, Pasajero>();
  private reservas = new Map<string, Reserva>();
  private turno: Promise<void> = Promise.resolve();
  private copiarReserva(r: Reserva) {
    return new Reserva(r.id, r.vueloId, r.asientoId, r.pasajeroId, r.estado, new Date(r.fechaCreacion));
  }
  private copiarVuelo(v: Vuelo) {
    return new Vuelo(v.id, v.origen, v.destino, new Date(v.fecha), v.hora,
      v.asientos.map(a => new Asiento(a.id, a.vueloId, a.numero, a.clase)), v.activo);
  }
  async ejecutarEnVuelo<T>(_vueloId: string, trabajo: (repo: IReservaRepositorio) => Promise<T>): Promise<T> {
    const anterior = this.turno;
    let liberar!: () => void;
    this.turno = new Promise<void>(resolve => { liberar = resolve; });
    await anterior;
    const vuelos = new Map(this.vuelos), reservas = new Map(this.reservas), pasajeros = new Map(this.pasajeros);
    try { return await trabajo(this); }
    catch (e) { this.vuelos = vuelos; this.reservas = reservas; this.pasajeros = pasajeros; throw e; }
    finally { liberar(); }
  }
  async obtenerVuelo(id: string) { const v = this.vuelos.get(id); return v ? this.copiarVuelo(v) : undefined; }
  async listarVuelos() { return [...this.vuelos.values()].filter(v => v.activo).map(v => this.copiarVuelo(v)); }
  async listarVuelosEnPeriodo(desde: Date, hastaExclusiva: Date) {
    return [...this.vuelos.values()]
      .filter(v => v.fecha >= desde && v.fecha < hastaExclusiva)
      .map(v => this.copiarVuelo(v));
  }
  async listarVuelosPorPeriodo(desde: Date, hasta: Date) {
    return [...this.vuelos.values()]
      .filter(v => v.activo && +v.fecha >= +desde && +v.fecha <= +hasta)
      .sort(porFechaYHora).map(v => this.copiarVuelo(v));
  }
  async listarPasajeros(texto?: string) {
    const q = texto ? normalizar(texto) : "";
    return [...this.pasajeros.values()]
      .filter(p => !q || normalizar(p.nombre).includes(q) || normalizar(p.contacto).includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || a.id.localeCompare(b.id))
      .map(p => new Pasajero(p.id, p.nombre, p.contacto));
  }
  async listarReservasAgenda(f: FiltroReservas): Promise<ReservaAgenda[]> {
    const filas: ReservaAgenda[] = [];
    for (const r of this.reservas.values()) {
      const vuelo = this.vuelos.get(r.vueloId), pasajero = this.pasajeros.get(r.pasajeroId);
      const asiento = vuelo?.asientos.find(a => a.id === r.asientoId);
      if (!vuelo || !pasajero || !asiento) continue;
      if (f.vueloId && r.vueloId !== f.vueloId) continue;
      if (f.estado && r.estado !== f.estado) continue;
      if (f.pasajeroId && r.pasajeroId !== f.pasajeroId) continue;
      if (f.desde && +vuelo.fecha < +f.desde) continue;
      if (f.hasta && +vuelo.fecha > +f.hasta) continue;
      filas.push({
        id: r.id, estado: r.estado, fechaCreacion: new Date(r.fechaCreacion),
        vuelo: { id: vuelo.id, origen: vuelo.origen, destino: vuelo.destino, fecha: new Date(vuelo.fecha), hora: vuelo.hora },
        asiento: { id: asiento.id, numero: asiento.numero, clase: asiento.clase },
        pasajero: { id: pasajero.id, nombre: pasajero.nombre },
      });
    }
    return filas.sort((a, b) => porFechaYHora(a.vuelo, b.vuelo) || +a.fechaCreacion - +b.fechaCreacion || a.id.localeCompare(b.id));
  }
  async obtenerAsiento(id: string) {
    for (const v of this.vuelos.values()) {
      const a = v.asientos.find(a => a.id === id);
      if (a) return new Asiento(a.id, a.vueloId, a.numero, a.clase);
    }
    return undefined;
  }
  async obtenerPasajero(id: string) {
    const p = this.pasajeros.get(id); return p ? new Pasajero(p.id, p.nombre, p.contacto) : undefined;
  }
  async obtenerReserva(id: string) { const x = this.reservas.get(id); return x ? this.copiarReserva(x) : undefined; }
  private filtrar(filtro: (r: Reserva) => boolean) { return [...this.reservas.values()].filter(filtro).map(x => this.copiarReserva(x)); }
  async listarReservasActivasPorVuelo(id: string) { return this.filtrar(r => r.vueloId === id && r.estaActiva()); }
  async listarReservasActivasPorAsiento(id: string) { return this.filtrar(r => r.asientoId === id && r.estaActiva()); }
  async listarReservasActivasPorPasajeroYAsiento(p: string, a: string) { return this.filtrar(r => r.pasajeroId === p && r.asientoId === a && r.estaActiva()); }
  async listarReservasPorPasajero(id: string) { return this.filtrar(r => r.pasajeroId === id).sort((a,b) => +a.fechaCreacion - +b.fechaCreacion); }
  async listarReservasPorVuelos(vueloIds: readonly string[]) {
    const ids = new Set(vueloIds);
    return this.filtrar(r => ids.has(r.vueloId));
  }
  async guardarVuelo(v: Vuelo, soloNuevo = false) {
    if (soloNuevo && this.vuelos.has(v.id)) throw Object.assign(new Error("Vuelo duplicado."), { code: "P2002" });
    // Igual que MySQL: un asiento con historial no puede desaparecer del catálogo.
    const viejo = this.vuelos.get(v.id);
    for (const a of viejo?.asientos ?? []) {
      if (!v.asientos.some(n => n.id === a.id) && [...this.reservas.values()].some(x => x.asientoId === a.id))
        throw Object.assign(new Error("El asiento tiene reservas relacionadas."), { code: "P2003" });
    }
    this.vuelos.set(v.id, this.copiarVuelo(v));
  }
  async actualizarVuelo(v: Vuelo) {
    const anterior = this.vuelos.get(v.id);
    if (!anterior) throw Object.assign(new Error("Vuelo inexistente."), { code: "P2025" });
    // Solo cambian los datos del vuelo; los asientos se conservan tal cual.
    this.vuelos.set(v.id, new Vuelo(v.id, v.origen, v.destino, new Date(v.fecha), v.hora, anterior.asientos, v.activo));
  }
  async guardarPasajero(p: Pasajero) { this.pasajeros.set(p.id, new Pasajero(p.id, p.nombre, p.contacto)); }
  async guardarReserva(x: Reserva) { this.reservas.set(x.id, this.copiarReserva(x)); }
  async actualizarReserva(x: Reserva) {
    const anterior = this.reservas.get(x.id);
    if (!anterior) throw Object.assign(new Error("Reserva inexistente."), { code: "P2025" });
    const copia = this.copiarReserva(anterior); copia.estado = x.estado;
    this.reservas.set(x.id, copia);
  }
}