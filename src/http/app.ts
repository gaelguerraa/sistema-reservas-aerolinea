import express from "express";
import swaggerUi from "swagger-ui-express";
import { crearOpenApi } from "./documentacion";
import { rutasAuth } from "./rutas/auth.rutas";
import type { Dependencias } from "../composicion";
import { crearControladorPasajeros } from "./controladores/pasajeros.controlador";
import { crearControladorReservas } from "./controladores/reservas.controlador";
import { crearControladorVuelos } from "./controladores/vuelos.controlador";
import { corsRestringido } from "./middlewares/cors";
import { manejadorErrores, rutaNoEncontrada } from "./middlewares/manejadorErrores";
import { registrarPeticiones } from "./middlewares/registrarPeticiones";
import { enviarOk } from "./respuestas";
import { rutasPasajeros } from "./rutas/pasajeros.rutas";
import { rutasReservas } from "./rutas/reservas.rutas";
import { rutasVuelos } from "./rutas/vuelos.rutas";

/**
 * Arma la app HTTP con las dependencias que vienen de composicion.ts. No
 * decide nada sobre persistencia ni seguridad: solo conecta piezas.
 */
export function crearApp(deps: Dependencias, origenesPermitidos: string[]) {
  const app = express();
  app.disable("x-powered-by");

  // 1) Logging: primero, para registrar también las peticiones rechazadas.
  app.use(registrarPeticiones);
  // 2) CORS: solo el front configurado en CORS_ORIGIN.
  app.use(corsRestringido(origenesPermitidos));
  // 3) Cuerpo JSON.
  app.use(express.json());

  // La documentación toma los mismos esquemas de entrada que usan las rutas.
  app.get("/openapi.json", (_req, res) => res.json(crearOpenApi()));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(crearOpenApi(), { swaggerOptions: { persistAuthorization: false } }));

  app.use("/auth", rutasAuth(deps.auth, deps.seguridad));
  app.get("/usuarios", deps.seguridad.autenticar, deps.seguridad.permitirRoles("ADMIN"), async (_req, res) => {
    enviarOk(res, await deps.auth.listarUsuarios());
  });

  // Rutas por recurso, con autenticación real.
  app.get("/salud", (_req, res) => enviarOk(res, { estado: "ok", persistencia: deps.persistencia }));
  app.use("/vuelos", rutasVuelos(crearControladorVuelos(deps.reservas, deps.catalogo), deps.seguridad));
  app.use("/pasajeros", rutasPasajeros(crearControladorPasajeros(deps.catalogo), deps.seguridad));
  app.use("/reservas", rutasReservas(crearControladorReservas(deps.reservas, deps.catalogo), deps.seguridad));

  // 6) Errores: siempre al final. Único lugar donde un error se vuelve respuesta.
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return app;
}
