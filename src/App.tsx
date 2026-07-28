import AppProviders from './context/AppProviders'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Test from './Test'
import Test2 from './Test2'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

function App() {

  return (
    <AppProviders>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/task" element={<Test2 />} />
          <Route path="/test" element={<Test />} />
        </Routes>
      </HashRouter>
    </AppProviders>
  )
}

export default App