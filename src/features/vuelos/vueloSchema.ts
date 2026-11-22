import type { AsientoBody, CrearVueloBody, EditarVueloBody, Vuelo } from './types'
import { fechaISO } from './vuelosFormato'

export const MAX_ASIENTOS = 600

export interface VueloFormValues {
  id: string
  origen: string
  destino: string
  fecha: string
  hora: string
  filasEjecutivas: string
  filasEconomicas: string
  letras: string
}

export type CampoVuelo = 'id' | 'origen' | 'destino' | 'fecha' | 'hora' | 'asientos'
export type VueloFormErrors = Partial<Record<CampoVuelo, string>>
export type ModoVuelo = 'crear' | 'editar'

export const valoresIniciales: VueloFormValues = {
  id: '',
  origen: '',
  destino: '',
  fecha: '',
  hora: '',
  filasEjecutivas: '2',
  filasEconomicas: '10',
  letras: 'ABCDEF',
}

export function valoresDesdeVuelo(vuelo: Vuelo): VueloFormValues {
  return { ...valoresIniciales, id: vuelo.id, origen: vuelo.origen, destino: vuelo.destino, fecha: fechaISO(vuelo.fecha), hora: vuelo.hora }
}

const ID = /^[A-Za-z0-9_-]+$/
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

function esFechaReal(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const fecha = new Date(`${valor}T00:00:00Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
}

function entero(valor: string): number | null {
  return /^\d+$/.test(valor.trim()) ? Number(valor.trim()) : null
}

export function letrasUnicas(letras: string): string[] {
  return [...new Set(letras.toUpperCase().replace(/[^A-Z]/g, ''))]
}

export function generarAsientos(values: Pick<VueloFormValues, 'filasEjecutivas' | 'filasEconomicas' | 'letras'>): AsientoBody[] {
  const ejecutivas = entero(values.filasEjecutivas) ?? 0
  const economicas = entero(values.filasEconomicas) ?? 0
  const letras = letrasUnicas(values.letras)
  const asientos: AsientoBody[] = []
  for (let fila = 1; fila <= ejecutivas + economicas; fila += 1) {
    for (const letra of letras) {
      asientos.push({ numero: `${fila}${letra}`, clase: fila <= ejecutivas ? 'EJECUTIVA' : 'ECONOMICA' })
    }
  }
  return asientos
}

export function validarVuelo(values: VueloFormValues, modo: ModoVuelo): VueloFormErrors {
  const errors: VueloFormErrors = {}
  const id = values.id.trim()
  const origen = values.origen.trim()
  const destino = values.destino.trim()

  if (modo === 'crear') {
    if (!id) errors.id = 'El id no puede ir vacío.'
    else if (id.length > 50) errors.id = 'El id del vuelo admite hasta 50 caracteres.'
    else if (!ID.test(id)) errors.id = 'El id solo puede tener letras, números, "-" y "_".'
  }

  if (origen.length < 2) errors.origen = 'El origen debe tener al menos 2 caracteres.'
  else if (origen.length > 80) errors.origen = 'El origen no puede pasar de 80 caracteres.'

  if (destino.length < 2) errors.destino = 'El destino debe tener al menos 2 caracteres.'
  else if (destino.length > 80) errors.destino = 'El destino no puede pasar de 80 caracteres.'
  else if (!errors.origen && origen.toLowerCase() === destino.toLowerCase()) errors.destino = 'El destino debe ser distinto del origen.'

  if (!values.fecha) errors.fecha = 'La fecha es obligatoria.'
  else if (!esFechaReal(values.fecha)) errors.fecha = 'La fecha no es una fecha real (AAAA-MM-DD).'

  if (!values.hora) errors.hora = 'La hora es obligatoria.'
  else if (!HORA.test(values.hora)) errors.hora = 'La hora debe tener formato HH:MM (24 horas).'

  if (modo === 'crear') {
    const ejecutivas = entero(values.filasEjecutivas)
    const economicas = entero(values.filasEconomicas)
    const letras = letrasUnicas(values.letras)
    if (ejecutivas === null || economicas === null) errors.asientos = 'Las filas deben ser números enteros (0 o más).'
    else if (letras.length === 0) errors.asientos = 'Indica al menos una letra de asiento (por ejemplo ABCDEF).'
    else if (ejecutivas + economicas < 1) errors.asientos = 'Un vuelo debe tener al menos un asiento.'
    else if ((ejecutivas + economicas) * letras.length > MAX_ASIENTOS) errors.asientos = `Un vuelo no puede tener más de ${MAX_ASIENTOS} asientos.`
    else if (ejecutivas + economicas > 999) errors.asientos = 'Demasiadas filas: el número de asiento admite hasta 999.'
  }
  return errors
}

export function cuerpoCrear(values: VueloFormValues): CrearVueloBody {
  return {
    id: values.id.trim(),
    origen: values.origen.trim(),
    destino: values.destino.trim(),
    fecha: values.fecha,
    hora: values.hora,
    asientos: generarAsientos(values),
  }
}

export function cuerpoEditar(values: VueloFormValues): EditarVueloBody {
  return { origen: values.origen.trim(), destino: values.destino.trim(), fecha: values.fecha, hora: values.hora }
}

const CAMPOS: readonly CampoVuelo[] = ['id', 'origen', 'destino', 'fecha', 'hora', 'asientos']

export function erroresDelServidor(porCampo: Record<string, string>): { campos: VueloFormErrors; sinCampo: string[] } {
  const campos: VueloFormErrors = {}
  const sinCampo: string[] = []
  for (const [campo, mensaje] of Object.entries(porCampo)) {
    const clave = campo.split(/[.[]/)[0] as CampoVuelo
    if (CAMPOS.includes(clave)) campos[clave] ??= mensaje
    else sinCampo.push(`${campo}: ${mensaje}`)
  }
  return { campos, sinCampo }
}