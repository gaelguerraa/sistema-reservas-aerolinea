import { isApiError } from '../http/client'

export function BusinessRuleMessage({ error }: { error: unknown }) {
  if (!isApiError(error) || error.status !== 409) return null
  return <div className="business-rule-message" role="alert" aria-live="assertive">
    <strong>No se pudo completar la operación</strong>
    <p>{error.message}</p>
  </div>
}
