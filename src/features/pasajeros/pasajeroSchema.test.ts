import { describe, expect, it } from 'vitest'
import {
  cuerpoCrear,
  erroresDelServidor,
  validarPasajero,
  valoresIniciales,
  type PasajeroFormValues,
} from './pasajeroSchema'

const valido: PasajeroFormValues = {
  nombre: 'Ana Sofía López',
  contacto: 'ana.lopez@correo.com',
}

describe('validarPasajero', () => {
  it('acepta un pasajero válido', () => {
    expect(validarPasajero(valido)).toEqual({})
  })

  it('reporta los obligatorios vacíos', () => {
    const errores = validarPasajero(valoresIniciales)
    expect(Object.keys(errores).sort()).toEqual(['contacto', 'nombre'])
  })

  it('rechaza nombres muy cortos o mayores a 120 caracteres', () => {
    expect(validarPasajero({ ...valido, nombre: 'A' }).nombre).toBeDefined()
    expect(validarPasajero({ ...valido, nombre: 'x'.repeat(121) }).nombre).toBeDefined()
  })

  it('rechaza correos con formato inválido', () => {
    expect(validarPasajero({ ...valido, contacto: 'correo-sin-arroba' }).contacto).toBeDefined()
    expect(validarPasajero({ ...valido, contacto: 'usuario@dominio' }).contacto).toBeDefined()
  })

  it('normaliza espacios y minúsculas en el correo al construir el body', () => {
    expect(cuerpoCrear({ nombre: '  Carlos Ruiz  ', contacto: '  Carlos@Correo.COM ' })).toEqual({
      nombre: 'Carlos Ruiz',
      contacto: 'carlos@correo.com',
    })
  })
})

describe('erroresDelServidor', () => {
  it('asigna campos conocidos y separa los desconocidos', () => {
    const { campos, sinCampo } = erroresDelServidor({ contacto: 'ya registrado', extra: 'error' })
    expect(campos).toEqual({ contacto: 'ya registrado' })
    expect(sinCampo).toEqual(['extra: error'])
  })
})
