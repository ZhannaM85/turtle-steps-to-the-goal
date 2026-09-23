import { useState } from 'react'
import type { MealItem } from '@/domain/mealItem'
import { useLocale, useTranslation } from '@/i18n'
import { formatKcal, formatMacroGrams } from '@/shared/lib/macroDisplay'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  findMatchingMealItem,
  sharedFoodAbsoluteNutrition,
  sharedFoodServings,
  type SharedFoodPayload,
} from './sharedFoodPayload'

export interface ImportedSharedFood {
  name: string
  brand?: string
  barcode?: string
  nutrition: {
    amountKcal?: number
    proteinG?: number
    fatG?: number
    carbsG?: number
    amountG?: number
  }
  servings?: MealItem['servings']
  existingId?: string
}

export interface ImportSharedFoodsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payloads: readonly SharedFoodPayload[] | null
  existingItems: readonly MealItem[]
  onConfirm: (results: ImportedSharedFood[]) => void | Promise<void>
}

/**
 * #982 — review a batch share, then add every food (or update a
 * barcode/name match) in one confirm. Per-field edit stays on the
 * single-food dialog.
 */
export function ImportSharedFoodsDialog({
  open,
  onOpenChange,
  payloads,
  existingItems,
  onConfirm,
}: ImportSharedFoodsDialogProps) {
  const t = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.settings.shareFoodCloseLabel}>
        <DialogTitle>{t.settings.importSharedFoodsDialogTitle}</DialogTitle>
        <DialogDescription>
          {t.settings.importSharedFoodsDialogDescription}
        </DialogDescription>
        {open && payloads && payloads.length > 0 ? (
          <ImportSharedFoodsFields
            payloads={payloads}
            existingItems={existingItems}
            onConfirm={onConfirm}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ImportSharedFoodsFields({
  payloads,
  existingItems,
  onConfirm,
  onOpenChange,
}: {
  payloads: readonly SharedFoodPayload[]
  existingItems: readonly MealItem[]
  onConfirm: ImportSharedFoodsDialogProps['onConfirm']
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslation()
  const locale = useLocale()
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    if (busy) return
    setBusy(true)
    try {
      await onConfirm(
        payloads.map((payload) => {
          const match = findMatchingMealItem(payload, existingItems)
          return {
            name: payload.name,
            brand: payload.brand,
            barcode: payload.barcode,
            nutrition: sharedFoodAbsoluteNutrition(payload),
            servings: sharedFoodServings(payload),
            existingId: match?.id,
          }
        }),
      )
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <ul className="flex flex-col divide-y divide-foreground/15 rounded-xl border border-border px-3">
        {payloads.map((payload, index) => {
          const nutrition = sharedFoodAbsoluteNutrition(payload)
          const match = findMatchingMealItem(payload, existingItems)
          const grams =
            nutrition.amountG !== undefined
              ? formatMacroGrams(nutrition.amountG, locale, t)
              : null
          return (
            <li key={`${payload.name}-${index}`} className="py-2 text-sm">
              <p className="font-medium text-foreground">{payload.name}</p>
              <p className="text-muted-foreground">
                {formatKcal(nutrition.amountKcal, locale, t)}
                {grams ? ` · ${grams}` : ''}
              </p>
              {match ? (
                <p className="text-muted-foreground">
                  {t.settings.importSharedFoodsAlreadyHaveLabel}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" disabled={busy} onClick={() => void handleConfirm()}>
          {t.settings.importSharedFoodsAddButton}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          {t.settings.importSharedFoodCancelButton}
        </Button>
      </div>
    </div>
  )
}
