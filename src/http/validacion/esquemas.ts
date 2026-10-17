import { z } from "zod";

// Mensajes de zod en español
z.config(z.locales.es());

/* ------------------------------------------------------------------ */
/* Piezas reutilizables                                               */
/* ------------------------------------------------------------------ */

/** Identificador: texto corto, solo letras, números, guion y guion bajo (ej. "V100-12A"). */
const id = (nombre: string) =>
  z
    .string({ error: `${nombre} es obligatorio y debe ser texto.` })
    .trim()
    .min(1, `${nombre} no puede ir vacío.`)
    .max(64, `${nombre} no puede pasar de 64 caracteres.`)
    .regex(/^[A-Za-z0-9_-]+$/, `${nombre} solo puede tener letras, números, "-" y "_".`);

const texto = (nombre: string, min: number, max: number) =>
  z
    .string({ error: `${nombre} es obligatorio y debe ser texto.` })
    .trim()
    .min(min, `${nombre} debe tener al menos ${min} caracteres.`)
    .max(max, `${nombre} no puede pasar de ${max} caracteres.`);

const email = (nombre: string) =>
  z
    .string({ error: `${nombre} es obligatorio y debe ser texto.` })
    .trim()
    .toLowerCase()
    .max(120, `${nombre} no puede pasar de 120 caracteres.`)
    .pipe(z.email(`${nombre} no tiene formato de correo válido.`));

/** Fecha "YYYY-MM-DD" que exista en el calendario (rechaza 2026-02-31). Devuelve Date en UTC. */
const fechaISO = (nombre: string) =>
  z
    .string({ error: `${nombre} es obligatoria y debe ser texto con formato AAAA-MM-DD.` })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${nombre} debe tener formato AAAA-MM-DD.`)
    .refine((v) => {
      const d = new Date(`${v}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }, `${nombre} no es una fecha real.`)
    .transform((v) => new Date(`${v}T00:00:00Z`));

const ESTADOS = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"] as const;

/* ------------------------------------------------------------------ */
/* Parámetros de ruta y query                                         */
/* ------------------------------------------------------------------ */

/** /reservas/:id, /vuelos/:id, /pasajeros/:id */
export const paramsId = z.strictObject({ id: id("El id") });

/** GET /pasajeros/:id/reservas?estado=CONFIRMADA (filtro opcional) */
export const queryFiltroEstado = z.strictObject({
  estado: z.enum(ESTADOS, { error: `estado debe ser uno de: ${ESTADOS.join(", ")}.` }).optional(),
});

/* ------------------------------------------------------------------ */
/* Reservas                                                           */
/* ------------------------------------------------------------------ */

/** POST /reservas */
export const crearReservaBody = z.strictObject({
  pasajeroId: id("pasajeroId"),
  vueloId: id("vueloId"),
  asientoId: id("asientoId"),
});

/**
 * PATCH /reservas/:id   { "estado": "CONFIRMADA" | "CANCELADA" }
 * (COMPLETADA no se acepta porque ningún caso de uso la solicita desde afuera.)
 */
export const cambiarEstadoReservaBody = z.strictObject({
  estado: z.enum(["CONFIRMADA", "CANCELADA"], {
    error: "estado debe ser CONFIRMADA o CANCELADA.",
  }),
});

/* ------------------------------------------------------------------ */
/* Vuelos y pasajeros (operaciones de administración)                 */
/* ------------------------------------------------------------------ */

const asientoBody = z.strictObject({
  numero: z
    .string({ error: "numero del asiento es obligatorio y debe ser texto." })
    .trim()
    .toUpperCase()
    .regex(/^[1-9]\d{0,2}[A-Z]$/, "numero del asiento debe verse como 12A."),
  clase: z.enum(["ECONOMICA", "EJECUTIVA"], { error: "clase debe ser ECONOMICA o EJECUTIVA." }),
});

/** POST /vuelos */
export const crearVueloBody = z
  .strictObject({
    id: id("id"),
    origen: texto("origen", 2, 80),
    destino: texto("destino", 2, 80),
    fecha: fechaISO("fecha"),
    hora: z
      .string({ error: "hora es obligatoria y debe ser texto con formato HH:MM." })
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "hora debe tener formato HH:MM (24 horas)."),
    asientos: z
      .array(asientoBody, { error: "asientos es obligatorio y debe ser una lista." })
      .min(1, "Un vuelo debe tener al menos un asiento.")
      .max(600, "Un vuelo no puede tener más de 600 asientos."),
  })
  .superRefine((v, ctx) => {
    if (v.origen.toLowerCase() === v.destino.toLowerCase()) {
      ctx.addIssue({ code: "custom", path: ["destino"], message: "destino debe ser distinto del origen." });
    }
    const vistos = new Set<string>();
    v.asientos.forEach((a, i) => {
      if (vistos.has(a.numero)) {
        ctx.addIssue({ code: "custom", path: ["asientos", i, "numero"], message: `El asiento ${a.numero} está repetido.` });
      }
      vistos.add(a.numero);
    });
  });

/** POST /pasajeros */
export const crearPasajeroBody = z.strictObject({
  nombre: texto("nombre", 2, 120),
  contacto: email("contacto"),
});

/* ------------------------------------------------------------------ */
/* Autenticación                                                      */
/* ------------------------------------------------------------------ */

/**
 * POST /auth/registro
 * OJO: NO acepta "rol". Todo registro público nace como CLIENTE; si alguien
 * manda { "rol": "ADMIN" } recibe 400 (strictObject) y no puede subirse el rol.
 */
export const registroBody = z.strictObject({
  email: email("email"),
  password: z
    .string({ error: "password es obligatorio y debe ser texto." })
    .trim()
    .min(8, "password debe tener al menos 8 caracteres.")
    .refine((p) => p.trim().length > 0, "password no puede ir vacío.")
    .refine((p) => Buffer.byteLength(p, "utf8") <= 72, "password es demasiado largo (máximo 72 bytes).")
    .refine((p) => /[a-z]/.test(p), "password debe incluir una minúscula.")
    .refine((p) => /[A-Z]/.test(p), "password debe incluir una mayúscula.")
    .refine((p) => /\d/.test(p), "password debe incluir un número."),
});

/** POST /auth/login (aquí no se revisa la política: solo que venga algo razonable) */
export const loginBody = z.strictObject({
  email: email("email"),
  password: z
    .string({ error: "password es obligatorio y debe ser texto." })
    .trim()
    .min(1, "password no puede ir vacío.")
    .max(128, "password es demasiado largo."),
});

/* ------------------------------------------------------------------ */
/* Tipos listos para usar en los controladores                        */
/* ------------------------------------------------------------------ */
export type ParamsId = z.infer<typeof paramsId>;
export type QueryFiltroEstado = z.infer<typeof queryFiltroEstado>;
export type CrearReservaBody = z.infer<typeof crearReservaBody>;
export type CambiarEstadoReservaBody = z.infer<typeof cambiarEstadoReservaBody>;
export type CrearVueloBody = z.infer<typeof crearVueloBody>;
export type CrearPasajeroBody = z.infer<typeof crearPasajeroBody>;
export type RegistroBody = z.infer<typeof registroBody>;
export type LoginBody = z.infer<typeof loginBody>;