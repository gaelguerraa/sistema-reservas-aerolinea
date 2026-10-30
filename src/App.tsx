import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { VuelosListPage } from './features/vuelos/pages/VuelosListPage'
import { VueloDetallePage } from './features/vuelos/pages/VueloDetallePage'
import './App.css'

function NotFoundPage() {
  return (
    <main className="not-found">
      <span className="eyebrow">RUTA NO DISPONIBLE</span>
      <h1>No encontramos esta página</h1>
      <p>Revisa la dirección o vuelve a explorar los vuelos disponibles.</p>
      <Link className="button button-primary" to="/vuelos">Explorar vuelos</Link>
    </main>
  )
}

function PublicLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/vuelos" aria-label="Aerolínea, inicio">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span>AEROLÍNEA<span className="brand-subtitle">VIAJA A TU MANERA</span></span>
        </Link>
        <nav aria-label="Navegación principal"><Link to="/vuelos">Vuelos</Link></nav>
        <span className="header-note"><span className="status-dot" /> Portal de viajes</span>
      </header>
      <Routes>
        <Route path="/" element={<VuelosListPage />} />
        <Route path="/vuelos" element={<VuelosListPage />} />
        <Route path="/vuelos/:id" element={<VueloDetallePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <footer className="site-footer"><span>Un buen viaje empieza con una buena elección.</span><span>© {new Date().getFullYear()} Aerolínea</span></footer>
    </div>
  )
}

export default function App() {
  return <BrowserRouter><PublicLayout /></BrowserRouter>
}
