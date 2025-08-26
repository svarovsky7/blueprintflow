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
  const [scale, setScale] = useState(() => {
    const savedScale = localStorage.getItem('blueprintflow-scale')
    return savedScale ? Number(savedScale) : 1
  })

  useEffect(() => {
    document.body.style.backgroundColor = isDark ? '#555555' : '#FCFCFC'
    document.body.style.color = isDark ? '#ffffff' : '#000000'
    document.body.dataset.theme = isDark ? 'dark' : 'light'
    localStorage.setItem('blueprintflow-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    const root = document.getElementById('root')
    if (root) {
      root.style.removeProperty('transform')
      root.style.removeProperty('transform-origin')
      root.style.removeProperty('width')
      root.style.removeProperty('height')
    }

    document.body.style.setProperty('zoom', scale.toString())
    document.body.style.width = `${100 / scale}%`
    document.body.style.height = `${100 / scale}%`
    localStorage.setItem('blueprintflow-scale', String(scale))
  }, [scale])

  return (
    <ConfigProvider
      theme={
        isDark
          ? {
              algorithm: theme.darkAlgorithm,
              token: {
                colorPrimary: '#ffffff',
                colorBgLayout: '#555555',
                colorBgContainer: '#555555',
                colorText: '#ffffff',
              },
            }
          : {
              algorithm: theme.defaultAlgorithm,
              token: {
                colorPrimary: '#0000ff',
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
            <App
              isDark={isDark}
              toggleTheme={() => setIsDark((prev) => !prev)}
              scale={scale}
              onScaleChange={setScale}
            />
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
