import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sprout, Beef, Factory, Check, Loader2, Save, Info, ShieldCheck } from 'lucide-react'
import {
  CULTURAS,
  CRIACOES,
  ESTRUTURAS,
  CaracterizacaoAgro,
  OpcaoCaracterizacao,
  caracterizacaoPreenchida,
} from '@/lib/caracterizacaoAgro'

interface CaracterizacaoAgroSectionProps {
  valor: CaracterizacaoAgro
  onChange: (valor: CaracterizacaoAgro) => void
  onSalvar: () => void
  isReadOnly?: boolean
  isSaving?: boolean
  /** Nomes dos temas que serão dispensados com a marcação atual. */
  temasDispensados: string[]
  totalTemas: number
}

function GrupoChips({
  titulo,
  descricao,
  icone,
  opcoes,
  selecionados,
  onToggle,
  isReadOnly,
}: {
  titulo: string
  descricao: string
  icone: React.ReactNode
  opcoes: OpcaoCaracterizacao[]
  selecionados: string[]
  onToggle: (id: string) => void
  isReadOnly?: boolean
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-[#E8F1F8] text-[#004B8D] flex items-center justify-center shrink-0">
          {icone}
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-[#102A43] leading-tight">{titulo}</h4>
          <p className="text-[11px] text-[#627D98]">{descricao}</p>
        </div>
        {selecionados.length > 0 && (
          <Badge className="ml-auto bg-[#004B8D] text-white border-0 text-[11px] font-bold shrink-0">
            {selecionados.length}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => {
          const ativo = selecionados.includes(opcao.id)
          return (
            <button
              key={opcao.id}
              type="button"
              disabled={isReadOnly}
              onClick={() => onToggle(opcao.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                ativo
                  ? 'bg-[#004B8D] text-white border-[#004B8D] shadow-xs'
                  : 'bg-white text-[#486581] border-[#D3DFE9] hover:border-[#004B8D] hover:text-[#004B8D]'
              } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {ativo && <Check className="w-3 h-3" />}
              {opcao.nome}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Bloco de caracterização exibido ANTES do checklist nas fiscalizações rurais.
 * O fiscal marca o que existe na fazenda e o app dispensa os temas do checklist
 * que não têm correspondência física no empreendimento.
 */
export function CaracterizacaoAgroSection({
  valor,
  onChange,
  onSalvar,
  isReadOnly,
  isSaving,
  temasDispensados,
  totalTemas,
}: CaracterizacaoAgroSectionProps) {
  const toggle = (campo: 'culturas' | 'criacoes' | 'estruturas', id: string) => {
    const atual = valor[campo]
    const proximo = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
    onChange({ ...valor, [campo]: proximo })
  }

  const preenchida = caracterizacaoPreenchida(valor)
  const temasRestantes = totalTemas - temasDispensados.length

  return (
    <div className="bg-white rounded-2xl border border-[#D3DFE9] shadow-xs overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-5 py-4 bg-[#F4F6F9] border-b border-[#D3DFE9]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#102A43] flex items-center gap-2">
              <Sprout className="w-5 h-5 text-[#004B8D]" />
              Caracterização do Empreendimento
            </h3>
            <p className="text-xs text-[#486581] mt-0.5 max-w-2xl leading-relaxed">
              Marque o que existe na propriedade nesta safra. O checklist abaixo se ajusta ao que
              for marcado, dispensando os temas sem correspondência.
            </p>
          </div>
          {preenchida && (
            <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-bold gap-1 shrink-0">
              <Check className="w-3 h-3 text-emerald-600" />
              {temasRestantes} de {totalTemas} temas a fiscalizar
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        <GrupoChips
          titulo="Culturas"
          descricao="Lavouras conduzidas na safra em fiscalização"
          icone={<Sprout className="w-4 h-4" />}
          opcoes={CULTURAS}
          selecionados={valor.culturas}
          onToggle={(id) => toggle('culturas', id)}
          isReadOnly={isReadOnly}
        />

        <div className="space-y-1.5 sm:max-w-md">
          <Label htmlFor="outras-culturas" className="text-xs font-bold text-[#102A43]">
            Outras culturas
          </Label>
          <Input
            id="outras-culturas"
            disabled={isReadOnly}
            placeholder="Ex: gergelim, mandioca, cana..."
            value={valor.outrasCulturas}
            onChange={(e) => onChange({ ...valor, outrasCulturas: e.target.value })}
            className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm"
          />
        </div>

        <div className="pt-1 border-t border-[#D3DFE9]/70">
          <div className="pt-5">
            <GrupoChips
              titulo="Criação animal"
              descricao="Atividades pecuárias existentes na propriedade"
              icone={<Beef className="w-4 h-4" />}
              opcoes={CRIACOES}
              selecionados={valor.criacoes}
              onToggle={(id) => toggle('criacoes', id)}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>

        <div className="pt-1 border-t border-[#D3DFE9]/70">
          <div className="pt-5">
            <GrupoChips
              titulo="Estruturas e instalações"
              descricao="Define quais temas de manutenção predial serão fiscalizados"
              icone={<Factory className="w-4 h-4" />}
              opcoes={ESTRUTURAS}
              selecionados={valor.estruturas}
              onToggle={(id) => toggle('estruturas', id)}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>

        {/* Prévia do efeito no checklist */}
        {preenchida && temasDispensados.length > 0 && (
          <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 space-y-2">
            <p className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-orange-600" />
              {temasDispensados.length} tema(s) serão marcados como &ldquo;Não se aplica&rdquo;
            </p>
            <ul className="text-[11px] text-orange-800 space-y-0.5 list-disc list-inside">
              {temasDispensados.map((nome) => (
                <li key={nome}>{nome}</li>
              ))}
            </ul>
            <p className="text-[11px] text-orange-700 leading-relaxed">
              Só os subitens ainda não respondidos são marcados, e o fiscal pode reverter qualquer
              um deles no próprio checklist.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-[#D3DFE9] bg-[#F4F6F9] p-3.5">
          <p className="text-[11px] text-[#486581] flex items-start gap-1.5 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#004B8D] shrink-0 mt-px" />
            <span>
              Segurança e Saúde no Trabalho, Meio Ambiente e Resíduos, Prevenção e Combate a
              Incêndio, Georreferenciamento, Infraestrutura Rural e Instalações Elétricas nunca são
              dispensados automaticamente — valem para qualquer imóvel rural e a ausência deles é a
              própria irregularidade.
            </span>
          </p>
        </div>

        {!isReadOnly && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
            <Button
              type="button"
              onClick={onSalvar}
              disabled={isSaving}
              className="bg-[#004B8D] hover:bg-[#003666] text-white font-bold h-10 px-5 shadow-sm cursor-pointer gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aplicando ao checklist...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar e aplicar ao checklist
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
