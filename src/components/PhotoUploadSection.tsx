import React, { useRef, useState } from 'react'
import { Camera, Image as ImageIcon, Trash2, Loader2, Eye, X, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getVistoriaItemPhotoUrl } from '@/services/vistorias'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface PhotoUploadSectionProps {
  itemId?: string
  existingPhotos: string[] // filenames in PocketBase
  pendingFiles: File[]
  onAddFiles: (files: File[]) => void
  onRemovePendingFile: (index: number) => void
  onDeleteExistingPhoto: (filename: string) => void
  disabled?: boolean
}

export function PhotoUploadSection({
  itemId,
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

  const totalCount = existingPhotos.length + pendingFiles.length
  const maxReached = totalCount >= 3

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const incoming = Array.from(e.target.files)
    const availableSlots = Math.max(0, 3 - totalCount)
    const toAdd = incoming.slice(0, availableSlots)
    if (toAdd.length > 0) {
      onAddFiles(toAdd)
    }
    // reset input
    e.target.value = ''
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
        {existingPhotos.map((photoName) => {
          const photoUrl = itemId
            ? getVistoriaItemPhotoUrl({ id: itemId, collectionName: 'vistoria_itens' }, photoName)
            : ''

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
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewImage(photoUrl)}
                  className="w-7 h-7 rounded-full bg-white/90 text-[#102A43] hover:bg-white flex items-center justify-center shadow-sm cursor-pointer"
                  title="Ampliar foto"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
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
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewImage(localUrl)}
                  className="w-7 h-7 rounded-full bg-white/90 text-[#102A43] hover:bg-white flex items-center justify-center shadow-sm cursor-pointer"
                  title="Ampliar foto"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
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
            <div className="flex items-center gap-1">
              {/* Camera capture trigger (mobile/desktop webcam) */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-8 h-8 rounded-lg bg-[#E8F1F8] hover:bg-[#004B8D] text-[#004B8D] hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Tirar foto com a câmera"
              >
                <Camera className="w-4 h-4" />
              </button>
              {/* Gallery upload trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-lg bg-[#F4F6F9] hover:bg-[#004B8D] text-[#486581] hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Escolher da galeria"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            </div>
            <span className="text-[10px] font-semibold text-[#486581] leading-tight">
              Câmera / Galeria
            </span>
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
          <DialogContent className="max-w-2xl bg-black/95 p-2 text-white border-0">
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
