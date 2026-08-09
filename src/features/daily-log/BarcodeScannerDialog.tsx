import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import {
  focusVideoTrackAtPoint,
  videoTrackFromElement,
} from './focusVideoTrackAtPoint'

export interface BarcodeScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** May return a promise — the dialog now awaits it (#292) so it can show
   * a "searching" state for the gap between "barcode decoded" and "lookup
   * finished" instead of closing instantly and leaving that whole gap with
   * no visible feedback at all. */
  onScanned: (barcode: string) => void | Promise<void>
  /**
   * #661 — `product` (default) = retail UPC/EAN only; `qr` = QR codes for
   * shared-food deep links. Kept as a small enum rather than exposing
   * zxing format enums to callers.
   */
  scanKind?: 'product' | 'qr'
  /** Optional title override (#661 QR import). */
  title?: string
  /** Optional instructions override (#661 QR import). */
  instructions?: string
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
 *
 * #564 — tap inside the framing rectangle asks the camera to refocus on
 * that point (`pointsOfInterest` / `focusMode` when the device supports
 * them). Best-effort: quiet no-op on platforms without focus constraints
 * (typical iOS Safari); manual entry (#291) stays the workaround.
 */
// #294 — how long the camera-decode phase can run before the "still
// scanning" tip appears. Long enough not to flash on every normal scan
// (most resolve well under this), short enough that a genuinely stuck
// scan doesn't read as broken for too long before getting a hint.
const STILL_SCANNING_TIP_DELAY_MS = 4000
const FOCUS_RETICLE_MS = 700

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScanned,
  scanKind = 'product',
  title,
  instructions,
}: BarcodeScannerDialogProps) {
  const t = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [showStillScanningTip, setShowStillScanningTip] = useState(false)
  const [focusReticle, setFocusReticle] = useState<{
    xPct: number
    yPct: number
  } | null>(null)
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
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
          await Promise.all([import('@zxing/browser'), import('@zxing/library')])
        if (cancelled || !videoRef.current) return
        // #294 — Open Food Facts barcodes are almost always one of these
        // four retail formats; restricting the decoder to just them (out
        // of the ~18 symbologies it checks by default, including 2D
        // formats like QR/Aztec/PDF417 this app never needs) means less
        // work per frame, so a genuine barcode in view gets found faster.
        // #661 — QR import flips this to QR_CODE only for shared-food links.
        const hints = new Map()
        hints.set(
          DecodeHintType.POSSIBLE_FORMATS,
          scanKind === 'qr'
            ? [BarcodeFormat.QR_CODE]
            : [
                BarcodeFormat.UPC_A,
                BarcodeFormat.UPC_E,
                BarcodeFormat.EAN_13,
                BarcodeFormat.EAN_8,
              ],
        )
        const reader = new BrowserMultiFormatReader(hints)
        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) void handleScanned(result.getText())
          },
        )
        // #564 — prefer continuous autofocus when the track exposes it
        // (Android Chrome); ignored quietly when unsupported.
        const track = videoTrackFromElement(videoRef.current)
        if (track) {
          try {
            await track.applyConstraints({
              advanced: [
                { focusMode: 'continuous' } as MediaTrackConstraintSet,
              ],
            })
          } catch {
            // Device/browser has no focusMode — leave defaults.
          }
        }
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

  // #294 — most of the wait a scan feels is this camera-decode phase
  // itself (before a barcode is even found), which previously had no
  // feedback of its own beyond the plain camera preview. A one-shot timer
  // (not reset per-frame) is enough — it only ever needs to fire once per
  // dialog open, and clears itself on unmount/success via the same
  // cancelled-flag pattern the camera-start effect above uses.
  useEffect(() => {
    const timer = setTimeout(
      () => setShowStillScanningTip(true),
      STILL_SCANNING_TIP_DELAY_MS,
    )
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!focusReticle) return
    const timer = setTimeout(() => setFocusReticle(null), FOCUS_RETICLE_MS)
    return () => clearTimeout(timer)
  }, [focusReticle])

  function handleManualSubmit() {
    const trimmed = manualBarcode.trim()
    if (!trimmed) return
    void handleScanned(trimmed)
  }

  async function handleFramePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const frame = frameRef.current
    const video = videoRef.current
    if (!frame || !video) return

    const rect = frame.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const xNorm = (event.clientX - rect.left) / rect.width
    const yNorm = (event.clientY - rect.top) / rect.height
    setFocusReticle({ xPct: xNorm * 100, yPct: yNorm * 100 })
    await focusVideoTrackAtPoint(videoTrackFromElement(video), {
      x: xNorm,
      y: yNorm,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="fullscreen"
        closeLabel={t.dailyEntry.closeItemEditorLabel}
        className="flex flex-col gap-4"
      >
        <DialogTitle>
          {title ?? t.dailyEntry.scanBarcodeDialogTitle}
        </DialogTitle>
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
                  {instructions ?? t.dailyEntry.scanBarcodeInstructions}
                </p>
                <div className="relative flex-1">
                  <video
                    ref={videoRef}
                    className="h-full w-full rounded-lg bg-black object-cover"
                    muted
                    playsInline
                  />
                  {/* #294 — framing guide; #564 — tap inside to request
                   * focus on that point (when the device supports it). */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                    <div
                      ref={frameRef}
                      role="button"
                      tabIndex={0}
                      aria-label={t.dailyEntry.scanBarcodeTapToFocusLabel}
                      className={
                        scanKind === 'qr'
                          ? 'pointer-events-auto relative aspect-square w-full max-w-xs cursor-pointer rounded-lg border-2 border-white/80'
                          : 'pointer-events-auto relative aspect-[5/2] w-full max-w-xs cursor-pointer rounded-lg border-2 border-white/80'
                      }
                      onPointerDown={(event) => {
                        void handleFramePointerDown(event)
                      }}
                    >
                      {focusReticle && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                          style={{
                            left: `${focusReticle.xPct}%`,
                            top: `${focusReticle.yPct}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
                {showStillScanningTip && (
                  <p className="text-sm text-muted-foreground">
                    {t.dailyEntry.scanBarcodeStillScanningTip}
                  </p>
                )}
              </>
            )}
            {scanKind === 'product' ? (
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
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
