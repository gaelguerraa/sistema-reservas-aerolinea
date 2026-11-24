import { Link } from 'react-router-dom'

export function ReservaNoEncontrada({ id }: { id: string }) {
  return <section className="async-state">
    <h2>No se encontró la reserva</h2>
    <p>No existe una reserva con el identificador «{id}».</p>
    <Link className="button button-secondary" to="/app/reservas">Buscar otra reserva</Link>
  </section>
}
