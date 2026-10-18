import { z } from "zod";
import { registroBody, loginBody, crearVueloBody, crearPasajeroBody, crearReservaBody, cambiarEstadoReservaBody } from "./validacion/esquemas";

const json = (schema: z.ZodType) => z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
const error = (codigo: string, mensaje: string) => ({ description: mensaje, content: { "application/json": {
  schema: { $ref: "#/components/schemas/Error" }, example: { ok: false, error: { codigo, mensaje } }
} } });
function operacion(summary: string, tag: string, protegida = false, body?: z.ZodType, creada = false) {
  return {
    summary, tags: [tag], security: protegida ? [{ bearerAuth: [] }] : [],
    ...(body ? { requestBody: { required: true, content: { "application/json": { schema: json(body) } } } } : {}),
    responses: {
      [creada ? "201" : "200"]: { description: creada ? "Recurso creado" : "Operación correcta", content: { "application/json": { schema: { $ref: "#/components/schemas/Exito" } } } },
      "400": error("VALIDACION_FALLIDA", "La entrada no es válida."),
      ...(protegida ? { "401": error("NO_AUTENTICADO", "Falta una credencial válida."), "403": error("SIN_PERMISO", "El rol o la propiedad no permiten esta operación.") } : {}),
      "404": error("NO_ENCONTRADO", "El recurso no existe."),
      "409": error("REGLA_DE_NEGOCIO", "Una regla de negocio impide la operación."),
      "500": error("ERROR_INTERNO", "Ocurrió un error interno.")
    }
  };
}
const id = [{ name: "id", in: "path", required: true, schema: { type: "string", maxLength: 64 }, description: "Identificador del recurso" }];
export function crearOpenApi() {
  return {
    openapi: "3.1.0",
    info: { title: "Reservas de aerolínea", version: "2.0.0", description: "Práctica de persistencia, autenticación y roles. Primero usa /auth/login; luego pega accessToken en Authorize. ADMIN administra y CLIENTE opera solo sus datos." },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      schemas: {
        Exito: { type: "object", required: ["ok", "data"], properties: { ok: { const: true }, data: {} } },
        Error: { type: "object", required: ["ok", "error"], properties: { ok: { const: false }, error: { type: "object", properties: { codigo: { type: "string" }, mensaje: { type: "string" }, detalles: {} } } } }
      }
    },
    paths: {
      "/salud": { get: operacion("Consultar estado del servicio", "Inicio") },
      "/auth/registro": { post: operacion("Registrar cliente y pasajero (siempre CLIENTE)", "Autenticación", false, registroBody, true) },
      "/auth/login": { post: operacion("Iniciar sesión y obtener JWT por 15 minutos", "Autenticación", false, loginBody) },
      "/auth/me": { get: operacion("Ver el usuario de la credencial", "Autenticación", true) },
      "/usuarios": { get: operacion("Listar usuarios sin contraseñas (ADMIN)", "Administración", true) },
      "/vuelos": { post: operacion("Crear vuelo con asientos (ADMIN)", "Vuelos", true, crearVueloBody, true) },
      "/vuelos/{id}": { parameters: id, get: operacion("Ver vuelo", "Vuelos") },
      "/vuelos/{id}/asientos": { parameters: id, get: operacion("Ver asientos y ocupación", "Vuelos") },
      "/vuelos/{id}/disponibilidad": { parameters: id, get: operacion("Consultar disponibilidad", "Vuelos") },
      "/pasajeros": { post: operacion("Crear pasajero de catálogo (ADMIN)", "Pasajeros", true, crearPasajeroBody, true) },
      "/pasajeros/{id}": { parameters: id, get: operacion("Ver pasajero propio o cualquiera si es ADMIN", "Pasajeros", true) },
      "/pasajeros/{id}/reservas": { parameters: [...id, { name: "estado", in: "query", schema: { type: "string", enum: ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"] } }], get: operacion("Consultar historial del pasajero", "Pasajeros", true) },
      "/reservas": { post: operacion("Reservar asiento para el pasajero propio", "Reservas", true, crearReservaBody, true) },
      "/reservas/{id}": { parameters: id, get: operacion("Consultar reserva propia", "Reservas", true), patch: operacion("Confirmar o cancelar reserva propia", "Reservas", true, cambiarEstadoReservaBody) }
    }
  };
}
