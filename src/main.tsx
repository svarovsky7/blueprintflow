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
    document.body.style.backgroundColor = isDark ? '#000000' : '#ffffff'
    document.body.style.color = isDark ? '#ffffff' : '#000000'
  }, [isDark])

  return (
    <ConfigProvider
      theme={
        isDark
          ? {
              algorithm: theme.darkAlgorithm,
              token: {
                colorPrimary: '#ffffff',
                colorBgLayout: '#000000',
                colorBgContainer: '#000000',
                colorText: '#ffffff',
              },
            }
          : {
              algorithm: theme.defaultAlgorithm,
              token: {
                colorPrimary: '#1677ff',
                colorBgLayout: '#ffffff',
                colorBgContainer: '#ffffff',
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
