# Sistema de Reservas de Aerolínea

Proyecto de Tópico de Aplicaciones Web (ITSON). Esta rama contiene el dominio del
avance 1 más el **avance 2**: base de datos MySQL con Prisma (migraciones, seeder y
un repositorio real con el mismo contrato que la implementación en memoria) y el
**servicio REST** que expone los casos de uso del dominio.

> Estado: persistencia, base del servicio REST (rutas, logging, CORS, formato de
> respuesta) y validación listos. Autenticación/roles y documentación Swagger
> están pendientes; ya tienen su punto de enganche (ver más abajo).

## Requisitos

- Node.js 20.19 o superior (recomendado 22)
- MySQL 8 corriendo en local
- Git

## Cómo levantarlo desde cero

1. Clonar y cambiar a la rama del avance:

```bash
git clone https://github.com/gaelguerraa/sistema-reservas-aerolinea.git
cd sistema-reservas-aerolinea
git checkout feat-servicio
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear el archivo de configuración. Copia el ejemplo y edítalo con tus datos
   (el `.env` real nunca se sube al repositorio):

```bash
# Windows (PowerShell)
copy .env.example .env
# Mac / Linux
cp .env.example .env
```

Variables del `.env`:

| Variable | Qué es |
|---|---|
| `PERSISTENCIA` | `mysql` para usar la base real, `memoria` para usar el repositorio en memoria |
| `DATABASE_URL` | `mysql://USUARIO:PASSWORD@localhost:3306/reservas_aerolinea` |
| `SEED_ADMIN_EMAIL` | Correo del usuario administrador que crea el seeder |
| `SEED_ADMIN_PASSWORD` | Contraseña de ese administrador |
| `PORT` | Puerto del servicio HTTP (por defecto `3000`) |
| `CORS_ORIGIN` | Origen del front que puede llamar al servicio, ej. `http://localhost:5173`. Varios se separan con coma. Cualquier otro origen se rechaza |

Si tu contraseña de MySQL tiene caracteres especiales (`@`, `#`, `/`, `:`, `%`),
codifícalos en la URL (por ejemplo `@` se escribe `%40`).

4. Crear la base de datos vacía en MySQL:

```sql
CREATE DATABASE reservas_aerolinea CHARACTER SET utf8mb4;
```

5. Generar el cliente de Prisma, aplicar las migraciones y cargar los datos de ejemplo:

```bash
npx prisma generate
npm run migrate:deploy
npm run seed
```

Con eso la base queda lista para probarse desde cero.

## Datos de ejemplo (seeder)

- Usuario administrador: el que definas en `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`
- Usuario cliente: `cliente@ejemplo.com` / `Cliente123!`
- 2 vuelos (`V100`, `V200`), 6 asientos y 3 pasajeros
- 4 reservas, una en cada estado: pendiente, confirmada, cancelada y completada

Las contraseñas se guardan transformadas con bcrypt, nunca en texto plano.

## Levantar el servicio HTTP

Con la base lista (pasos anteriores):

```bash
npm run dev     # se reinicia solo al guardar cambios
npm start       # sin recarga automática
```

Al arrancar muestra el puerto, la persistencia en uso y los orígenes permitidos:

```
Servicio escuchando en http://localhost:3000
Persistencia: mysql
CORS permitido para: http://localhost:5173
[seguridad] Autenticación NO conectada: todas las rutas están abiertas.
```

Cada petición atendida queda en el log con método, ruta, código de estado y tiempo:

```
[2026-10-17T20:32:57.979Z] POST /reservas 201 1.2 ms
[2026-10-17T20:33:01.191Z] PATCH /reservas/res-seed-2 409 0.6 ms
```

Prueba rápida:

```bash
curl http://localhost:3000/salud
```

## Endpoints

| Recurso | Método y ruta | Qué hace | Seguridad declarada |
|---|---|---|---|
| — | `GET /salud` | Estado del servicio y persistencia en uso | pública |
| vuelos | `POST /vuelos` | Registra un vuelo con sus asientos (409 si el id ya existe) | autenticado + `ADMIN` |
| | `GET /vuelos/:id` | Detalle del vuelo con sus asientos y `capacidadTotal` | pública |
| | `GET /vuelos/:id/disponibilidad` | Asientos libres (caso de uso `consultarDisponibilidad`) | pública |
| | `GET /vuelos/:id/asientos` | Asientos del vuelo con `ocupado: true/false` | pública |
| pasajeros | `POST /pasajeros` | Registra un pasajero (el id lo genera el servicio) | autenticado |
| | `GET /pasajeros/:id` | Datos del pasajero | autenticado |
| | `GET /pasajeros/:id/reservas?estado=` | Historial (caso de uso `historialDePasajero`), filtro opcional por estado | autenticado |
| reservas | `POST /reservas` | Crea una reserva PENDIENTE (caso de uso `crearReserva`) | autenticado |
| | `GET /reservas/:id` | Detalle de la reserva | autenticado |
| | `PATCH /reservas/:id` | `{"estado":"CONFIRMADA"}` → `confirmarReserva`; `{"estado":"CANCELADA"}` → `cancelarReserva` | autenticado |

La columna "Seguridad declarada" es lo que cada ruta pide; mientras no se conecte
la autenticación real, todas las rutas están abiertas.

Ejemplos de cuerpo:

```json
POST /vuelos
{ "id": "V300", "origen": "Hermosillo", "destino": "Monterrey", "fecha": "2026-12-20",
  "hora": "09:15", "asientos": [{ "numero": "1A", "clase": "EJECUTIVA" }, { "numero": "12A", "clase": "ECONOMICA" }] }

POST /pasajeros
{ "nombre": "Ana López", "contacto": "ana@example.com" }

POST /reservas
{ "pasajeroId": "P2", "vueloId": "V100", "asientoId": "V100-12C" }
```

Los asientos de un vuelo registrado por la API tienen id `<vuelo>-<numero>` (ej. `V300-12A`).

### Formato de respuesta

Todas las respuestas, de éxito o de error, tienen la misma forma:

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "codigo": "ASIENTO_OCUPADO", "mensaje": "...", "detalles": [ ... ] } }
```

| Código HTTP | Cuándo | `codigo` |
|---|---|---|
| 200 / 201 | Éxito (201 incluye cabecera `Location`) | — |
| 400 | Datos inválidos o JSON mal formado | `VALIDACION_FALLIDA`, `JSON_INVALIDO` |
| 403 | Origen no permitido por CORS | `ORIGEN_NO_PERMITIDO` |
| 404 | Vuelo/asiento/pasajero/reserva o ruta inexistente | `NO_ENCONTRADO`, `RUTA_NO_ENCONTRADA` |
| 409 | Una regla de negocio lo impide o el registro ya existe | `ASIENTO_OCUPADO`, `TRANSICION_INVALIDA`, `RESERVA_COMPLETADA`, `VUELO_YA_EXISTE`, ... |
| 500 | Error inesperado (el detalle solo sale en la consola del servidor) | `ERROR_INTERNO` |

### CORS

Solo los orígenes de `CORS_ORIGIN` pueden llamar al servicio desde un navegador.
Una petición con otra cabecera `Origin` recibe `403 ORIGEN_NO_PERMITIDO`. Las
peticiones sin cabecera `Origin` (curl, Postman, servidor a servidor) no son
peticiones cruzadas de navegador y sí se atienden.

```bash
curl -i -H "Origin: http://sitio-malo.com" http://localhost:3000/salud   # 403
curl -i -H "Origin: http://localhost:5173" http://localhost:3000/salud   # 200
```

## Probar que el dominio no depende de la base de datos

Los escenarios ejecutan las reglas de negocio con el mismo servicio de dominio.
La implementación se elige en un solo lugar (`src/composicion.ts`) con la
variable `PERSISTENCIA`.

**Con memoria:** pon `PERSISTENCIA=memoria` en el `.env` y corre:

```bash
npm run escenarios
```

**Con MySQL:** pon `PERSISTENCIA=mysql` en el `.env`. Los escenarios usan sus
propios datos, así que deben correr sobre una base vacía (con tablas, sin seed):

```bash
npx prisma migrate reset --force
npm run escenarios
```

Resultado esperado en ambos casos:

1. Reserva válida: se crea.
2. Asiento ya ocupado: rechazado con `AsientoOcupadoError`.
3. Cancelar una reserva completada: rechazado con `ReservaCompletadaError`.

Para volver a dejar la base con los datos de ejemplo después de esta prueba:

```bash
npm run seed
```

**El servicio HTTP usa la misma composición.** Para cambiar de implementación
solo se cambia una línea del `.env` y se reinicia el servicio; el dominio, las
rutas y los controladores no se tocan:

```
PERSISTENCIA=memoria   # o mysql
```

En memoria el servicio arranca sin datos: primero crea un vuelo (`POST /vuelos`)
y un pasajero (`POST /pasajeros`) y luego reserva. Un valor distinto de `memoria`
o `mysql` detiene el arranque con un mensaje claro.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servicio HTTP y lo reinicia al guardar cambios |
| `npm start` | Levanta el servicio HTTP |
| `npm run escenarios` | Corre los 3 escenarios de reglas de negocio |
| `npm run build` | Compila TypeScript |
| `npm run prisma:generate` | Genera el cliente de Prisma |
| `npm run migrate:deploy` | Aplica las migraciones existentes a la base |
| `npm run migrate` | Crea una migración nueva al cambiar `schema.prisma` (desarrollo) |
| `npm run migrate:reset` | Borra la base y vuelve a aplicar todas las migraciones |
| `npm run seed` | Carga los datos de arranque |

## Estructura

```
prisma/
  schema.prisma        Modelo de datos
  migrations/          Historial de cambios de la estructura de la BD
  seed.ts              Datos de arranque
src/
  entities/            Entidades del dominio
  errores/             Errores de negocio
  puertos/             Contrato de acceso a datos (IReservaRepositorio)
  servicios/           Servicio de dominio con las reglas de negocio
  infraestructura/
    ReservaRepositorioEnMemoria.ts   Implementación en memoria
    ReservaRepositorioPrisma.ts      Implementación real (MySQL con Prisma)
    prisma/cliente.ts                Conexión a la base
  aplicacion/
    CatalogoService.ts   Consultas y altas que el dominio no cubre (sin reglas de negocio)
  http/
    app.ts               Arma la app Express (orden de middlewares y rutas)
    rutas/               Un router por recurso: vuelos, pasajeros, reservas
    controladores/       Reciben la petición, llaman al servicio y responden
    middlewares/         Logging, CORS, validación y manejo de errores
    validacion/          Esquemas zod de cada endpoint
    errores/             Errores HTTP y traducción de errores a respuesta
    respuestas.ts        Formato uniforme { ok, data, error }
    seguridad.ts         Punto de enganche de autenticación y roles
    entrada.ts           Lee los datos validados de la petición
  composicion.ts       Único lugar donde se elige memoria o MySQL (y la seguridad)
  servidor.ts          Arranque del servicio HTTP
  escenarios.ts        Escenarios de prueba de las reglas de negocio
```

## Para el equipo: cómo conectar las demás piezas

**Validación (ya conectada).** Cada ruta llama a `validar({ body, params, query })`
con los esquemas de `src/http/validacion/esquemas.ts`. Los controladores leen los
datos ya limpios con `cuerpo()`, `parametros()` y `consulta()` de `src/http/entrada.ts`.
Para ajustar una regla de entrada basta con cambiar el esquema; las rutas no cambian.
Los errores se lanzan (`throw` o `next(error)`) y `manejadorErrores` los convierte
en la respuesta uniforme; un error nuevo se agrega en `src/http/errores/mapearError.ts`.

**Autenticación y roles.** Las rutas ya declaran lo que necesitan con
`seguridad.autenticar` y `seguridad.permitirRoles("ADMIN")` (ver tabla de endpoints).
Hoy se usa `seguridadAbierta`, que deja pasar todo. Para conectar la real:

1. Implementar la interfaz `Seguridad` de `src/http/seguridad.ts`: `autenticar` deja el
   usuario en `res.locals.usuario` (`{ id, email, rol }`) o lanza `NoAutenticadoError`;
   `permitirRoles` lanza `SinPermisoError` si el rol no alcanza.
2. Cambiar `seguridadAbierta` por esa implementación en `crearDependencias()` de
   `src/composicion.ts` (una línea).
3. Montar las rutas de login/registro en `src/http/app.ts`, en el punto marcado
   (`app.use("/auth", ...)`). Los esquemas `registroBody` y `loginBody` ya existen.

**Documentación (Swagger/OpenAPI).** Montarla en `src/http/app.ts`, en el punto
marcado antes de las rutas (por ejemplo `app.use("/docs", ...)`). La tabla de
endpoints y los esquemas zod describen cada ruta.

## Modelo de datos

```mermaid
erDiagram
  VUELOS ||--o{ ASIENTOS : tiene
  VUELOS ||--o{ RESERVAS : contiene
  ASIENTOS ||--o{ RESERVAS : ocupa
  PASAJEROS ||--o{ RESERVAS : realiza
  VUELOS {
    string id PK
    string origen
    string destino
    datetime fecha
    string hora
  }
  ASIENTOS {
    string id PK
    string vuelo_id FK
    string numero
    enum clase
  }
  PASAJEROS {
    string id PK
    string nombre
    string contacto
  }
  RESERVAS {
    string id PK
    string vuelo_id FK
    string asiento_id FK
    string pasajero_id FK
    enum estado
    datetime fecha_creacion
  }
  USUARIOS {
    string id PK
    string email UK
    string password_hash
    enum rol
    datetime creado_en
  }
```

## Problemas comunes

- **`Cannot resolve environment variable: DATABASE_URL`**: falta el archivo `.env`
  (solo existe `.env.example`) o tiene un nombre incorrecto.
- **`Cannot find module '../../generated/prisma/client'`**: falta correr
  `npx prisma generate`.
- **Error `Unique constraint failed` al correr los escenarios con MySQL**: la base
  tiene los datos del seeder. Corre `npx prisma migrate reset --force` y vuelve a
  intentar.
- **No conecta a MySQL**: revisa que MySQL esté corriendo y que usuario, contraseña
  y puerto de `DATABASE_URL` sean correctos.
- **`Falta la variable CORS_ORIGIN`** al arrancar el servicio: agrégala al `.env`
  (ver `.env.example`).
- **El front recibe `403 ORIGEN_NO_PERMITIDO` o un error de CORS en el navegador**:
  el origen del front (protocolo, host y puerto exactos, sin `/` al final) debe
  estar en `CORS_ORIGIN`.
- **`No se pudo iniciar el servicio en el puerto 3000`**: ya hay otro proceso en ese
  puerto. Ciérralo o cambia `PORT` en el `.env`.
- **Rojo en el editor con `Cannot find name 'process'`**: es la caché de VS Code.
  Reinicia el servidor de TypeScript (`Ctrl+Shift+P`, "TypeScript: Restart TS Server").
  `npx tsc --noEmit` debe correr sin errores.
