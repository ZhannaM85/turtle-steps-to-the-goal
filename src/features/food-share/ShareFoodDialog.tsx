import { useEffect, useState } from 'react'
import { Check, Copy, QrCode, Share2 } from 'lucide-react'
import type { MealItem } from '@/domain/mealItem'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { buildShareFoodUrl } from './buildShareFoodUrl'
import { generateQrDataUrl } from './generateQrDataUrl'
import { mealItemToSharedFoodPayload } from './sharedFoodPayload'

export interface ShareFoodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: MealItem | null
}

/**
 * #661 — share a personal meal-library food via the OS share sheet and/or
 * a QR code encoding the same deep-link URL.
 *
 * Body mounts only while open+item so URL/QR state doesn't need a sync
 * setState-in-effect reset on close.
 */
export function ShareFoodDialog({
  open,
  onOpenChange,
  item,
}: ShareFoodDialogProps) {
  const t = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.settings.shareFoodCloseLabel}>
        <DialogTitle>{t.settings.shareFoodDialogTitle}</DialogTitle>
        <DialogDescription>
          {item
            ? t.settings.shareFoodDialogDescription(item.name)
            : t.settings.shareFoodDialogTitle}
        </DialogDescription>
        {open && item ? <ShareFoodDialogBody item={item} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ShareFoodDialogBody({ item }: { item: MealItem }) {
  const t = useTranslation()
  const payload = mealItemToSharedFoodPayload(item)
  const [shareUrl] = useState(() => buildShareFoodUrl(payload))
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
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
  }, [shareUrl])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleNativeShare() {
    if (!canNativeShare) return
    setShareError(null)
    try {
      await navigator.share({
        title: t.settings.shareFoodShareTitle(item.name),
        text: t.settings.shareFoodShareText(item.name),
        url: shareUrl,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setShareError(t.settings.shareFoodShareFailedMessage)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-2">
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt={t.settings.shareFoodQrAlt(item.name)}
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
        {t.settings.shareFoodQrHint}
      </p>
      <div className="flex w-full flex-wrap justify-center gap-2">
        {canNativeShare ? (
          <Button type="button" onClick={() => void handleNativeShare()}>
            <Share2 aria-hidden="true" />
            {t.settings.shareFoodNativeShareButton}
          </Button>
        ) : null}
        <Button
          type="button"
          variant={canNativeShare ? 'outline' : 'default'}
          onClick={() => void handleCopy()}
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied
            ? t.settings.shareFoodLinkCopiedLabel
            : t.settings.shareFoodCopyLinkButton}
        </Button>
      </div>
      {shareError ? (
        <p className="text-sm text-destructive">{shareError}</p>
      ) : null}
    </div>
  )
}
