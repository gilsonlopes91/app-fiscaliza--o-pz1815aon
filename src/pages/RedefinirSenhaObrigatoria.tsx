import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import logoCreaPi from '@/assets/creapi-a5c20.png'

export default function RedefinirSenhaObrigatoria() {
  const { user, mustChangePassword, changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    document.title = 'Redefinição Obrigatória de Senha · CREA-PI'
  }, [])

  // Se o usuário já não precisa redefinir a senha, manda para o fluxo normal
  useEffect(() => {
    if (user && !mustChangePassword && !isDone) {
      if (user.role === 'admin') {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/tipos-empreendimento', { replace: true })
      }
    }
  }, [user, mustChangePassword, isDone, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe e confirme a nova senha para continuar.',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A nova senha deve possuir no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas divergentes',
        description: 'A confirmação de senha deve ser idêntica à nova senha digitada.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await changePassword(newPassword, confirmPassword)
      setIsDone(true)

      toast({
        title: 'Senha atualizada com sucesso!',
        description: 'Sua nova senha pessoal foi cadastrada com sucesso.',
      })

      // Faz logout automático da sessão provisória para segurança e redireciona para login
      setTimeout(() => {
        logout()
        navigate('/login', {
          replace: true,
          state: {
            message: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
          },
        })
      }, 1500)
    } catch (err: any) {
      console.error('Erro ao trocar senha obrigatória:', err)
      toast({
        title: 'Erro ao cadastrar senha',
        description:
          err?.message || 'Não foi possível salvar a nova senha no momento. Tente novamente.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  const handleCancelAndLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Branding CREA-PI */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-[#004B8D] rounded-2xl shadow-md border border-[#003666] mb-4">
            <img src={logoCreaPi} alt="CREA-PI" className="h-14 sm:h-16 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#102A43] tracking-tight">
            Redefinição de Senha Obrigatória
          </h1>
          <p className="text-sm text-[#486581] mt-1">
            CREA-PI • Primeiro acesso ou reset de credencial
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl border border-[#D3DFE9] shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden p-6 sm:p-7 space-y-5">
          {isDone ? (
            <div className="text-center py-6 space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#102A43]">Senha Definida com Sucesso!</h3>
                <p className="text-xs text-[#486581] mt-1.5 leading-relaxed">
                  A sua senha provisória foi desativada. Redirecionando para a tela de autenticação
                  para você entrar com sua nova senha...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#004B8D]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando tela de login...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Alerta de obrigatoriedade */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5 text-amber-700">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-amber-950">Ação Obrigatória de Segurança</p>
                  <p className="leading-relaxed text-[11px] text-amber-800">
                    Sua conta está utilizando uma <strong>senha provisória</strong> gerada pelo
                    administrador. Para liberar o acesso ao sistema, cadastre uma nova senha pessoal
                    e intransferível.
                  </p>
                </div>
              </div>

              {/* Informações da conta */}
              <div className="bg-slate-50 p-3 rounded-xl border border-[#D3DFE9] text-xs text-[#627D98] flex items-center justify-between">
                <span>
                  Logado como: <strong className="text-[#102A43]">{user?.name}</strong>
                </span>
                <span className="font-mono text-[11px] text-[#486581]">{user?.email}</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-bold text-[#102A43]">
                    Nova Senha Pessoal (mínimo 8 caracteres)
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10 border-[#D3DFE9] focus-visible:ring-[#004B8D] h-10 text-sm"
                      required
                      minLength={8}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#829AB1] hover:text-[#102A43] p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-bold text-[#102A43]">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 border-[#D3DFE9] focus-visible:ring-[#004B8D] h-10 text-sm"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div className="bg-[#E8F1F8] p-3 rounded-lg border border-[#004B8D]/20 text-[11px] text-[#004B8D] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#004B8D]" />
                    Recomendações:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[#102A43]">
                    <li>Mínimo de 8 caracteres</li>
                    <li>Utilize combinação de letras e números</li>
                    <li>Não compartilhe sua nova senha com terceiros</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#004B8D] hover:bg-[#003666] text-white font-bold h-11 text-sm shadow-sm mt-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando nova senha...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Salvar Senha e Concluir
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelAndLogout}
                  disabled={isSubmitting}
                  className="w-full text-[#486581] hover:text-[#102A43] hover:bg-slate-100 text-xs h-9 gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair da sessão atual
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6 text-xs text-[#627D98]">
          Sistema Oficial de Fiscalização • CREA-PI &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
