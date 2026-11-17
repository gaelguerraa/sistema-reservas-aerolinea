import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <main className="message-page"><p className="eyebrow">ERROR 404</p><h1>No encontramos esa página</h1><p>Revisa la dirección o vuelve al tablero administrativo.</p><Link className="button button-primary" to="/app/dashboard">Ir al tablero</Link></main>
}
