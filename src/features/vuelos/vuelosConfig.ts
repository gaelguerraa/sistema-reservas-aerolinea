const activo = (valor: unknown) => valor === 'true'

export const vuelosCapabilities = {
  editar: activo(import.meta.env['VITE_VUELOS_EDITAR']),
  baja: activo(import.meta.env['VITE_VUELOS_BAJA']),
} as const
