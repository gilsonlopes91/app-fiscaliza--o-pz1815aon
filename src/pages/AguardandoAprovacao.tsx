import { useNavigate } from 'react-router-dom'
import { Clock, ShieldAlert, RefreshCw, LogOut, Mail, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import logoCreaPi from '@/assets/creapi-a5c20.png'

export default function AguardandoAprovacao() {
  const { user, logout, refreshUser, isApproved, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleCheckStatus = async () => {
    await refreshUser()
    if (isApproved) {
      toast({
        title: 'Acesso Liberado!',
        description: 'Sua conta foi aprovada pelo administrador do CREA-PI.',
      })
      if (isAdmin) {
        navigate('/hospitais')
      } else {
        navigate('/tipos-empreendimento')
      }
    } else {
      toast({
        title: 'Status atual',
        description:
          user?.approvalStatus === 'rejeitado'
            ? 'Sua solicitação de acesso foi rejeitada pela administração.'
            : 'Sua solicitação ainda está aguardando revisão do administrador.',
      })
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isRejeitado = user?.approvalStatus === 'rejeitado'

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        {/* Branding CREA-PI */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-[#004B8D] rounded-2xl shadow-md border border-[#003666] mb-4">
            <img src={logoCreaPi} alt="CREA-PI" className="h-14 sm:h-16 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#102A43] tracking-tight">Fiscalização</h1>
          <p className="text-sm text-[#486581] mt-1">CREA-PI • Controle de Acesso e Segurança</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#D3DFE9] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 sm:p-8 text-center space-y-6">
          {isRejeitado ? (
            <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <XCircle className="w-10 h-10 stroke-[2]" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-10 h-10 stroke-[2] animate-pulse" />
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#102A43]">
              {isRejeitado
                ? 'Solicitação de Acesso Não Aprovada'
                : 'Aguardando Aprovação do Administrador'}
            </h2>
            <p className="text-sm text-[#486581] max-w-md mx-auto leading-relaxed">
              {isRejeitado
                ? 'Seu cadastro foi revisado e não foi aprovado pelo administrador do CREA-PI. Entre em contato com a equipe de fiscalização caso considere um equívoco.'
                : 'O seu usuário foi registrado no banco de dados com sucesso, porém o sistema de fiscalização do CREA-PI exige aprovação prévia e ativação pelo administrador.'}
            </p>
          </div>

          {/* User Info Box */}
          <div className="bg-[#F4F6F9] rounded-xl p-4 border border-[#D3DFE9] text-left space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#004B8D]">
              Dados da sua solicitação
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#627D98] block">Nome:</span>
                <span className="font-bold text-[#102A43]">{user?.name || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[#627D98] block">E-mail:</span>
                <span className="font-mono text-[#102A43] font-semibold">{user?.email}</span>
              </div>
              <div>
                <span className="text-[#627D98] block">Papel solicitado:</span>
                <span className="text-[#102A43] capitalize font-semibold">
                  {user?.role || 'Usuário'}
                </span>
              </div>
              <div>
                <span className="text-[#627D98] block">Situação:</span>
                <span
                  className={`font-bold inline-flex items-center gap-1 ${
                    isRejeitado ? 'text-rose-600' : 'text-amber-700'
                  }`}
                >
                  {isRejeitado ? 'Rejeitado' : 'Pendente de aprovação'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleCheckStatus}
              className="bg-[#004B8D] hover:bg-[#003666] text-white font-semibold shadow-sm h-10 px-5 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Verificar se já fui aprovado
            </Button>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-[#D3DFE9] text-[#486581] hover:text-[#102A43] h-10 px-4 gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </Button>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-[#627D98]">
          Dúvidas? Entre em contato com a Divisão de Fiscalização do CREA-PI.
        </div>
      </div>
    </div>
  )
}
