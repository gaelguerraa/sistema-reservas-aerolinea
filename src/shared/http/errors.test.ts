import { describe, expect, it } from 'vitest'
import { validationErrorsByField } from './errors'

describe('validationErrorsByField', () => {
  it('extrae campo y mensaje del arreglo real de detalles del servicio', () => {
    expect(validationErrorsByField([
      { donde: 'body', campo: 'email', mensaje: 'Correo inválido.' },
      { donde: 'body', campo: 'password', mensaje: 'Contraseña requerida.' },
    ])).toEqual({ email: 'Correo inválido.', password: 'Contraseña requerida.' })
  })

  it('tolera detalles vacíos o con forma desconocida', () => {
    expect(validationErrorsByField(null)).toEqual({})
    expect(validationErrorsByField([{ campo: 'email' }, 'x'])).toEqual({})
  })
})
