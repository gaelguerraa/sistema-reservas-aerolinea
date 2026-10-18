import "dotenv/config";
import bcrypt from "bcryptjs";
import { crearPrisma } from "../src/infraestructura/prisma/cliente";

function password(variable: string) {
  const value = process.env[variable] ?? "";
  if (value.length < 8 || Buffer.byteLength(value) > 72 || value.includes("REEMPLAZAR"))
    throw new Error(`Configura ${variable} con una contraseña propia de 8 a 72 bytes.`);
  return value;
}
async function main() {
  const adminPass = password("SEED_ADMIN_PASSWORD");
  const clientPass = password("SEED_CLIENT_PASSWORD");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@ejemplo.com";
  const clientEmail = process.env.SEED_CLIENT_EMAIL ?? "cliente@ejemplo.com";
  if (adminEmail === clientEmail) throw new Error("Admin y cliente necesitan correos diferentes.");
  const prisma = crearPrisma();
  try {
    // La semilla agrega ejemplos que faltan. Nunca borra reservas ni usuarios existentes.
    await prisma.$transaction(async tx => {
      for (const v of [
        { id: "V100", origen: "Hermosillo", destino: "CDMX", fecha: new Date("2026-12-01T00:00:00Z"), hora: "08:00" },
        { id: "V200", origen: "CDMX", destino: "Cancún", fecha: new Date("2026-12-15T00:00:00Z"), hora: "14:30" }
      ]) await tx.vuelo.upsert({ where: { id: v.id }, create: v, update: {} });
      for (const [id, vueloId, numero, clase] of [
        ["V100-1A", "V100", "1A", "EJECUTIVA"], ["V100-12A", "V100", "12A", "ECONOMICA"],
        ["V100-12B", "V100", "12B", "ECONOMICA"], ["V100-12C", "V100", "12C", "ECONOMICA"],
        ["V200-1A", "V200", "1A", "EJECUTIVA"], ["V200-10A", "V200", "10A", "ECONOMICA"]
      ] as const) await tx.asiento.upsert({ where: { id }, create: { id, vueloId, numero, clase }, update: {} });
      for (const [id, nombre, contacto] of [["P1", "Ana López", "ana@example.com"], ["P2", "Luis Pérez", clientEmail], ["P3", "María Ruiz", "maria@example.com"]])
        await tx.pasajero.upsert({ where: { id }, create: { id, nombre, contacto }, update: {} });
      // Un registro público no puede convertirse en admin por ejecutar la semilla.
      for (const [id, email, pass, rol, pasajeroId] of [
        ["usr-admin", adminEmail, adminPass, "ADMIN", null],
        ["usr-cliente", clientEmail, clientPass, "CLIENTE", "P2"]
      ] as const) {
        const anterior = await tx.usuario.findUnique({ where: { email } });
        if (anterior && (anterior.id !== id || anterior.rol !== rol))
          throw new Error("Un correo de semilla ya pertenece a otra cuenta. Usa otro correo de práctica.");
        await tx.usuario.upsert({ where: { id }, create: { id, email, passwordHash: await bcrypt.hash(pass, 12), rol, pasajeroId }, update: pasajeroId && !anterior?.pasajeroId ? { pasajeroId } : {} });
      }
      for (const [id, vueloId, asientoId, pasajeroId, estado] of [
        ["res-seed-1", "V100", "V100-1A", "P1", "CONFIRMADA"],
        ["res-seed-2", "V100", "V100-12A", "P2", "PENDIENTE"],
        ["res-seed-3", "V100", "V100-12B", "P3", "CANCELADA"],
        ["res-seed-4", "V200", "V200-1A", "P1", "COMPLETADA"]
      ] as const) await tx.reserva.upsert({ where: { id }, create: { id, vueloId, asientoId, pasajeroId, estado, fechaCreacion: new Date() }, update: {} });
    }, { timeout: 30000 });
    console.log("Datos de práctica listos. Los registros existentes se conservaron.");
  } finally { await prisma.$disconnect(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
