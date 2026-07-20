import { useState } from 'react'
import type { CalorieItem } from '@/domain/dailyEntry'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'

export interface RepeatMealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The label shown in the dialog title — the *new* meal's own effective
   * label (position-derived default, or `previousMeal.label` if it had a
   * custom one), not necessarily identical to how yesterday's meal reads,
   * matching what `repeatMealLabel` already shows on the trigger button. */
  mealLabel: string
  items: CalorieItem[]
  /** Called with just the checked subset (#202) — cloning (fresh ids,
   * dropping emotion) stays MealList's own job, same as before, so this
   * dialog only ever deals in the *original* yesterday's items. */
  onConfirm: (selectedItems: CalorieItem[]) => void
}

/**
 * Preview + selective picking (#202) for "Repeat yesterday's [meal]" — #190
 * shipped that action as an immediate one-tap commit, the only add-path in
 * the app with no confirmation step (Find Food, manual entry, and
 * multi-add all show something before committing). Reuses #183's
 * checkbox-then-confirm pattern, same shape as `FoodPickerDialog`, so this
 * is a consistent flow rather than a new one — all dishes start checked
 * (matching the old all-or-nothing behavior as the default), but any can
 * be unchecked before confirming.
 */
export function RepeatMealDialog({
  open,
  onOpenChange,
  mealLabel,
  items,
  onConfirm,
}: RepeatMealDialogProps) {
  const t = useTranslation()
  const locale = useLocale()
  const [uncheckedIds, setUncheckedIds] = useState<Set<string>>(new Set())

  const selectedItems = items.filter((item) => !uncheckedIds.has(item.id))

  function toggleItem(id: string) {
    setUncheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.dailyEntry.closeFoodDialogLabel}>
        <DialogTitle>{t.dailyEntry.repeatMealDialogTitle(mealLabel)}</DialogTitle>
        <div className="flex flex-col gap-3 pt-2">
          <ul className="flex flex-col rounded-lg border border-border">
            {items.map((item) => {
              const checked = !uncheckedIds.has(item.id)
              const itemMacros = macrosSummaryTextCompact(
                item.proteinG,
                item.fatG,
                item.carbsG,
                locale,
                t,
              )
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    className={cn(
                      'flex w-full items-start gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted',
                      checked && 'border-2 border-primary bg-primary/15 font-medium',
                    )}
                    onClick={() => toggleItem(item.id)}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-border',
                        checked && 'border-primary bg-primary text-primary-foreground',
                      )}
                    />
                    <span className="flex flex-col">
                      <span>{item.name || t.dailyEntry.itemNamePlaceholder}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {formatNumber(item.amountKcal, locale, 0)}{' '}
                        {t.dailyEntry.kcalUnit}
                        {itemMacros && ` · ${itemMacros}`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <Button
            type="button"
            disabled={selectedItems.length === 0}
            onClick={() => onConfirm(selectedItems)}
          >
            {t.dailyEntry.addSelectedFoodsButton(selectedItems.length)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
