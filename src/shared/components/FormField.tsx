import type { InputHTMLAttributes, ReactNode } from 'react'

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  hint?: string
  children?: ReactNode
}

export function FormField({ id, label, error, hint, children, ...inputProps }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return <div className="form-field">
    <label htmlFor={id}>{label}{inputProps.required && <span aria-hidden="true"> *</span>}</label>
    {children ?? <input {...inputProps} id={id} aria-invalid={Boolean(error)} aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined} />}
    {hint && <small id={hintId} className="field-hint">{hint}</small>}
    {error && <small id={errorId} className="field-error" role="alert">{error}</small>}
  </div>
}
