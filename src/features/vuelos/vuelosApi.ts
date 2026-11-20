import { api } from '../../shared/http/client'
import type {
    AsientoConEstado,
    CrearVueloBody,
    Disponibilidad,
    EditarVueloBody,
    Vuelo,
    VueloResumen,
} from './types'

const ruta = (id: string) => `/vuelos/${encodeURIComponent(id)}`

export const vuelosApi = {
    listar: (signal?: AbortSignal) => api.get<VueloResumen[]>('/vuelos', { signal }),
    obtener: (id: string, signal?: AbortSignal) => api.get<Vuelo>(ruta(id), { signal }),
    disponibilidad: (id: string, signal?: AbortSignal) => api.get<Disponibilidad>(`${ruta(id)}/disponibilidad`, { signal }),
    asientos: (id: string, signal?: AbortSignal) => api.get<AsientoConEstado[]>(`${ruta(id)}/asientos`, { signal }),
    crear: (body: CrearVueloBody) => api.post<Vuelo>('/vuelos', body),
    actualizar: (id: string, body: EditarVueloBody) => api.patch<Vuelo>(ruta(id), body),
    darDeBaja: (id: string) => api.delete<{ id: string }>(ruta(id)),
}