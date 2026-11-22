import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AsyncState } from '../../shared/components/AsyncState'
import { FormField } from '../../shared/components/FormField'
import { useAsyncQuery } from '../../shared/components/useAsyncQuery'
import { useUnsavedChangesWarning } from '../../shared/components/useUnsavedChangesWarning'
import { isApiError, validationErrorsByField } from '../../shared/http/client'
import { OperationError } from './components/OperationError'
import { VueloNoEncontrado } from './components/VueloNoEncontrado'
import type { Vuelo } from './types'
import {
    cuerpoCrear,
    cuerpoEditar,
    erroresDelServidor,
    generarAsientos,
    validarVuelo,
    valoresDesdeVuelo,
    valoresIniciales,
    type ModoVuelo,
    type VueloFormErrors,
    type VueloFormValues,
} from './vueloSchema'
import { vuelosApi } from './vuelosApi'
import { vuelosCapabilities } from './vuelosConfig'
import { filtrosDesdeEstado } from './vuelosFormato'
import './vuelos.css'

export function VueloFormPage() {
    const { id } = useParams()
    if (!id) return <VueloForm modo="crear" />
    if (!vuelosCapabilities.editar) return <EdicionNoDisponible id={id} />
    return <CargarVueloParaEditar id={id} />
}

function EdicionNoDisponible({ id }: { id: string }) {
    return <section className="async-state" role="status">
        <h1>Edición no disponible</h1>
        <p>El servicio todavía no expone la operación para modificar vuelos (PATCH /vuelos/{id}). Cuando se acuerde el contrato con el equipo del servicio, esta pantalla se habilita.</p>
        <Link className="button button-secondary" to={`/app/vuelos/${encodeURIComponent(id)}`}>Volver al detalle</Link>
    </section>
}

function CargarVueloParaEditar({ id }: { id: string }) {
    const load = useCallback(async (signal: AbortSignal): Promise<Vuelo | 'NO_ENCONTRADO'> => {
        try {
            return await vuelosApi.obtener(id, signal)
        } catch (error) {
            if (isApiError(error) && error.status === 404) return 'NO_ENCONTRADO'
            throw error
        }
    }, [id])
    const { state, retry } = useAsyncQuery(load)
    return <AsyncState state={state} onRetry={retry}>
        {(vuelo) => vuelo === 'NO_ENCONTRADO' ? <VueloNoEncontrado id={id} /> : <VueloForm modo="editar" vuelo={vuelo} />}
    </AsyncState>
}

function focoEnPrimerError() {
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.vuelos-form [aria-invalid="true"]')?.focus())
}

function VueloForm({ modo, vuelo }: { modo: ModoVuelo; vuelo?: Vuelo }) {
    const navigate = useNavigate()
    const location = useLocation()
    const filtros = filtrosDesdeEstado(location.state)
    const inicial = useMemo(() => (vuelo ? valoresDesdeVuelo(vuelo) : valoresIniciales), [vuelo])
    const [values, setValues] = useState<VueloFormValues>(inicial)
    const [errors, setErrors] = useState<VueloFormErrors>({})
    const [resumen, setResumen] = useState<string[]>([])
    const [errorOperacion, setErrorOperacion] = useState<unknown>(null)
    const [enviando, setEnviando] = useState(false)
    const [terminado, setTerminado] = useState<{ to: string; aviso: string } | null>(null)

    const sucio = !terminado && JSON.stringify(values) !== JSON.stringify(inicial)
    const { dialog } = useUnsavedChangesWarning(sucio)

    useEffect(() => {
        if (terminado) navigate(terminado.to, { state: { notice: terminado.aviso, from: filtros } })
    }, [terminado, navigate, filtros])

    const cambiar = (campo: keyof VueloFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
        setValues((actuales) => ({ ...actuales, [campo]: event.target.value }))
        if (campo in errors) setErrors((actuales) => ({ ...actuales, [campo]: undefined }))
    }

    const cantidadAsientos = useMemo(() => generarAsientos(values), [values])
    const ejecutivos = cantidadAsientos.filter((a) => a.clase === 'EJECUTIVA').length

    async function enviar(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (enviando) return
        setErrorOperacion(null)
        setResumen([])
        const encontrados = validarVuelo(values, modo)
        setErrors(encontrados)
        if (Object.values(encontrados).some(Boolean)) {
            focoEnPrimerError()
            return
        }
        setEnviando(true)
        try {
            if (modo === 'crear') {
                const creado = await vuelosApi.crear(cuerpoCrear(values))
                setTerminado({ to: `/app/vuelos${filtros}`, aviso: `Vuelo ${creado.id} creado correctamente.` })
            } else if (vuelo) {
                await vuelosApi.actualizar(vuelo.id, cuerpoEditar(values))
                setTerminado({ to: `/app/vuelos${filtros}`, aviso: `Vuelo ${vuelo.id} actualizado correctamente.` })
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

    const titulo = modo === 'crear' ? 'Nuevo vuelo' : `Editar vuelo ${vuelo?.id ?? ''}`
    const cancelarA = modo === 'editar' && vuelo ? `/app/vuelos/${encodeURIComponent(vuelo.id)}` : `/app/vuelos${filtros}`

    return <>
        <section className="page-heading">
            <div><p className="eyebrow">VUELOS</p><h1 id="vuelo-form-title">{titulo}</h1><p className="muted">Los campos marcados con * son obligatorios.</p></div>
        </section>

        <form className="vuelos-form" noValidate aria-labelledby="vuelo-form-title" onSubmit={enviar}>
            <OperationError error={errorOperacion} />
            {resumen.length > 0 && <div className="form-error-summary" role="alert"><ul>{resumen.map((m) => <li key={m}>{m}</li>)}</ul></div>}

            <FormField id="vuelo-id" label="Id del vuelo" required maxLength={50} autoComplete="off" value={values.id} readOnly={modo === 'editar'}
                hint={modo === 'crear' ? 'Letras, números, "-" y "_" (ej. V100). No se puede cambiar después.' : 'El id no se puede modificar.'}
                error={errors.id} onChange={cambiar('id')} />

            <div className="vuelos-form-row">
                <FormField id="vuelo-origen" label="Origen" required maxLength={80} autoComplete="off" value={values.origen} error={errors.origen} onChange={cambiar('origen')} />
                <FormField id="vuelo-destino" label="Destino" required maxLength={80} autoComplete="off" value={values.destino} error={errors.destino} onChange={cambiar('destino')} />
            </div>

            <div className="vuelos-form-row">
                <FormField id="vuelo-fecha" label="Fecha" type="date" required value={values.fecha} error={errors.fecha} onChange={cambiar('fecha')} />
                <FormField id="vuelo-hora" label="Hora (24 h)" type="time" required value={values.hora} error={errors.hora} onChange={cambiar('hora')} />
            </div>

            {modo === 'crear'
                ? <fieldset>
                    <legend>Asientos</legend>
                    <div className="vuelos-form-row">
                        <FormField id="vuelo-filas-ejecutivas" label="Filas ejecutivas" type="number" min={0} inputMode="numeric" value={values.filasEjecutivas} onChange={cambiar('filasEjecutivas')} />
                        <FormField id="vuelo-filas-economicas" label="Filas económicas" type="number" min={0} inputMode="numeric" value={values.filasEconomicas} onChange={cambiar('filasEconomicas')} />
                        <FormField id="vuelo-letras" label="Letras por fila" autoComplete="off" value={values.letras} error={errors.asientos} hint="Ejemplo: ABCDEF" onChange={cambiar('letras')} />
                    </div>
                    <p className="muted" role="status">Se generarán {cantidadAsientos.length} asientos ({ejecutivos} ejecutivos y {cantidadAsientos.length - ejecutivos} económicos). Máximo 600.</p>
                </fieldset>
                : <p className="muted">Los asientos del vuelo no se modifican desde este formulario.</p>}

            <div className="vuelos-form-actions">
                <button className="button button-primary" type="submit" disabled={enviando}>{enviando ? 'Guardando…' : modo === 'crear' ? 'Crear vuelo' : 'Guardar cambios'}</button>
                <Link className="button button-secondary" to={cancelarA}>Cancelar</Link>
            </div>
            {dialog}
        </form>
    </>
}