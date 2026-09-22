import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Mail,
  Calendar,
  AlertTriangle,
  Trash2,
  Lock,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usersService, UserProfile, UserRole } from '@/services/auth'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export default function GestaoUsuarios() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'pendentes' | 'aprovados' | 'todos'>('pendentes')

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null)

  // Reset password states
  const [userToReset, setUserToReset] = useState<UserProfile | null>(null)
  const [resetModalResult, setResetModalResult] = useState<{
    user: UserProfile
    provisionalPassword: string
  } | null>(null)
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false)

  useEffect(() => {
    document.title = 'Controle de Usuários · CREA-PI Fiscalização'
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const list = await usersService.getAll()
      setUsers(list)
    } catch (err) {
      console.error('Erro ao carregar lista de usuários:', err)
      toast({
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível carregar a lista do servidor.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleApprove = async (u: UserProfile) => {
    try {
      setProcessingId(u.id)
      await usersService.approveUser(u.id)
      setUsers((prev) =>
        prev.map((item) =>
          item.id === u.id ? { ...item, approved: true, approvalStatus: 'aprovado' } : item,
        ),
      )
      toast({
        title: 'Usuário Aprovado!',
        description: `${u.name} agora possui acesso ao sistema.`,
      })
    } catch (err) {
      console.error('Erro ao aprovar usuário:', err)
      toast({
        title: 'Erro ao aprovar usuário',
        description: 'Não foi possível aprovar a solicitação.',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (u: UserProfile) => {
    try {
      setProcessingId(u.id)
      await usersService.rejectUser(u.id)
      setUsers((prev) =>
        prev.map((item) =>
          item.id === u.id ? { ...item, approved: false, approvalStatus: 'rejeitado' } : item,
        ),
      )
      toast({
        title: 'Usuário Rejeitado',
        description: `A solicitação de ${u.name} foi recusada.`,
      })
    } catch (err) {
      console.error('Erro ao rejeitar usuário:', err)
      toast({
        title: 'Erro ao rejeitar usuário',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleRoleChange = async (u: UserProfile, newRole: UserRole) => {
    if (u.id === currentUser?.id && newRole !== 'admin') {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode remover seu próprio papel de Administrador.',
        variant: 'destructive',
      })
      return
    }

    try {
      setProcessingId(u.id)
      await usersService.updateUserRole(u.id, newRole)
      setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, role: newRole } : item)))
      toast({
        title: 'Papel atualizado',
        description: `${u.name} agora possui perfil de "${newRole === 'admin' ? 'Administrador' : 'Usuário Comum'}".`,
      })
    } catch (err) {
      console.error('Erro ao mudar papel:', err)
      toast({
        title: 'Erro ao atualizar papel',
        description: 'Não foi possível alterar a permissão do usuário.',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    if (userToDelete.id === currentUser?.id) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode excluir a sua própria conta logada.',
        variant: 'destructive',
      })
      setUserToDelete(null)
      return
    }

    try {
      setProcessingId(userToDelete.id)
      await usersService.deleteUser(userToDelete.id)
      setUsers((prev) => prev.filter((item) => item.id !== userToDelete.id))
      toast({
        title: 'Usuário excluído',
        description: 'O cadastro foi removido com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao excluir usuário:', err)
      toast({
        title: 'Erro ao excluir usuário',
        description: 'Não foi possível remover o registro.',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
      setUserToDelete(null)
    }
  }

  const handleConfirmResetPassword = async () => {
    if (!userToReset) return
    if (userToReset.id === currentUser?.id) {
      toast({
        title: 'Ação não permitida',
        description:
          'Você não pode redefinir a própria senha através desta função para evitar bloqueio acidental.',
        variant: 'destructive',
      })
      setUserToReset(null)
      return
    }

    try {
      setProcessingId(userToReset.id)
      const res = await usersService.resetUserPassword(userToReset.id)
      setUsers((prev) =>
        prev.map((item) => (item.id === res.user.id ? { ...item, ...res.user } : item)),
      )
      setResetModalResult({
        user: res.user,
        provisionalPassword: res.provisionalPassword,
      })
      setUserToReset(null)
      setHasCopiedPassword(false)
      toast({
        title: 'Senha redefinida com sucesso!',
        description: `Uma senha provisória foi gerada para ${res.user.name}.`,
      })
    } catch (err) {
      console.error('Erro ao redefinir senha do usuário:', err)
      toast({
        title: 'Erro ao redefinir senha',
        description: 'Não foi possível gerar a nova senha provisória.',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleCopyPassword = async () => {
    if (!resetModalResult?.provisionalPassword) return
    try {
      await navigator.clipboard.writeText(resetModalResult.provisionalPassword)
      setHasCopiedPassword(true)
      toast({
        title: 'Senha copiada!',
        description: 'Senha provisória copiada para a área de transferência.',
      })
      setTimeout(() => setHasCopiedPassword(false), 3000)
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Selecione e copie a senha manualmente.',
        variant: 'destructive',
      })
    }
  }

  // Filtered lists
  const pendentesList = useMemo(
    () => users.filter((u) => !u.approved || u.approvalStatus === 'pendente'),
    [users],
  )
  const aprovadosList = useMemo(
    () => users.filter((u) => u.approved && u.approvalStatus === 'aprovado'),
    [users],
  )

  const displayedList = useMemo(() => {
    let base = users
    if (activeTab === 'pendentes') {
      base = pendentesList
    } else if (activeTab === 'aprovados') {
      base = aprovadosList
    }

    if (!searchQuery.trim()) return base
    const q = searchQuery.toLowerCase()
    return base.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q),
    )
  }, [users, activeTab, pendentesList, aprovadosList, searchQuery])

  return (
    <div className="animate-page-enter space-y-6 pb-16 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] sm:text-[28px] font-bold text-[#102A43] tracking-tight leading-tight">
              Controle de Usuários & Aprovações
            </h1>
            <Badge className="bg-[#E8F1F8] text-[#004B8D] hover:bg-[#E8F1F8] border-0 text-xs font-semibold">
              Área Restrita Admin
            </Badge>
          </div>
          <p className="text-sm text-[#486581] mt-0.5">
            Gerencie os acessos, aprove novos fiscais e defina os papéis de permissão no CREA-PI
          </p>
        </div>

        <Button
          variant="outline"
          onClick={loadUsers}
          disabled={isLoading}
          className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] self-start sm:self-auto h-9 text-xs font-semibold gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar lista
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#D3DFE9] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <Clock className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#102A43]">{pendentesList.length}</div>
            <div className="text-xs font-semibold text-[#486581]">Aguardando aprovação</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#D3DFE9] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <UserCheck className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#102A43]">{aprovadosList.length}</div>
            <div className="text-xs font-semibold text-[#486581]">Usuários ativos aprovados</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#D3DFE9] shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#E8F1F8] text-[#004B8D] flex items-center justify-center shrink-0 border border-[#004B8D]/20">
            <Shield className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#102A43]">
              {users.filter((u) => u.role === 'admin').length}
            </div>
            <div className="text-xs font-semibold text-[#486581]">Administradores totais</div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#D3DFE9] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-stretch sm:items-center">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'pendentes' | 'aprovados' | 'todos')}
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-[#E8F1F8] p-1 rounded-lg border border-[#D3DFE9]/80 h-auto w-full sm:w-auto grid grid-cols-3">
              <TabsTrigger
                value="pendentes"
                className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs py-1.5 px-3 rounded-md"
              >
                Pendentes ({pendentesList.length})
              </TabsTrigger>
              <TabsTrigger
                value="aprovados"
                className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs py-1.5 px-3 rounded-md"
              >
                Aprovados ({aprovadosList.length})
              </TabsTrigger>
              <TabsTrigger
                value="todos"
                className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs py-1.5 px-3 rounded-md"
              >
                Todos ({users.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs border-[#D3DFE9] focus-visible:ring-[#004B8D]"
            />
          </div>
        </div>

        {/* User list */}
        {isLoading ? (
          <div className="py-16 text-center text-[#486581]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#004B8D] mb-2" />
            <p className="text-xs font-semibold">Carregando usuários do sistema...</p>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="py-12 text-center text-[#486581] border border-dashed border-[#D3DFE9] rounded-xl bg-slate-50/50">
            <Users className="w-10 h-10 mx-auto text-[#829AB1] mb-2 stroke-[1.5]" />
            <p className="text-sm font-bold text-[#102A43]">Nenhum usuário encontrado</p>
            <p className="text-xs text-[#627D98] mt-0.5">
              Não há registros para a aba ou busca selecionada no momento.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#D3DFE9]/80 border border-[#D3DFE9] rounded-xl overflow-hidden">
            {displayedList.map((u) => {
              const isPendente = !u.approved || u.approvalStatus === 'pendente'
              const isRejeitado = u.approvalStatus === 'rejeitado'
              const isAprovado = u.approved && u.approvalStatus === 'aprovado'
              const isSelf = u.id === currentUser?.id
              const isBusy = processingId === u.id

              return (
                <div
                  key={u.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isPendente
                      ? 'bg-amber-50/40 hover:bg-amber-50/70'
                      : 'bg-white hover:bg-slate-50/70'
                  }`}
                >
                  {/* Left: User Identity */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                        u.role === 'admin'
                          ? 'bg-[#004B8D] text-white'
                          : 'bg-[#E8F1F8] text-[#004B8D]'
                      }`}
                    >
                      {u.name
                        ? u.name
                            .split(' ')
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join('')
                            .toUpperCase()
                        : 'U'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#102A43]">{u.name}</span>
                        {isSelf && (
                          <Badge className="bg-[#E5A812] text-[#102A43] hover:bg-[#E5A812] text-[10px] font-bold px-1.5 py-0">
                            Você
                          </Badge>
                        )}

                        {/* Status Badge */}
                        {isAprovado && (
                          <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-semibold gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Aprovado
                          </Badge>
                        )}
                        {isPendente && (
                          <Badge className="bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-semibold gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Aguardando Aprovação
                          </Badge>
                        )}
                        {isRejeitado && (
                          <Badge className="bg-rose-50 text-rose-800 border border-rose-300 text-[11px] font-semibold gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Rejeitado
                          </Badge>
                        )}
                        {u.mustChangePassword && (
                          <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold gap-1">
                            <KeyRound className="w-3 h-3 text-amber-700" />
                            Troca de senha pendente
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-[#486581] flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1 font-mono">
                          <Mail className="w-3.5 h-3.5 text-[#004B8D]" />
                          {u.email}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-[#627D98]" />
                          Cadastrado em {new Date(u.created).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions & Role Selector */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                    {/* Role selector for admin */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#627D98] hidden sm:inline">
                        Papel:
                      </span>
                      <Select
                        value={u.role}
                        onValueChange={(val) => handleRoleChange(u, val as UserRole)}
                        disabled={isBusy}
                      >
                        <SelectTrigger className="h-8 text-xs font-semibold w-36 border-[#D3DFE9] bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usuario">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              Usuário Comum
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#004B8D]" />
                              Administrador
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Approve / Reject Actions */}
                    {isPendente && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(u)}
                          disabled={isBusy}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 gap-1 shadow-xs cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(u)}
                          disabled={isBusy}
                          className="border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs h-8 px-3 gap-1 cursor-pointer"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Rejeitar
                        </Button>
                      </div>
                    )}

                    {isRejeitado && (
                      <Button
                        size="sm"
                        onClick={() => handleApprove(u)}
                        disabled={isBusy}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Reativar / Aprovar
                      </Button>
                    )}

                    {/* Redefinir Senha button (except self) */}
                    {!isSelf && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUserToReset(u)}
                        disabled={isBusy}
                        className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold text-xs h-8 px-2.5 gap-1.5 cursor-pointer"
                        title="Redefinir senha com provisória"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#004B8D]" />
                        <span className="hidden sm:inline">Redefinir Senha</span>
                        <span className="sm:hidden">Reset</span>
                      </Button>
                    )}

                    {/* Delete button (except self) */}
                    {!isSelf && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setUserToDelete(u)}
                        disabled={isBusy}
                        className="text-[#829AB1] hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0 cursor-pointer"
                        title="Excluir usuário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={!!userToReset} onOpenChange={(open) => !open && setUserToReset(null)}>
        <AlertDialogContent className="border-[#D3DFE9] bg-white max-w-md">
          <AlertDialogHeader>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#004B8D] border border-blue-100 flex items-center justify-center mb-1">
              <KeyRound className="w-6 h-6 stroke-[2]" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-[#102A43]">
              Redefinir Senha de Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#486581] space-y-2">
              <p>
                Deseja gerar uma nova senha provisória para{' '}
                <strong className="text-[#102A43]">{userToReset?.name}</strong> (
                {userToReset?.email})?
              </p>
              <div className="bg-[#E8F1F8] p-3 rounded-lg border border-[#004B8D]/20 text-xs text-[#004B8D]">
                <p className="font-semibold mb-1">Como funciona:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#102A43]">
                  <li>Uma senha aleatória e segura será gerada imediatamente.</li>
                  <li>O usuário será obrigado a criar uma nova senha pessoal no próximo login.</li>
                  <li>
                    O acesso às telas do sistema fica bloqueado até a definição da nova senha.
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D3DFE9] text-[#486581]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmResetPassword}
              className="bg-[#004B8D] hover:bg-[#003666] text-white font-semibold cursor-pointer"
            >
              Confirmar Redefinição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Provisional Password Display Dialog */}
      <Dialog open={!!resetModalResult} onOpenChange={(open) => !open && setResetModalResult(null)}>
        <DialogContent className="border-[#D3DFE9] bg-white sm:max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mb-1">
              <CheckCircle2 className="w-7 h-7 stroke-[2]" />
            </div>
            <DialogTitle className="text-lg font-bold text-[#102A43]">
              Senha Provisória Gerada
            </DialogTitle>
            <DialogDescription className="text-xs text-[#486581]">
              A senha do usuário foi redefinida. Copie e envie os dados abaixo com segurança para o
              usuário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-[#D3DFE9] space-y-2">
              <div className="text-xs text-[#627D98]">
                Usuário: <strong className="text-[#102A43]">{resetModalResult?.user.name}</strong>
              </div>
              <div className="text-xs text-[#627D98]">
                E-mail:{' '}
                <span className="font-mono text-[#102A43]">{resetModalResult?.user.email}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#102A43] flex items-center justify-between">
                <span>Senha Provisória (Válida apenas para o 1º acesso):</span>
                <span className="text-[11px] font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Uso temporário
                </span>
              </label>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-amber-50/70 border-2 border-amber-300/80 rounded-xl px-3.5 py-2.5 font-mono text-base font-bold text-[#102A43] tracking-widest text-center select-all">
                  {resetModalResult?.provisionalPassword}
                </div>
                <Button
                  type="button"
                  onClick={handleCopyPassword}
                  className={`h-11 px-4 font-semibold text-xs gap-1.5 transition-colors cursor-pointer ${
                    hasCopiedPassword
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-[#004B8D] hover:bg-[#003666] text-white'
                  }`}
                >
                  {hasCopiedPassword ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-1">Aviso de Segurança:</p>
              Ao entrar no aplicativo com esta senha provisória, o sistema irá bloquear o acesso e
              exigir que o usuário cadastre sua própria senha definitiva imediatamente.
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setResetModalResult(null)}
              className="w-full bg-[#102A43] hover:bg-[#243B53] text-white font-semibold text-xs h-9"
            >
              Concluir e Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="border-[#D3DFE9] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#102A43]">
              Excluir Cadastro de Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#486581]">
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong> (
              {userToDelete?.email})? O acesso será revogado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D3DFE9] text-[#486581]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
