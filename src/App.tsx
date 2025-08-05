import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/Auth'
import RegisterPage from './pages/Register'
import HomePage from './pages/Home'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
