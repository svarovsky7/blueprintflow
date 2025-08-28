import { useEffect, useState } from 'react'
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
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('blueprintflow-theme')
    return savedTheme === 'dark'
  })

  useEffect(() => {
    document.body.style.backgroundColor = isDark ? '#555555' : '#FCFCFC'
    document.body.style.color = isDark ? '#ffffff' : '#000000'
    document.body.dataset.theme = isDark ? 'dark' : 'light'
    localStorage.setItem('blueprintflow-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <ConfigProvider
      theme={
        isDark
          ? {
              algorithm: theme.darkAlgorithm,
              token: {
                colorPrimary: '#c3b8cc',
                colorBgLayout: '#555555',
                colorBgContainer: '#555555',
                colorText: '#ffffff',
              },
            }
          : {
              algorithm: theme.defaultAlgorithm,
              token: {
                colorPrimary: '#c3b8cc',
                colorBgLayout: '#FCFCFC',
                colorBgContainer: '#FCFCFC',
                colorText: '#000000',
              },
            }
      }
    >
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App isDark={isDark} toggleTheme={() => setIsDark((prev) => !prev)} />
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
