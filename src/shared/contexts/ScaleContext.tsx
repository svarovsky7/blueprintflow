/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface ScaleContextType {
  scale: number
  setScale: (value: number) => void
}

const ScaleContext = createContext<ScaleContextType | undefined>(undefined)

export function ScaleProvider({ children }: { children: ReactNode }) {
  const [scale, setScaleState] = useState<number>(() => {
    const saved = localStorage.getItem('blueprintflow-scale')
    return saved ? Number(saved) : 1
  })

  useEffect(() => {
    document.documentElement.style.setProperty('--app-scale', String(scale))
    localStorage.setItem('blueprintflow-scale', String(scale))
    window.dispatchEvent(new Event('ui:scale-changed'))
  }, [scale])

  const setScale = (value: number) => {
    setScaleState(value)
  }

  return (
    <ScaleContext.Provider value={{ scale, setScale }}>
      {children}
    </ScaleContext.Provider>
  )
}

export function useScale() {
  const context = useContext(ScaleContext)
  if (!context) {
    throw new Error('useScale must be used within ScaleProvider')
  }
  return context
}

