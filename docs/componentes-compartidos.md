# Contratos compartidos del panel administrativo

Este documento fija nombres y firmas para que las features de vuelos, pasajeros y reservas se integren sin editar la aplicación ni duplicar infraestructura. La Persona 1 mantiene src/shared/**, src/app/** y este contrato. Las features registran su export en routes.tsx y se conectan mediante src/app/featureRegistry.ts.

## Cliente HTTP

Importar siempre desde src/shared/http/client.ts:

    import { api, ApiError, isApiError, validationErrorsByField } from '../../shared/http/client'
    const vuelos = await api.get<Vuelo[]>('/vuelos')
    await api.post<Vuelo>('/vuelos', body)
    await api.patch<Vuelo>(`/vuelos/${id}`, changes)
    await api.put<Vuelo>(`/vuelos/${id}`, body)
    await api.delete<void>(`/vuelos/${id}`)

Las funciones adjuntan Authorization: Bearer <token> desde tokenStorage, devuelven directamente data de una respuesta exitosa y lanzan ApiError con status, code, message y details. El message original del servicio se conserva. Para login se usa skipAuth: true, de modo que un 401 de credenciales no cierra otra sesión. Un 401 de una petición protegida limpia token y usuario, y el AuthProvider navega a /login una sola vez. El cliente incluye put y delete como capacidad futura; feat-servicio aún no tiene esas rutas para vuelos, pasajeros ni reservas.

    try {
      const item = await api.get<Vuelo>('/vuelos/V100')
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        // Renderizar BusinessRuleMessage con el error.
      }
      if (isApiError(error)) {
        const fields = validationErrorsByField(error.details)
        // Asociar fields.id, fields.origen, etc. a los controles.
      }
    }

El servicio actual manda detalles de validación como un arreglo de {donde, campo, mensaje}; el helper usa campo y mensaje. Si la API agrega rutas con una estructura distinta, coordinarla antes de extender el helper.

## Tipos de API

src/shared/types/api.ts exporta RespuestaOk<T>, RespuestaError, DetalleValidacion, Rol ('ADMIN' | 'CLIENTE'), Usuario, Sesion, LoginBody y LoginRespuesta. El login recibe { email, password }; devuelve data.accessToken y data.usuario. GET /auth/me devuelve en data un usuario con id, email, rol y pasajeroId.

## Registro de una feature

Cada feature exporta un objeto FeatureModule de src/shared/types/navigation.ts desde su routes.tsx. src/app/featureRegistry.ts importa y agrega el objeto una sola vez al arreglo. El router principal ya consume featureRoutes; las personas de módulo no necesitan editar src/app/**.

    import type { FeatureModule } from '../../shared/types/navigation'

    export const vuelosFeature: FeatureModule = {
      navigation: [{ label: 'Vuelos', path: '/app/vuelos', allowedRoles: ['ADMIN'] }],
      routes: [
        { path: 'vuelos', element: <VuelosListPage /> },
        { path: 'vuelos/nuevo', element: <VueloFormPage /> },
        { path: 'vuelos/:id', element: <VueloDetailPage /> },
        { path: 'vuelos/:id/editar', element: <VueloFormPage /> },
      ],
    }

Las rutas son relativas a /app. NavigationItem.path es absoluto para los enlaces. allowedRoles controla visibilidad; las rutas de servidor también deben autorizar el rol. Ocultar un enlace no protege el endpoint.

## Guardia y layout

ProtectedRoute recibe { allowedRoles: readonly Rol[] } y debe envolver la rama protegida. Actualmente App restringe /app/** a ADMIN. Sin sesión se navega a /login con la ruta original en location.state.from; con rol no permitido se muestra ForbiddenPage.

AdminShell contiene Sidebar, Topbar, skip link y Outlet. Para añadir navegación, declarar el elemento en FeatureModule; la sesión y el cierre de sesión se leen con useAuth() desde src/features/auth/useAuth.ts.

## Estados de lectura

AsyncState<T> recibe una unión discriminada: {status:'loading'}, {status:'data', data:T}, {status:'empty'} o {status:'error', error:Error}. Acepta children(data), isEmpty, emptyMessage y onRetry.

    const load = useCallback((signal: AbortSignal) => api.get<Vuelo[]>('/vuelos', { signal }), [])
    const { state, retry } = useAsyncQuery(load)
    return <AsyncState state={state} onRetry={retry} isEmpty={(items) => items.length === 0}>
      {(items) => <DataTable rows={items} columns={columns} caption="Vuelos" />}
    </AsyncState>

useAsyncQuery(load) cancela la petición anterior al desmontar/recargar; pasa un load estable con useCallback.

## Formularios y errores

FormField requiere id y label; acepta error y hint y enlaza mensajes con aria-describedby. Puede recibir un input propio como hijo. Usa validationErrorsByField(error.details) para poblar errores del servicio.

BusinessRuleMessage muestra el mensaje original cuando el error es ApiError con estado 409. No reemplazarlo por un mensaje genérico. useUnsavedChangesWarning(isDirty) devuelve { dialog, isBlocked }; renderiza dialog dentro del formulario para cubrir navegación y cierre/recarga de pestaña.

## Confirmaciones y tablas

ConfirmDialog recibe open, title, description, onConfirm, onCancel, confirmLabel?, cancelLabel?, destructive? y onError?. onConfirm puede ser asíncrono; el componente muestra “Procesando…”, impide doble envío, acepta Escape para cancelar y atrapa el foco. Si onConfirm falla, usar onError para mostrar el motivo de la operación.

DataTable<Row extends {id:string}> recibe rows, columns y caption. Cada columna define key, header, render(row) y opcionalmente isRowHeader.

## Acceso por teclado

Todos los enlaces/botones se recorren con Tab/Shift+Tab y se activan con Enter/Espacio. El skip link lleva al contenido y el foco vuelve a main al cambiar de ruta. Atajos: Ctrl+Alt+Shift+1 tablero, +2 vuelos, +3 pasajeros y +4 reservas; se ignoran dentro de campos de edición.

## Sesión y persistencia

useAuth() exporta user, role, token, status, notice, login, logout y clearNotice. status toma loading | authenticated | anonymous. El almacenamiento usa localStorage, replicando la convención del storefront. SUPUESTO: el equipo prefiere mantener sesión después de recargar; el servicio valida el token con GET /auth/me antes de renderizar rutas protegidas. El token/usuario se borran en logout, 401, o cuando el login revela un rol distinto de ADMIN.

## Pendientes coordinados con Persona 5

- El servicio feat-servicio no ofrece endpoint de resumen; el tablero usa tarjetas genéricas y no inventa métricas. VITE_USE_FIXTURES=true habilita solo datos claramente rotulados “Datos de ejemplo”; por defecto está desactivado.
- El catálogo no está en las ramas revisadas. Confirmar cuáles módulos, rutas y métricas forman parte del avance antes de que las personas de feature cambien los stubs.
- El contrato de errores existente tiene detalles: [{donde, campo, mensaje}]. Errores típicos: 401 NO_AUTENTICADO, 403 SIN_PERMISO, 404 NO_ENCONTRADO/RUTA_NO_ENCONTRADA, 409 con código de regla o conflicto y 500 ERROR_INTERNO.
- Vuelos hoy solo tiene alta protegida con ADMIN y consultas públicas; pasajeros, reservas y dashboard tienen operaciones administrativas incompletas. No llamar a rutas de edición/baja o resumen hasta que existan en el servicio.
- Para levantar localmente, copiar .env.example a .env.local, ajustar VITE_API_URL y ejecutar npm install y npm run dev. El panel usa por defecto http://localhost:5173; ese origen debe figurar en CORS_ORIGIN del servicio junto con el origen del storefront.
