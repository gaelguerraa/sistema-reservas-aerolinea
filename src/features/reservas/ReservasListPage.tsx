import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormField } from '../../shared/components/FormField'
import './reservas.css'

export function ReservasListPage() {
  const navigate = useNavigate()
  const [id, setId] = useState('')
  const [error, setError] = useState('')

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const identificador = id.trim()
    if (!identificador) {
      setError('Escribe el identificador de la reserva.')
      return
    }
    setError('')
    navigate(`/app/reservas/${encodeURIComponent(identificador)}`)
  }

  return <>
    <section className="page-heading">
      <div>
        <p className="eyebrow">RESERVAS</p>
        <h1>Consultar reserva</h1>
        <p className="muted">Busca una reserva por su identificador para consultar su estado o administrarla.</p>
      </div>
    </section>

    <div className="reservas-notice" role="note">
      El servicio aún no ofrece un listado global de reservas. Esta pantalla consulta únicamente reservas existentes;
      no recorre identificadores ni muestra datos de ejemplo.
    </div>
    <form className="reservas-search" role="search" aria-label="Buscar reserva" onSubmit={buscar}>
      <FormField
        id="reserva-id"
        label="Identificador de la reserva"
        value={id}
        onChange={(event) => { setId(event.target.value); setError('') }}
        error={error}
        hint="Ingresa el identificador asignado por el servicio."
      />
      <button className="button button-primary" type="submit">Consultar</button>
    </form>
  </>
}
