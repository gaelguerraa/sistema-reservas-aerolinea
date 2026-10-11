import "dotenv/config";
import { Asiento } from "./entities/Asiento";
import { ClaseAsiento, EstadoReserva } from "./entities/enums";
import { Pasajero } from "./entities/Pasajero";
import { Vuelo } from "./entities/Vuelo";
import { DomainError } from "./errores/DomainError";
import { crearServicio } from "./composicion";

function separador(titulo: string) {
  console.log("\n" + "=".repeat(60));
  console.log(titulo);
  console.log("=".repeat(60));
}

async function main() {
  const { repositorio, servicio, cerrar } = crearServicio();
  try {
    // --- Preparación de datos base ---
    const asientos = [
      new Asiento("A1", "V100", "12A", ClaseAsiento.ECONOMICA),
      new Asiento("A2", "V100", "12B", ClaseAsiento.ECONOMICA),
    ];
    const vuelo = new Vuelo("V100", "Hermosillo", "CDMX", new Date("2026-10-01"), "08:00", asientos);
    await repositorio.guardarVuelo(vuelo);

    const ana = new Pasajero("P1", "Ana López", "ana@example.com");
    const luis = new Pasajero("P2", "Luis Pérez", "luis@example.com");
    await repositorio.guardarPasajero(ana);
    await repositorio.guardarPasajero(luis);

    // --- Escenario 1: una reserva válida debe funcionar ---
    separador("Escenario 1 - Reserva válida (debe funcionar)");
    try {
      const reserva = await servicio.crearReserva(ana.id, vuelo.id, "A1");
      console.log("OK: reserva creada ->", reserva);
      console.log("Disponibilidad restante en el vuelo:", await servicio.consultarDisponibilidad(vuelo.id));
    } catch (error) {
      console.log("FALLÓ (no debía fallar):", (error as Error).message);
    }

    // --- Escenario 2: reservar un asiento ya ocupado por otra reserva activa ---
    separador("Escenario 2 - Asiento ya ocupado (debe ser rechazado)");
    try {
      const reserva = await servicio.crearReserva(luis.id, vuelo.id, "A1");
      console.log("FALLÓ (no debía permitirse):", reserva);
    } catch (error) {
      if (error instanceof DomainError) {
        console.log("OK: rechazado correctamente ->", error.name, "-", error.message);
      } else {
        throw error;
      }
    }

    // --- Escenario 3: cancelar una reserva que ya está "completada" ---
    separador('Escenario 3 - Cancelar una reserva "completada" (debe ser rechazado)');
    try {
      // Reservamos el segundo asiento y forzamos su estado a COMPLETADA para
      // simular un vuelo ya realizado.
      const reservaLuis = await servicio.crearReserva(luis.id, vuelo.id, "A2");
      const reservaGuardada = (await repositorio.obtenerReserva(reservaLuis.id))!;
      reservaGuardada.estado = EstadoReserva.COMPLETADA;
      await repositorio.actualizarReserva(reservaGuardada);

      const cancelada = await servicio.cancelarReserva(reservaLuis.id);
      console.log("FALLÓ (no debía permitirse):", cancelada);
    } catch (error) {
      if (error instanceof DomainError) {
        console.log("OK: rechazado correctamente ->", error.name, "-", error.message);
      } else {
        throw error;
      }
    }
  } finally {
    await cerrar();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});