import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";
import { crearApp } from "../src/http/app";
import { crearSeguridad } from "../src/http/seguridad";
import { Asiento } from "../src/entities/Asiento";
import { ClaseAsiento, EstadoReserva } from "../src/entities/enums";
import { Pasajero } from "../src/entities/Pasajero";
import { Reserva } from "../src/entities/Reserva";
import { Vuelo } from "../src/entities/Vuelo";
import { ReservaRepositorioEnMemoria } from "../src/infraestructura/ReservaRepositorioEnMemoria";
import { UsuarioRepositorioEnMemoria } from "../src/infraestructura/UsuarioRepositorioEnMemoria";
import { AutenticacionService } from "../src/seguridad/AutenticacionService";
import { CatalogoService } from "../src/aplicacion/CatalogoService";
import { ReservaService } from "../src/servicios/ReservaService";

const secreto = "secreto-pruebas-resumen-12345678901234567890";

async function entorno() {
  const repo = new ReservaRepositorioEnMemoria();
  const adminHash = await bcrypt.hash("Admin123!", 4);
  const clienteHash = await bcrypt.hash("Cliente123!", 4);
  await repo.guardarPasajero(new Pasajero("P1", "Ana", "ana@example.com"));
  await repo.guardarVuelo(new Vuelo("V1", "Hermosillo", "CDMX", new Date("2026-11-10T00:00:00Z"), "10:00", [
    new Asiento("V1-1A", "V1", "1A", ClaseAsiento.ECONOMICA),
    new Asiento("V1-1B", "V1", "1B", ClaseAsiento.ECONOMICA),
  ]));
  await repo.guardarVuelo(new Vuelo("V2", "Guadalajara", "Monterrey", new Date("2026-11-20T00:00:00Z"), "12:00", [
    new Asiento("V2-1A", "V2", "1A", ClaseAsiento.ECONOMICA),
  ]));
  await repo.guardarVuelo(new Vuelo("V3", "CDMX", "Mérida", new Date("2026-12-01T00:00:00Z"), "14:00", [
    new Asiento("V3-1A", "V3", "1A", ClaseAsiento.ECONOMICA),
  ]));
  const fechaCreacion = new Date("2026-10-01T00:00:00Z");
  await repo.guardarReserva(new Reserva("R1", "V1", "V1-1A", "P1", EstadoReserva.CONFIRMADA, fechaCreacion));
  await repo.guardarReserva(new Reserva("R2", "V1", "V1-1B", "P1", EstadoReserva.CANCELADA, fechaCreacion));
  await repo.guardarReserva(new Reserva("R3", "V2", "V2-1A", "P1", EstadoReserva.PENDIENTE, fechaCreacion));

  const usuarios = new UsuarioRepositorioEnMemoria(repo, [
    { id: "U1", email: "admin@example.com", passwordHash: adminHash, rol: "ADMIN", activo: true, pasajeroId: null },
    { id: "U2", email: "cliente@example.com", passwordHash: clienteHash, rol: "CLIENTE", activo: true, pasajeroId: "P1" },
  ]);
  const auth = new AutenticacionService(usuarios, { secreto, duracionSegundos: 900 });
  const reservas = new ReservaService(repo);
  const catalogo = new CatalogoService(repo, reservas);
  const app = crearApp({ persistencia: "memoria", reservas, catalogo, auth, seguridad: crearSeguridad(auth), cerrar: async () => {} }, ["http://localhost:5173"]);
  const login = async (email: string, password: string) => {
    const response = await request(app).post("/auth/login").send({ email, password }).expect(200);
    return response.body.data.accessToken as string;
  };
  return { app, login };
}

test("resumen administrativo respeta permisos, periodo y métricas del catálogo", async () => {
  const { app, login } = await entorno();
  await request(app).get("/admin/resumen?desde=2026-11-01&hasta=2026-11-30").expect(401);
  const cliente = await login("cliente@example.com", "Cliente123!");
  await request(app).get("/admin/resumen?desde=2026-11-01&hasta=2026-11-30").auth(cliente, { type: "bearer" }).expect(403);

  const admin = await login("admin@example.com", "Admin123!");
  await request(app).get("/admin/resumen?desde=2026-11-31&hasta=2026-12-01").auth(admin, { type: "bearer" }).expect(400);
  await request(app).get("/admin/resumen?desde=2026-11-30&hasta=2026-11-01").auth(admin, { type: "bearer" }).expect(400);

  const response = await request(app)
    .get("/admin/resumen?desde=2026-11-01&hasta=2026-11-30")
    .auth(admin, { type: "bearer" })
    .expect(200);
  assert.deepEqual(response.body, {
    ok: true,
    data: {
      periodo: { desde: "2026-11-01", hasta: "2026-11-30" },
      ocupacion: { asientosTotales: 3, asientosOcupados: 2, porcentaje: 66.7 },
      masSolicitados: [
        { vueloId: "V1", origen: "Hermosillo", destino: "CDMX", reservas: 2 },
        { vueloId: "V2", origen: "Guadalajara", destino: "Monterrey", reservas: 1 },
      ],
      canceladas: 1,
    },
  });
});
