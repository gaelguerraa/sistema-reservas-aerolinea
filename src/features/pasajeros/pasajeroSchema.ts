import type { CrearPasajeroBody, EditarPasajeroBody, Pasajero } from './types'

export interface PasajeroFormValues {
  nombre: string
  contacto: string
}

export type CampoPasajero = 'nombre' | 'contacto'
export type PasajeroFormErrors = Partial<Record<CampoPasajero, string>>
export type ModoPasajero = 'crear' | 'editar'

export const valoresIniciales: PasajeroFormValues = {
  nombre: '',
  contacto: '',
}

export function valoresDesdePasajero(pasajero: Pasajero): PasajeroFormValues {
  return {
    nombre: pasajero.nombre,
    contacto: pasajero.contacto,
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarPasajero(values: PasajeroFormValues): PasajeroFormErrors {
  const errors: PasajeroFormErrors = {}
  const nombre = values.nombre.trim()
  const contacto = values.contacto.trim().toLowerCase()

  if (!nombre) errors.nombre = 'El nombre es obligatorio.'
  else if (nombre.length < 2) errors.nombre = 'El nombre debe tener al menos 2 caracteres.'
  else if (nombre.length > 120) errors.nombre = 'El nombre no puede pasar de 120 caracteres.'

  if (!contacto) errors.contacto = 'El correo de contacto es obligatorio.'
  else if (contacto.length > 120) errors.contacto = 'El correo no puede pasar de 120 caracteres.'
  else if (!EMAIL.test(contacto)) errors.contacto = 'El correo no tiene formato válido.'

  return errors
}

export function cuerpoCrear(values: PasajeroFormValues): CrearPasajeroBody {
  return {
    nombre: values.nombre.trim(),
    contacto: values.contacto.trim().toLowerCase(),
  }
}

export function cuerpoEditar(values: PasajeroFormValues): EditarPasajeroBody {
  return {
    nombre: values.nombre.trim(),
    contacto: values.contacto.trim().toLowerCase(),
  }
}

const CAMPOS: readonly CampoPasajero[] = ['nombre', 'contacto']

export function erroresDelServidor(porCampo: Record<string, string>): { campos: PasajeroFormErrors; sinCampo: string[] } {
  const campos: PasajeroFormErrors = {}
  const sinCampo: string[] = []
  for (const [campo, mensaje] of Object.entries(porCampo)) {
    const clave = campo.split(/[.[]/)[0] as CampoPasajero
    if (CAMPOS.includes(clave)) campos[clave] ??= mensaje
    else sinCampo.push(`${campo}: ${mensaje}`)
  }
  return { campos, sinCampo }
}
