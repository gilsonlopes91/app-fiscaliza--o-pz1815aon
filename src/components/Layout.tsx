import React from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Building2,
  ClipboardCheck,
  Shield,
  Layers,
  Users,
  LogOut,
  UserCheck,
  ChevronDown,
  Download,
  WifiOff,
  LayoutDashboard,
  CheckSquare,
} from 'lucide-react'
import logoCreaPi from '@/assets/creapi-a5c20.png'
import { useAuth } from '@/contexts/AuthContext'
import { usePwa } from '@/hooks/use-pwa'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAdmin, logout } = useAuth()
  const { isInstallable, installApp, isOnline } = usePwa()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleInstallClick = async () => {
    await installApp()
  }

  // Define navigation tabs based on user role
  // Admin: Painel Geral (Dashboard), Tipos de Empreendimento, Vistoria, Gestão de Usuários
  // Fiscal: Minhas Fiscalizações, Tipos de Empreendimento, Vistoria
  const navItems = [
    ...(isAdmin
      ? [
          {
            to: '/dashboard',
            label: 'Painel Geral',
            icon: LayoutDashboard,
          },
        ]
      : [
          {
            to: '/minhas-fiscalizacoes',
            label: 'Minhas Fiscalizações',
            icon: CheckSquare,
          },
        ]),
    {
      to: '/tipos-empreendimento',
      label: 'Tipos de Empreendimento',
      icon: Layers,
    },
    {
      to: '/vistoria',
      label: 'Vistoria',
      icon: ClipboardCheck,
    },
    ...(isAdmin
      ? [
          {
            to: '/usuarios',
            label: 'Gestão de Usuários',
            icon: Users,
          },
        ]
      : []),
  ]
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-[#102A43] font-sans antialiased selection:bg-[#004B8D] selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Offline Alert Bar */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-inner z-50">
          <WifiOff className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span className="truncate">Modo Offline ativado. Exibindo dados salvos.</span>
        </div>
      )}

      {/* 1. Header Fixo Superior */}
      <header className="sticky top-0 z-40 bg-[#004B8D] border-b border-[#003666] text-white shadow-md w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Logo & Brand Identity CREA-PI */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center justify-center py-1 shrink-0">
              <img
                src={logoCreaPi}
                alt="CREA-PI - Conselho Regional de Engenharia e Agronomia do Piauí"
                className="h-8 sm:h-11 w-auto max-w-[150px] sm:max-w-[240px] object-contain drop-shadow-sm"
              />
            </div>
            <div className="flex flex-col border-l border-white/20 pl-2 sm:pl-3 min-w-0">
              <span className="font-bold text-xs sm:text-base tracking-tight leading-none text-white flex items-center gap-1.5">
                Fiscalização
              </span>
              <span className="hidden sm:inline text-[10px] text-blue-100 font-medium tracking-wide truncate">
                Sistema integrado de fiscalização por empreendimento
              </span>
            </div>
          </div>

          {/* Right Area: User profile dropdown & Role badge */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Install PWA Button if available */}
            {isInstallable && (
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="bg-[#E5A812] hover:bg-[#d4970b] text-[#102A43] font-bold text-xs h-8 px-2 sm:px-3 shadow-xs flex items-center gap-1 cursor-pointer"
                title="Instalar App Fiscalização no Dispositivo"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Instalar</span>
              </Button>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 sm:h-10 px-2 sm:px-3 text-white hover:bg-[#003666] hover:text-white flex items-center gap-1.5 sm:gap-2 rounded-lg cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#E5A812] text-[#102A43] font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-xs font-semibold leading-tight text-white max-w-[120px] truncate">
                        {user.name || user.email}
                      </span>
                      <span className="text-[10px] text-blue-200 capitalize">
                        {user.role === 'admin' ? 'Administrador' : 'Fiscal / Usuário'}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white border-[#D3DFE9] text-[#102A43] shadow-lg rounded-xl z-50"
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-bold leading-none text-[#102A43] truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] leading-none text-[#627D98] font-mono truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#D3DFE9]" />

                  <div className="px-2 py-1.5 text-xs text-[#486581]">
                    <div className="flex items-center justify-between">
                      <span>Papel:</span>
                      <Badge className="bg-[#E8F1F8] text-[#004B8D] border-0 text-[10px] font-bold">
                        {user.role === 'admin' ? 'ADMINISTRADOR' : 'USUÁRIO'}
                      </Badge>
                    </div>
                  </div>

                  {isAdmin ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => navigate('/dashboard')}
                        className="text-xs cursor-pointer focus:bg-[#E8F1F8] focus:text-[#004B8D]"
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2 text-[#004B8D]" />
                        Painel Geral
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate('/minhas-fiscalizacoes')}
                        className="text-xs cursor-pointer focus:bg-[#E8F1F8] focus:text-[#004B8D]"
                      >
                        <CheckSquare className="w-4 h-4 mr-2 text-[#004B8D]" />
                        Minhas Fiscalizações
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate('/usuarios')}
                        className="text-xs cursor-pointer focus:bg-[#E8F1F8] focus:text-[#004B8D]"
                      >
                        <Users className="w-4 h-4 mr-2 text-[#004B8D]" />
                        Gestão de Usuários
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => navigate('/minhas-fiscalizacoes')}
                      className="text-xs cursor-pointer focus:bg-[#E8F1F8] focus:text-[#004B8D]"
                    >
                      <CheckSquare className="w-4 h-4 mr-2 text-[#004B8D]" />
                      Minhas Fiscalizações
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator className="bg-[#D3DFE9]" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-xs text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair do sistema
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* 2. Barra de Abas Fixa Logo Abaixo do Cabeçalho - Sem scrollbar visível */}
        <div className="bg-[#003666] border-t border-[#00264d]/60 shadow-xs w-full overflow-hidden">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
            <nav
              className="flex space-x-1 sm:space-x-3 overflow-x-auto py-1.5 scrollbar-none no-scrollbar touch-pan-x"
              aria-label="Abas"
            >
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive: active }) =>
                      `flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap shrink-0 active:scale-95 ${
                        active
                          ? 'bg-white text-[#004B8D] shadow-xs'
                          : 'text-blue-100 hover:text-white hover:bg-white/10'
                      }`
                    }
                  >
                    <Icon
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-[#004B8D]' : 'text-blue-200'}`}
                    />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* 3. Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
        <Outlet />
      </main>

      {/* 4. Rodapé Técnico */}
      <footer className="bg-white border-t border-[#D3DFE9] text-[#627D98] text-xs py-4 text-center mt-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>CREA-PI • Conselho Regional de Engenharia e Agronomia do Estado do Piauí</span>
          <span className="text-[11px] text-[#829AB1]">
            Sistema integrado de fiscalização por empreendimento
          </span>
        </div>
      </footer>
    </div>
  )
}
