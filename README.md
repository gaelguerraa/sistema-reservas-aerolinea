# Portal del cliente de la aerolínea

Rama de integración: `feat-storefront`. Requiere Node 22.12 o posterior compatible.

## Probar sin backend

```bash
npm ci
npm run dev:demo
```

Cuenta: `cliente@ejemplo.com` / `Cliente123`. Cuenta sin reservas: `sinreservas@ejemplo.com` / `Cliente123`.

La semilla está en `src/features/demo/seed.ts`. Los datos se conservan en sessionStorage. Al limpiar los datos del sitio se reinicia la demostración.

## Conectar al servicio real

Copia `.env.example` a `.env.local`, configura `VITE_API_URL` y conserva `VITE_USE_MOCKS=false`. Ejecuta `npm run dev`. El servicio de `feat-servicio` debe estar iniciado, permitir el origen del portal por CORS y tener usuarios y vuelos cargados. Las cuentas de demostración solo aplican al modo demo.

## Comprobar

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run build` produce el portal para el servicio real. `npm run build:demo` produce una demostración sin backend. Para publicar una SPA, el hosting debe devolver index.html para rutas como /vuelos/V100 y /reservas/123.

Para probar estados en modo demo: `/vuelos?mockEmpty=1`, `/vuelos?mockError=1` y, con sesión, `/reservas?mockExpired=1`. La caducidad simulada se dispara una vez por semilla. No es una configuración de producción.