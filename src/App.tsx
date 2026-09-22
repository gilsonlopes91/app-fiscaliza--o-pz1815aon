import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Suspense, lazy } from 'react'

const Vistoria = lazy(() => import('./pages/Vistoria'))
const TiposEmpreendimento = lazy(() => import('./pages/TiposEmpreendimento'))
const TipoEmpreendimentoDetalhe = lazy(() => import('./pages/TipoEmpreendimentoDetalhe'))
const Login = lazy(() => import('./pages/Login'))
const AguardandoAprovacao = lazy(() => import('./pages/AguardandoAprovacao'))
const RedefinirSenhaObrigatoria = lazy(() => import('./pages/RedefinirSenhaObrigatoria'))
const GestaoUsuarios = lazy(() => import('./pages/GestaoUsuarios'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const FiscalDashboard = lazy(() => import('./pages/FiscalDashboard'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#004B8D]" />
      <span className="text-xs font-semibold text-[#486581]">Carregando página...</span>
    </div>
  )
}
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
  const { user, isLoading, isAuthenticated, isApproved, isAdmin, mustChangePassword } = useAuth()
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

  // Interrompe qualquer acesso se must_change_password for true
  if (mustChangePassword) {
    return <Navigate to="/redefinir-senha" replace />
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

// Rota protegida especificamente para quem precisa redefinir senha
function MustChangePasswordRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, mustChangePassword } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#004B8D]" />
        <span className="text-xs font-semibold text-[#486581]">Verificando credenciais...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!mustChangePassword) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Redirects index based on auth status and role
function IndexRedirect() {
  const { user, isLoading, isAuthenticated, isApproved, isAdmin, mustChangePassword } = useAuth()

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

  if (mustChangePassword) {
    return <Navigate to="/redefinir-senha" replace />
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
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />
            <Route
              path="/redefinir-senha"
              element={
                <MustChangePasswordRoute>
                  <RedefinirSenhaObrigatoria />
                </MustChangePasswordRoute>
              }
            />

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
        </Suspense>
      </Router>
    </AuthProvider>
  )
}
