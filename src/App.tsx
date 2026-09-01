import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import Vistoria from './pages/Vistoria'
import TiposEmpreendimento from './pages/TiposEmpreendimento'
import TipoEmpreendimentoDetalhe from './pages/TipoEmpreendimentoDetalhe'
import Login from './pages/Login'
import AguardandoAprovacao from './pages/AguardandoAprovacao'
import GestaoUsuarios from './pages/GestaoUsuarios'
import AdminDashboard from './pages/AdminDashboard'
import FiscalDashboard from './pages/FiscalDashboard'
import NotFound from './pages/NotFound'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Loader2 } from 'lucide-react'

// Guard to require user to be logged in and approved
function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode
  requireAdmin?: boolean
}) {
  const { user, isLoading, isAuthenticated, isApproved, isAdmin } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#004B8D]" />
        <span className="text-xs font-semibold text-[#486581]">Verificando credenciais...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isApproved) {
    return <Navigate to="/aguardando-aprovacao" replace />
  }

  if (requireAdmin && !isAdmin) {
    // Regular users cannot access admin routes (like Hospitais, Import CSV, Usuarios)
    return <Navigate to="/tipos-empreendimento" replace />
  }

  return <>{children}</>
}

// Redirects index based on auth status and role
function IndexRedirect() {
  const { user, isLoading, isAuthenticated, isApproved, isAdmin } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#004B8D]" />
        <span className="text-xs font-semibold text-[#486581]">Carregando sistema...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isApproved) {
    return <Navigate to="/aguardando-aprovacao" replace />
  }

  if (isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Navigate to="/minhas-fiscalizacoes" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />

          {/* Root Redirect */}
          <Route path="/" element={<IndexRedirect />} />

          {/* Protected Main Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard Principal conforme o Papel */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="/minhas-fiscalizacoes" element={<FiscalDashboard />} />

            {/* Redirecionamento da antiga rota /hospitais para o tipo Hospital */}
            <Route
              path="/hospitais"
              element={<Navigate to="/tipos-empreendimento/Hospital" replace />}
            />

            {/* Tipos de Empreendimento - Catálogo */}
            <Route path="/tipos-empreendimento" element={<TiposEmpreendimento />} />

            {/* Página do Tipo de Empreendimento (Unidades + Checklist exclusivo) */}
            <Route path="/tipos-empreendimento/:id" element={<TipoEmpreendimentoDetalhe />} />

            {/* Vistoria */}
            <Route path="/vistoria" element={<Vistoria />} />

            {/* Admin-only: Gestao de Usuarios */}
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute requireAdmin>
                  <GestaoUsuarios />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
