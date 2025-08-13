import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntdApp, unstableSetRender, theme } from 'antd'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'

unstableSetRender((node, container) => {
  const root = createRoot(container)
  root.render(node)
  return async () => {
    root.unmount()
  }
})

const queryClient = new QueryClient()

export function Root() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('dark-theme', isDark)
    document.body.classList.toggle('light-theme', !isDark)
  }, [isDark])

  return (
    <ConfigProvider
      theme={
        isDark
          ? {
              algorithm: theme.darkAlgorithm,
              token: {
                colorPrimary: '#ffffff',
                colorBgLayout: '#1f1f1f',
                colorBgContainer: '#1f1f1f',
                colorText: '#ffffff',
              },
            }
          : {
              algorithm: theme.defaultAlgorithm,
              token: {
                colorPrimary: '#6a5acd',
                colorBgLayout: '#ffffff',
                colorBgContainer:
                  'linear-gradient(to bottom, #add8e6, #ee82ee)',
                colorText: '#000000',
              },
            }
      }
    >
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App isDark={isDark} toggleTheme={() => setIsDark((v) => !v)} />
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
