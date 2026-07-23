import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

export interface BarcodeScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** May return a promise — the dialog now awaits it (#292) so it can show
   * a "searching" state for the gap between "barcode decoded" and "lookup
   * finished" instead of closing instantly and leaving that whole gap with
   * no visible feedback at all. */
  onScanned: (barcode: string) => void | Promise<void>
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
 *
 * #291/#292: also offers a manual barcode-number entry, always available
 * alongside the camera (not just after a camera error) — useful on its
 * own for anyone who'd rather type than grant camera access, and doubles
 * as a diagnostic: if manual entry finds the food fine but the camera
 * path doesn't, that isolates a report to camera/decoding specifically
 * rather than `lookupBarcode`'s own logic. A caught camera error now also
 * includes the underlying error's name (e.g. "NotAllowedError"), visible
 * right in the existing on-screen message — the simplest way to get any
 * debug detail back from a report without new logging infrastructure.
 */
export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScanned,
}: BarcodeScannerDialogProps) {
  const t = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const controlsRef = useRef<{ stop: () => void } | null>(null)

  async function handleScanned(barcode: string) {
    controlsRef.current?.stop()
    setIsProcessing(true)
    try {
      await onScanned(barcode)
    } catch (err) {
      console.error('Barcode lookup failed', err)
    } finally {
      onOpenChange(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled || !videoRef.current) return
        const reader = new BrowserMultiFormatReader()
        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) void handleScanned(result.getText())
          },
        )
      } catch (err) {
        if (!cancelled) {
          const detail = err instanceof Error ? err.name : undefined
          setError(t.dailyEntry.scanBarcodeCameraErrorMessage(detail))
        }
      }
    }

    start()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleManualSubmit() {
    const trimmed = manualBarcode.trim()
    if (!trimmed) return
    void handleScanned(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="fullscreen"
        closeLabel={t.dailyEntry.closeItemEditorLabel}
        className="flex flex-col gap-4"
      >
        <DialogTitle>{t.dailyEntry.scanBarcodeDialogTitle}</DialogTitle>
        {isProcessing ? (
          <p className="text-sm text-muted-foreground">
            {t.dailyEntry.scanBarcodeSearchingMessage}
          </p>
        ) : (
          <>
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
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {t.dailyEntry.scanBarcodeManualLabel}
              </span>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  aria-label={t.dailyEntry.scanBarcodeManualLabel}
                  placeholder={t.dailyEntry.scanBarcodeManualPlaceholder}
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleManualSubmit()
                    }
                  }}
                  className="h-12 flex-1 text-base"
                />
                <Button
                  type="button"
                  disabled={!manualBarcode.trim()}
                  onClick={handleManualSubmit}
                >
                  {t.dailyEntry.scanBarcodeManualSubmitLabel}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
