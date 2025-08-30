/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react'
import light from '@/logo_light.svg'
import dark from '@/logo_dark_1.svg'

interface LogoContextType {
  lightLogo: string
  darkLogo: string
  setLightLogo: (logo: string) => void
  setDarkLogo: (logo: string) => void
}

const LogoContext = createContext<LogoContextType | undefined>(undefined)

export function LogoProvider({ children }: { children: ReactNode }) {
  const [lightLogo, setLightLogoState] = useState<string>(
    () => localStorage.getItem('blueprintflow-logo-light') ?? light
  )
  const [darkLogo, setDarkLogoState] = useState<string>(
    () => localStorage.getItem('blueprintflow-logo-dark') ?? dark
  )

  const setLightLogo = (logo: string) => {
    setLightLogoState(logo)
    localStorage.setItem('blueprintflow-logo-light', logo)
  }

  const setDarkLogo = (logo: string) => {
    setDarkLogoState(logo)
    localStorage.setItem('blueprintflow-logo-dark', logo)
  }

  return (
    <LogoContext.Provider value={{ lightLogo, darkLogo, setLightLogo, setDarkLogo }}>
      {children}
    </LogoContext.Provider>
  )
}

export function useLogo() {
  const context = useContext(LogoContext)
  if (!context) {
    throw new Error('useLogo must be used within LogoProvider')
  }
  return context
}
