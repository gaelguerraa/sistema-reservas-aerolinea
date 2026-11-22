import { Link } from 'react-router-dom'

export function PasajeroNoEncontrado({ id, volverA = '/app/pasajeros' }: { id: string; volverA?: string }) {
  return <section className="async-state" role="status">
    <h1>Pasajero no encontrado</h1>
    <p>No existe un pasajero con el id «{id}». Pudo haberse dado de baja o la dirección es incorrecta.</p>
    <Link className="button button-secondary" to={volverA}>Volver al listado de pasajeros</Link>
  </section>
}
