import "dotenv/config";
import bcrypt from "bcryptjs";
import { crearPrisma } from "../src/infraestructura/prisma/cliente";

/**
 * Deja el sistema listo para probarse: 1 admin, 1 cliente, 2 vuelos, asientos,
 * pasajeros y reservas en distintos estados. Se puede ejecutar varias veces.
 */
async function main() {
  const prisma = crearPrisma();
  try {
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPass = process.env.SEED_ADMIN_PASSWORD;
    if (!adminEmail || !adminPass) {
      throw new Error("Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en el .env");
    }

    // Se borra en orden inverso a las llaves foráneas
    await prisma.reserva.deleteMany();
    await prisma.pasajero.deleteMany();
    await prisma.asiento.deleteMany();
    await prisma.vuelo.deleteMany();
    await prisma.usuario.deleteMany();

    await prisma.usuario.createMany({
      data: [
        { id: "usr-admin", email: adminEmail, passwordHash: await bcrypt.hash(adminPass, 10), rol: "ADMIN" },
        { id: "usr-cliente", email: "cliente@ejemplo.com", passwordHash: await bcrypt.hash("Cliente123!", 10), rol: "CLIENTE" },
      ],
    });

    await prisma.vuelo.createMany({
      data: [
        { id: "V100", origen: "Hermosillo", destino: "CDMX", fecha: new Date("2026-12-01T00:00:00Z"), hora: "08:00" },
        { id: "V200", origen: "CDMX", destino: "Cancún", fecha: new Date("2026-12-15T00:00:00Z"), hora: "14:30" },
      ],
    });

    await prisma.asiento.createMany({
      data: [
        { id: "V100-1A", vueloId: "V100", numero: "1A", clase: "EJECUTIVA" },
        { id: "V100-12A", vueloId: "V100", numero: "12A", clase: "ECONOMICA" },
        { id: "V100-12B", vueloId: "V100", numero: "12B", clase: "ECONOMICA" },
        { id: "V100-12C", vueloId: "V100", numero: "12C", clase: "ECONOMICA" },
        { id: "V200-1A", vueloId: "V200", numero: "1A", clase: "EJECUTIVA" },
        { id: "V200-10A", vueloId: "V200", numero: "10A", clase: "ECONOMICA" },
      ],
    });

    await prisma.pasajero.createMany({
      data: [
        { id: "P1", nombre: "Ana López", contacto: "ana@example.com" },
        { id: "P2", nombre: "Luis Pérez", contacto: "luis@example.com" },
        { id: "P3", nombre: "María Ruiz", contacto: "maria@example.com" },
      ],
    });

    // Reservas en cada estado, para recorrer todos los casos de uso
    const ahora = new Date();
    await prisma.reserva.createMany({
      data: [
        { id: "res-seed-1", vueloId: "V100", asientoId: "V100-1A", pasajeroId: "P1", estado: "CONFIRMADA", fechaCreacion: ahora },
        { id: "res-seed-2", vueloId: "V100", asientoId: "V100-12A", pasajeroId: "P2", estado: "PENDIENTE", fechaCreacion: ahora },
        { id: "res-seed-3", vueloId: "V100", asientoId: "V100-12B", pasajeroId: "P3", estado: "CANCELADA", fechaCreacion: ahora },
        { id: "res-seed-4", vueloId: "V200", asientoId: "V200-1A", pasajeroId: "P1", estado: "COMPLETADA", fechaCreacion: ahora },
      ],
    });

    console.log("Seed completado");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});