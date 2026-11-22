import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AsyncState } from '../../shared/components/AsyncState'
import { FormField } from '../../shared/components/FormField'
import { useAsyncQuery } from '../../shared/components/useAsyncQuery'
import { useUnsavedChangesWarning } from '../../shared/components/useUnsavedChangesWarning'
import { isApiError, validationErrorsByField } from '../../shared/http/client'
import { OperationError } from './components/OperationError'
import { PasajeroNoEncontrado } from './components/PasajeroNoEncontrado'
import type { Pasajero } from './types'
import {
  cuerpoCrear,
  cuerpoEditar,
  erroresDelServidor,
  validarPasajero,
  valoresDesdePasajero,
  valoresIniciales,
  type ModoPasajero,
  type PasajeroFormErrors,
  type PasajeroFormValues,
} from './pasajeroSchema'
import { pasajerosApi } from './pasajerosApi'
import { pasajerosCapabilities } from './pasajerosConfig'
import { filtrosDesdeEstado } from './pasajerosFormato'
import './pasajeros.css'

export function PasajeroFormPage() {
  const { id } = useParams()
  if (!id) return <PasajeroForm modo="crear" />
  if (!pasajerosCapabilities.editar) return <EdicionNoDisponible id={id} />
  return <CargarPasajeroParaEditar id={id} />
}

function EdicionNoDisponible({ id }: { id: string }) {
  return <section className="async-state" role="status">
    <h1>Edición no disponible</h1>
    <p>El servicio todavía no expone la operación para modificar pasajeros (PATCH /pasajeros/{id}). Cuando se habilite en el servicio, esta pantalla quedará activa.</p>
    <Link className="button button-secondary" to={`/app/pasajeros/${encodeURIComponent(id)}`}>Volver al detalle</Link>
  </section>
}

function CargarPasajeroParaEditar({ id }: { id: string }) {
  const load = useCallback(async (signal: AbortSignal): Promise<Pasajero | 'NO_ENCONTRADO'> => {
    try {
      return await pasajerosApi.obtener(id, signal)
    } catch (error) {
      if (isApiError(error) && error.status === 404) return 'NO_ENCONTRADO'
      throw error
    }
  }, [id])

  const { state, retry } = useAsyncQuery(load)

  return <AsyncState state={state} onRetry={retry}>
    {(pasajero) => pasajero === 'NO_ENCONTRADO'
      ? <PasajeroNoEncontrado id={id} />
      : <PasajeroForm modo="editar" pasajero={pasajero} />}
  </AsyncState>
}

function focoEnPrimerError() {
  requestAnimationFrame(() => document.querySelector<HTMLElement>('.pasajeros-form [aria-invalid="true"]')?.focus())
}

function PasajeroForm({ modo, pasajero }: { modo: ModoPasajero; pasajero?: Pasajero }) {
  const navigate = useNavigate()
  const location = useLocation()
  const filtros = filtrosDesdeEstado(location.state)
  const inicial = useMemo(() => (pasajero ? valoresDesdePasajero(pasajero) : valoresIniciales), [pasajero])
  const [values, setValues] = useState<PasajeroFormValues>(inicial)
  const [errors, setErrors] = useState<PasajeroFormErrors>({})
  const [resumen, setResumen] = useState<string[]>([])
  const [errorOperacion, setErrorOperacion] = useState<unknown>(null)
  const [enviando, setEnviando] = useState(false)
  const [terminado, setTerminado] = useState<{ to: string; aviso: string } | null>(null)

  const sucio = !terminado && JSON.stringify(values) !== JSON.stringify(inicial)
  const { dialog } = useUnsavedChangesWarning(sucio)

  useEffect(() => {
    if (terminado) navigate(terminado.to, { state: { notice: terminado.aviso, from: filtros } })
  }, [terminado, navigate, filtros])

  const cambiar = (campo: keyof PasajeroFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((actuales) => ({ ...actuales, [campo]: event.target.value }))
    if (campo in errors) setErrors((actuales) => ({ ...actuales, [campo]: undefined }))
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (enviando) return
    setErrorOperacion(null)
    setResumen([])

    const encontrados = validarPasajero(values)
    setErrors(encontrados)
    if (Object.values(encontrados).some(Boolean)) {
      focoEnPrimerError()
      return
    }

    setEnviando(true)
    try {
      if (modo === 'crear') {
        const creado = await pasajerosApi.crear(cuerpoCrear(values))
        setTerminado({
          to: `/app/pasajeros${filtros}`,
          aviso: `Pasajero ${creado.nombre} (${creado.id}) registrado correctamente.`,
        })
      } else if (pasajero) {
        await pasajerosApi.actualizar(pasajero.id, cuerpoEditar(values))
        setTerminado({
          to: `/app/pasajeros${filtros}`,
          aviso: `Pasajero ${pasajero.nombre} actualizado correctamente.`,
        })
      }
    } catch (error) {
      const porCampo = isApiError(error) ? validationErrorsByField(error.details) : {}
      if (Object.keys(porCampo).length > 0) {
        const { campos, sinCampo } = erroresDelServidor(porCampo)
        setErrors(campos)
        setResumen(sinCampo)
        focoEnPrimerError()
      } else {
        setErrorOperacion(error)
      }
    } finally {
      setEnviando(false)
    }
  }

  const titulo = modo === 'crear' ? 'Nuevo pasajero' : `Editar pasajero ${pasajero?.nombre ?? ''}`
  const cancelarA = modo === 'editar' && pasajero
    ? `/app/pasajeros/${encodeURIComponent(pasajero.id)}`
    : `/app/pasajeros${filtros}`

  return <>
    <section className="page-heading">
      <div>
        <p className="eyebrow">PASAJEROS</p>
        <h1 id="pasajero-form-title">{titulo}</h1>
        <p className="muted">Los campos marcados con * son obligatorios.</p>
      </div>
    </section>

    <form className="pasajeros-form" noValidate aria-labelledby="pasajero-form-title" onSubmit={enviar}>
      <OperationError error={errorOperacion} />
      {resumen.length > 0 && (
        <div className="form-error-summary" role="alert">
          <ul>{resumen.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      {modo === 'editar' && pasajero && (
        <FormField
          id="pasajero-id"
          label="Id del pasajero"
          value={pasajero.id}
          readOnly
          hint="El identificador del pasajero no se puede modificar."
        />
      )}

      <FormField
        id="pasajero-nombre"
        label="Nombre completo"
        required
        maxLength={120}
        autoComplete="name"
        value={values.nombre}
        error={errors.nombre}
        onChange={cambiar('nombre')}
      />

      <FormField
        id="pasajero-contacto"
        label="Correo de contacto"
        type="email"
        required
        maxLength={120}
        autoComplete="email"
        hint="Correo electrónico donde se reciben notificaciones de reserva."
        value={values.contacto}
        error={errors.contacto}
        onChange={cambiar('contacto')}
      />

      <div className="pasajeros-form-actions">
        <button className="button button-primary" type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : modo === 'crear' ? 'Registrar pasajero' : 'Guardar cambios'}
        </button>
        <Link className="button button-secondary" to={cancelarA}>Cancelar</Link>
      </div>
      {dialog}
    </form>
  </>
}
