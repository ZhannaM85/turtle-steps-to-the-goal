import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/i18n'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'

export interface BarcodeScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanned: (barcode: string) => void
}

/**
 * Live camera barcode scanning (#256) — lazy-loads `@zxing/browser` only
 * once actually opened (`await import(...)`, same on-demand pattern
 * `exportXlsx.ts` already uses for `exceljs`) rather than paying for the
 * decoding library on every load of the add-meal flow. Safari has no
 * native `BarcodeDetector` support and this app cares a lot about iOS, so
 * this can't rely on that browser API the way a Chromium-only
 * implementation could.
 *
 * The caller is expected to *lazily mount* this (`{open && <BarcodeScanner
 * Dialog .../>}`, same pattern `FoodPickerDialog` uses) rather than always
 * rendering it with `open` toggling — a fresh mount each time naturally
 * resets `error` back to null and starts a new camera session, without an
 * effect needing to reset that state itself (calling setState
 * unconditionally at the top of an effect trips the React Compiler's
 * `react-hooks/set-state-in-effect` rule, #159's real CI-blocking gate).
 */
export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScanned,
}: BarcodeScannerDialogProps) {
  const t = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // IScannerControls['stop'] — typed loosely since it only comes from
    // the dynamically-imported module, not a static import.
    let controls: { stop: () => void } | null = null

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled || !videoRef.current) return
        const reader = new BrowserMultiFormatReader()
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) {
              onScanned(result.getText())
              onOpenChange(false)
            }
          },
        )
      } catch {
        if (!cancelled) setError(t.dailyEntry.scanBarcodeCameraErrorMessage)
      }
    }

    start()

    return () => {
      cancelled = true
      controls?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="fullscreen"
        closeLabel={t.dailyEntry.closeItemEditorLabel}
        className="flex flex-col gap-4"
      >
        <DialogTitle>{t.dailyEntry.scanBarcodeDialogTitle}</DialogTitle>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t.dailyEntry.scanBarcodeInstructions}
            </p>
            <video
              ref={videoRef}
              className="w-full flex-1 rounded-lg bg-black object-cover"
              muted
              playsInline
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
