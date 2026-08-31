import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Building2,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  Building,
  MapPin,
  Sparkles,
  LayoutGrid,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { hospitaisService, Hospital, HospitalFormData } from '@/services/hospitais'
import { tiposEmpreendimentoService, TipoEmpreendimento } from '@/services/tiposEmpreendimento'
import { HospitalCard } from '@/components/HospitalCard'
import { HospitalDetailSheet } from '@/components/HospitalDetailSheet'
import { HospitalFormDialog } from '@/components/HospitalFormDialog'
import { HospitalImportCsv } from '@/components/HospitalImportCsv'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

export default function Hospitais() {
  const { toast } = useToast()
  const { isAdmin } = useAuth()

  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [tiposEmpreendimento, setTiposEmpreendimento] = useState<TipoEmpreendimento[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Sub-tabs: 'lista' vs 'importar'
  const [activeSubTab, setActiveSubTab] = useState<'lista' | 'importar'>('lista')

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('todos')
  const [selectedTipo, setSelectedTipo] = useState<string>('todos')

  // Modals & Sheets
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [hospitalToEdit, setHospitalToEdit] = useState<Hospital | null>(null)

  useEffect(() => {
    document.title = 'Hospitais e Unidades · CREA-PI Fiscalização'
  }, [])

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [data, tipos] = await Promise.all([
        hospitaisService.getAll(),
        tiposEmpreendimentoService.getAll(),
      ])
      setHospitais(data)
      setTiposEmpreendimento(tipos)
    } catch (err) {
      console.error('Erro ao carregar hospitais:', err)
      toast({
        title: 'Erro ao carregar hospitais',
        description: 'Não foi possível buscar a lista de hospitais no servidor.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Unique municipios list for select filter
  const municipios = useMemo(() => {
    const list = hospitais.map((h) => h.municipio).filter(Boolean)
    return Array.from(new Set(list)).sort()
  }, [hospitais])

  // Filtered hospitais
  const filteredHospitais = useMemo(() => {
    return hospitais.filter((h) => {
      const matchSearch =
        searchQuery === '' ||
        h.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.municipio.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.cnes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.cnpj && h.cnpj.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchMunicipio =
        selectedMunicipio === 'todos' ||
        h.municipio.toLowerCase() === selectedMunicipio.toLowerCase()

      const matchTipo =
        selectedTipo === 'todos' ||
        (h.tipo || 'Hospital').toLowerCase() === selectedTipo.toLowerCase()

      return matchSearch && matchMunicipio && matchTipo
    })
  }, [hospitais, searchQuery, selectedMunicipio, selectedTipo])

  const handleCreateHospital = async (formData: HospitalFormData) => {
    try {
      const created = await hospitaisService.create(formData)
      setHospitais((prev) => [created, ...prev])
      toast({
        title: 'Hospital cadastrado!',
        description: `"${created.nome}" foi incluído na fiscalização do CREA-PI.`,
      })
    } catch (err) {
      console.error('Erro ao criar hospital:', err)
      toast({
        title: 'Erro ao cadastrar',
        description: 'Não foi possível cadastrar o hospital. Verifique os campos.',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleUpdateHospital = async (id: string, formData: Partial<HospitalFormData>) => {
    try {
      const updated = await hospitaisService.update(id, formData)
      setHospitais((prev) => prev.map((h) => (h.id === id ? updated : h)))
      if (selectedHospital?.id === id) {
        setSelectedHospital(updated)
      }
      toast({
        title: 'Hospital atualizado!',
        description: 'As alterações cadastrais foram salvas com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao atualizar hospital:', err)
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleDeleteHospital = async (id: string) => {
    try {
      await hospitaisService.delete(id)
      setHospitais((prev) => prev.filter((h) => h.id !== id))
      toast({
        title: 'Hospital excluído',
        description: 'O cadastro foi removido do sistema.',
      })
    } catch (err) {
      console.error('Erro ao excluir hospital:', err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o hospital.',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleCardClick = (hospital: Hospital) => {
    setSelectedHospital(hospital)
    setIsDetailOpen(true)
  }

  return (
    <div className="animate-page-enter space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] sm:text-[28px] font-bold text-[#102A43] tracking-tight leading-tight">
              Hospitais & Estabelecimentos
            </h1>
          </div>
          <p className="text-sm text-[#486581] mt-0.5">
            Cadastro de unidades de saúde no Estado do Piauí vinculadas à fiscalização do CREA-PI
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {isAdmin && (
            <Button
              onClick={() => {
                setHospitalToEdit(null)
                setIsFormOpen(true)
              }}
              className="bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold h-10 px-4 cursor-pointer gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Novo Hospital
            </Button>
          )}

          <Button
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8] font-semibold h-10 px-3 cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Sub-tabs: Lista vs Importar CSV (CSV restrito ao admin) */}
      <Tabs
        value={activeSubTab}
        onValueChange={(val) => setActiveSubTab(val as 'lista' | 'importar')}
        className="w-full"
      >
        <div className="flex items-center justify-between border-b border-[#D3DFE9] pb-3 mb-6">
          <TabsList className="bg-[#E8F1F8] p-1 rounded-lg border border-[#D3DFE9]/80 h-auto">
            <TabsTrigger
              value="lista"
              className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs sm:text-sm py-1.5 px-3.5 rounded-md gap-2"
            >
              <Building2 className="w-4 h-4" />
              Lista de Hospitais ({hospitais.length})
            </TabsTrigger>

            {isAdmin && (
              <TabsTrigger
                value="importar"
                className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white text-[#486581] font-semibold text-xs sm:text-sm py-1.5 px-3.5 rounded-md gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Importar CSV
              </TabsTrigger>
            )}
          </TabsList>

          <span className="text-xs font-semibold text-[#627D98] hidden sm:inline">
            {filteredHospitais.length} de {hospitais.length} exibidos
          </span>
        </div>

        {/* TAB 1: LISTA DE HOSPITAIS */}
        <TabsContent value="lista" className="space-y-6 mt-0">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-[#D3DFE9] shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#486581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Buscar por hospital, CNES, município ou CNPJ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm border-[#D3DFE9] focus-visible:ring-[#004B8D] h-10 bg-[#F4F6F9]/50"
              />
            </div>

            {/* Filter by Tipo */}
            <div className="w-full md:w-56">
              <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                <SelectTrigger className="border-[#D3DFE9] text-xs h-10 bg-white">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[#627D98] shrink-0 font-medium">Tipo:</span>
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tiposEmpreendimento.map((t) => (
                    <SelectItem key={t.id} value={t.nome}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Município */}
            <div className="w-full md:w-52">
              <Select value={selectedMunicipio} onValueChange={setSelectedMunicipio}>
                <SelectTrigger className="border-[#D3DFE9] text-xs h-10 bg-white">
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="w-3.5 h-3.5 text-[#004B8D] shrink-0" />
                    <span className="text-[#627D98] shrink-0 font-medium">Município:</span>
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos ({hospitais.length})</SelectItem>
                  {municipios.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cards Grid or Empty */}
          {isLoading ? (
            <div className="py-20 text-center text-[#486581]">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#004B8D] mb-3" />
              <p className="text-sm font-semibold">Carregando hospitais cadastrados...</p>
            </div>
          ) : filteredHospitais.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#D3DFE9] p-12 text-center space-y-3">
              <Building2 className="w-12 h-12 text-[#829AB1] mx-auto stroke-[1.5]" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#102A43]">
                  Nenhum estabelecimento encontrado
                </h3>
                <p className="text-xs text-[#486581] max-w-sm mx-auto">
                  {searchQuery || selectedMunicipio !== 'todos' || selectedTipo !== 'todos'
                    ? 'Tente ajustar os filtros de busca ou município para encontrar unidades cadastradas.'
                    : 'Nenhum hospital foi cadastrado ainda. Use o botão acima para adicionar o primeiro.'}
                </p>
              </div>
              {(searchQuery || selectedMunicipio !== 'todos' || selectedTipo !== 'todos') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedMunicipio('todos')
                    setSelectedTipo('todos')
                  }}
                  className="border-[#D3DFE9] text-[#004B8D] text-xs"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHospitais.map((hospital) => (
                <HospitalCard
                  key={hospital.id}
                  hospital={hospital}
                  onClick={() => handleCardClick(hospital)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: IMPORTAR CSV */}
        {isAdmin && (
          <TabsContent value="importar" className="mt-0">
            <HospitalImportCsv
              existingHospitais={hospitais}
              onImportCompleted={(created, updated) => {
                loadData()
                setActiveSubTab('lista')
              }}
              onCancel={() => setActiveSubTab('lista')}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Hospital Detail Sheet */}
      <HospitalDetailSheet
        hospital={selectedHospital}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={handleUpdateHospital}
        onDelete={isAdmin ? handleDeleteHospital : undefined}
      />

      {/* Hospital Form Modal */}
      <HospitalFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        hospitalToEdit={hospitalToEdit}
        onSave={handleCreateHospital}
      />
    </div>
  )
}
