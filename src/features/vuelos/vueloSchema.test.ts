import { describe, expect, it } from 'vitest'
import { erroresDelServidor, generarAsientos, validarVuelo, valoresIniciales, type VueloFormValues } from './vueloSchema'

const valido: VueloFormValues = { ...valoresIniciales, id: 'V100', origen: 'Monterrey', destino: 'Cancún', fecha: '2026-12-01', hora: '08:30' }

describe('validarVuelo', () => {
    it('acepta un vuelo válido', () => {
        expect(validarVuelo(valido, 'crear')).toEqual({})
    })

    it('reporta los obligatorios vacíos', () => {
        const errores = validarVuelo({ ...valoresIniciales }, 'crear')
        expect(Object.keys(errores).sort()).toEqual(['destino', 'fecha', 'hora', 'id', 'origen'])
    })

    it('rechaza destino igual al origen sin importar mayúsculas', () => {
        expect(validarVuelo({ ...valido, destino: 'MONTERREY' }, 'crear').destino).toMatch(/distinto/)
    })

    it('rechaza fechas inexistentes y horas fuera de rango', () => {
        expect(validarVuelo({ ...valido, fecha: '2026-02-31' }, 'crear').fecha).toBeDefined()
        expect(validarVuelo({ ...valido, hora: '24:10' }, 'crear').hora).toBeDefined()
    })

    it('rechaza ids con caracteres no permitidos', () => {
        expect(validarVuelo({ ...valido, id: 'V 100' }, 'crear').id).toBeDefined()
    })

    it('limita los asientos a 600', () => {
        expect(validarVuelo({ ...valido, filasEjecutivas: '0', filasEconomicas: '101', letras: 'ABCDEF' }, 'crear').asientos).toMatch(/600/)
    })

    it('en edición no valida id ni asientos', () => {
        expect(validarVuelo({ ...valido, id: '', letras: '' }, 'editar')).toEqual({})
    })
})

describe('generarAsientos', () => {
    it('numera ejecutivas primero y luego económicas', () => {
        expect(generarAsientos({ filasEjecutivas: '1', filasEconomicas: '2', letras: 'ab' })).toEqual([
            { numero: '1A', clase: 'EJECUTIVA' },
            { numero: '1B', clase: 'EJECUTIVA' },
            { numero: '2A', clase: 'ECONOMICA' },
            { numero: '2B', clase: 'ECONOMICA' },
            { numero: '3A', clase: 'ECONOMICA' },
            { numero: '3B', clase: 'ECONOMICA' },
        ])
    })

    it('ignora letras repetidas o inválidas', () => {
        expect(generarAsientos({ filasEjecutivas: '0', filasEconomicas: '1', letras: 'A a 1-B' })).toHaveLength(2)
    })
})

describe('erroresDelServidor', () => {
    it('asigna campos conocidos, agrupa asientos.* y separa los desconocidos', () => {
        const { campos, sinCampo } = erroresDelServidor({ destino: 'mal', 'asientos.0.numero': 'repetido', extra: 'x' })
        expect(campos).toEqual({ destino: 'mal', asientos: 'repetido' })
        expect(sinCampo).toEqual(['extra: x'])
    })
})