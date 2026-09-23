import { useRef, useState, type ReactNode } from 'react'
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
  onShareComposition,
  onShareSelected,
  onCreateRecipe,
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
  /** #982 — share every named dish in this meal as one QR / link. */
  onShareComposition?: () => void
  /** #983 — share the long-press selection (2+ dishes → one link). */
  onShareSelected?: (items: CalorieItem[]) => void
  /** #983 — name and save the selection as one recipe. */
  onCreateRecipe?: (items: CalorieItem[]) => void
  onRequestRemoveItem: (itemId: string) => void
  onDeleteMeal?: () => void
  mealPosition?: number
  isConfirmingMealDelete: boolean
  onConfirmingMealDeleteChange: (confirming: boolean) => void
}) {
  const t = useTranslation()
  const locale = useLocale()
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null)
  const pressTimer = useRef<number | null>(null)
  const suppressClick = useRef(false)
  const selecting = selectedIds !== null
  const selectedItems = items.filter((item) => selectedIds?.includes(item.id))
  const namedCount = items.filter((item) => item.name?.trim()).length

  function clearPress() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function enterSelection(id: string) {
    setSelectedIds((current) =>
      current?.includes(id) ? current : [...(current ?? []), id],
    )
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const base = current ?? []
      return base.includes(id)
        ? base.filter((itemId) => itemId !== id)
        : [...base, id]
    })
  }

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
              <span className="flex w-full items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
                {t.dailyEntry.mealSoFarLabel}
                {onShareComposition && namedCount >= 2 && !selecting ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.dailyEntry.shareMealCompositionLabel}
                    onClick={onShareComposition}
                  >
                    <Share2 aria-hidden="true" />
                  </Button>
                ) : null}
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
                      onPointerDown={(event) => {
                        if (
                          event.target instanceof Element &&
                          event.target.closest('[data-meal-row-actions]')
                        ) {
                          return
                        }
                        clearPress()
                        pressTimer.current = window.setTimeout(() => {
                          suppressClick.current = true
                          enterSelection(item.id)
                        }, 450)
                      }}
                      onPointerUp={clearPress}
                      onPointerLeave={clearPress}
                      onPointerCancel={clearPress}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      {selecting ? (
                        <input
                          type="checkbox"
                          className="mt-1 size-5 shrink-0 accent-primary"
                          checked={selectedIds?.includes(item.id) ?? false}
                          aria-label={t.dailyEntry.selectMealItemLabel(
                            item.name?.trim() ||
                              t.dailyEntry.itemNamePlaceholder,
                          )}
                          onChange={() => toggleSelected(item.id)}
                        />
                      ) : null}
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 flex-col gap-0.5 text-left hover:underline"
                        onClick={() => {
                          if (suppressClick.current) {
                            suppressClick.current = false
                            return
                          }
                          if (selecting) {
                            toggleSelected(item.id)
                            return
                          }
                          onStartEditItem(item)
                        }}
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
                      <span
                        data-meal-row-actions
                        className="flex shrink-0 items-center gap-2"
                      >
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
              {selecting ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={selectedItems.length === 0}
                    onClick={() => {
                      onCreateRecipe?.(selectedItems)
                      setSelectedIds(null)
                    }}
                  >
                    {t.dailyEntry.createRecipeFromMealButton}
                  </Button>
                  {selectedItems.length >= 2 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onShareSelected?.(selectedItems)
                        setSelectedIds(null)
                      }}
                    >
                      {t.dailyEntry.shareSelectedMealItemsButton}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedIds(null)}
                  >
                    {t.dailyEntry.cancelMealSelectionButton}
                  </Button>
                </div>
              ) : null}
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
