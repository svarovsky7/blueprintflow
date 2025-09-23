import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntdApp, theme } from 'antd'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import { LogoProvider } from './shared/contexts/LogoContext'
import { ScaleProvider, useScale } from './shared/contexts/ScaleContext'

// Подавляем findDOMNode warning от Ant Design до обновления библиотеки // LOG: подавление findDOMNode warnings
const originalError = console.error
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('findDOMNode is deprecated')) {
    return // Игнорируем это предупреждение
  }
  // Временно показываем Maximum update depth для отладки
  if (typeof args[0] === 'string' && args[0].includes('Maximum update depth')) {
    console.warn('🔴 INFINITE RENDER DETECTED:', args[0]) // LOG: обнаружение infinite render

    // ДИАГНОСТИКА: выводим стек вызовов и дополнительную информацию
    console.group('🔍 INFINITE RENDER DIAGNOSTICS')
    console.warn('Stack trace:', new Error().stack)
    console.warn('Current URL:', window.location.href)
    console.warn('Current time:', new Date().toISOString())

    // Диагностика React Query
    if (window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__) {
      const queries = window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__.queryClient?.getQueryCache?.().getAll?.()
      console.warn('Active queries count:', queries?.length || 'unknown')
      if (queries?.length > 10) {
        console.warn('⚠️ HIGH QUERY COUNT detected:', queries.length)
      }
    }

    console.groupEnd()
  }
  originalError(...args)
}

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
