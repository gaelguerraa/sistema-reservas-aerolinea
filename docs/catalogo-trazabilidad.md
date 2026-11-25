# Catálogo y trazabilidad del panel administrativo

Responsable: Persona 5. Actualizado el 25-nov-2026.

**Fuente del catálogo:** documento de la materia *"Proyecto Final – Sistema de Reservas de Aerolínea"* (Aplicaciones Web, Plan 2023), secciones *"Casos de Uso – Backoffice / Panel Administrativo"* y *"Casos de Uso — Storefront / Portal del Usuario"*.
El documento no numera los casos. Los IDs `CU-Bxx` (backoffice) y `CU-Sxx` (portal) los asignamos nosotros, en el mismo orden en que aparecen.

## 1. Cómo adaptamos el catálogo a la aerolínea

El documento describe una plataforma genérica de citas y permite "adaptar el dominio a su contexto". El equipo lo adaptó así:

| En el catálogo | En nuestro sistema |
|---|---|
| Servicio o espacio | **Vuelo** (ruta origen → destino) |
| Horario disponible / cupo | **Fecha y hora de salida** del vuelo y sus **asientos** libres |
| Cliente | **Pasajero** (ligado a un usuario CLIENTE) |
| Agenda del día / semana | Reservas de los vuelos de ese día o semana, ordenadas por hora |
| Duración estimada y costo | **No existen** en el modelo del vuelo (ver decisión pendiente 1) |

## 2. Matriz del backoffice: caso → pantalla → rol → endpoint

Las brechas `B-x` se detallan en [contrato-api-admin.md](contrato-api-admin.md).

| ID | Caso de uso (catálogo) | Cómo se ve en la aerolínea | Pantalla | Rol | Endpoint(s) | Estado | Responsable |
|---|---|---|---|---|---|---|---|
| CU-B01 | Crear servicio o espacio | Registrar un vuelo con ruta, fecha, hora y asientos | `/app/vuelos/nuevo` | ADMIN | `POST /vuelos` | **Hecho.** Sin descripción, duración ni costo (decisión 1) | P2 |
| CU-B02 | Configurar horarios disponibles | Fijar y ajustar la fecha y hora de salida de cada vuelo | `/app/vuelos/nuevo`, `/app/vuelos/:id/editar` | ADMIN | `POST /vuelos`, `PATCH /vuelos/:id` | **Parcial:** falta `PATCH` (B-1). Ver decisión 2 | P2 |
| CU-B03 | Bloquear fechas o rangos | Marcar un vuelo como no disponible (mantenimiento u otra razón) | `/app/vuelos/:id` | ADMIN | Desactivar vuelo (B-2) | **Falta** (B-2). Ver decisión 3 | P2 |
| CU-B04 | Ver agenda del día / semana | Ver las reservas de los vuelos de un día o semana, por hora y vuelo, con su detalle | `/app/reservas` (confirmar con P4) | ADMIN | `GET /reservas?desde&hasta` (B-6), `GET /reservas/:id` | **Falta** el listado (B-6) | P4 |
| CU-B05 | Confirmar o cancelar reservación | Confirmar o cancelar reservas pendientes; al cancelar, el asiento queda libre | `/app/reservas/:id` (confirmar con P4) | ADMIN | `PATCH /reservas/:id` | **API lista** (el ADMIN puede operar cualquier reserva) | P4 |
| CU-B06 | Crear reservación manualmente | Reservar un asiento a nombre de un pasajero (por teléfono o en mostrador) | `/app/reservas/nueva` (confirmar con P4) | ADMIN | `POST /reservas`; buscar pasajero con `GET /pasajeros` (B-3) | **API lista** para reservar; falta buscar al pasajero (B-3) | P4 |
| CU-B07 | Ver historial por cliente | Buscar un pasajero y ver sus reservas pasadas y futuras | `/app/pasajeros`, `/app/pasajeros/:id` | ADMIN | `GET /pasajeros` (B-3), `GET /pasajeros/:id`, `GET /pasajeros/:id/reservas` | **Parcial:** el historial funciona; la búsqueda falla hasta B-3 | P3 |
| CU-B08 | Ver resumen de ocupación | % de asientos ocupados, vuelos más solicitados y reservas canceladas en un periodo | `/app/dashboard` | ADMIN | `GET /admin/resumen?desde&hasta` (B-7) | **Falta** (B-7). Las métricas ya las define el catálogo | P1 |

Además, el panel cubre lo que el catálogo da por hecho: **iniciar y cerrar sesión, sesión vencida y acceso solo para ADMIN** (`/login`, `/403`, `/404`). Lo tiene P1.

## 3. Matriz del portal (para el "reflejo en el portal")

| ID | Caso de uso (catálogo) | Pantalla del portal | Endpoint(s) | Estado |
|---|---|---|---|---|
| CU-S01 | Explorar servicios disponibles | `/vuelos` | `GET /vuelos` | Hecho (Avance 3) |
| CU-S02 | Consultar disponibilidad | `/vuelos/:id` | `GET /vuelos/:id`, `GET /vuelos/:id/asientos` | Hecho (Avance 3) |
| CU-S03 | Hacer una reservación | `/reservar` | `POST /reservas` | Hecho (Avance 3) |
| CU-S04 | Ver mis reservaciones | `/reservas` | `GET /pasajeros/:id/reservas` | Hecho (Avance 3) |
| CU-S05 | Cancelar una reservación | `/reservas/:id` | `PATCH /reservas/:id` | Hecho (Avance 3) |
| CU-S06 | Registrarse e iniciar sesión | `/login` (y registro) | `POST /auth/registro`, `POST /auth/login` | Login hecho; **registro: confirmar con el equipo** |

## 4. Lo que el panel tiene y el catálogo NO pide

El plan dice: si el catálogo no lo incluye, no se agrega por iniciativa propia.

| Pantalla actual | ¿En el catálogo? | Sugerencia |
|---|---|---|
| Alta de pasajero (`/app/pasajeros/nuevo`) | No | Decisión 4: conservarla solo si sirve para CU-B06 (reservar a nombre de alguien que no existe todavía) |
| Editar y dar de baja pasajero | No | No implementar. Que P3 deje esas opciones fuera |
| Editar vuelo | Sí, como parte de CU-B02 | Necesita B-1 |
| Dar de baja vuelo | Sí, como CU-B03 ("bloquear") | Mejor como **desactivar** que como borrar (ver B-2) |

## 5. Recurso para la prueba de aceptación

El plan pide administrar un recurso de principio a fin: **alta → modificación → reflejo en el portal → baja**.
Se usa **Vuelos**: es el único recurso que el cliente ve en el portal, y cubre CU-B01 (alta), CU-B02 (modificación) y CU-B03 (baja o bloqueo).
Faltan dos cosas en el servicio: **B-1 (`PATCH /vuelos/:id`) y B-2 (desactivar vuelo)**. Sin ellas, el equipo no puede decir que terminó el flujo.

## 6. Decisiones pendientes del equipo

1. **CU-B01, descripción, duración y costo:** el vuelo no tiene esos campos. ¿Se agregan al modelo (B-9) o se justifica en el PDF que no aplican a la adaptación?
2. **CU-B02, horarios:** ¿basta con la fecha y hora de cada vuelo, o se necesita programar salidas repetidas (por ejemplo, de lunes a viernes a las 9:00)?
3. **CU-B03, bloquear:** propuesta de desactivar el vuelo (campo `activo`). Alternativa: bloquear asientos sueltos.
4. **Alta de pasajero:** ¿se queda para apoyar CU-B06 o se quita?
5. **Rutas de reservas en el panel:** P4 confirma las rutas exactas (agenda, detalle y nueva reservación).
