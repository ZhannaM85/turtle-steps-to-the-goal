import { useEffect, useState } from 'react'
import { Check, Copy, QrCode, Share2 } from 'lucide-react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { BarcodeScannerDialog } from '@/features/daily-log/BarcodeScannerDialog'
import { generateQrDataUrl } from '@/features/food-share/generateQrDataUrl'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { classifyShareScan } from './classifyShareScan'
import {
  buildDaySnippetUrl,
  dailyEntryToDaySnippet,
  daySnippetFitsQr,
  daySnippetHasSendableContent,
  encodeDaySnippetPayload,
  parseDaySnippetFromText,
} from './daySnippetPayload'
import { useDayTransferUiStore } from './dayTransferUiStore'

export interface SendDaySnippetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  entry: DailyEntry | null
}

/**
 * #720 / #722 / #723 — send sheet: copy/share/QR, paste, or scan a QR.
 */
export function SendDaySnippetDialog({
  open,
  onOpenChange,
  date,
  entry,
}: SendDaySnippetDialogProps) {
  const t = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.today.importDayCancel}>
        <DialogTitle>{t.today.sendDayDialogTitle}</DialogTitle>
        <DialogDescription>{t.today.sendDayDialogDescription}</DialogDescription>
        {open ? (
          <SendDaySnippetBody
            date={date}
            entry={entry}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function SendDaySnippetBody({
  date,
  entry,
  onOpenChange,
}: {
  date: string
  entry: DailyEntry | null
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslation()
  const openConfirm = useDayTransferUiStore((state) => state.openConfirm)
  // Snapshot once on mount (body only mounts while the sheet is open), same
  // as ShareFoodDialog. Recomputing `dailyEntryToDaySnippet` each render
  // used to mint a new `createdAt` and regenerate the QR forever (#741).
  const [{ canSend, shareUrl, qrFits }] = useState(() => {
    const payload =
      entry && entry.date === date ? dailyEntryToDaySnippet(entry) : null
    const canSend = payload ? daySnippetHasSendableContent(payload) : false
    const shareUrl = canSend && payload ? buildDaySnippetUrl(payload) : null
    const qrFits =
      canSend && payload
        ? daySnippetFitsQr(encodeDaySnippetPayload(payload))
        : false
    return { canSend, shareUrl, qrFits }
  })
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [pasteValue, setPasteValue] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    if (!shareUrl || !qrFits) return
    let cancelled = false
    void generateQrDataUrl(shareUrl)
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [shareUrl, qrFits])

  async function handleNativeShare() {
    if (!shareUrl || !canNativeShare) return
    setShareError(null)
    try {
      await navigator.share({
        title: t.today.sendDayShareTitle(date),
        text: t.today.sendDayShareText(date),
        url: shareUrl,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setShareError(t.today.sendDayShareFailed)
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
  }

  function handleQrScanned(text: string) {
    const kind = classifyShareScan(text)
    if (kind === 'day') {
      const parsed = parseDaySnippetFromText(text)
      if (parsed) {
        onOpenChange(false)
        openConfirm(parsed)
      }
      return
    }
    setPasteError(
      kind === 'food'
        ? t.today.receiveDayScanIsFood
        : t.today.receiveDayScanUnreadable,
    )
  }

  const receive = (
    <ReceiveDayPaste
      pasteValue={pasteValue}
      pasteError={pasteError}
      setPasteValue={setPasteValue}
      setPasteError={setPasteError}
      onScan={() => setScanOpen(true)}
      onParsed={(parsed) => {
        onOpenChange(false)
        openConfirm(parsed)
      }}
    />
  )

  return (
    <>
      {!canSend || !shareUrl ? (
        <div className="flex flex-col gap-4 pt-2">
          <p className="text-sm text-muted-foreground">{t.today.sendDayNothingLogged}</p>
          {receive}
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-2">
          <p className="text-sm font-medium">{t.today.sendDayWholeDayLabel}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleCopy()}>
              {copied ? <Check /> : <Copy />}
              {copied ? t.today.sendDayCopied : t.today.sendDayCopyButton}
            </Button>
            {canNativeShare ? (
              <Button type="button" variant="outline" onClick={() => void handleNativeShare()}>
                <Share2 />
                {t.today.sendDayShareButton}
              </Button>
            ) : null}
          </div>
          {shareError ? (
            <p className="text-sm text-destructive">{shareError}</p>
          ) : null}
          {qrFits ? (
            <div className="flex flex-col items-center gap-2">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={t.today.sendDayQrAlt}
                  width={256}
                  height={256}
                  className="rounded-lg border border-border bg-white p-2"
                />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                  <QrCode aria-hidden="true" className="size-10 opacity-40" />
                </div>
              )}
              <p className="text-center text-xs text-muted-foreground">
                {t.today.sendDayQrHint}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.today.sendDayQrTooLarge}</p>
          )}
          {receive}
        </div>
      )}
      {scanOpen ? (
        <BarcodeScannerDialog
          open={scanOpen}
          onOpenChange={setScanOpen}
          scanKind="qr"
          title={t.today.receiveDayScanQrTitle}
          instructions={t.today.receiveDayScanQrInstructions}
          onScanned={handleQrScanned}
        />
      ) : null}
    </>
  )
}

function ReceiveDayPaste({
  pasteValue,
  pasteError,
  setPasteValue,
  setPasteError,
  onParsed,
  onScan,
}: {
  pasteValue: string
  pasteError: string | null
  setPasteValue: (value: string) => void
  setPasteError: (value: string | null) => void
  onParsed: (payload: NonNullable<ReturnType<typeof parseDaySnippetFromText>>) => void
  onScan: () => void
}) {
  const t = useTranslation()

  function handlePasteSubmit() {
    const decoded = parseDaySnippetFromText(pasteValue)
    if (!decoded) {
      setPasteError(t.today.receiveDayPasteInvalid)
      return
    }
    setPasteValue('')
    setPasteError(null)
    onParsed(decoded)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" variant="outline" className="self-start" onClick={onScan}>
        {t.today.receiveDayScanQrButton}
      </Button>
      <Label htmlFor="receive-day-paste">{t.today.receiveDayPasteLabel}</Label>
      <Input
        id="receive-day-paste"
        value={pasteValue}
        onChange={(event) => {
          setPasteValue(event.target.value)
          setPasteError(null)
        }}
        placeholder={t.today.receiveDayPastePlaceholder}
      />
      {pasteError ? (
        <p className="text-sm text-destructive">{pasteError}</p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={!pasteValue.trim()}
        onClick={handlePasteSubmit}
      >
        {t.today.receiveDayPasteSubmit}
      </Button>
    </div>
  )
}
