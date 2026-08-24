import AppProviders from './context/AppProviders'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import OfflineLogin from './pages/auth/OfflineLogin'

function App() {

  return (
    <AppProviders>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/offline" element={<OfflineLogin />} />
          <Route path="/app" element={<Dashboard />} />
        </Routes>
      </HashRouter>
    </AppProviders>
  )
}

export default App