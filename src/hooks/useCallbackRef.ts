import { useRef } from 'react'

export const useCallbackRef = <T extends HTMLElement>(
  callback: (node: T | null) => (() => void) | void,
) => {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const ref = useRef<T | null>(null)

  return (node: T | null) => {
    if (ref.current) {
      const cleanup = callbackRef.current(ref.current)
      if (typeof cleanup === 'function') {
        cleanup()
      }
    }

    ref.current = node
    if (ref.current) {
      callbackRef.current(ref.current)
    }
  }
}
