import "dotenv/config";
import { crearDependencias } from "./composicion";
import { crearApp } from "./http/app";
import { leerOrigenesPermitidos } from "./http/middlewares/cors";

const puerto = Number(process.env.PORT ?? 3000);
const origenesPermitidos = leerOrigenesPermitidos();
const dependencias = crearDependencias();
const app = crearApp(dependencias, origenesPermitidos);

const servidor = app.listen(puerto, (error?: Error) => {
  if (error) {
    console.error(`No se pudo iniciar el servicio en el puerto ${puerto}:`, error.message);
    process.exit(1);
  }
  console.log(`Servicio escuchando en http://localhost:${puerto}`);
  console.log(`Persistencia: ${dependencias.persistencia}`);
  console.log(`CORS permitido para: ${origenesPermitidos.join(", ")}`);

});

function apagar(senal: string) {
  console.log(`${senal} recibido, cerrando el servicio...`);
  servidor.close(async () => {
    await dependencias.cerrar();
    process.exit(0);
  });
}

process.on("SIGINT", () => apagar("SIGINT"));
process.on("SIGTERM", () => apagar("SIGTERM"));
