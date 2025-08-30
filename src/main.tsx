import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntdApp, unstableSetRender, theme } from 'antd'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import { LogoProvider } from './shared/contexts/LogoContext'
import { ScaleProvider, useScale } from './shared/contexts/ScaleContext'

unstableSetRender((node, container) => {
  const root = createRoot(container)
  root.render(node)
  return async () => {
    root.unmount()
  }
})

const queryClient = new QueryClient()

export function Root() {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('blueprintflow-theme')
    return savedTheme === 'dark'
  })

  return (
    <ScaleProvider>
      <ConfiguredApp isDark={isDark} toggleTheme={() => setIsDark((prev) => !prev)} />
    </ScaleProvider>
  )
}

function ConfiguredApp({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
  const { scale } = useScale()

  useEffect(() => {
    document.body.style.backgroundColor = isDark ? '#555555' : '#FCFCFC'
    document.body.style.color = isDark ? '#ffffff' : '#000000'
    document.body.dataset.theme = isDark ? 'dark' : 'light'
    localStorage.setItem('blueprintflow-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#a69ead',
          colorInfo: '#a69ead',
          colorLink: '#a69ead',
          colorBgLayout: isDark ? '#555555' : '#FCFCFC',
          colorBgContainer: isDark ? '#555555' : '#FCFCFC',
          colorText: isDark ? '#ffffff' : '#000000',
          fontSize: 14 * scale,
          controlHeight: 32 * scale,
          sizeUnit: 4 * scale,
          sizeStep: 4 * scale,
        },
      }}
    >
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <LogoProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <App isDark={isDark} toggleTheme={toggleTheme} />
            </BrowserRouter>
          </LogoProvider>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
