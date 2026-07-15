import { useState } from 'react'
import { type FoodItem, foods } from '@/data/foods'
import { useLocale, useTranslation } from '@/i18n'
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
            <ul className="flex max-h-48 flex-col overflow-y-auto rounded-lg border border-border">
              {matches.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    aria-pressed={selectedFood?.id === food.id}
                    className={cn(
                      'w-full px-2.5 py-1.5 text-left text-sm hover:bg-muted',
                      selectedFood?.id === food.id && 'bg-muted font-medium',
                    )}
                    onClick={() => setSelectedFood(food)}
                  >
                    {food[locale]}
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
