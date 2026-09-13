import type { ReactNode } from 'react'
import { Pencil, Share2, Trash2 } from 'lucide-react'
import type { CalorieItem, Emotion } from '@/domain/dailyEntry'
import type { NutritionFactId } from '@/domain/nutritionFacts'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { DAY_EMOTIONS } from '@/shared/lib/emotionIcons'
import {
  formatMacroGrams,
  macrosSummaryTextCompact,
} from '@/shared/lib/macroDisplay'
import { Button } from '@/shared/ui/button'
import { ConfirmDeleteEntryBar } from './ConfirmDeleteEntryBar'
import { EmotionPicker } from './EmotionPicker'

export function AddMealDialogComposition({
  items,
  mealLabel,
  reaction,
  onReactionChange,
  mealNoteField,
  showDoneWhenEmpty,
  todayTotalPreview,
  todayRemainingPreview,
  newlySatisfiedFactIds,
  onStartEditItem,
  onShareItem,
  onRequestRemoveItem,
  onDeleteMeal,
  mealPosition,
  isConfirmingMealDelete,
  onConfirmingMealDeleteChange,
}: {
  items: CalorieItem[]
  mealLabel: string
  reaction: Emotion | undefined
  onReactionChange: (reaction: Emotion | undefined) => void
  mealNoteField: ReactNode
  showDoneWhenEmpty: boolean
  todayTotalPreview: string | null
  todayRemainingPreview: string | null
  newlySatisfiedFactIds: NutritionFactId[]
  onStartEditItem: (item: CalorieItem) => void
  onShareItem: (item: CalorieItem) => void
  onRequestRemoveItem: (itemId: string) => void
  onDeleteMeal?: () => void
  mealPosition?: number
  isConfirmingMealDelete: boolean
  onConfirmingMealDeleteChange: (confirming: boolean) => void
}) {
  const t = useTranslation()
  const locale = useLocale()

  const deleteMealSection =
    onDeleteMeal && mealPosition !== undefined ? (
      isConfirmingMealDelete ? (
        <ConfirmDeleteEntryBar
          onConfirm={onDeleteMeal}
          onCancel={() => onConfirmingMealDeleteChange(false)}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t.dailyEntry.deleteMealLabel(mealPosition)}
          className="self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onConfirmingMealDeleteChange(true)}
        >
          <Trash2 aria-hidden="true" />
          {t.dailyEntry.deleteWholeMealButton}
        </Button>
      )
    ) : null

  return (
    <>
      {(items.length > 0 || showDoneWhenEmpty) && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          {items.length > 0 && (
            <>
              <span className="text-sm font-medium text-muted-foreground">
                {t.dailyEntry.mealSoFarLabel}
              </span>
              <ul className="flex flex-col divide-y divide-foreground/15 rounded-xl border border-border p-4">
                {items.map((item) => {
                  const itemMacros = macrosSummaryTextCompact(
                    item.proteinG,
                    item.fatG,
                    item.carbsG,
                    locale,
                    t,
                  )
                  const shareName = item.name?.trim()
                  return (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-2 py-3 text-sm text-muted-foreground first:pt-0 last:pb-0"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 flex-col gap-0.5 text-left hover:underline"
                        onClick={() => onStartEditItem(item)}
                      >
                        <p className="text-base font-medium">
                          {item.name || t.dailyEntry.itemNamePlaceholder}
                        </p>
                        <p className="flex items-baseline gap-1.5">
                          <span className="text-xl font-semibold tabular-nums">
                            {formatNumber(item.amountKcal, locale, 0)}{' '}
                            {t.dailyEntry.kcalUnit}
                          </span>
                          {item.amountG !== undefined && (
                            <span>
                              · {formatMacroGrams(item.amountG, locale, t)}
                            </span>
                          )}
                        </p>
                        {itemMacros && <p>{itemMacros}</p>}
                      </button>
                      <span className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t.dailyEntry.editItemSheetTitle}
                          onClick={() => onStartEditItem(item)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        {shareName ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t.settings.shareMealItemLabel(
                              shareName,
                            )}
                            onClick={() => onShareItem(item)}
                          >
                            <Share2 aria-hidden="true" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t.dailyEntry.deleteItemLabel}
                          onClick={() => onRequestRemoveItem(item.id)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </span>
                    </li>
                  )
                })}
              </ul>
              {todayTotalPreview && (
                <p className="text-base text-muted-foreground">
                  {todayTotalPreview}
                </p>
              )}
              {todayRemainingPreview && (
                <p className="text-base text-muted-foreground">
                  {todayRemainingPreview}
                </p>
              )}
              {newlySatisfiedFactIds.length > 0 && (
                <div
                  role="status"
                  className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
                >
                  {newlySatisfiedFactIds.map((factId) => (
                    <span key={factId}>{t.nutritionFacts[factId]}</span>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-3 pt-2 pb-4">
                <span className="text-sm text-muted-foreground">
                  {t.dailyEntry.wasItTastyLabel}
                </span>
                <EmotionPicker
                  value={reaction}
                  onChange={onReactionChange}
                  options={DAY_EMOTIONS}
                  labelFor={t.dailyEntry.mealReactionValueLabel}
                  size="icon-xl"
                  layout="spread"
                  contextLabel={mealLabel}
                />
                {mealNoteField}
                {deleteMealSection}
              </div>
            </>
          )}
          {items.length === 0 && showDoneWhenEmpty && (
            <div className="flex flex-col gap-3 pb-4">{deleteMealSection}</div>
          )}
        </div>
      )}
      {items.length === 0 && !showDoneWhenEmpty && deleteMealSection}
    </>
  )
}
