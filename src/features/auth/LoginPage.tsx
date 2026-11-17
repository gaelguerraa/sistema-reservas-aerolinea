import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError, validationErrorsByField } from '../../shared/http/client'
import { FormField } from '../../shared/components/FormField'
import { useAuth } from './useAuth'

interface LoginLocationState { from?: unknown }

export function LoginPage() {
  const { login, notice, clearNotice } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)
    const errors: Record<string, string> = {}
    if (!email.trim()) errors['email'] = 'Ingresa tu correo.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors['email'] = 'Ingresa un correo válido.'
    if (!password) errors['password'] = 'Ingresa tu contraseña.'
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      document.getElementById(errors['email'] ? 'email' : 'password')?.focus()
      return
    }
    setSubmitting(true)
    clearNotice()
    try {
      await login({ email: email.trim(), password })
      const state = location.state as LoginLocationState | null
      const destination = typeof state?.from === 'string' && state.from.startsWith('/app/') ? state.from : '/app/dashboard'
      navigate(destination, { replace: true })
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        setFieldErrors(validationErrorsByField(error.details))
        setFormError(error.message)
      } else {
        setFormError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="login-page">
    <section className="login-card" aria-labelledby="login-title">
      <p className="eyebrow">AEROLÍNEA · ADMINISTRACIÓN</p>
      <h1 id="login-title">Iniciar sesión</h1>
      <p className="muted">Accede con una cuenta autorizada para el panel.</p>
      {notice && <p className="notice" role="status">{notice}</p>}
      {formError && <p className="form-error-summary" role="alert">{formError}</p>}
      <form onSubmit={(event) => void submit(event)} noValidate>
        <FormField id="email" label="Correo" type="email" name="email" autoComplete="username" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} error={fieldErrors['email']} />
        <FormField id="password" label="Contraseña" type="password" name="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} error={fieldErrors['password']} />
        <button className="button button-primary login-submit" type="submit" disabled={submitting}>
          {submitting ? 'Validando acceso…' : 'Entrar al panel'}
        </button>
      </form>
    </section>
  </main>
}
