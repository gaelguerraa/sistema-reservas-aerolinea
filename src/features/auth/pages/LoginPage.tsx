import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../../shared/http/client'
import { useAuth } from '../useAuth'

function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/vuelos'
  const destination = new URL(value, window.location.origin)
  if (destination.origin !== window.location.origin || /^\/login\/?$/.test(destination.pathname)) return '/vuelos'
  return `${destination.pathname}${destination.search}${destination.hash}`
}

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const redirect = safeRedirect(searchParams.get('redirect'))

  if (isAuthenticated) return <Navigate to={redirect} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const next: Record<string, string> = {}
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) next.email = 'Escribe tu correo electrónico.'
    else if (cleanEmail.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) next.email = 'Escribe un correo electrónico válido.'
    if (!password) next.password = 'Escribe tu contraseña.'
    else if (password.length > 128) next.password = 'La contraseña es demasiado larga.'
    setErrors(next)
    setError('')
    if (Object.keys(next).length) return
    setSubmitting(true)
    try {
      await login({ email: cleanEmail, password })
    } catch (reason) {
      if (reason instanceof ApiError) {
        if (Object.keys(reason.fieldErrors).length) setErrors(reason.fieldErrors)
        else if (reason.kind === 'NO_AUTENTICADO') setErrors({ password: 'El correo o la contraseña no coinciden. Revisa ambos datos.' })
        else setError(reason.userMessage)
      } else setError('No fue posible iniciar sesión. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page-content auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <span className="eyebrow">BIENVENIDO DE NUEVO</span>
        <h1 id="login-title">Inicia sesión</h1>
        <p>Accede a tu cuenta para continuar con tus reservaciones.</p>
        {import.meta.env.VITE_USE_MOCKS === 'true' && <p role="note">Demostración: cliente@ejemplo.com · Contraseña: Cliente123</p>}
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <label htmlFor="login-email">Correo electrónico</label>
          <input id="login-email" type="email" autoComplete="email" value={email} disabled={submitting}
            aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined}
            onChange={(event) => { setEmail(event.target.value); setErrors({}); setError('') }} />
          {errors.email && <p id="login-email-error" className="form-error" role="alert">{errors.email}</p>}
          <label htmlFor="login-password">Contraseña</label>
          <input id="login-password" type="password" autoComplete="current-password" value={password} disabled={submitting}
            aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined}
            onChange={(event) => { setPassword(event.target.value); setErrors({}); setError('') }} />
          {errors.password && <p id="login-password-error" className="form-error" role="alert">{errors.password}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  )
}
