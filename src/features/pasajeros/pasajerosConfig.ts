const activo = (valor: unknown) => valor === 'true'

export const pasajerosCapabilities = {
  editar: activo(import.meta.env['VITE_PASAJEROS_EDITAR']),
  baja: activo(import.meta.env['VITE_PASAJEROS_BAJA']),
} as const
