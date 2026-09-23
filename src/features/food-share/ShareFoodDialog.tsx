import { useState } from 'react'
import type { MealItem } from '@/domain/mealItem'
import { useTranslation } from '@/i18n'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { buildShareFoodBatchUrl, buildShareFoodUrl } from './buildShareFoodUrl'
import { mealItemsToSharedFoodPayloads } from './sharedFoodBatchPayload'
import { mealItemToSharedFoodPayload } from './sharedFoodPayload'
import { ShareFoodQrPanel } from './ShareFoodQrPanel'

export interface ShareFoodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: MealItem | null
  /** #982 — two or more foods share one QR / link. One food stays `item`. */
  items?: readonly MealItem[] | null
}

/**
 * #661 — share a personal meal-library food via the OS share sheet and/or
 * a QR code encoding the same deep-link URL. #982 reuses the sheet for a
 * whole meal composition.
 *
 * Body mounts only while open so URL/QR state doesn't need a sync
 * setState-in-effect reset on close.
 */
export function ShareFoodDialog({
  open,
  onOpenChange,
  item,
  items = null,
}: ShareFoodDialogProps) {
  const t = useTranslation()
  const batch = items && items.length >= 2 ? items : null
  const single = batch ? null : item

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.settings.shareFoodCloseLabel}>
        <DialogTitle>
          {batch
            ? t.settings.shareFoodsDialogTitle
            : t.settings.shareFoodDialogTitle}
        </DialogTitle>
        <DialogDescription>
          {batch
            ? t.settings.shareFoodsDialogDescription(batch.length)
            : single
              ? t.settings.shareFoodDialogDescription(single.name)
              : t.settings.shareFoodDialogTitle}
        </DialogDescription>
        {open && batch ? <ShareFoodBatchBody items={batch} /> : null}
        {open && single ? <ShareFoodSingleBody item={single} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ShareFoodSingleBody({ item }: { item: MealItem }) {
  const t = useTranslation()
  const payload = mealItemToSharedFoodPayload(item)
  const [shareUrl] = useState(() => buildShareFoodUrl(payload))

  return (
    <ShareFoodQrPanel
      shareUrl={shareUrl}
      qrAlt={t.settings.shareFoodQrAlt(item.name)}
      nativeShareTitle={t.settings.shareFoodShareTitle(item.name)}
      nativeShareText={t.settings.shareFoodShareText(item.name)}
    />
  )
}

function ShareFoodBatchBody({ items }: { items: readonly MealItem[] }) {
  const t = useTranslation()
  const payloads = mealItemsToSharedFoodPayloads(items)
  const [shareUrl] = useState(() => buildShareFoodBatchUrl(payloads))
  const names = items.map((item) => item.name).join(', ')

  return (
    <>
      <ul className="flex flex-col gap-1 text-sm text-foreground">
        {items.map((item, index) => (
          <li key={`${item.id}-${index}`}>{item.name}</li>
        ))}
      </ul>
      <ShareFoodQrPanel
        shareUrl={shareUrl}
        qrAlt={t.settings.shareFoodsQrAlt(items.length)}
        nativeShareTitle={t.settings.shareFoodsShareTitle(items.length)}
        nativeShareText={t.settings.shareFoodsShareText(names)}
      />
    </>
  )
}
