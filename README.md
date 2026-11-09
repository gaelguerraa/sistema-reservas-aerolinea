# Aerolínea · Portal del cliente

Portal público independiente para explorar vuelos y consultar disponibilidad de asientos. La aplicación usa React, TypeScript, Vite y React Router; sus modelos reflejan el servicio de Avance 2.

## Ejecutar

```bash
npm install
npm run dev
```

Abre la URL local de Vite. Para usar el servicio real, copia `.env.example` a `.env.local`, configura `VITE_API_URL` y reinicia Vite. El backend debe permitir el origen del portal mediante `CORS_ORIGIN` (por ejemplo, `http://localhost:5173`). Un `403 ORIGEN_NO_PERMITIDO` indica que el origen, protocolo o puerto no coincide con ese ajuste.

## Modo de demostración

En `.env.local`, activa `VITE_USE_MOCKS=true` y reinicia el servidor. La feature simula 600–1200 ms de latencia e incluye rutas mexicanas e internacionales, ocupación de ambas clases, un vuelo lleno, uno sin asientos y uno pasado. Agrega `?mockError=1` a la URL para mostrar el estado de error y su acción Reintentar. El modo real queda desactivado por defecto.

## Feature de vuelos

- `/vuelos`: catálogo; filtros `origen`, `destino` y `fecha` se guardan en query params.
- `/vuelos/:id`: detalle, capacidad y mapa de asientos; `?asiento=12A` conserva la selección en la URL.
- Las respuestas se desenvuelven en `src/shared/http/client.ts`; la feature solo llama `src/features/vuelos/vuelosApi.ts`.
- El mapa usa `GET /vuelos/:id/asientos`, que ya incluye `ocupado`. No consulta `GET /disponibilidad`, porque repetiría el dato de plazas libres. La capacidad y los datos del encabezado vienen de `GET /vuelos/:id`.
- Los filtros ocultan vuelos pasados y ordenan cronológicamente. Los IDs se conservan como texto.

## Contrato confirmado y pendiente

Se inspeccionó el checkout hermano del servicio `aerolinea-dominio-feat-dominio/aerolinea-dominio/sistema-reservas-aerolinea`. Sus rutas y OpenAPI confirman `GET /vuelos/:id`, `GET /vuelos/:id/asientos`, `GET /vuelos/:id/disponibilidad` y `GET /salud`. La envoltura es `{ ok: true, data }` / `{ ok: false, error: { codigo, mensaje, detalles? } }`; el detalle incluye `capacidadTotal`, y el asiento usa `vueloId`, `numero`, `clase` y `ocupado`.

El servicio **no publica `GET /vuelos`**. `vuelosApi.list()` lo implementa como supuesto concentrado en un único método. Hasta que P1/backend confirme el listado, el catálogo en modo real fallará de forma visible y reintentable. No se modificó el backend. No se inventan precio, duración, aeronave ni imagen.

## Integración con el resto del equipo

- **P1 (cliente HTTP, respuestas, tipos, 401):** aún no había piezas compartidas. El cliente mínimo de compatibilidad está en `src/shared/http/client.ts`; reemplazar su importación en `vuelosApi.ts` por el cliente acordado. Los tipos del contrato se declaran una vez en `src/features/vuelos/types.ts`; P1 puede moverlos al módulo compartido cambiando ese import. El manejo común de 401 también queda pendiente de conectar; el cliente de este avance no agrega credenciales ni interceptores propios.
- **P2 (router, layout, sesión, 404):** `src/App.tsx` configura las rutas SPA para `/vuelos`, `/vuelos/:id`, `/login`, `/reservas` y `/reservar`; las dos últimas requieren sesión y conservan la ruta solicitada en `redirect`. `AuthProvider` integra `authApi`, persiste usuario y token y conecta el manejador 401 del cliente HTTP para cerrar sesión, notificar y volver al login. Header, Footer y la vista 404 están en `src/shared/layout/` y las reservas quedan listas como punto de integración de P4. Las pantallas de login y reservaciones deben coordinarse con P5 y P4, respectivamente.
- **P4 (reservación):** `buildReservarUrl()` genera `/reservar?vueloId=<id>&asientoId=<id completo>` en `src/features/vuelos/utils.ts`. Al integrar la ruta de P4, confirmar que mantiene esos nombres de parámetros.
- **P5 (diseño/login/registro):** no existía sistema de diseño. La feature usa tokens CSS globales compatibles y un `AsyncState` local reutilizable; al integrar P5, sustituirlos por sus componentes/tokens sin cambiar el contrato de las pantallas.

## Verificación

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

La prueba visual manual se realiza con `VITE_USE_MOCKS=true`, incluyendo ancho de 360 px y el detalle `/vuelos/V100?asiento=12A`. Para revisar el error de servicio, añade `?mockError=1`.
