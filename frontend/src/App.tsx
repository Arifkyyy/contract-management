import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { Logo } from './components/ui'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ContractForm from './pages/ContractForm'
import ContractList from './pages/ContractList'
import ContractDetail from './pages/ContractDetail'
import Admins from './pages/Admins'

function Protected({ children }: { children: JSX.Element }) {
  const { admin, loading } = useAuth()
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-base">
        <div className="animate-pulse"><Logo light /></div>
      </div>
    )
  }
  return admin ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="kontrak" element={<ContractList />} />
        <Route path="kontrak/baru" element={<ContractForm key="baru" />} />
        <Route path="kontrak/:id" element={<ContractDetail />} />
        <Route path="kontrak/:id/edit" element={<ContractForm key="edit" />} />
        <Route path="admin" element={<Admins />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
