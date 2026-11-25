# Evidencias del panel administrativo

La Persona 5 organiza esta carpeta. Cada captura la toma la persona asignada, con el sistema funcionando contra el **servicio real** (no con datos de ejemplo).

| # | Evidencia | Quién la toma | Archivo | Estado |
|---|---|---|---|---|
| 1 | Acceso rechazado: entrar a `/app/vuelos` sin sesión manda al login; una cuenta CLIENTE ve "Acceso denegado" | P1 | `01-acceso-rechazado.png` | Pendiente |
| 2 | Errores de formulario: alta de vuelo o pasajero con campos inválidos y el mensaje junto a cada campo | P2 / P3 | `02-errores-formulario.png` | P2 dice que ya la tiene: pedirle el archivo |
| 3 | Regla de negocio: una operación rechazada (409) con el motivo claro. Sugerencia: reservar desde el panel un asiento ya ocupado → `ASIENTO_OCUPADO` (ya funciona en el servicio) | P4 | `03-regla-negocio.png` | Pendiente |
| 4 | Tablero con el resumen de ocupación (CU-B08) | P1 | `04-tablero.png` | Bloqueada hasta que exista el endpoint del resumen (B-7) |

## Reglas para las capturas

- Que se lea bien: ventana completa o recorte claro, sin zoom raro.
- Que se vea la URL, para saber en qué pantalla está.
- Sin contraseñas ni datos personales reales.
- Si alguna se toma con `VITE_USE_FIXTURES=true`, debe verse el aviso "Datos de ejemplo".
