import React, { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu,
  Download,
  WifiOff,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  CheckSquare,
  Users,
  Layers,
  ClipboardCheck,
} from 'lucide-react'
import logoCreaPi from '@/assets/creapi-a5c20.png'
import { useAuth } from '@/contexts/AuthContext'
import { usePwa } from '@/hooks/use-pwa'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppSidebar } from './AppSidebar'

const SIDEBAR_STATE_KEY = 'creapi_sidebar_collapsed'

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAdmin, logout } = useAuth()
  const { isInstallable, installApp, isOnline } = usePwa()

  // Estado recolhido/expandido persistido no localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STATE_KEY)
      if (saved !== null) {
        return saved === 'true'
      }
    } catch {
      // Ignora falhas de acesso a localStorage
    }
    return false
  })

  // Estado do drawer no mobile
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Salvar no localStorage sempre que o usuário alternar
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_STATE_KEY, String(next))
      } catch {
        // Ignora
      }
      return next
    })
  }

  // Fecha o menu mobile ao trocar de rota
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleInstallClick = async () => {
    await installApp()
  }

  // Título e ícone da página atual para mostrar na topbar
  const pageInfo = (() => {
    const path = location.pathname
    if (path.startsWith('/dashboard')) {
      return { title: 'Painel Geral', icon: LayoutDashboard }
    }
    if (path.startsWith('/minhas-fiscalizacoes')) {
      return { title: 'Minhas Fiscalizações', icon: CheckSquare }
    }
    if (path.startsWith('/tipos-empreendimento')) {
      return { title: 'Tipos de Empreendimento', icon: Layers }
    }
    if (path.startsWith('/vistoria')) {
      return { title: 'Vistoria', icon: ClipboardCheck }
    }
    if (path.startsWith('/usuarios')) {
      return { title: 'Gestão de Usuários', icon: Users }
    }
    return { title: 'Fiscalização', icon: null }
  })()

  return (
    <div className="min-h-screen flex bg-[#F4F6F9] text-[#102A43] font-sans antialiased selection:bg-[#004B8D] selection:text-white w-full max-w-full overflow-x-hidden">
      {/* 1. Sidebar Fixa em Desktop */}
      <div className="hidden md:block shrink-0 sticky top-0 h-screen z-30">
        <AppSidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} isMobile={false} />
      </div>

      {/* 2. Sidebar Drawer em Mobile */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[280px] max-w-[85vw] border-r border-[#003666] bg-[#004B8D] text-white [&>button]:hidden shadow-2xl"
        >
          <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
          <div className="h-full w-full">
            <AppSidebar
              isCollapsed={false}
              onToggleCollapse={() => {}}
              isMobile={true}
              isMobileOpen={isMobileOpen}
              onMobileClose={() => setIsMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 3. Área Principal: Topbar + Conteúdo + Rodapé */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen w-full">
        {/* Offline Alert Bar */}
        {!isOnline && (
          <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-inner z-50">
            <WifiOff className="w-3.5 h-3.5 animate-pulse shrink-0" />
            <span className="truncate">Modo Offline ativado. Exibindo dados salvos.</span>
          </div>
        )}

        {/* Topbar Compacta Superior */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#D3DFE9] text-[#102A43] shadow-xs w-full">
          <div className="px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
            {/* Lado Esquerdo: Botão Hambúrguer Mobile + Título do Contexto Atual */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Botão Hambúrguer apenas no mobile */}
              <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                aria-label="Abrir menu de navegação"
                className="md:hidden p-2 rounded-lg text-[#004B8D] hover:bg-[#E8F1F8] focus:outline-none focus:ring-2 focus:ring-[#004B8D]/30 transition-colors shrink-0 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Logo CREA-PI visível no topo mobile para reforçar a identidade */}
              <div className="flex md:hidden items-center shrink-0">
                <img
                  src={logoCreaPi}
                  alt="CREA-PI"
                  className="h-7 w-auto max-w-[100px] object-contain drop-shadow-xs"
                />
              </div>

              {/* Título da Página / Subtítulo Institucional */}
              <div className="flex flex-col border-l border-[#D3DFE9] pl-2 sm:pl-3 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base tracking-tight leading-none text-[#004B8D] truncate">
                    {pageInfo.title}
                  </span>
                  {isAdmin && (
                    <Badge className="hidden sm:inline-flex bg-[#E8F1F8] text-[#004B8D] border-0 text-[10px] font-bold py-0 h-4">
                      Admin
                    </Badge>
                  )}
                </div>
                <span className="hidden sm:inline text-[11px] text-[#627D98] font-medium tracking-wide truncate mt-0.5">
                  Sistema integrado de fiscalização por empreendimento
                </span>
              </div>
            </div>

            {/* Lado Direito: Ações rápidas (Instalar PWA, perfil rápido) */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Botão de Instalação PWA se elegível */}
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

              {/* Informação / menu rápido do usuário também na topbar */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Menu do usuário"
                      className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-[#F4F6F9] border border-transparent hover:border-[#D3DFE9] transition-all cursor-pointer"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#004B8D] text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0 ring-2 ring-[#E8F1F8]">
                        {user.name ? user.name[0].toUpperCase() : 'U'}
                      </div>
                      <div className="hidden lg:flex flex-col text-left">
                        <span className="text-xs font-semibold leading-tight text-[#102A43] max-w-[120px] truncate">
                          {user.name || user.email}
                        </span>
                        <span className="text-[10px] text-[#627D98] capitalize">
                          {user.role === 'admin' ? 'Administrador' : 'Fiscal'}
                        </span>
                      </div>
                      <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-[#627D98] shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-white border-[#D3DFE9] text-[#102A43] shadow-lg rounded-xl z-50 p-1.5"
                  >
                    <DropdownMenuLabel className="font-normal px-2 py-1.5">
                      <div className="flex flex-col space-y-1">
                        <p className="text-xs font-bold leading-none text-[#102A43] truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] leading-none text-[#627D98] font-mono truncate">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#D3DFE9] my-1" />

                    <div className="px-2 py-1.5 text-xs text-[#486581]">
                      <div className="flex items-center justify-between">
                        <span>Papel:</span>
                        <Badge className="bg-[#E8F1F8] text-[#004B8D] border-0 text-[10px] font-bold">
                          {user.role === 'admin' ? 'ADMINISTRADOR' : 'FISCAL'}
                        </Badge>
                      </div>
                    </div>

                    {isAdmin ? (
                      <>
                        <DropdownMenuItem
                          onClick={() => navigate('/dashboard')}
                          className="text-xs cursor-pointer focus:bg-[#E8F1F8] focus:text-[#004B8D] rounded-lg"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 mr-2 text-[#004B8D]" />
                          Painel Geral
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/minhas-fiscalizacoes')}
                          className="text-xs cursor-pointer focus:bg-[#E8F1F8] focus:text-[#004B8D] rounded-lg"
                        >
                          <CheckSquare className="w-3.5 h-3.5 mr-2 text-[#004B8D]" />
                          Minhas Fiscalizações
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/usuarios')}
                          className="text-xs cursor-pointer focus:bg-[#E8F1F8] focus:text-[#004B8D] rounded-lg"
                        >
                          <Users className="w-3.5 h-3.5 mr-2 text-[#004B8D]" />
                          Gestão de Usuários
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => navigate('/minhas-fiscalizacoes')}
                        className="text-xs cursor-pointer focus:bg-[#E8F1F8] focus:text-[#004B8D] rounded-lg"
                      >
                        <CheckSquare className="w-3.5 h-3.5 mr-2 text-[#004B8D]" />
                        Minhas Fiscalizações
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="bg-[#D3DFE9] my-1" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-xs text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer rounded-lg"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-2" />
                      Sair do sistema
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </header>

        {/* 4. Conteúdo Principal */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
          <Outlet />
        </main>

        {/* 5. Rodapé Técnico */}
        <footer className="bg-white border-t border-[#D3DFE9] text-[#627D98] text-xs py-4 text-center mt-auto w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>CREA-PI • Conselho Regional de Engenharia e Agronomia do Estado do Piauí</span>
            <span className="text-[11px] text-[#829AB1]">
              Sistema integrado de fiscalização por empreendimento
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
