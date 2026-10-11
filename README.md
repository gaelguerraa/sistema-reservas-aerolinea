# Sistema de Reservas de Aerolínea

Proyecto de Tópico de Aplicaciones Web (ITSON). Esta rama contiene el dominio del
avance 1 más la **persistencia del avance 2**: base de datos MySQL con Prisma,
migraciones, seeder y un repositorio real que cumple el mismo contrato que la
implementación en memoria.

> Estado: persistencia lista. El servicio REST, la autenticación y los roles
> (resto del avance 2) están pendientes.

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

## Scripts

| Comando | Qué hace |
|---|---|
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
  composicion.ts       Único lugar donde se elige memoria o MySQL
  escenarios.ts        Escenarios de prueba de las reglas de negocio
```

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
- **Rojo en el editor con `Cannot find name 'process'`**: es la caché de VS Code.
  Reinicia el servidor de TypeScript (`Ctrl+Shift+P`, "TypeScript: Restart TS Server").
  `npx tsc --noEmit` debe correr sin errores.
