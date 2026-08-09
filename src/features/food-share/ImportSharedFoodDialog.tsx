import { useState } from 'react'
import type { MealItem } from '@/domain/mealItem'
import { useTranslation } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
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
  findMatchingMealItem,
  sharedFoodAbsoluteNutrition,
  sharedFoodServings,
  type SharedFoodPayload,
} from './sharedFoodPayload'

export interface ImportSharedFoodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payload: SharedFoodPayload | null
  existingItems: readonly MealItem[]
  onConfirm: (result: {
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
  }) => void | Promise<void>
}

/**
 * #661 — review/edit a received shared food before adding it (or updating
 * a barcode/name match in the receiver's library).
 *
 * Fields mount only while open+payload so draft state is initialized from
 * the payload without a setState-in-effect reset (same lazy-mount pattern
 * as BarcodeScannerDialog).
 */
export function ImportSharedFoodDialog({
  open,
  onOpenChange,
  payload,
  existingItems,
  onConfirm,
}: ImportSharedFoodDialogProps) {
  const t = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.settings.shareFoodCloseLabel}>
        <DialogTitle>{t.settings.importSharedFoodDialogTitle}</DialogTitle>
        <DialogDescription>
          {t.settings.importSharedFoodDialogDescription}
        </DialogDescription>
        {open && payload ? (
          <ImportSharedFoodFields
            payload={payload}
            existingItems={existingItems}
            onConfirm={onConfirm}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ImportSharedFoodFields({
  payload,
  existingItems,
  onConfirm,
  onOpenChange,
}: {
  payload: SharedFoodPayload
  existingItems: readonly MealItem[]
  onConfirm: ImportSharedFoodDialogProps['onConfirm']
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslation()
  const nutrition = sharedFoodAbsoluteNutrition(payload)
  const [name, setName] = useState(payload.name)
  const [brand, setBrand] = useState(payload.brand ?? '')
  const [barcode, setBarcode] = useState(payload.barcode ?? '')
  const [amountG, setAmountG] = useState(
    nutrition.amountG !== undefined ? String(nutrition.amountG) : '',
  )
  const [kcal, setKcal] = useState(
    nutrition.amountKcal !== undefined ? String(nutrition.amountKcal) : '',
  )
  const [protein, setProtein] = useState(
    nutrition.proteinG !== undefined ? String(nutrition.proteinG) : '',
  )
  const [fat, setFat] = useState(
    nutrition.fatG !== undefined ? String(nutrition.fatG) : '',
  )
  const [carbs, setCarbs] = useState(
    nutrition.carbsG !== undefined ? String(nutrition.carbsG) : '',
  )
  const [busy, setBusy] = useState(false)

  const match = findMatchingMealItem(payload, existingItems)

  async function handleConfirm(updateExisting: boolean) {
    const trimmedName = name.trim()
    if (!trimmedName || busy) return
    const amountKcal = parseNumberInput(kcal)
    setBusy(true)
    try {
      await onConfirm({
        name: trimmedName,
        brand: brand.trim() || undefined,
        barcode: barcode.trim() || undefined,
        nutrition: {
          amountKcal: amountKcal,
          proteinG: parseNumberInput(protein),
          fatG: parseNumberInput(fat),
          carbsG: parseNumberInput(carbs),
          amountG: parseNumberInput(amountG),
        },
        servings: sharedFoodServings(payload),
        existingId: updateExisting ? match?.id : undefined,
      })
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      {match ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
          {t.settings.importSharedFoodMatchMessage(match.name)}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <Label htmlFor="import-shared-food-name">
          {t.settings.mealItemNameLabel}
        </Label>
        <Input
          id="import-shared-food-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="import-shared-food-brand">
          {t.settings.importSharedFoodBrandLabel}
        </Label>
        <Input
          id="import-shared-food-brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {t.settings.importSharedFoodBrandHint}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="import-shared-food-barcode">
          {t.settings.importSharedFoodBarcodeLabel}
        </Label>
        <Input
          id="import-shared-food-barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="import-shared-food-kcal">
            {t.dailyEntry.addCaloriesPortionLabel}
          </Label>
          <Input
            id="import-shared-food-kcal"
            inputMode="decimal"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="import-shared-food-protein">
            {t.dailyEntry.proteinLabel}
          </Label>
          <Input
            id="import-shared-food-protein"
            inputMode="decimal"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="import-shared-food-fat">
            {t.dailyEntry.fatLabel}
          </Label>
          <Input
            id="import-shared-food-fat"
            inputMode="decimal"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="import-shared-food-carbs">
            {t.dailyEntry.carbsLabel}
          </Label>
          <Input
            id="import-shared-food-carbs"
            inputMode="decimal"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="import-shared-food-grams">
            {t.settings.importSharedFoodGramsLabel}
          </Label>
          <Input
            id="import-shared-food-grams"
            inputMode="decimal"
            value={amountG}
            onChange={(e) => setAmountG(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {match ? (
          <>
            <Button
              type="button"
              disabled={busy || !name.trim()}
              onClick={() => void handleConfirm(true)}
            >
              {t.settings.importSharedFoodUpdateButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {t.settings.importSharedFoodSkipButton}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              disabled={busy || !name.trim()}
              onClick={() => void handleConfirm(false)}
            >
              {t.settings.importSharedFoodAddButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {t.settings.importSharedFoodCancelButton}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
