import React from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Layers,
  ClipboardCheck,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  CheckSquare,
  Shield,
  User,
} from 'lucide-react'
import logoCreaPi from '@/assets/creapi-a5c20.png'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AppSidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen?: boolean
  onMobileClose?: () => void
  isMobile?: boolean
}

export function AppSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
  isMobile = false,
}: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAdmin, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Navigation items:
  // Admin: Painel Geral, Tipos de Empreendimento, Vistoria, Gestão de Usuários
  // Fiscal: Minhas Fiscalizações, Tipos de Empreendimento, Vistoria
  const navItems = [
    ...(isAdmin
      ? [
          {
            to: '/dashboard',
            label: 'Painel Geral',
            icon: LayoutDashboard,
            badge: undefined,
          },
        ]
      : [
          {
            to: '/minhas-fiscalizacoes',
            label: 'Minhas Fiscalizações',
            icon: CheckSquare,
            badge: undefined,
          },
        ]),
    {
      to: '/tipos-empreendimento',
      label: 'Tipos de Empreendimento',
      icon: Layers,
      badge: undefined,
    },
    {
      to: '/vistoria',
      label: 'Vistoria',
      icon: ClipboardCheck,
      badge: undefined,
    },
    ...(isAdmin
      ? [
          {
            to: '/usuarios',
            label: 'Gestão de Usuários',
            icon: Users,
            badge: undefined,
          },
        ]
      : []),
  ]

  const showExpanded = isMobile ? true : !isCollapsed

  const handleLinkClick = () => {
    if (isMobile && onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        data-sidebar="app-sidebar"
        aria-label="Menu Principal"
        className={`bg-[#004B8D] text-white flex flex-col h-full border-r border-[#003666] select-none shadow-xl transition-all duration-300 ease-in-out ${
          isMobile ? 'w-[280px] max-w-[85vw]' : isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* 1. Header do Menu: Logo CREA-PI e Botão de Recolher/Expandir */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-white/10 shrink-0 bg-[#003F78]">
          <div
            className={`flex items-center gap-2.5 overflow-hidden transition-all duration-300 ${
              showExpanded ? 'opacity-100 flex-1' : 'opacity-100 justify-center w-full'
            }`}
          >
            {/* Logo CREA-PI */}
            <div className="flex items-center justify-center shrink-0">
              <img
                src={logoCreaPi}
                alt="CREA-PI"
                className={`w-auto object-contain transition-all duration-300 drop-shadow-sm ${
                  showExpanded ? 'h-9 max-w-[130px]' : 'h-8 max-w-[48px]'
                }`}
              />
            </div>

            {/* Texto de Identificação da Aplicação (quando expandido) */}
            {showExpanded && (
              <div className="flex flex-col border-l border-white/20 pl-2 min-w-0">
                <span className="font-bold text-xs tracking-tight leading-none text-white truncate">
                  Fiscalização
                </span>
                <span className="text-[10px] text-blue-200 font-medium tracking-wide truncate mt-0.5">
                  CREA-PI
                </span>
              </div>
            )}
          </div>

          {/* Botão de Toggle desktop */}
          {!isMobile && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 transition-colors shrink-0 cursor-pointer ml-1"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Botão de fechar no mobile */}
          {isMobile && (
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Fechar menu lateral"
              title="Fechar menu lateral"
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 transition-colors shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. Subtítulo / Seção de Navegação */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1.5 scrollbar-none">
          {showExpanded && (
            <div className="px-2.5 pb-1.5 pt-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200/70">
                Navegação Principal
              </span>
            </div>
          )}

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                location.pathname === item.to ||
                (item.to !== '/dashboard' &&
                  item.to !== '/minhas-fiscalizacoes' &&
                  location.pathname.startsWith(`${item.to}/`))

              const navLink = (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={handleLinkClick}
                  className={({ isActive: linkActive }) => {
                    const active = isActive || linkActive
                    return `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                      active
                        ? 'bg-white text-[#004B8D] font-bold shadow-sm'
                        : 'text-blue-100 hover:text-white hover:bg-white/10'
                    } ${!showExpanded ? 'justify-center px-2' : ''}`
                  }}
                >
                  <Icon
                    className={`shrink-0 transition-colors ${
                      !showExpanded ? 'w-5 h-5' : 'w-4 h-4'
                    } ${isActive ? 'text-[#004B8D]' : 'text-blue-200 group-hover:text-white'}`}
                  />
                  {showExpanded && (
                    <span className="truncate flex-1 tracking-tight">{item.label}</span>
                  )}
                  {showExpanded && isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#004B8D] shrink-0" />
                  )}
                </NavLink>
              )

              if (!showExpanded) {
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent
                      side="right"
                      sideOffset={10}
                      className="bg-[#00264d] text-white border-[#003666] text-xs font-semibold py-1.5 px-3 z-50 shadow-md"
                    >
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return navLink
            })}
          </nav>
        </div>

        {/* 3. Rodapé do Menu: Identificação do Usuário e Ações */}
        <div className="p-2 border-t border-white/10 shrink-0 bg-[#003B70]">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Opções do usuário"
                  className={`w-full flex items-center rounded-xl p-2 transition-all duration-150 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer ${
                    !showExpanded ? 'justify-center' : 'justify-between gap-2.5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#E5A812] text-[#102A43] font-bold text-xs flex items-center justify-center shadow-xs shrink-0 ring-2 ring-white/20">
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>

                    {showExpanded && (
                      <div className="flex flex-col text-left min-w-0">
                        <span className="text-xs font-bold leading-tight text-white truncate max-w-[130px]">
                          {user.name || user.email}
                        </span>
                        <span className="text-[10px] text-blue-200 truncate capitalize mt-0.5">
                          {user.role === 'admin' ? 'Administrador' : 'Fiscal'}
                        </span>
                      </div>
                    )}
                  </div>

                  {showExpanded && <ChevronDown className="w-3.5 h-3.5 text-blue-200 shrink-0" />}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side={showExpanded ? 'top' : 'right'}
                align="start"
                sideOffset={10}
                className="w-56 bg-white border-[#D3DFE9] text-[#102A43] shadow-xl rounded-xl z-50 p-1.5"
              >
                <DropdownMenuLabel className="font-normal px-2 py-1.5">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-bold leading-none text-[#102A43] truncate">
                      {user.name || 'Usuário'}
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
                      onClick={() => {
                        handleLinkClick()
                        navigate('/dashboard')
                      }}
                      className="text-xs cursor-pointer focus:bg-[#E8F1F8] focus:text-[#004B8D] rounded-lg"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 mr-2 text-[#004B8D]" />
                      Painel Geral
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        handleLinkClick()
                        navigate('/minhas-fiscalizacoes')
                      }}
                      className="text-xs cursor-pointer focus:bg-[#E8F1F8] focus:text-[#004B8D] rounded-lg"
                    >
                      <CheckSquare className="w-3.5 h-3.5 mr-2 text-[#004B8D]" />
                      Minhas Fiscalizações
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        handleLinkClick()
                        navigate('/usuarios')
                      }}
                      className="text-xs cursor-pointer focus:bg-[#E8F1F8] focus:text-[#004B8D] rounded-lg"
                    >
                      <Users className="w-3.5 h-3.5 mr-2 text-[#004B8D]" />
                      Gestão de Usuários
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={() => {
                      handleLinkClick()
                      navigate('/minhas-fiscalizacoes')
                    }}
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
                  <LogOut className="w-3.5 h-3.5 mr-2 text-rose-600" />
                  Sair do sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center justify-center py-2">
              <User className="w-5 h-5 text-blue-200" />
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
