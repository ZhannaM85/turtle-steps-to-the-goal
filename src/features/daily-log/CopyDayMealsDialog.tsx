import { useState } from 'react'
import type { CalorieEntry, CalorieItem } from '@/domain/dailyEntry'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { effectiveMealLabel } from '@/shared/lib/mealLabel'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'

export interface CopyDayMealsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealGroups: CalorieEntry[]
  /** Called with just the checked items, still grouped by their original
   * meal — a group with nothing left checked is dropped entirely. Cloning
   * (fresh ids, dropping emotion) and appending to today's own list stays
   * the caller's job, same division `RepeatMealDialog` already uses. */
  onConfirm: (
    selectedGroups: { label: string | undefined; items: CalorieItem[] }[],
  ) => void
}

/**
 * #253 — whole-day sibling of `RepeatMealDialog` (#190/#202): same
 * checkbox-then-confirm preview, extended over every meal group in the
 * source day instead of just one. Each group keeps its own header (its
 * effective label, positional or custom) so the source day's structure is
 * visible while picking, not just a flattened dish list.
 */
export function CopyDayMealsDialog({
  open,
  onOpenChange,
  mealGroups,
  onConfirm,
}: CopyDayMealsDialogProps) {
  const t = useTranslation()
  const locale = useLocale()
  const [uncheckedIds, setUncheckedIds] = useState<Set<string>>(new Set())

  function toggleItem(id: string) {
    setUncheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedGroups = mealGroups
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => !uncheckedIds.has(item.id)),
    }))
    .filter((group) => group.items.length > 0)
  const totalSelected = selectedGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.dailyEntry.closeFoodDialogLabel}>
        <DialogTitle>{t.dailyEntry.copyDayMealsDialogTitle}</DialogTitle>
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pt-2">
          {mealGroups.map((group, index) => (
            <div key={group.id} className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {effectiveMealLabel(t, index + 1, group.label)}
              </span>
              <ul className="flex flex-col rounded-lg border border-border">
                {group.items.map((item) => {
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
                          checked &&
                            'border-2 border-primary bg-primary/15 font-medium',
                        )}
                        onClick={() => toggleItem(item.id)}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-border',
                            checked &&
                              'border-primary bg-primary text-primary-foreground',
                          )}
                        />
                        <span className="flex flex-col">
                          <span>
                            {item.name || t.dailyEntry.itemNamePlaceholder}
                          </span>
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
            </div>
          ))}
          <Button
            type="button"
            disabled={totalSelected === 0}
            onClick={() => onConfirm(selectedGroups)}
          >
            {t.dailyEntry.addSelectedFoodsButton(totalSelected)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
