import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Building2,
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Download,
  Smartphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { usePwa } from '@/hooks/use-pwa'
import { useToast } from '@/hooks/use-toast'
import logoCreaPi from '@/assets/creapi-a5c20.png'

export default function Login() {
  const { login, register, isAuthenticated, isApproved, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { isInstallable, installApp } = usePwa()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  // Auto redirect if already logged in and approved
  React.useEffect(() => {
    if (isAuthenticated) {
      if (isApproved) {
        if (isAdmin) {
          navigate('/hospitais', { replace: true })
        } else {
          navigate('/tipos-empreendimento', { replace: true })
        }
      } else {
        navigate('/aguardando-aprovacao', { replace: true })
      }
    }
  }, [isAuthenticated, isApproved, isAdmin, navigate])

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail.trim() || !loginPassword) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe seu e-mail e senha cadastrados.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsLoggingIn(true)
      const user = await login(loginEmail, loginPassword)
      toast({
        title: `Bem-vindo, ${user.name}!`,
        description: 'Autenticação realizada com sucesso.',
      })

      if (!user.approved && user.approvalStatus !== 'aprovado') {
        navigate('/aguardando-aprovacao')
      } else if (user.role === 'admin') {
        navigate('/hospitais')
      } else {
        navigate('/tipos-empreendimento')
      }
    } catch (err: any) {
      console.error('Erro de login:', err)
      toast({
        title: 'Falha no login',
        description: 'E-mail ou senha incorretos. Verifique suas credenciais.',
        variant: 'destructive',
      })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!regName.trim() || !regEmail.trim() || !regPassword || !regPasswordConfirm) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos para solicitar seu cadastro.',
        variant: 'destructive',
      })
      return
    }

    if (regPassword.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve conter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (regPassword !== regPasswordConfirm) {
      toast({
        title: 'Senhas não conferem',
        description: 'A confirmação de senha deve ser idêntica à senha digitada.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsRegistering(true)
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        passwordConfirm: regPasswordConfirm,
      })

      setRegistrationSuccess(true)
      toast({
        title: 'Cadastro solicitado!',
        description:
          'Sua conta foi criada e está aguardando aprovação do administrador do CREA-PI.',
      })
    } catch (err: any) {
      console.error('Erro de cadastro:', err)
      toast({
        title: 'Erro ao cadastrar',
        description:
          err?.message || 'Não foi possível concluir o cadastro. O e-mail já pode estar em uso.',
        variant: 'destructive',
      })
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Decor */}
      <div className="w-full max-w-md">
        {/* Branding CREA-PI */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-[#004B8D] rounded-2xl shadow-md border border-[#003666] mb-4">
            <img src={logoCreaPi} alt="CREA-PI" className="h-14 sm:h-16 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#102A43] tracking-tight">Fiscalização</h1>
          <p className="text-sm text-[#486581] mt-1">
            CREA-PI • Sistema integrado de fiscalização por empreendimento
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl border border-[#D3DFE9] shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Quick Demo Credentials Banner */}
          <div className="bg-[#E8F1F8] border-b border-[#004B8D]/20 px-5 py-3 text-xs text-[#004B8D]">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-[#004B8D]" />
              Acesso Rápido para Demonstração:
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#102A43]">
              <div
                onClick={() => {
                  setLoginEmail('admin@creapi.org.br')
                  setLoginPassword('Skip@Pass')
                  setActiveTab('login')
                }}
                className="bg-white p-2 rounded border border-[#004B8D]/30 cursor-pointer hover:bg-blue-50/50 transition-colors"
              >
                <div className="font-bold text-[#004B8D]">Perfil Administrador</div>
                <div className="font-mono text-[10px] text-[#486581]">admin@creapi.org.br</div>
                <div className="text-[10px] text-emerald-700 font-semibold">
                  Vê tudo + Aprovações
                </div>
              </div>

              <div
                onClick={() => {
                  setLoginEmail('fiscal@creapi.org.br')
                  setLoginPassword('Skip@Pass')
                  setActiveTab('login')
                }}
                className="bg-white p-2 rounded border border-[#004B8D]/30 cursor-pointer hover:bg-blue-50/50 transition-colors"
              >
                <div className="font-bold text-[#004B8D]">Perfil Usuário Fiscal</div>
                <div className="font-mono text-[10px] text-[#486581]">fiscal@creapi.org.br</div>
                <div className="text-[10px] text-blue-700 font-semibold">Tipos + Vistorias</div>
              </div>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as 'login' | 'register')
              setRegistrationSuccess(false)
            }}
          >
            <TabsList className="grid grid-cols-2 bg-[#F4F6F9] border-b border-[#D3DFE9] rounded-none p-1 h-12">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-white data-[state=active]:text-[#004B8D] data-[state=active]:shadow-xs font-bold text-sm"
              >
                Entrar na conta
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-white data-[state=active]:text-[#004B8D] data-[state=active]:shadow-xs font-bold text-sm"
              >
                Solicitar cadastro
              </TabsTrigger>
            </TabsList>

            {/* TAB: LOGIN */}
            <TabsContent value="login" className="p-6 pt-5 m-0 space-y-5">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold text-[#102A43]">
                    E-mail institucional / cadastrado
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 border-[#D3DFE9] focus-visible:ring-[#004B8D] h-10 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-bold text-[#102A43]">
                      Senha de acesso
                    </Label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 border-[#D3DFE9] focus-visible:ring-[#004B8D] h-10 text-sm"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-[#004B8D] hover:bg-[#003666] text-white font-bold h-11 text-sm shadow-sm mt-2 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Autenticando...
                    </>
                  ) : (
                    <>
                      Acessar Sistema
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* TAB: REGISTER */}
            <TabsContent value="register" className="p-6 pt-5 m-0 space-y-5">
              {registrationSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#102A43]">Cadastro Solicitado!</h3>
                    <p className="text-xs text-[#486581] mt-1.5 leading-relaxed">
                      Sua solicitação foi registrada com sucesso. Por normas de segurança do
                      CREA-PI, seu acesso requer{' '}
                      <strong>aprovação obrigatória do administrador</strong> antes de liberar a
                      visualização das telas.
                    </p>
                  </div>
                  <div className="bg-[#F4F6F9] p-3.5 rounded-xl border border-[#D3DFE9] text-xs text-[#102A43] text-left">
                    <p className="font-semibold mb-1">O que acontece agora?</p>
                    <p className="text-[#486581]">
                      Você já pode fazer login para acompanhar o status da sua aprovação. Assim que
                      o administrador validar, seu acesso será liberado automaticamente.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setActiveTab('login')
                      setRegistrationSuccess(false)
                    }}
                    className="w-full bg-[#004B8D] hover:bg-[#003666] text-white font-semibold h-10 text-sm"
                  >
                    Ir para tela de Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Aprovação obrigatória:</strong> novos cadastros são revisados pela
                      administração do CREA-PI antes de obter acesso ao sistema.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-name" className="text-xs font-bold text-[#102A43]">
                      Nome Completo
                    </Label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="Ex: Eng. João da Silva"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="pl-10 border-[#D3DFE9] focus-visible:ring-[#004B8D] h-10 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="text-xs font-bold text-[#102A43]">
                      E-mail Profissional
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="joao.silva@creapi.org.br"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="pl-10 border-[#D3DFE9] focus-visible:ring-[#004B8D] h-10 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-pass" className="text-xs font-bold text-[#102A43]">
                      Senha (mínimo 8 caracteres)
                    </Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="reg-pass"
                        type="password"
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="pl-10 border-[#D3DFE9] focus-visible:ring-[#004B8D] h-10 text-sm"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-pass-conf" className="text-xs font-bold text-[#102A43]">
                      Confirmar Senha
                    </Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="reg-pass-conf"
                        type="password"
                        placeholder="••••••••"
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        className="pl-10 border-[#D3DFE9] focus-visible:ring-[#004B8D] h-10 text-sm"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full bg-[#004B8D] hover:bg-[#003666] text-white font-bold h-11 text-sm shadow-sm mt-2 cursor-pointer"
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        Enviar Solicitação de Cadastro
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* PWA Install Banner on Login if installable */}
        {isInstallable && (
          <div className="mt-4 p-3 bg-white rounded-xl border border-[#D3DFE9] shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#004B8D] text-white flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-[#E5A812]" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#102A43]">Instalar no celular / desktop</p>
                <p className="text-[10px] text-[#627D98]">Acesso rápido direto da tela inicial</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={installApp}
              className="h-7 px-2.5 text-xs bg-[#004B8D] hover:bg-[#003666] text-white font-semibold cursor-pointer"
            >
              <Download className="w-3 h-3 mr-1" />
              Instalar
            </Button>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-[#627D98]">
          Sistema Oficial de Fiscalização • CREA-PI &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
