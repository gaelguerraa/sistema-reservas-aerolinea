import type { ReactNode } from 'react'

type AsyncStateProps = {
  kind: 'loading' | 'error' | 'empty'
  title: string
  message: string
  retry?: () => void
  action?: ReactNode
}

export function AsyncState({ kind, title, message, retry, action }: AsyncStateProps) {
  return (
    <section className={`async-state async-${kind}`} aria-busy={kind === 'loading'} role={kind === 'error' ? 'alert' : 'status'}>
      {kind === 'loading' ? <span className="loading-orbit" aria-hidden="true" /> : <span className="state-symbol" aria-hidden="true">{kind === 'error' ? '!' : '✦'}</span>}
      <h2>{title}</h2>
      <p>{message}</p>
      {kind === 'loading' && <span className="sr-only">Cargando información</span>}
      {retry && <button className="button button-secondary" type="button" onClick={retry}>Reintentar</button>}
      {action}
    </section>
  )
}
