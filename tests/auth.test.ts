import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { crearApp } from "../src/http/app";
import { crearSeguridad } from "../src/http/seguridad";
import { ReservaRepositorioEnMemoria } from "../src/infraestructura/ReservaRepositorioEnMemoria";
import { UsuarioRepositorioEnMemoria } from "../src/infraestructura/UsuarioRepositorioEnMemoria";
import { AutenticacionService, EMISOR, AUDIENCIA } from "../src/seguridad/AutenticacionService";
import { ReservaService } from "../src/servicios/ReservaService";
import { CatalogoService } from "../src/aplicacion/CatalogoService";
import { Pasajero } from "../src/entities/Pasajero";
import { leerConfiguracionJwt } from "../src/seguridad/configuracion";
const secreto = "solo-para-pruebas-automatizadas-12345678901234567890";
async function entorno() {
  const repo = new ReservaRepositorioEnMemoria();
  await repo.guardarPasajero(new Pasajero("P2", "Cliente", "cliente@example.com"));
  const usuarios = new UsuarioRepositorioEnMemoria(repo, [
    { id: "admin", email: "admin@example.com", passwordHash: await bcrypt.hash("Admin123!", 4), rol: "ADMIN", activo: true, pasajeroId: null },
    { id: "cliente", email: "cliente@example.com", passwordHash: await bcrypt.hash("Cliente123!", 4), rol: "CLIENTE", activo: true, pasajeroId: "P2" }
  ]);
  const auth = new AutenticacionService(usuarios, { secreto, duracionSegundos: 900 });
  const reservas = new ReservaService(repo);
  const app = crearApp({ persistencia: "memoria", reservas, catalogo: new CatalogoService(repo, reservas), auth, seguridad: crearSeguridad(auth), cerrar: async () => {} }, ["http://localhost:5173"]);
  const login = async (email: string, password: string) => {
    const r = await request(app).post("/auth/login").send({ email, password }).expect(200);
    return r.body.data.accessToken as string;
  };
  return { app, usuarios, repo, auth, login };
}

test("registro: crea CLIENTE, vincula pasajero y nunca responde con el hash", async () => {
  const { app, usuarios, repo } = await entorno();
  const r = await request(app).post("/auth/registro").send({ nombre: "Ana Nueva", email: "ANA@EXAMPLE.COM", password: "NuevaClave123!" }).expect(201);
  assert.equal(r.body.data.rol, "CLIENTE");
  assert.equal(r.body.data.email, "ana@example.com");
  assert.equal(r.body.data.passwordHash, undefined);
  const u = (await usuarios.buscarPorEmail("ana@example.com"))!;
  assert.notEqual(u.passwordHash, "NuevaClave123!");
  assert.ok(await bcrypt.compare("NuevaClave123!", u.passwordHash));
  assert.ok(await repo.obtenerPasajero(u.pasajeroId!));
  await request(app).post("/auth/registro").send({ nombre: "Ana Nueva", email: u.email, password: "NuevaClave123!" }).expect(409);
});

test("el registro rechaza intentar elegir ADMIN y contraseñas inválidas", async () => {
  const { app } = await entorno();
  for (const body of [
    { nombre: "Ana", email: "ana@example.com", password: "NuevaClave123!", rol: "ADMIN" },
    { nombre: "Ana", email: "correo-mal", password: "123" }
  ]) await request(app).post("/auth/registro").send(body).expect(400);
});

test("operación administrativa: sin token 401, CLIENTE 403, ADMIN 201", async () => {
  const { app, login } = await entorno();
  const body = { id: "V300", origen: "Hermosillo", destino: "CDMX", fecha: "2027-01-01", hora: "10:00", asientos: [{ numero: "1A", clase: "ECONOMICA" }] };
  await request(app).post("/vuelos").send(body).expect(401);
  const cliente = await login("cliente@example.com", "Cliente123!");
  await request(app).post("/vuelos").auth(cliente, { type: "bearer" }).send(body).expect(403);
  const admin = await login("admin@example.com", "Admin123!");
  await request(app).post("/vuelos").auth(admin, { type: "bearer" }).send(body).expect(201);
  await request(app).post("/vuelos").auth(admin, { type: "bearer" }).send(body).expect(409);
});

test("rechaza token alterado, vencido, firma ajena y algoritmo distinto", async () => {
  const { app, login } = await entorno();
  const valido = await login("cliente@example.com", "Cliente123!");
  const partes = valido.split(".");
  const payload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(partes[1], "base64url").toString()), sub: "admin" })).toString("base64url");
  const firmado = (key: string, algorithm: "HS256" | "HS384", exp: number) => jwt.sign({}, key, { algorithm, subject: "admin", issuer: EMISOR, audience: AUDIENCIA, expiresIn: exp });
  for (const token of [partes[0]+"."+payload+"."+partes[2], firmado(secreto,"HS256",-1), firmado("otra-clave-sin-permiso","HS256",900), firmado(secreto,"HS384",900)])
    await request(app).get("/auth/me").auth(token, { type: "bearer" }).expect(401);
  const decoded = jwt.decode(valido) as jwt.JwtPayload;
  assert.equal(decoded.exp! - decoded.iat!, 900);
});

test("login incorrecto responde 401 y el hash no aparece en lista de usuarios", async () => {
  const { app, login } = await entorno();
  await request(app).post("/auth/login").send({ email: "admin@example.com", password: "mala" }).expect(401);
  const token = await login("admin@example.com", "Admin123!");
  const r = await request(app).get("/usuarios").auth(token, { type: "bearer" }).expect(200);
  assert.equal(JSON.stringify(r.body).includes("passwordHash"), false);
});

test("un cliente solo puede consultar su pasajero e historial", async () => {
  const { app, login } = await entorno();
  const token = await login("cliente@example.com", "Cliente123!");
  await request(app).get("/pasajeros/P2").auth(token, { type: "bearer" }).expect(200);
  await request(app).get("/pasajeros/P1/reservas").auth(token, { type: "bearer" }).expect(403);
});

test("CORS, JSON inválido, ruta inexistente y secreto sin configurar", async () => {
  const { app } = await entorno();
  const r = await request(app).get("/salud").set("Origin", "https://otro.example").expect(403);
  assert.equal(r.body.ok, false);
  await request(app).post("/auth/login").set("Content-Type", "application/json").send('{"email":').expect(400);
  await request(app).get("/no-existe").expect(404);
  const old = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try { assert.throws(() => leerConfiguracionJwt(), /JWT_SECRET/); }
  finally { if (old !== undefined) process.env.JWT_SECRET = old; }
});
