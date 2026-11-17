import type { ReactNode } from 'react'

export type AsyncStateValue<T> =
  | { status: 'loading' }
  | { status: 'data'; data: T }
  | { status: 'empty' }
  | { status: 'error'; error: Error }

interface AsyncStateProps<T> {
  state: AsyncStateValue<T>
  children: (data: T) => ReactNode
  isEmpty?: (data: T) => boolean
  emptyMessage?: string
  onRetry?: () => void
}

export function AsyncState<T>({ state, children, isEmpty, emptyMessage = 'No hay información para mostrar.', onRetry }: AsyncStateProps<T>) {
  if (state.status === 'loading') return <div className="async-state" role="status" aria-live="polite">Cargando información…</div>
  if (state.status === 'error') {
    return <section className="async-state async-state-error" role="alert">
      <p>{state.error.message}</p>
      {onRetry && <button className="button button-secondary" type="button" onClick={onRetry}>Reintentar</button>}
    </section>
  }
  if (state.status === 'empty' || (state.status === 'data' && isEmpty?.(state.data))) {
    return <div className="async-state" role="status">{emptyMessage}</div>
  }
  if (state.status === 'data') return <>{children(state.data)}</>
  return null
}
