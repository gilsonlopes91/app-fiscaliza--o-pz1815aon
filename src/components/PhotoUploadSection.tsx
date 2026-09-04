import React, { useRef, useState } from 'react'
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  Loader2,
  Eye,
  X,
  ZoomIn,
  Download,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getVistoriaItemPhotoUrl } from '@/services/vistorias'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { applyWatermarkToImage, PhotoCaptureMetadata } from '@/lib/watermark'
import { downloadSinglePhoto } from '@/lib/photoDownload'
import { toast } from '@/hooks/use-toast'

interface PhotoUploadSectionProps {
  itemId?: string
  subitemCode?: string
  existingPhotos: string[] // filenames in PocketBase
  pendingFiles: File[]
  onAddFiles: (files: File[], metaList?: PhotoCaptureMetadata[]) => void
  onRemovePendingFile: (index: number) => void
  onDeleteExistingPhoto: (filename: string) => void
  disabled?: boolean
}

export function PhotoUploadSection({
  itemId,
  subitemCode = 'subitem',
  existingPhotos = [],
  pendingFiles = [],
  onAddFiles,
  onRemovePendingFile,
  onDeleteExistingPhoto,
  disabled = false,
}: PhotoUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isProcessingWatermark, setIsProcessingWatermark] = useState(false)
  const [downloadingPhoto, setDownloadingPhoto] = useState<string | null>(null)

  const totalCount = existingPhotos.length + pendingFiles.length
  const maxReached = totalCount >= 3

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const incoming = Array.from(e.target.files)
    const availableSlots = Math.max(0, 3 - totalCount)
    const toAdd = incoming.slice(0, availableSlots)

    if (toAdd.length > 0) {
      try {
        setIsProcessingWatermark(true)
        toast({
          title: 'Gravando metadados na foto...',
          description: "Obtendo geolocalização e aplicando marca d'água permanente do CREA-PI.",
        })

        const processedList: File[] = []
        const metadataList: PhotoCaptureMetadata[] = []

        for (const file of toAdd) {
          const { processedFile, metadata } = await applyWatermarkToImage(file)
          processedList.push(processedFile)
          metadataList.push(metadata)
        }

        onAddFiles(processedList, metadataList)

        toast({
          title: 'Fotos preparadas com sucesso',
          description: "Marca d'água com coordenadas e data/hora registrada.",
        })
      } catch (err) {
        console.error("Erro ao queimar marca d'água na foto:", err)
        // Fallback: adiciona arquivos originais
        onAddFiles(toAdd)
      } finally {
        setIsProcessingWatermark(false)
      }
    }
    // reset input
    e.target.value = ''
  }

  const handleDownloadSingle = async (url: string, photoIndex: number) => {
    try {
      setDownloadingPhoto(url)
      const cleanSub = subitemCode.replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `${cleanSub}-foto-${photoIndex}.jpg`
      await downloadSinglePhoto(url, fileName)
      toast({
        title: 'Foto baixada com sucesso!',
        description: `Arquivo salvo: ${fileName}`,
      })
    } catch (err) {
      console.error('Erro ao baixar foto:', err)
      toast({
        title: 'Erro ao baixar foto',
        description: 'Não foi possível fazer o download da imagem.',
        variant: 'destructive',
      })
    } finally {
      setDownloadingPhoto(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-[#004B8D]" />
          <span className="text-xs font-bold text-[#102A43]">
            Registro Fotográfico ({totalCount}/3 fotos)
          </span>
        </div>
        <span className="text-[11px] text-[#486581]">Até 3 fotos (máx. 10MB cada)</span>
      </div>

      {/* Grid of photo thumbnails + upload trigger cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {/* 1. Existing photos stored on PocketBase */}
        {existingPhotos.map((photoName, pIdx) => {
          const photoUrl = itemId
            ? getVistoriaItemPhotoUrl({ id: itemId, collectionName: 'vistoria_itens' }, photoName)
            : ''

          const isDownloadingThis = downloadingPhoto === photoUrl

          return (
            <div
              key={photoName}
              className="group relative aspect-square rounded-xl overflow-hidden border border-[#D3DFE9] bg-slate-100 shadow-2xs"
            >
              <img
                src={photoUrl}
                alt="Registro da vistoria"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                <button
                  type="button"
                  onClick={() => setPreviewImage(photoUrl)}
                  className="w-7 h-7 rounded-full bg-white/90 text-[#102A43] hover:bg-white flex items-center justify-center shadow-sm cursor-pointer"
                  title="Ampliar foto"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  disabled={isDownloadingThis}
                  onClick={() => handleDownloadSingle(photoUrl, pIdx + 1)}
                  className="w-7 h-7 rounded-full bg-[#004B8D] text-white hover:bg-[#003666] flex items-center justify-center shadow-sm cursor-pointer"
                  title="Baixar foto individual (com marca d'água)"
                >
                  {isDownloadingThis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                </button>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onDeleteExistingPhoto(photoName)}
                    className="w-7 h-7 rounded-full bg-rose-600 text-white hover:bg-rose-700 flex items-center justify-center shadow-sm cursor-pointer"
                    title="Remover foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded font-mono">
                Salva
              </span>
            </div>
          )
        })}

        {/* 2. Pending local files awaiting save */}
        {pendingFiles.map((file, idx) => {
          const localUrl = URL.createObjectURL(file)

          return (
            <div
              key={`${file.name}-${idx}`}
              className="group relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-[#004B8D]/60 bg-[#E8F1F8]/30 shadow-2xs"
            >
              <img
                src={localUrl}
                alt="Nova foto"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                <button
                  type="button"
                  onClick={() => setPreviewImage(localUrl)}
                  className="w-7 h-7 rounded-full bg-white/90 text-[#102A43] hover:bg-white flex items-center justify-center shadow-sm cursor-pointer"
                  title="Ampliar foto"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSingle(localUrl, existingPhotos.length + idx + 1)}
                  className="w-7 h-7 rounded-full bg-[#004B8D] text-white hover:bg-[#003666] flex items-center justify-center shadow-sm cursor-pointer"
                  title="Baixar foto pré-visualizada"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onRemovePendingFile(idx)}
                    className="w-7 h-7 rounded-full bg-rose-600 text-white hover:bg-rose-700 flex items-center justify-center shadow-sm cursor-pointer"
                    title="Remover foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="absolute bottom-1 right-1 bg-[#E5A812] text-[#102A43] text-[9px] px-1 rounded font-bold shadow-xs">
                Pendente
              </span>
            </div>
          )
        })}

        {/* 3. Add Photo Slots if not reached limit */}
        {!maxReached && !disabled && (
          <div className="aspect-square rounded-xl border-2 border-dashed border-[#D3DFE9] hover:border-[#004B8D] bg-white hover:bg-[#E8F1F8]/30 transition-all flex flex-col items-center justify-center p-2 text-center gap-1.5">
            {isProcessingWatermark ? (
              <div className="flex flex-col items-center gap-1 text-[#004B8D]">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-[10px] font-bold">Processando GPS...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  {/* Camera capture trigger (mobile/desktop webcam) */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-8 h-8 rounded-lg bg-[#E8F1F8] hover:bg-[#004B8D] text-[#004B8D] hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    title="Tirar foto com a câmera (grava GPS e data/hora)"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  {/* Gallery upload trigger */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-8 h-8 rounded-lg bg-[#F4F6F9] hover:bg-[#004B8D] text-[#486581] hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    title="Escolher da galeria (grava GPS e data/hora)"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[10px] font-semibold text-[#486581] leading-tight">
                  Câmera / Galeria
                </span>
                <span className="text-[9px] text-[#004B8D] font-medium flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  GPS + Horário
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden inputs for camera capture and file picker */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview Dialog */}
      {previewImage && (
        <Dialog open={Boolean(previewImage)} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl bg-black/95 p-2 text-white border-0 rounded-2xl">
            <DialogHeader className="p-2 pb-0">
              <DialogTitle className="text-xs text-slate-300">
                Visualização do Registro Fotográfico
              </DialogTitle>
            </DialogHeader>
            <div className="relative flex items-center justify-center max-h-[80vh] p-2">
              <img
                src={previewImage}
                alt="Foto ampliada"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
