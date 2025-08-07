import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntdApp, unstableSetRender } from 'antd'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          colorBgLayout: '#e6f7ff',
          colorBgContainer: '#ffffff',
        },
      }}
    >
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
