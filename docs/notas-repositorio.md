# Notas para levantar el panel administrativo

Responsable: Persona 5. Probado el 25-nov-2026 con Node 24.15 en Windows: `npm install`, `typecheck`, `lint`, `test` (39 pruebas) y `build` pasan.

## Requisitos

- **Node 22.12 o mayor** y npm. El panel pide 22.12 o más (`package.json` → `engines`) y el servicio recomienda 22 (`.nvmrc`).
- **MySQL 8**: instalado en la computadora, o con Docker usando el `compose.yml` del servicio.
- Tres programas en tres terminales: servicio (puerto 3000), panel (5173) y, para la demo, el portal (5174).

## 1. Servicio (`feat-servicio`)

Los pasos completos están en el README de esa rama. En resumen, dentro de la carpeta del servicio:

```bash
npm install
```

Crea el `.env`. La forma fácil es este script, que lo genera con contraseñas nuevas y **no** sobrescribe uno que ya exista:

```bash
npm run preparar
```

(O copia `.env.example` a `.env` y llénalo a mano.) Variables importantes:

| Variable | Para qué |
|---|---|
| `PERSISTENCIA` | `mysql` para la base real (`memoria` sirve solo para pruebas rápidas) |
| `DATABASE_URL` | Conexión a MySQL. Con el `compose.yml` usa el puerto **3307** |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Cuenta **ADMIN** que crea el seed: con ella se entra al panel |
| `SEED_CLIENT_EMAIL` / `SEED_CLIENT_PASSWORD` | Cuenta **CLIENTE**: sirve para mostrar que un cliente no entra al panel |
| `JWT_SECRET` / `JWT_TTL_SECONDS` | Firma y duración del token (900 s = 15 min) |
| `CORS_ORIGIN` | Orígenes que pueden llamar al servicio. **Debe incluir al panel y al portal** |

```
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

Si usas Docker para MySQL (con el `.env` ya creado):

```bash
docker compose up -d
```

Genera el cliente de Prisma, aplica las migraciones y carga los datos de ejemplo:

```bash
npx prisma generate
```

```bash
npm run migrate:deploy
```

```bash
npm run seed
```

```bash
npm run dev
```

Para comprobar que responde, abre `http://localhost:3000/salud`. La documentación Swagger está en `http://localhost:3000/docs`.

El seed crea 2 vuelos (`V100` y `V200`), 6 asientos, 3 pasajeros y 4 reservas, una en cada estado.

## 2. Panel (`feat-administracion`)

```bash
npm install
```

Copia `.env.example` a `.env.local` y revisa las variables:

| Variable | Valor | Para qué |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Dirección del servicio. Sin ella, todo falla con `API_NO_CONFIGURADA` |
| `VITE_USE_FIXTURES` | `false` | `true` muestra en el tablero datos rotulados "Datos de ejemplo". En la demo debe ir en `false` |
| `VITE_VUELOS_EDITAR` | `false` | Enciende la edición de vuelos. Solo cuando exista `PATCH /vuelos/:id` |
| `VITE_VUELOS_BAJA` | `false` | Enciende la baja de vuelos. Solo cuando exista `DELETE /vuelos/:id` |
| `VITE_PASAJEROS_EDITAR` | `false` | Enciende la edición de pasajeros. Solo cuando exista `PATCH /pasajeros/:id` |
| `VITE_PASAJEROS_BAJA` | `false` | Enciende la baja de pasajeros. Solo cuando exista `DELETE /pasajeros/:id` |

`.env.local` no se sube a git (está en `.gitignore`). Después de cambiar una variable hay que reiniciar `npm run dev`.

```bash
npm run dev
```

Abre `http://localhost:5173` y entra con la cuenta ADMIN.

## 3. Portal (`feat-storefront`) al mismo tiempo

El portal también usa el puerto 5173 por defecto y el panel lo tiene fijo (`strictPort`). Para la demo, levanta el portal en otro puerto:

```bash
npm run dev -- --port 5174
```

En el `.env.local` del portal, pon `VITE_USE_MOCKS=false` para que use el servicio real y se vean los cambios hechos desde el panel.

## 4. Verificación antes de entregar

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```

## 5. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| 403 `ORIGEN_NO_PERMITIDO`, o "No se pudo conectar" aunque el servicio sí está corriendo | El origen del panel no está en `CORS_ORIGIN` | Agregar `http://localhost:5173` en el `.env` del servicio y reiniciarlo |
| "Configura VITE_API_URL" | Falta `.env.local` o la variable | Copiar `.env.example` a `.env.local` y reiniciar |
| `Port 5173 is already in use` | Otro programa (por ejemplo el portal) usa el puerto | Cerrarlo o levantar el portal en 5174 |
| "No se pudo conectar con el servicio" | El servicio no está corriendo | Levantar `feat-servicio` con `npm run dev` |
| Entrar con la cuenta cliente dice "Acceso denegado" | Es lo correcto: el panel es solo para ADMIN | Usar la cuenta ADMIN del seed |
| `/app/pasajeros` muestra error | Falta `GET /pasajeros` en el servicio (brecha B-3) | Esperar ese endpoint; ver `contrato-api-admin.md` |
| El tablero dice "pendiente" | Falta el endpoint del resumen (brecha B-7) | Esperado hasta que se acuerden las métricas |
