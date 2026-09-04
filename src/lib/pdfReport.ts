import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoCreaPi from '@/assets/creapi-a5c20.png'
import { Vistoria, VistoriaItem, getVistoriaItemPhotoUrl } from '@/services/vistorias'
import { Hospital } from '@/services/hospitais'
import { CategoriaVistoria, SubitemChecklist } from '@/services/categoriasVistoria'
import { formatCNPJ } from '@/lib/formatters'
import { sanitizeFileName } from './photoDownload'

export interface GeneratePdfParams {
  vistoria: Vistoria
  hospital?: Hospital | null
  responsavelNome?: string
  vistoriaItens: VistoriaItem[]
  categorias: CategoriaVistoria[]
  subitens: SubitemChecklist[]
  onProgress?: (statusText: string) => void
}

/**
 * Converte uma URL de imagem (ou data URL / asset import) para base64 JPEG/PNG
 * com redimensionamento para manter o PDF rápido e leve.
 */
async function getBase64ImageFromUrl(
  imgUrl: string,
  maxDimension = 800,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        let width = img.width
        let height = img.height

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve({ dataUrl, width, height })
      } catch (err) {
        console.warn('Erro ao converter imagem em base64:', err)
        resolve(null)
      }
    }
    img.onerror = () => {
      console.warn('Erro ao carregar imagem para PDF:', imgUrl)
      resolve(null)
    }
    img.src = imgUrl
  })
}

/**
 * Gera o Relatório Técnico de Fiscalização em formato PDF no cliente.
 */
export async function generateVistoriaPdf(params: GeneratePdfParams): Promise<string> {
  const { vistoria, hospital, responsavelNome, vistoriaItens, categorias, subitens, onProgress } =
    params

  if (onProgress) onProgress('Preparando estrutura do documento...')

  // Inicializa jsPDF no formato A4 retrato (210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2

  // 1. Carrega logotipo CREA-PI
  let logoData: { dataUrl: string; width: number; height: number } | null = null
  try {
    logoData = await getBase64ImageFromUrl(logoCreaPi, 300)
  } catch {
    // prossegue sem logo se falhar
  }

  // Helper para desenhar o cabeçalho oficial do CREA-PI
  const drawHeader = (docInstance: jsPDF, pageNum: number, totalPages?: number) => {
    // Barra superior decorativa azul CREA (#004B8D)
    docInstance.setFillColor(0, 75, 141)
    docInstance.rect(0, 0, pageWidth, 5, 'F')

    // Faixa dourada/âmbar sutil CREA-PI (#E5A812)
    docInstance.setFillColor(229, 168, 18)
    docInstance.rect(0, 5, pageWidth, 1.5, 'F')

    // Logotipo
    let logoRight = margin
    if (logoData) {
      const logoH = 14
      const logoW = (logoData.width / logoData.height) * logoH
      docInstance.addImage(logoData.dataUrl, 'PNG', margin, 9, logoW, logoH)
      logoRight = margin + logoW + 4
    }

    // Textos do Cabeçalho Oficial
    docInstance.setFont('helvetica', 'bold')
    docInstance.setFontSize(11)
    docInstance.setTextColor(0, 75, 141)
    docInstance.text(
      'CONSELHO REGIONAL DE ENGENHARIA E AGRONOMIA DO PIAUÍ — CREA-PI',
      logoRight,
      13,
    )

    docInstance.setFont('helvetica', 'normal')
    docInstance.setFontSize(8.5)
    docInstance.setTextColor(72, 101, 129)
    docInstance.text(
      'Divisão de Fiscalização e Controle do Exercício Profissional',
      logoRight,
      17.5,
    )
    docInstance.text('RELATÓRIO TÉCNICO DE VISTORIA E FISCALIZAÇÃO', logoRight, 21.5)

    // Linha divisória
    docInstance.setDrawColor(211, 223, 233)
    docInstance.setLineWidth(0.5)
    docInstance.line(margin, 25, pageWidth - margin, 25)

    // Rodapé
    docInstance.setFont('helvetica', 'normal')
    docInstance.setFontSize(8)
    docInstance.setTextColor(130, 154, 177)
    const rodapeText = `CREA-PI Fiscalização • Emitido em ${new Date().toLocaleString('pt-BR')}`
    docInstance.text(rodapeText, margin, pageHeight - 7)

    const pageStr = totalPages ? `Página ${pageNum} de ${totalPages}` : `Página ${pageNum}`
    docInstance.text(pageStr, pageWidth - margin, pageHeight - 7, { align: 'right' })
  }

  // Desenha cabeçalho da página 1
  drawHeader(doc, 1)

  let cursorY = 29

  // 2. Bloco: Dados Gerais do Empreendimento e da Vistoria
  doc.setFillColor(244, 246, 249)
  doc.setDrawColor(211, 223, 233)
  doc.roundedRect(margin, cursorY, contentWidth, 36, 2, 2, 'FD')

  // Faixa lateral esquerda no card
  doc.setFillColor(0, 75, 141)
  doc.rect(margin, cursorY, 3, 36, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(16, 42, 67)
  doc.text('DADOS GERAIS DA VISTORIA', margin + 6, cursorY + 6)

  // Data formatada
  const vistoriaDate = new Date(vistoria.created).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  doc.setFontSize(8.5)
  // Coluna 1
  doc.setFont('helvetica', 'bold')
  doc.text('Empreendimento:', margin + 6, cursorY + 12)
  doc.setFont('helvetica', 'normal')
  doc.text(hospital?.nome || 'Não identificado', margin + 35, cursorY + 12)

  doc.setFont('helvetica', 'bold')
  doc.text('Segmento / Tipo:', margin + 6, cursorY + 17)
  doc.setFont('helvetica', 'normal')
  doc.text(hospital?.tipo || 'Hospital', margin + 35, cursorY + 17)

  doc.setFont('helvetica', 'bold')
  doc.text('Endereço / Local:', margin + 6, cursorY + 22)
  doc.setFont('helvetica', 'normal')
  const enderecoFull = [hospital?.endereco, hospital?.municipio, 'PI'].filter(Boolean).join(' - ')
  const truncatedEndereco =
    enderecoFull.length > 55 ? `${enderecoFull.slice(0, 52)}...` : enderecoFull
  doc.text(truncatedEndereco || 'Não informado', margin + 35, cursorY + 22)

  doc.setFont('helvetica', 'bold')
  doc.text('CNPJ / CNES:', margin + 6, cursorY + 27)
  doc.setFont('helvetica', 'normal')
  const cnpjFormatted = hospital?.cnpj ? formatCNPJ(hospital.cnpj) : 'N/A'
  doc.text(`${cnpjFormatted}  |  CNES: ${hospital?.cnes || 'N/A'}`, margin + 35, cursorY + 27)

  doc.setFont('helvetica', 'bold')
  doc.text('Responsável Unidade:', margin + 6, cursorY + 32)
  doc.setFont('helvetica', 'normal')
  doc.text(hospital?.responsavel || 'Não informado', margin + 35, cursorY + 32)

  // Coluna 2 (lado direito)
  const col2X = margin + 115
  doc.setFont('helvetica', 'bold')
  doc.text('Data da Vistoria:', col2X, cursorY + 12)
  doc.setFont('helvetica', 'normal')
  doc.text(vistoriaDate, col2X + 27, cursorY + 12)

  doc.setFont('helvetica', 'bold')
  doc.text('Status:', col2X, cursorY + 17)
  doc.setFont('helvetica', 'normal')
  doc.text(vistoria.status === 'concluida' ? 'Concluída' : 'Em Andamento', col2X + 27, cursorY + 17)

  doc.setFont('helvetica', 'bold')
  doc.text('Fiscal Responsável:', col2X, cursorY + 22)
  doc.setFont('helvetica', 'normal')
  const fiscalNome = responsavelNome || 'Fiscal CREA-PI'
  doc.text(fiscalNome, col2X + 27, cursorY + 22)

  cursorY += 41

  // 3. Montar Tabela do Checklist Completo Preenchido
  if (onProgress) onProgress('Compilando dados do checklist preenchido...')

  // Estrutura das categorias do tipo
  const relevantCats = categorias
    .filter((cat) => {
      const catTipo = (cat.tipo || 'Hospital').trim().toLowerCase()
      const hospTipo = (hospital?.tipo || 'Hospital').trim().toLowerCase()
      return catTipo === hospTipo
    })
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

  // Array de linhas da tabela
  const tableRows: Array<any[]> = []

  // Coleta também fotos anexadas por subitem para a galeria técnica posterior
  interface SubitemPhotoGroup {
    categoriaTitulo: string
    subitemCodigo: string
    subitemDescricao: string
    situacao: string
    fotos: Array<{ url: string; nome: string }>
  }
  const photoGroups: SubitemPhotoGroup[] = []

  let totalItens = 0
  let totalConforme = 0
  let totalVencido = 0
  let totalNaoSeAplica = 0
  let totalPendente = 0

  for (let idx = 0; idx < relevantCats.length; idx++) {
    const cat = relevantCats[idx]
    const catNumber = cat.ordem || idx + 1
    const subs = subitens
      .filter((s) => s.categoria === cat.id)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

    // Fallback virtual se não houver subitens cadastrados
    const activeSubs: Array<{
      id: string
      codigo?: string
      descricao: string
      exigeArt?: boolean
      periodicidadeDias?: number | null
    }> =
      subs.length > 0
        ? subs
        : [
            {
              id: cat.id,
              codigo: `${catNumber}.1`,
              descricao: cat.nome,
              exigeArt: cat.exigeArt ?? true,
              periodicidadeDias: cat.periodicidadeDias,
            },
          ]

    // Linha de agrupador / Tema Principal (Nível 1)
    tableRows.push([
      {
        content: `ITEM ${catNumber}: ${cat.nome.toUpperCase()}`,
        colSpan: 5,
        styles: {
          fillColor: [0, 75, 141],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
      },
    ])

    for (const sub of activeSubs) {
      totalItens++
      const item = vistoriaItens.find(
        (i) => i.subitem === sub.id || (!i.subitem && i.categoria === cat.id),
      )

      let situacao = item?.situacaoCalculada || 'Pendente'
      if (situacao === 'conforme') totalConforme++
      else if (situacao === 'vencido') totalVencido++
      else if (situacao === 'não se aplica') totalNaoSeAplica++
      else totalPendente++

      // Formatação da situação para a tabela
      let situacaoLabel = 'PENDENTE'
      let situacaoColor: [number, number, number] = [217, 119, 6] // âmbar
      if (situacao === 'conforme') {
        situacaoLabel = 'CONFORME'
        situacaoColor = [16, 122, 60] // verde
      } else if (situacao === 'vencido') {
        situacaoLabel = 'VENCIDO'
        situacaoColor = [220, 38, 38] // vermelho
      } else if (situacao === 'não se aplica') {
        situacaoLabel = 'NÃO SE APLICA'
        situacaoColor = [72, 101, 129] // cinza azulado
      }

      // Detalhes / Observações
      const detalhesList: string[] = []
      if (item?.possuiSistema) {
        detalhesList.push(`Possui: ${item.possuiSistema}`)
      }
      if (item?.prestadorServico) {
        detalhesList.push(`Prestador: ${item.prestadorServico}`)
      }
      if (item?.numeroArt) {
        detalhesList.push(`ART: ${item.numeroArt}`)
      }
      if (item?.dataUltimaVerificacao) {
        const d = item.dataUltimaVerificacao.split('T')[0].split('-').reverse().join('/')
        detalhesList.push(`Últ. Verif: ${d}`)
      }
      if (item?.servicoPeriodico === 'Sim' && item.periodicidadeMeses) {
        detalhesList.push(`Período: a cada ${item.periodicidadeMeses} mês(es)`)
      }
      if (item?.fotos && item.fotos.length > 0) {
        detalhesList.push(`📸 ${item.fotos.length} foto(s) anexada(s)`)
      }

      const observacoesText = detalhesList.length > 0 ? detalhesList.join(' | ') : '—'

      // Subitem Code e Descrição
      const code = sub.codigo || `${catNumber}.1`
      tableRows.push([
        code,
        sub.descricao,
        sub.exigeArt ? 'Sim' : 'Não',
        {
          content: situacaoLabel,
          styles: {
            textColor: situacaoColor,
            fontStyle: 'bold',
          },
        },
        observacoesText,
      ])

      // Se tiver fotos, guarda para a galeria
      if (item && item.fotos && item.fotos.length > 0) {
        photoGroups.push({
          categoriaTitulo: `Item ${catNumber}: ${cat.nome}`,
          subitemCodigo: code,
          subitemDescricao: sub.descricao,
          situacao: situacaoLabel,
          fotos: item.fotos.map((fn) => ({
            nome: fn,
            url: getVistoriaItemPhotoUrl({ id: item.id, collectionName: 'vistoria_itens' }, fn),
          })),
        })
      }
    }
  }

  // Gera tabela com autoTable
  autoTable(doc, {
    startY: cursorY,
    head: [['Cód.', 'Subitem / Item Técnico', 'Exige ART', 'Situação', 'Observações / Dados']],
    body: tableRows,
    margin: { left: margin, right: margin, top: 28, bottom: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [244, 246, 249],
      textColor: [16, 42, 67],
      fontStyle: 'bold',
      fontSize: 8,
      lineWidth: 0.2,
      lineColor: [211, 223, 233],
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [36, 59, 83],
      lineColor: [211, 223, 233],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 14, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 62 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      drawHeader(doc, data.pageNumber)
    },
  })

  // 4. Anexo Fotográfico (Fotos com coordenadas, data/hora e legendas)
  let lastPhotoCursorY = 30
  if (photoGroups.length > 0) {
    if (onProgress) onProgress('Processando e anexando registros fotográficos...')

    // Nova página para a galeria fotográfica
    doc.addPage()
    const photoPageNum = (doc as any).internal.getNumberOfPages()
    drawHeader(doc, photoPageNum)

    let photoCursorY = 30

    // Título da Seção Fotográfica
    doc.setFillColor(0, 75, 141)
    doc.rect(margin, photoCursorY, contentWidth, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(
      'REGISTRO FOTOGRÁFICO DE VISTORIA (COM MARCAÇÃO GPS E TIMESTAMP)',
      margin + 3,
      photoCursorY + 4.8,
    )

    photoCursorY += 12

    for (const group of photoGroups) {
      // Verifica espaço para o cabeçalho do grupo
      if (photoCursorY > pageHeight - 50) {
        doc.addPage()
        const pNum = (doc as any).internal.getNumberOfPages()
        drawHeader(doc, pNum)
        photoCursorY = 30
      }

      // Título do Subitem
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(0, 75, 141)
      doc.text(`[${group.subitemCodigo}] ${group.subitemDescricao}`, margin, photoCursorY)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(72, 101, 129)
      doc.text(`${group.categoriaTitulo} • Situação: ${group.situacao}`, margin, photoCursorY + 4)

      photoCursorY += 7

      // Renderiza as fotos (até 2 fotos por linha)
      const photoWidth = (contentWidth - 6) / 2 // ~88mm cada
      const photoHeight = 56 // ~56mm cada

      for (let pIdx = 0; pIdx < group.fotos.length; pIdx++) {
        const photo = group.fotos[pIdx]
        const colIndex = pIdx % 2

        if (colIndex === 0 && pIdx > 0) {
          photoCursorY += photoHeight + 14
        }

        // Se passar da página, quebra
        if (photoCursorY + photoHeight + 10 > pageHeight - 15) {
          doc.addPage()
          const pNum = (doc as any).internal.getNumberOfPages()
          drawHeader(doc, pNum)
          photoCursorY = 30
        }

        const photoX = margin + colIndex * (photoWidth + 6)
        const photoY = photoCursorY

        // Moldura cinza para foto
        doc.setFillColor(244, 246, 249)
        doc.setDrawColor(211, 223, 233)
        doc.roundedRect(photoX, photoY, photoWidth, photoHeight, 1.5, 1.5, 'FD')

        // Carrega foto com marca d'água
        try {
          const imgBase64 = await getBase64ImageFromUrl(photo.url, 800)
          if (imgBase64) {
            // Desenha imagem dentro da moldura
            doc.addImage(
              imgBase64.dataUrl,
              'JPEG',
              photoX + 0.5,
              photoY + 0.5,
              photoWidth - 1,
              photoHeight - 1,
            )
          } else {
            doc.setFont('helvetica', 'italic')
            doc.setFontSize(8)
            doc.setTextColor(130, 154, 177)
            doc.text(
              'Foto indisponível para exibição',
              photoX + photoWidth / 2,
              photoY + photoHeight / 2,
              {
                align: 'center',
              },
            )
          }
        } catch {
          // segue em frente
        }

        // Legenda abaixo da foto
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(16, 42, 67)
        doc.text(
          `Foto ${pIdx + 1} de ${group.fotos.length} — Subitem ${group.subitemCodigo}`,
          photoX,
          photoY + photoHeight + 3.5,
        )

        if (pIdx === group.fotos.length - 1) {
          photoCursorY += photoHeight + 10
        }
      }

      photoCursorY += 4
    }
    lastPhotoCursorY = photoCursorY
  }

  // 5. Bloco de Assinaturas e Encerramento na última página
  const lastPage = (doc as any).internal.getNumberOfPages()
  // Garante que cabe o bloco de assinatura ou cria nova página
  let finalY = (doc as any).lastAutoTable?.finalY || 180
  if (photoGroups.length > 0) {
    finalY = lastPhotoCursorY
  }

  if (finalY > pageHeight - 45) {
    doc.addPage()
    const pNum = (doc as any).internal.getNumberOfPages()
    drawHeader(doc, pNum)
    finalY = 35
  } else {
    finalY += 10
  }

  // Bloco de Assinatura
  doc.setDrawColor(211, 223, 233)
  doc.line(margin + 20, finalY + 18, margin + 80, finalY + 18)
  doc.line(pageWidth - margin - 80, finalY + 18, pageWidth - margin - 20, finalY + 18)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(16, 42, 67)
  doc.text('Fiscal Responsável CREA-PI', margin + 50, finalY + 22, { align: 'center' })
  doc.text('Responsável Técnico / Representante', pageWidth - margin - 50, finalY + 22, {
    align: 'center',
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(72, 101, 129)
  doc.text(fiscalNome, margin + 50, finalY + 25.5, { align: 'center' })
  doc.text(
    hospital?.responsavel || hospital?.nome || 'Unidade Fiscalizada',
    pageWidth - margin - 50,
    finalY + 25.5,
    {
      align: 'center',
    },
  )

  // 6. Atualiza rodapés com total de páginas real
  const totalPagesCount = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= totalPagesCount; p++) {
    doc.setPage(p)
    drawHeader(doc, p, totalPagesCount)
  }

  // 7. Salva o PDF com nome amigável
  const hospitalClean = sanitizeFileName(hospital?.nome || 'vistoria')
  const dateFormatted = new Date().toISOString().split('T')[0]
  const fileName = `relatorio-vistoria-${hospitalClean}-${dateFormatted}.pdf`

  doc.save(fileName)

  return fileName
}
