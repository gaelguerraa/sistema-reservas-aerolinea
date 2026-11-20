import { Link } from 'react-router-dom'

export function VueloNoEncontrado({ id, volverA = '/app/vuelos' }: { id: string; volverA?: string }) {
    return <section className="async-state" role="status">
        <h1>Vuelo no encontrado</h1>
        <p>No existe un vuelo con el id «{id}». Pudo haberse eliminado o la dirección es incorrecta.</p>
        <Link className="button button-secondary" to={volverA}>Volver al listado de vuelos</Link>
    </section>
}
