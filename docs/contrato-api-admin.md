# Contrato de API del panel administrativo

Responsable: Persona 5. Actualizado el 25-nov-2026.
Fuentes: código de `feat-administracion` y de `feat-servicio` (ZIP descargado el 25-nov-2026) y el catálogo de la materia (ver `catalogo-trazabilidad.md`).
La documentación en vivo del servicio está en `http://localhost:3000/docs` (Swagger) y en `http://localhost:3000/openapi.json`.

## 1. Reglas comunes

- **Dirección del servicio:** `VITE_API_URL` (por ejemplo `http://localhost:3000`). Toda llamada pasa por `src/shared/http/client.ts`; ninguna página usa Axios directo.
- **Credencial:** el cliente agrega `Authorization: Bearer <token>` solo. El login usa `skipAuth`. El token dura `JWT_TTL_SECONDS` (900 s = 15 min en el ejemplo del servicio).
- **Respuesta exitosa:** `{ "ok": true, "data": ... }`. Las altas responden `201` con encabezado `Location`.
- **Respuesta con error:** `{ "ok": false, "error": { "codigo", "mensaje", "detalles?" } }`.
- **Errores de validación:** `detalles` es un arreglo `[{ donde, campo, mensaje }]`. El panel lo convierte con `validationErrorsByField` y muestra cada mensaje junto a su campo.
- **Permisos:** las rutas con "control de propiedad" dejan pasar al **ADMIN** siempre (`exigirPasajeroPropio` en `seguridad.ts`). Un CLIENTE solo ve y opera lo suyo.

### Códigos de error

| Estado | Código | Qué hace el panel |
|---|---|---|
| 400 | `VALIDACION_FALLIDA`, `JSON_INVALIDO` | Mensaje junto a cada campo |
| 401 | `NO_AUTENTICADO` | Borra la sesión y manda a `/login` |
| 403 | `SIN_PERMISO` | Pantalla de acceso denegado |
| 403 | `ORIGEN_NO_PERMITIDO` | Falta el origen del panel en `CORS_ORIGIN` del servicio |
| 404 | `NO_ENCONTRADO`, `RUTA_NO_ENCONTRADA` | Pantalla "no encontrado" |
| 409 | `ASIENTO_OCUPADO`, `VUELO_SIN_DISPONIBILIDAD`, `CAPACIDAD_MAXIMA_ALCANZADA`, `RESERVA_COMPLETADA`, `RESERVA_DUPLICADA`, `TRANSICION_INVALIDA`, `REGLA_DE_NEGOCIO`, `REGISTRO_DUPLICADO`, `REFERENCIA_INVALIDA`, `EMAIL_DUPLICADO` | `BusinessRuleMessage` con el mensaje original del servicio |
| 413 / 415 | `CUERPO_DEMASIADO_GRANDE`, `FORMATO_NO_SOPORTADO` | Mensaje general |
| 429 | `DEMASIADOS_INTENTOS` | Solo en `/auth`: más de 30 intentos en 15 minutos |
| 500 | `ERROR_INTERNO` | Estado de error con "Reintentar" |

Códigos que solo genera el panel (no vienen del servicio): `API_NO_CONFIGURADA` (falta `VITE_API_URL`), `ERROR_RED`, `TIMEOUT`, `RESPUESTA_INVALIDA`, `ERROR_HTTP`, `ERROR_DESCONOCIDO` y `RESUMEN_PENDIENTE` (tablero sin endpoint).

## 2. Endpoints que ya existen

| Método y ruta | Autorización | Caso | Notas |
|---|---|---|---|
| `POST /auth/login` | Pública | Sesión | Body `{ email, password }` → `{ accessToken, tokenType, expiresIn, usuario }` |
| `POST /auth/registro` | Pública | CU-S06 (portal) | Crea una cuenta CLIENTE |
| `GET /auth/me` | Token | Sesión | Restaura la sesión al recargar |
| `GET /usuarios` | ADMIN | — | Sin uso en el panel por ahora |
| `GET /salud` | Pública | — | Prueba rápida de que el servicio responde |
| `GET /vuelos` | Pública | CU-B01, CU-S01 | `[{ id, origen, destino, fecha, hora, capacidadTotal }]`. Sin filtros ni paginación |
| `GET /vuelos/:id` | Pública | CU-B01 | Incluye asientos y `capacidadTotal` |
| `GET /vuelos/:id/asientos` | Pública | CU-S02 | Cada asiento trae `ocupado` |
| `GET /vuelos/:id/disponibilidad` | Pública | CU-S02 | `{ vueloId, asientosDisponibles }` |
| `POST /vuelos` | ADMIN | CU-B01 | `{ id, origen, destino, fecha, hora, asientos: [{ numero, clase }] }` |
| `POST /pasajeros` | ADMIN | (fuera del catálogo) | `{ nombre, contacto }` |
| `GET /pasajeros/:id` | Token (ADMIN: cualquiera) | CU-B07 | |
| `GET /pasajeros/:id/reservas?estado=` | Token (ADMIN: cualquiera) | CU-B07 | Filtro opcional por estado |
| `POST /reservas` | Token (ADMIN: a nombre de cualquier pasajero) | CU-B06, CU-S03 | `{ pasajeroId, vueloId, asientoId }`. Un 409 `ASIENTO_OCUPADO` sirve como evidencia de regla de negocio |
| `GET /reservas/:id` | Token (ADMIN: cualquiera) | CU-B04, CU-B05 | |
| `PATCH /reservas/:id` | Token (ADMIN: cualquiera) | CU-B05, CU-S05 | `{ estado: "CONFIRMADA" \| "CANCELADA" }` |

## 3. Endpoints que faltan (brechas)

Todos se implementan en la rama `feat-servicio`, **no** en el panel. Nunca se resuelven escribiendo directo en la base de datos. Los códigos marcados como *propuesto* son nuevos y hay que acordarlos.

### B-1 · `PATCH /vuelos/:id` — modificar vuelo (CU-B02)
| | |
|---|---|
| Para qué | Ajustar el horario de un vuelo (CU-B02) y el paso "modificación" de la prueba de aceptación. Pedido por P2 |
| Autorización | Token + rol ADMIN (si no: 403 `SIN_PERMISO`) |
| Request | `params.id`; body `{ origen, destino, fecha, hora }` (el panel envía los cuatro). El `id` y los asientos **no** se editan |
| Validación | Las mismas reglas que `POST /vuelos`: origen y destino de 2 a 80 caracteres y distintos; fecha real `AAAA-MM-DD`; hora `HH:MM` de 24 h. Campos extra → 400 |
| Response | `200 { ok: true, data: Vuelo }`, con la misma forma que `GET /vuelos/:id` |
| Errores | 400 `VALIDACION_FALLIDA` · 404 `NO_ENCONTRADO` · *Por acordar:* 409 si el vuelo ya salió |

### B-2 · Desactivar vuelo — dar de baja o bloquear (CU-B03)
| | |
|---|---|
| Para qué | CU-B03 ("bloquear fechas o rangos") y el paso "baja" de la prueba de aceptación. Pedido por P2 |
| Por qué desactivar y no borrar | En la base, las reservas apuntan al vuelo sin borrado en cascada. Borrar un vuelo que tenga cualquier reserva (aunque esté cancelada) choca con la base (`REFERENCIA_INVALIDA`). Desactivar conserva el historial |
| Cambio en el modelo | Agregar `activo Boolean @default(true)` a `Vuelo` (nueva migración) |
| Opción A (recomendada) | `PATCH /vuelos/:id/estado` con `{ activo: false, motivo? }` → `200 { ok: true, data: Vuelo }`. Permite volver a activarlo |
| Opción B (lo que espera el panel hoy) | `DELETE /vuelos/:id` → `200 { ok: true, data: { id } }`, implementado como desactivación. Si se elige la A, P2 cambia una línea de `vuelosApi.ts` |
| Autorización | Token + rol ADMIN |
| Reglas | No se desactiva un vuelo con reservas activas (pendientes o confirmadas). Un vuelo inactivo deja de salir en `GET /vuelos` (el portal ya no lo muestra) y `POST /reservas` lo rechaza |
| Errores | 404 `NO_ENCONTRADO` · 409 `VUELO_CON_RESERVAS_ACTIVAS` (*propuesto*) · 409 `VUELO_NO_DISPONIBLE` al reservar uno inactivo (*propuesto*) |

### B-3 · `GET /pasajeros` — buscar pasajeros (CU-B07, CU-B06)
| | |
|---|---|
| Para qué | "El administrador busca un cliente" (CU-B07) y elegir a quién reservar (CU-B06). **Hoy la pantalla `/app/pasajeros` falla** porque llama a esta ruta |
| Autorización | Token + rol ADMIN |
| Request | Query opcional `q` (busca en nombre y contacto). Sin `q` regresa todos |
| Response | `200 { ok: true, data: Pasajero[] }` con `{ id, nombre, contacto }` |
| Errores | 400 (query inválida) · 401 · 403 |

### B-6 · `GET /reservas` — agenda y listado global (CU-B04)
| | |
|---|---|
| Para qué | La agenda del día o semana (CU-B04) y el requerimiento "filtros por fecha, servicio y estado". El plan prohíbe armarla pidiendo reserva por reserva |
| Autorización | Token + rol ADMIN |
| Request | Query opcional: `desde` y `hasta` (`AAAA-MM-DD`, por fecha del vuelo), `vueloId`, `estado` (`PENDIENTE`, `CONFIRMADA`, `CANCELADA`, `COMPLETADA`), `pasajeroId` |
| Validación | Fechas reales; `desde` ≤ `hasta`; `estado` dentro de los cuatro valores |
| Response | `200 { ok: true, data: [...] }`, ordenado por fecha y hora del vuelo. Cada elemento trae la reserva más un resumen de lo que la agenda muestra: `{ id, estado, fechaCreacion, vuelo: { id, origen, destino, fecha, hora }, asiento: { id, numero, clase }, pasajero: { id, nombre } }` |
| Errores | 400 `VALIDACION_FALLIDA` · 401 · 403 |

### B-7 · `GET /admin/resumen` — resumen de ocupación (CU-B08)
| | |
|---|---|
| Para qué | El tablero (CU-B08). Las métricas **las define el catálogo**, no son inventadas |
| Autorización | Token + rol ADMIN |
| Request | Query `desde` y `hasta` (`AAAA-MM-DD`): el periodo a medir, por fecha del vuelo |
| Response | `{ periodo: { desde, hasta }, ocupacion: { asientosTotales, asientosOcupados, porcentaje }, masSolicitados: [{ vueloId, origen, destino, reservas }], canceladas }` |
| Cómo se calcula | Ocupación: asientos con reserva activa ÷ asientos totales de los vuelos del periodo. Más solicitados: vuelos con más reservas en el periodo (los 5 primeros). Canceladas: reservas en estado `CANCELADA` en el periodo |
| Errores | 400 (fechas inválidas) · 401 · 403 |

### B-9 · Descripción, duración y costo del vuelo (CU-B01, opcional)
El catálogo pide registrar el servicio "con nombre, descripción, duración estimada y costo". El vuelo no tiene esos campos. Opciones: agregarlos al modelo y a `POST /vuelos` / `PATCH /vuelos/:id`, o justificar en el PDF que la adaptación a aerolínea no los usa. **Decisión del equipo.**

### Ya no son brechas
- **B-4 y B-5 (editar y dar de baja pasajero):** el catálogo no los pide. No se implementan.
- **B-8 (¿el ADMIN pasa el control de propiedad?):** resuelto. `exigirPasajeroPropio` deja pasar al ADMIN, así que puede ver pasajeros, su historial y cualquier reserva, y reservar a nombre de cualquier pasajero.

## 4. Resumen de brechas

| ID | Endpoint | Caso | Prioridad | Bloquea | Quién lo implementa |
|---|---|---|---|---|---|
| B-1 | `PATCH /vuelos/:id` | CU-B02 | **Alta** | Prueba de aceptación (modificación) | Por asignar |
| B-2 | Desactivar vuelo | CU-B03 | **Alta** | Prueba de aceptación (baja) | Por asignar |
| B-6 | `GET /reservas` | CU-B04 | **Alta** | La agenda, que también es un requerimiento funcional | Por asignar |
| B-3 | `GET /pasajeros` | CU-B07, CU-B06 | **Alta** | Buscar cliente; hoy la pantalla falla | Por asignar |
| B-7 | `GET /admin/resumen` | CU-B08 | **Alta** | Tablero y su evidencia | Por asignar |
| B-9 | Descripción, duración y costo | CU-B01 | Decisión | Nada, si se justifica | Equipo |

Cuando un endpoint quede listo en `feat-servicio`, el dueño del módulo enciende su variable (`VITE_VUELOS_EDITAR`, `VITE_VUELOS_BAJA`, etc.) y prueba contra el servicio real.

## 5. Registro de decisiones

| # | Decisión | Motivo |
|---|---|---|
| D-1 | El panel es una app separada en la rama `feat-administracion`, puerto fijo 5173 | Lo pide el plan; no se importa código del portal |
| D-2 | Editar y dar de baja quedan **apagados** con variables hasta que exista su endpoint | No simular éxito local |
| D-3 | Las métricas del tablero son las del catálogo (CU-B08). `VITE_USE_FIXTURES=true` solo muestra datos rotulados "Datos de ejemplo" | No inventar métricas |
| D-4 | Recurso para la aceptación: **Vuelos** | Es el único que se ve en el portal |
| D-5 | El portal se levanta en el puerto **5174** durante la demo | Portal y panel usan 5173 por defecto |
| D-6 | La baja de vuelo se hace **desactivando**, no borrando | Las reservas impiden borrar en la base, y así se cubre CU-B03 |
| D-7 | Editar y dar de baja pasajeros quedan fuera | El catálogo no los pide |

## 6. Avisos para el equipo del servicio

- La sección "Para el equipo: cómo conectar las demás piezas" del README de `feat-servicio` dice que la seguridad está "abierta". Ya no es así: `composicion.ts` usa la seguridad real (`crearSeguridad`). Conviene actualizar ese texto.
- `.env.example` del servicio trae `CORS_ORIGIN=http://localhost:5173,http://localhost:4200`. Para la demo hay que agregar `http://localhost:5174` (el portal).
