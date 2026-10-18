import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { crearPrisma } from "../../src/infraestructura/prisma/cliente";
import { ReservaRepositorioPrisma } from "../../src/infraestructura/ReservaRepositorioPrisma";
import { ReservaRepositorioEnMemoria } from "../../src/infraestructura/ReservaRepositorioEnMemoria";
import { ReservaService } from "../../src/servicios/ReservaService";
import { crearDependencias } from "../../src/composicion";
import { crearApp } from "../../src/http/app";
import { Vuelo } from "../../src/entities/Vuelo";
import { Asiento } from "../../src/entities/Asiento";
import { Pasajero } from "../../src/entities/Pasajero";
import { ClaseAsiento } from "../../src/entities/enums";
import { AsientoOcupadoError } from "../../src/errores/erroresDeNegocio";

const database = new URL(process.env.DATABASE_URL ?? "mysql://localhost/sin_configurar").pathname.slice(1);
if (database !== "reservas" && !database.startsWith("test_"))
  throw new Error("Los tests MySQL solo admiten reservas o una base cuyo nombre empiece por test_.");

test("contrato compartido: reemplazo de asientos y rollback en memoria y MySQL", async () => {
  const prisma=crearPrisma();
  try {
    for (const repo of [new ReservaRepositorioEnMemoria(),new ReservaRepositorioPrisma(prisma)]) {
      const id="C"+randomUUID().slice(0,8);
      const a=new Asiento(id+"A",id,"1A",ClaseAsiento.ECONOMICA), b=new Asiento(id+"B",id,"1B",ClaseAsiento.ECONOMICA);
      const v=(asientos: Asiento[])=>new Vuelo(id,"Hermosillo","CDMX",new Date("2027-01-01"),"10:00",asientos);
      await repo.guardarVuelo(v([a,b]));await repo.guardarVuelo(v([a]));
      assert.equal((await repo.obtenerVuelo(id))!.asientos.length,1);
      assert.equal(await repo.obtenerAsiento(b.id),undefined);
      await assert.rejects(repo.ejecutarEnVuelo(id,async tx=>{await tx.guardarVuelo(v([a,b]));throw new Error("simular caída");}));
      assert.equal((await repo.obtenerVuelo(id))!.asientos.length,1);
    }
  } finally { await prisma.$disconnect(); }
});

test("dos conexiones MySQL compiten por el mismo asiento: una sola gana",async () => {
  const p1=crearPrisma(),p2=crearPrisma();
  try {
    const repo1=new ReservaRepositorioPrisma(p1),repo2=new ReservaRepositorioPrisma(p2);
    const id="T"+randomUUID().slice(0,8);
    await repo1.guardarVuelo(new Vuelo(id,"Hermosillo","CDMX",new Date("2027-01-01"),"10:00",[
      new Asiento(id+"A",id,"1A",ClaseAsiento.ECONOMICA),new Asiento(id+"B",id,"1B",ClaseAsiento.ECONOMICA)
    ]));
    const a=id+"P1",b=id+"P2";
    await repo1.guardarPasajero(new Pasajero(a,"Ana","ana@example.com"));
    await repo1.guardarPasajero(new Pasajero(b,"Luis","luis@example.com"));
    const resultados=await Promise.allSettled([new ReservaService(repo1).crearReserva(a,id,id+"A"),new ReservaService(repo2).crearReserva(b,id,id+"A")]);
    assert.equal(resultados.filter(x=>x.status==="fulfilled").length,1);
    assert.ok((resultados.find(x=>x.status==="rejected") as PromiseRejectedResult).reason instanceof AsientoOcupadoError);
    assert.equal((await repo1.listarReservasActivasPorAsiento(id+"A")).length,1);
  } finally { await Promise.all([p1.$disconnect(),p2.$disconnect()]); }
});

test("recorrido HTTP con MySQL: documentación, roles, propiedad, conflictos y persistencia",async () => {
  process.env.PERSISTENCIA="mysql";
  const deps=crearDependencias(), app=crearApp(deps,["http://localhost:5173"]);
  const prisma=crearPrisma();
  try {
    const spec=await request(app).get("/openapi.json").expect(200);
    assert.ok(spec.body.paths["/auth/login"]);
    assert.ok(spec.body.paths["/reservas/{id}"].patch);
    assert.ok(spec.body.components.securitySchemes.bearerAuth);
    await request(app).get("/docs/").expect(200);
    const login=async (email: string,password: string)=>(await request(app).post("/auth/login").send({email,password}).expect(200)).body.data.accessToken;
    const admin=await login(process.env.SEED_ADMIN_EMAIL!,process.env.SEED_ADMIN_PASSWORD!);
    const cliente=await login(process.env.SEED_CLIENT_EMAIL!,process.env.SEED_CLIENT_PASSWORD!);
    const id="F"+randomUUID().slice(0,8),datos={id,origen:"Hermosillo",destino:"CDMX",fecha:"2027-01-01",hora:"09:00",asientos:[{numero:"1A",clase:"ECONOMICA"},{numero:"1B",clase:"ECONOMICA"}]};
    await request(app).post("/vuelos").send(datos).expect(401);
    await request(app).post("/vuelos").auth(cliente,{type:"bearer"}).send(datos).expect(403);
    await request(app).post("/vuelos").auth(admin,{type:"bearer"}).send(datos).expect(201);
    await request(app).post("/vuelos").auth(admin,{type:"bearer"}).send(datos).expect(409);
    const me=(await request(app).get("/auth/me").auth(cliente,{type:"bearer"}).expect(200)).body.data;
    const body={pasajeroId:me.pasajeroId,vueloId:id,asientoId:id+"-1A"};
    const creada=(await request(app).post("/reservas").auth(cliente,{type:"bearer"}).send(body).expect(201)).body.data;
    const conflicto=await request(app).post("/reservas").auth(cliente,{type:"bearer"}).send(body).expect(409);
    assert.equal(conflicto.body.error.codigo,"ASIENTO_OCUPADO");
    await request(app).post("/reservas").auth(cliente,{type:"bearer"}).send({...body,pasajeroId:"P1",asientoId:id+"-1B"}).expect(403);
    await request(app).patch("/reservas/"+creada.id).auth(cliente,{type:"bearer"}).send({estado:"CONFIRMADA"}).expect(200);
    await request(app).patch("/reservas/"+creada.id).auth(cliente,{type:"bearer"}).send({estado:"CONFIRMADA"}).expect(409);
    const completada=await request(app).patch("/reservas/res-seed-4").auth(admin,{type:"bearer"}).send({estado:"CANCELADA"}).expect(409);
    assert.equal(completada.body.error.codigo,"RESERVA_COMPLETADA");
    await request(app).patch("/reservas/"+creada.id).auth(cliente,{type:"bearer"}).send({estado:"CANCELADA"}).expect(200);
    const desdeOtraConexion=await prisma.reserva.findUnique({where:{id:creada.id}});
    assert.equal(desdeOtraConexion?.estado,"CANCELADA");
    const usuario=await prisma.usuario.findUnique({where:{email:process.env.SEED_CLIENT_EMAIL}});
    assert.ok(usuario?.passwordHash.startsWith("$2"));
    const email="nuevo-"+randomUUID()+"@example.com";
    await request(app).post("/auth/registro").send({nombre:"Cliente nuevo",email,password:"Pasajero123!"}).expect(201);
    const n=await login(email,"Pasajero123!");
    await request(app).get("/reservas/"+creada.id).auth(n,{type:"bearer"}).expect(403);
    assert.equal((await prisma.usuario.findUnique({where:{email}}))?.rol,"CLIENTE");
  } finally { await deps.cerrar();await prisma.$disconnect(); }
});
