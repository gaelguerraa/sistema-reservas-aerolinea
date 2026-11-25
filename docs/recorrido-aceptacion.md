# Recorrido de aceptación y guion del video (5 a 10 minutos)

Responsable: Persona 5 coordina. De preferencia, la demo la opera otra persona del equipo.
Basado en la sección 6 del plan de trabajo y en los casos del catálogo (ver `catalogo-trazabilidad.md`). El recurso para "alta → modificación → reflejo en el portal → baja" es **Vuelos**.

## Antes de grabar

- [ ] Servicio `feat-servicio` corriendo, con migraciones y seed recién aplicados.
- [ ] `CORS_ORIGIN` del servicio incluye `http://localhost:5173` (panel) y `http://localhost:5174` (portal).
- [ ] Panel en `http://localhost:5173` con `VITE_USE_FIXTURES=false`.
- [ ] Portal en `http://localhost:5174` con `VITE_USE_MOCKS=false`.
- [ ] Brechas listas en el servicio y variables encendidas en el panel. **Si falta alguna, ese paso no se graba y se reporta como pendiente:**
  - B-1 y B-2 (modificar y desactivar vuelo) → `VITE_VUELOS_EDITAR=true` y `VITE_VUELOS_BAJA=true`
  - B-3 (buscar pasajeros), B-6 (agenda) y B-7 (resumen)
- [ ] Un ID de vuelo nuevo preparado (por ejemplo `V900`) con fecha dentro de la semana actual.

## Guion

| # | Caso | Paso | Qué se muestra | Tiempo aprox. |
|---|---|---|---|---|
| 1 | — | Intro | Qué es el panel, quién lo usa (ADMIN) y cómo adaptamos el catálogo a la aerolínea | 0:30 |
| 2 | Sesión | Acceso sin sesión | Escribir `/app/vuelos` sin sesión → redirige a `/login` | 0:20 |
| 3 | Sesión | Cliente rechazado | Iniciar sesión con la cuenta CLIENTE → "Acceso denegado" | 0:20 |
| 4 | Sesión | Entrar como ADMIN | Iniciar sesión con la cuenta ADMIN → tablero | 0:20 |
| 5 | CU-B01 | Errores de formulario | En "Nuevo vuelo", enviar con datos inválidos → mensajes junto a cada campo | 0:40 |
| 6 | CU-B01 | Alta | Crear el vuelo `V900` → aparece en el listado | 0:40 |
| 7 | CU-S01 | Reflejo en el portal | Abrir el portal (`localhost:5174/vuelos`) → aparece `V900` | 0:30 |
| 8 | CU-B02 | Modificar horario | Cambiar la hora de `V900` → el listado se actualiza sin recargar; el portal muestra la nueva hora | 0:50 |
| 9 | CU-B07 | Historial por cliente | Buscar un pasajero → ver sus reservas pasadas y futuras | 0:40 |
| 10 | CU-B06 | Reservación manual | Reservar un asiento de `V900` a nombre de ese pasajero | 0:40 |
| 11 | Regla de negocio | Asiento ocupado | Intentar reservar el **mismo asiento** otra vez → 409 `ASIENTO_OCUPADO` con el motivo claro | 0:30 |
| 12 | CU-B04 | Agenda | Abrir la agenda de la semana → la reserva nueva aparece en su hora y vuelo; abrir su detalle | 0:40 |
| 13 | CU-B05 | Confirmar y cancelar | Confirmar la reserva; luego cancelar otra pendiente y mostrar que el asiento queda libre | 0:50 |
| 14 | CU-B03 | Bloquear (desactivar) | Desactivar `V900` → pide confirmación. Si aún tiene reservas activas, el servicio lo rechaza (409); al cancelarlas, se desactiva y desaparece del portal | 0:50 |
| 15 | CU-B08 | Resumen de ocupación | Tablero con % de ocupación, vuelos más solicitados y canceladas de la semana | 0:30 |
| 16 | Sesión | Salida | Cerrar sesión → volver a `/app/vuelos` manda al login | 0:20 |

Total aproximado: 9 minutos.

## Reglas de la grabación

- Nunca modificar la base de datos a mano durante la demo.
- No mostrar contraseñas en pantalla (escribirlas antes de grabar o tapar ese momento).
- Si un paso no funciona porque falta un endpoint, **no fingirlo**: se reporta como pendiente en el PDF.
