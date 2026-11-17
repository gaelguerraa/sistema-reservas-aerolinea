import { Link } from 'react-router-dom'

export function ForbiddenPage() {
  return <main className="message-page"><p className="eyebrow">ACCESO RESTRINGIDO</p><h1>No tienes permiso para esta sección</h1><p>Inicia sesión con una cuenta autorizada para el panel administrativo.</p><Link className="button button-primary" to="/login">Ir al inicio de sesión</Link></main>
}
