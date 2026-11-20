Módulo de vuelos (Persona 2)

Rutas: /app/vuelos, /app/vuelos/nuevo, /app/vuelos/:id, /app/vuelos/:id/editar
Casos: listado con búsqueda y filtros por fecha, detalle con asientos, alta de vuelo.
API usada: GET /vuelos, GET /vuelos/:id, /disponibilidad, /asientos, POST /vuelos.
Editar y baja: implementados pero apagados (VITE_VUELOS_EDITAR / VITE_VUELOS_BAJA).
Dependencia para Persona 5 (feat-servicio):
  - PATCH /vuelos/:id con { origen, destino, fecha, hora }, solo ADMIN.
  - DELETE /vuelos/:id con { ok:true, data:{ id } }, 409 si hay reservas activas.
Verificación: typecheck, lint y npm test pasan.
Evidencia: captura de errores de formulario adjunta.
