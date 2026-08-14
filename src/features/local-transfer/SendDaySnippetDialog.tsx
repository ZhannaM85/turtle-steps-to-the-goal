import { useEffect, useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import type { DailyEntry } from '@/domain/dailyEntry'
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
import {
  buildDaySnippetUrl,
  dailyEntryToDaySnippet,
  daySnippetHasSendableContent,
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
 * #720 — what-to-send sheet from Day’s refresh control. Whole day first.
 * QR is #722. Paste/receive is #721.
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
  const payload =
    entry && entry.date === date ? dailyEntryToDaySnippet(entry) : null
  const canSend = payload ? daySnippetHasSendableContent(payload) : false
  const shareUrl = canSend && payload ? buildDaySnippetUrl(payload) : null
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [pasteValue, setPasteValue] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

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

  if (!canSend || !shareUrl) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <p className="text-sm text-muted-foreground">{t.today.sendDayNothingLogged}</p>
        <ReceiveDayPaste
          pasteValue={pasteValue}
          pasteError={pasteError}
          setPasteValue={setPasteValue}
          setPasteError={setPasteError}
          onParsed={(parsed) => {
            onOpenChange(false)
            openConfirm(parsed)
          }}
        />
      </div>
    )
  }

  return (
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
      <ReceiveDayPaste
        pasteValue={pasteValue}
        pasteError={pasteError}
        setPasteValue={setPasteValue}
        setPasteError={setPasteError}
        onParsed={(parsed) => {
          onOpenChange(false)
          openConfirm(parsed)
        }}
      />
    </div>
  )
}

function ReceiveDayPaste({
  pasteValue,
  pasteError,
  setPasteValue,
  setPasteError,
  onParsed,
}: {
  pasteValue: string
  pasteError: string | null
  setPasteValue: (value: string) => void
  setPasteError: (value: string | null) => void
  onParsed: (payload: NonNullable<ReturnType<typeof parseDaySnippetFromText>>) => void
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
