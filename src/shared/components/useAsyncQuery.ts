import { useCallback, useEffect, useState } from 'react'
import type { AsyncStateValue } from './AsyncState'

export function useAsyncQuery<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<AsyncStateValue<T>>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setReloadKey((key) => key + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then((data) => {
      if (controller.signal.aborted) return
      if (data === null || data === undefined) setState({ status: 'empty' })
      else setState({ status: 'data', data })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ status: 'error', error: error instanceof Error ? error : new Error('Ocurrió un error inesperado.') })
    })
    return () => controller.abort()
  }, [load, reloadKey])

  return { state, retry }
}
