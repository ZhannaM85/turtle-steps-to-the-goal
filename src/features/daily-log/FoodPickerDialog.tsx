import { useState } from 'react'
import { type FoodItem, foods } from '@/data/foods'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

export interface FoodPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (values: {
    amountKcal: number
    proteinG: number
    fatG: number
    carbsG: number
    note: string
  }) => void
}

/** Quantity-based entry against the static food list (#62) — search, pick
 * one, scale its per-100g macros by quantity, and hand the computed numbers
 * back to the caller as a normal meal (flat CalorieEntry, same shape manual
 * entry produces — no separate "food entry" data model). */
export function FoodPickerDialog({
  open,
  onOpenChange,
  onAdd,
}: FoodPickerDialogProps) {
  const t = useTranslation()
  const locale = useLocale()
  const [search, setSearch] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [quantity, setQuantity] = useState('100')

  const query = search.trim().toLowerCase()
  const matches = query
    ? foods.filter((food) => food[locale].toLowerCase().includes(query))
    : foods

  const quantityNum = parseNumberInput(quantity)
  const canAdd =
    selectedFood !== null && quantityNum !== undefined && quantityNum > 0

  function reset() {
    setSearch('')
    setSelectedFood(null)
    setQuantity('100')
  }

  function handleAdd() {
    if (!selectedFood || quantityNum === undefined || quantityNum <= 0) return
    const scale = quantityNum / 100
    onAdd({
      amountKcal: Math.round(selectedFood.kcal100 * scale),
      proteinG: Math.round(selectedFood.protein100 * scale * 10) / 10,
      fatG: Math.round(selectedFood.fat100 * scale * 10) / 10,
      carbsG: Math.round(selectedFood.carbs100 * scale * 10) / 10,
      note: selectedFood[locale],
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent closeLabel={t.dailyEntry.closeFoodDialogLabel}>
        <DialogTitle>{t.dailyEntry.addFoodDialogTitle}</DialogTitle>
        <div className="flex flex-col gap-3 pt-2">
          <Input
            type="text"
            aria-label={t.dailyEntry.foodSearchLabel}
            placeholder={t.dailyEntry.foodSearchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedFood(null)
            }}
          />
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.dailyEntry.noFoodResultsText}
            </p>
          ) : (
            /* No independent scroll region here (#74) — nested scroll
             * containers on mobile made it unclear the list continued past
             * the first ~6 visible rows. The whole dialog scrolls as one
             * unit instead (see shared/ui/dialog.tsx's max-h-[85dvh]). */
            <ul className="flex flex-col rounded-lg border border-border">
              {matches.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    aria-pressed={selectedFood?.id === food.id}
                    className={cn(
                      'flex w-full flex-col px-2.5 py-1.5 text-left text-sm hover:bg-muted',
                      selectedFood?.id === food.id && 'bg-muted font-medium',
                    )}
                    onClick={() => setSelectedFood(food)}
                  >
                    <span>{food[locale]}</span>
                    {/* Per-100g preview (#75) — lets you sanity-check a food's
                     * numbers before picking it, rather than only finding out
                     * after it's added as a meal. */}
                    <span className="text-xs font-normal text-muted-foreground">
                      {formatNumber(food.kcal100, locale, 0)}{' '}
                      {t.dailyEntry.kcalUnit} {t.dailyEntry.per100gLabel} ·{' '}
                      {macrosSummaryTextCompact(
                        food.protein100,
                        food.fat100,
                        food.carbs100,
                        locale,
                        t,
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedFood && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t.dailyEntry.foodQuantityLabel}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={t.dailyEntry.foodQuantityLabel}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-8 w-20"
              />
            </div>
          )}
          <Button
            type="button"
            disabled={!canAdd}
            onClick={handleAdd}
            aria-label={t.dailyEntry.addFoodConfirmLabel}
          >
            {t.dailyEntry.addButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
