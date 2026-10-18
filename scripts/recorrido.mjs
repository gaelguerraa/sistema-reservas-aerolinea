import 'dotenv/config';
import assert from 'node:assert/strict';
const base=process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
async function llamar(method,path,body,token,esperado) {
  const r=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json();
  console.log(`${method.padEnd(5)} ${path} → ${r.status}${data.error?' · '+data.error.codigo:''}`);
  assert.equal(r.status,esperado,JSON.stringify(data));return data.data;
}
console.log('Recorrido de demostración. Crea datos nuevos en la base configurada del servidor.');
const admin=await llamar('POST','/auth/login',{email:process.env.SEED_ADMIN_EMAIL,password:process.env.SEED_ADMIN_PASSWORD},null,200);
const cliente=await llamar('POST','/auth/login',{email:process.env.SEED_CLIENT_EMAIL,password:process.env.SEED_CLIENT_PASSWORD},null,200);
const id=`DEMO-${Date.now()}`;
const vuelo={id,origen:'Hermosillo',destino:'CDMX',fecha:'2027-01-01',hora:'10:00',asientos:[{numero:'1A',clase:'ECONOMICA'},{numero:'1B',clase:'ECONOMICA'}]};
console.log('\nLa MISMA operación y el MISMO cuerpo, con tres credenciales:');
await llamar('POST','/vuelos',vuelo,null,401);
await llamar('POST','/vuelos',vuelo,cliente.accessToken,403);
await llamar('POST','/vuelos',vuelo,admin.accessToken,201);
console.log('\nReglas de negocio y estado persistido:');
const reserva={pasajeroId:cliente.usuario.pasajeroId,vueloId:id,asientoId:id+'-1A'};
const creada=await llamar('POST','/reservas',reserva,cliente.accessToken,201);
await llamar('POST','/reservas',reserva,cliente.accessToken,409);
await llamar('PATCH','/reservas/'+creada.id,{estado:'CONFIRMADA'},cliente.accessToken,200);
await llamar('PATCH','/reservas/'+creada.id,{estado:'CONFIRMADA'},cliente.accessToken,409);
await llamar('PATCH','/reservas/res-seed-4',{estado:'CANCELADA'},admin.accessToken,409);
await llamar('PATCH','/reservas/'+creada.id,{estado:'CANCELADA'},cliente.accessToken,200);
const final=await llamar('GET','/reservas/'+creada.id,null,cliente.accessToken,200);
assert.equal(final.estado,'CANCELADA');
console.log('\nRecorrido terminado. Los tokens no se imprimieron. Abre '+base+'/docs/ para repetirlo a mano.');
