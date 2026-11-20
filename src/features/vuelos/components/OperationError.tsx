import { isApiError } from '../../../shared/http/client'
import { BusinessRuleMessage } from '../../../shared/components/BusinessRuleMessage'

export function OperationError({ error }: { error: unknown }) {
    if (!error) return null
    if (isApiError(error) && error.status === 409) return <BusinessRuleMessage error={error} />
    const message = isApiError(error) && error.status === 403
        ? 'No tienes permiso para realizar esta operación.'
        : error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
    return <div className="form-error-summary" role="alert">{message}</div>
}