import { test } from "node:test";
import assert from "node:assert/strict";
import { ReservaRepositorioEnMemoria } from "../src/infraestructura/ReservaRepositorioEnMemoria";
import { ReservaService } from "../src/servicios/ReservaService";
import { CatalogoService } from "../src/aplicacion/CatalogoService";
import { Asiento } from "../src/entities/Asiento";
import { Vuelo } from "../src/entities/Vuelo";
import { Pasajero } from "../src/entities/Pasajero";
import { ClaseAsiento, EstadoReserva } from "../src/entities/enums";
import { AsientoOcupadoError, TransicionInvalidaError } from "../src/errores/erroresDeNegocio";
import { mapearError } from "../src/http/errores/mapearError";
const vuelo = () => new Vuelo("V1","Hermosillo","CDMX",new Date("2027-01-01"),"10:00",[
  new Asiento("A1","V1","1A",ClaseAsiento.ECONOMICA), new Asiento("A2","V1","1B",ClaseAsiento.ECONOMICA)
]);
test("dos peticiones simultáneas: solo una reserva el asiento", async () => {
  const repo = new ReservaRepositorioEnMemoria();
  await repo.guardarVuelo(vuelo());
  await repo.guardarPasajero(new Pasajero("P1","Ana","ana@example.com"));
  await repo.guardarPasajero(new Pasajero("P2","Luis","luis@example.com"));
  const service = new ReservaService(repo);
  const resultados = await Promise.allSettled([service.crearReserva("P1","V1","A1"),service.crearReserva("P2","V1","A1")]);
  assert.equal(resultados.filter(x => x.status === "fulfilled").length, 1);
  const error = resultados.find(x => x.status === "rejected") as PromiseRejectedResult;
  assert.ok(error.reason instanceof AsientoOcupadoError);
  assert.equal(mapearError(error.reason).estado,409);
  assert.equal((await repo.listarReservasActivasPorAsiento("A1")).length,1);
});
test("cancelar libera el asiento y repetir cancelación produce 409",async () => {
  const repo = new ReservaRepositorioEnMemoria();await repo.guardarVuelo(vuelo());
  await repo.guardarPasajero(new Pasajero("P1","Ana","ana@example.com"));
  const s = new ReservaService(repo),reserva=await s.crearReserva("P1","V1","A1");
  await s.cancelarReserva(reserva.id);
  await assert.rejects(s.cancelarReserva(reserva.id),TransicionInvalidaError);
  assert.equal(await s.consultarDisponibilidad("V1"),2);
});
test("leer no cambia la persistencia y una transacción fallida se revierte",async () => {
  const repo = new ReservaRepositorioEnMemoria();await repo.guardarVuelo(vuelo());
  const copia=(await repo.obtenerVuelo("V1"))!;copia.asientos.pop();
  assert.equal((await repo.obtenerVuelo("V1"))!.asientos.length,2);
  await assert.rejects(repo.ejecutarEnVuelo("V1",async r => {await r.guardarVuelo(new Vuelo("V1","Otro","Destino",new Date(),"10:00",copia.asientos));throw new Error("caída");}));
  assert.equal((await repo.obtenerVuelo("V1"))!.origen,"Hermosillo");
});
test("registrar vuelo duplicado también es conflicto de negocio",async () => {
  const repo = new ReservaRepositorioEnMemoria(), s=new ReservaService(repo), c=new CatalogoService(repo,s);
  const datos={id:"V2",origen:"Hermosillo",destino:"CDMX",fecha:new Date("2027-01-01"),hora:"10:00",asientos:[{numero:"1A",clase:"ECONOMICA" as const}]};
  await c.registrarVuelo(datos);
  try { await c.registrarVuelo(datos);assert.fail("Debe rechazarse"); }
  catch(e){assert.equal(mapearError(e).estado,409);}
});
