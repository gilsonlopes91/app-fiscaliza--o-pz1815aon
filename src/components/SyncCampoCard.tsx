import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CloudDownload,
  CloudUpload,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  HardDrive,
  Image as ImageIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useOnlineStatus } from '@/hooks/use-online-status'
import {
  sincronizarParaCampo,
  lerResumoOffline,
  enviarPendencias,
  hospitaisOffline,
  ResumoOffline,
} from '@/services/offlineSync'
import { formatarBytes } from '@/lib/offlineDb'

/**
 * Cartão "Preparar para campo": baixa as unidades do fiscal para o celular e
 * cuida da fila de respostas e fotos que ficaram aguardando rede.
 */
export function SyncCampoCard() {
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const online = useOnlineStatus()

  const [resumo, setResumo] = useState<ResumoOffline | null>(null)
  const [municipios, setMunicipios] = useState<string[]>([])
  const [isSincronizando, setIsSincronizando] = useState(false)
  const [isEnviando, setIsEnviando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [progressoEnvio, setProgressoEnvio] = useState(0)

  const atualizarResumo = useCallback(async () => {
    try {
      const dados = await lerResumoOffline()
      setResumo(dados)
      const unidades = await hospitaisOffline()
      const lista = Array.from(new Set(unidades.map((h) => h.municipio).filter(Boolean))).sort()
      setMunicipios(lista)
    } catch (err) {
      console.warn('Não foi possível ler o resumo offline:', err)
    }
  }, [])

  useEffect(() => {
    atualizarResumo()
  }, [atualizarResumo])

  const handleEnviar = useCallback(
    async (silencioso = false) => {
      if (!online || isEnviando) return
      const pendentes = resumo?.pendentes || 0
      if (pendentes === 0) return

      try {
        setIsEnviando(true)
        setProgressoEnvio(0)

        const resultado = await enviarPendencias((atual, total) => {
          setProgressoEnvio(Math.round((atual / total) * 100))
        })

        await atualizarResumo()

        if (resultado.falhas > 0) {
          toast({
            title: `${resultado.enviados} enviado(s), ${resultado.falhas} com falha`,
            description: resultado.mensagemErro || 'As pendências que falharam continuam na fila.',
            variant: 'destructive',
          })
        } else if (resultado.enviados > 0) {
          toast({
            title: 'Fila enviada',
            description: `${resultado.enviados} registro(s) sincronizado(s) com o servidor.`,
          })
        }
      } catch (err) {
        console.error('Erro ao enviar pendências:', err)
        if (!silencioso) {
          toast({
            title: 'Erro ao enviar',
            description: 'Não foi possível enviar a fila agora. Tente novamente.',
            variant: 'destructive',
          })
        }
      } finally {
        setIsEnviando(false)
        setProgressoEnvio(0)
      }
    },
    [online, isEnviando, resumo?.pendentes, atualizarResumo, toast],
  )

  // Assim que a rede volta, tenta esvaziar a fila sozinho
  useEffect(() => {
    if (online && (resumo?.pendentes || 0) > 0 && !isEnviando) {
      handleEnviar(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const handleSincronizar = async () => {
    if (!user?.id) return

    try {
      setIsSincronizando(true)
      setMensagem('Iniciando...')

      const dados = await sincronizarParaCampo({
        fiscalId: user.id,
        isAdmin,
        onProgress: (m) => setMensagem(m),
      })

      setResumo(dados)
      const unidades = await hospitaisOffline()
      setMunicipios(Array.from(new Set(unidades.map((h) => h.municipio).filter(Boolean))).sort())

      toast({
        title: 'Pronto para campo',
        description: `${dados.hospitais} unidade(s) e ${dados.subitens} itens de checklist disponíveis sem internet.`,
      })
    } catch (err) {
      console.error('Erro ao sincronizar para campo:', err)
      toast({
        title: 'Não foi possível sincronizar',
        description: err instanceof Error ? err.message : 'Verifique sua conexão e tente de novo.',
        variant: 'destructive',
      })
    } finally {
      setIsSincronizando(false)
      setMensagem('')
    }
  }

  const pendentes = resumo?.pendentes || 0
  const fotosPendentes = resumo?.fotosPendentes || 0
  const temDados = (resumo?.hospitais || 0) > 0

  const ultimaSyncTexto = resumo?.ultimaSync
    ? new Date(resumo.ultimaSync).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="bg-white rounded-2xl border border-[#D3DFE9] shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-[#D3DFE9] bg-[#F4F6F9] flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[#102A43] flex items-center gap-2">
            <CloudDownload className="w-5 h-5 text-[#004B8D]" />
            Trabalho em campo (offline)
          </h3>
          <p className="text-xs text-[#486581] mt-0.5">
            Baixe suas unidades antes de viajar. Sem sinal, o app continua funcionando e envia tudo
            quando a rede voltar.
          </p>
        </div>

        <Badge
          className={`shrink-0 text-[11px] font-bold gap-1 border ${
            online
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-900 border-amber-300'
          }`}
        >
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? 'Conectado' : 'Sem conexão'}
        </Badge>
      </div>

      <div className="p-5 space-y-4">
        {/* Estado atual dos dados baixados */}
        {temDados ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-[#D3DFE9] bg-[#F4F6F9] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#627D98]">
                Unidades
              </div>
              <div className="text-xl font-bold text-[#102A43]">{resumo?.hospitais}</div>
            </div>
            <div className="rounded-xl border border-[#D3DFE9] bg-[#F4F6F9] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#627D98]">
                Itens de checklist
              </div>
              <div className="text-xl font-bold text-[#102A43]">{resumo?.subitens}</div>
            </div>
            <div className="rounded-xl border border-[#D3DFE9] bg-[#F4F6F9] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#627D98]">
                Vistorias
              </div>
              <div className="text-xl font-bold text-[#102A43]">{resumo?.vistorias}</div>
            </div>
            <div className="rounded-xl border border-[#D3DFE9] bg-[#F4F6F9] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#627D98]">
                Respostas
              </div>
              <div className="text-xl font-bold text-[#102A43]">{resumo?.itens}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#004B8D]/35 bg-[#F4F6F9] p-4 text-center">
            <p className="text-sm font-bold text-[#102A43]">Nada baixado ainda</p>
            <p className="text-xs text-[#627D98] mt-0.5">
              Sincronize enquanto tem sinal para conseguir fiscalizar fora de área.
            </p>
          </div>
        )}

        {ultimaSyncTexto && (
          <p className="text-[11px] text-[#627D98] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Última sincronização em {ultimaSyncTexto}
          </p>
        )}

        {/* Fila pendente */}
        {pendentes > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 space-y-2.5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-900">
                  {pendentes} registro(s) aguardando envio
                </p>
                {fotosPendentes > 0 && (
                  <p className="text-xs text-amber-800 flex items-center gap-1 mt-0.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {fotosPendentes} foto(s) ainda no aparelho — não desinstale o app nem limpe os
                    dados do navegador antes de enviar.
                  </p>
                )}
              </div>
            </div>

            {isEnviando && <Progress value={progressoEnvio} className="h-2 bg-amber-200" />}

            <Button
              type="button"
              size="sm"
              onClick={() => handleEnviar(false)}
              disabled={!online || isEnviando}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 text-xs cursor-pointer gap-1.5"
            >
              {isEnviando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enviando... {progressoEnvio}%
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  {online ? 'Enviar agora' : 'Aguardando rede'}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Lembrete do mapa offline */}
        {municipios.length > 0 && (
          <div className="rounded-xl border border-[#004B8D]/20 bg-[#E8F1F8] p-3.5">
            <p className="text-xs font-bold text-[#004B8D] flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              Antes de viajar, baixe o mapa no app do Google Maps
            </p>
            <p className="text-[11px] text-[#334E68] mt-1 leading-relaxed">
              As coordenadas ficam salvas aqui, mas o mapa em si é do Google. No app do Google Maps,
              use &ldquo;Mapas off-line&rdquo; e baixe as regiões de:{' '}
              <strong>{municipios.join(', ')}</strong>.
            </p>
          </div>
        )}

        {/* Espaço em disco */}
        {resumo?.espaco && resumo.espaco.total > 0 && (
          <p className="text-[11px] text-[#829AB1] flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            {formatarBytes(resumo.espaco.usado)} usados de {formatarBytes(resumo.espaco.total)}{' '}
            disponíveis no aparelho
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button
            type="button"
            onClick={handleSincronizar}
            disabled={!online || isSincronizando}
            className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold h-10 px-5 shadow-sm cursor-pointer gap-2 flex-1 sm:flex-none"
          >
            {isSincronizando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mensagem || 'Sincronizando...'}
              </>
            ) : (
              <>
                <CloudDownload className="w-4 h-4" />
                {temDados ? 'Atualizar dados de campo' : 'Preparar para campo'}
              </>
            )}
          </Button>
        </div>

        {!online && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 leading-relaxed">
            Você está sem conexão. O app está usando os dados baixados na última sincronização —
            tudo que responder agora fica guardado no aparelho e sobe sozinho quando o sinal voltar.
          </p>
        )}
      </div>
    </div>
  )
}
