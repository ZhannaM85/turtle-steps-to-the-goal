import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { type FoodItem, foods } from '@/data/foods'
import type { MealEmotion } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { applyFoodOverrides } from '@/shared/lib/applyFoodOverrides'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { cn } from '@/shared/lib/utils'
import { useFoodOverrideStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { EmotionPicker } from './EmotionPicker'

export interface PickedFoodValues {
  amountKcal: number
  proteinG: number
  fatG: number
  carbsG: number
  note: string
  /** Quantity the totals were scaled from (#96) — lets the created item
   * be edited later the same per-100g + quantity way a manually-entered
   * one can. Undefined for a reused personal item with no recorded
   * quantity of its own. */
  amountG?: number
  /** This dish's own reaction (#134), set here rather than only after
   * the fact by editing the newly-added item — same "rate while you're
   * already here" pattern MealItemEditorSheet uses for manual entry. */
  emotion?: MealEmotion
}

export interface FoodPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called once per confirm with every checked dish (#183), even when
   * only one is checked — callers build one meal/group from the whole
   * array rather than being invoked per item, so multi-picks land
   * together instead of each needing its own onAdd round-trip. */
  onAdd: (values: PickedFoodValues[]) => void
  /** Personal meal-name library (#50) — merged into this dialog's search
   * (#86) so "+ Food" is one place to find anything you've ever added, not
   * just the curated database. Only items with recorded last-used
   * nutrition are shown; a bare name with nothing to reuse yet stays
   * confined to the note field's own autocomplete. */
  mealItems: MealItem[]
}

type PickableItem =
  | { source: 'food'; food: FoodItem }
  | {
      source: 'mealItem'
      mealItem: MealItem & { lastAmountKcal: number }
    }

function itemKey(item: PickableItem): string {
  return item.source === 'food' ? `food-${item.food.id}` : `meal-${item.mealItem.id}`
}

/** Quantity-based entry against the static food list (#62), merged with the
 * personal meal-item library (#86) — search, check off one or more dishes
 * (#183), and either scale a curated food's per-100g macros by quantity, or
 * reuse a personal item's last-logged absolute numbers as-is (not
 * quantity-scalable, no per-100g data exists for it). Either way, hands the
 * whole batch back to the caller in one `onAdd` call as a normal meal (flat
 * CalorieEntry shape, same as manual entry produces).
 *
 * Quantity/reaction editing (#183) is only offered while exactly one dish
 * is checked, matching the pre-#183 single-pick UX exactly with no
 * regression there — checking a second dish hides those fields and both
 * default (100g quantity, no reaction) rather than trying to show N sets
 * of fields at once. Fine-tuning a specific dish's portion/reaction after
 * a multi-add still works the normal way, via that item's own pencil once
 * it's in the meal.
 */
export function FoodPickerDialog({
  open,
  onOpenChange,
  onAdd,
  mealItems,
}: FoodPickerDialogProps) {
  const t = useTranslation()
  const locale = useLocale()
  const [search, setSearch] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [quantity, setQuantity] = useState('100')
  const [emotion, setEmotion] = useState<MealEmotion | undefined>(undefined)

  // Per-device hides/corrections to the curated list (#90) — loaded once
  // per mount, same pattern as useMealItemStore in DailyEntryForm.
  const foodOverrides = useFoodOverrideStore((state) => state.overrides)
  const loadFoodOverrides = useFoodOverrideStore((state) => state.loadOverrides)
  useEffect(() => {
    loadFoodOverrides()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const visibleFoods = applyFoodOverrides(foods, foodOverrides)

  // Every pickable item regardless of the current search text (#183) — a
  // dish checked while visible needs to stay counted toward
  // selectedItems/canAdd even after a later search filters it out of
  // `matches` below, since checked state deliberately survives a search
  // change.
  const allMealItems: PickableItem[] = mealItems
    .filter(
      (item): item is MealItem & { lastAmountKcal: number } =>
        item.lastAmountKcal !== undefined,
    )
    .map((mealItem) => ({ source: 'mealItem', mealItem }))
  const allFoods: PickableItem[] = visibleFoods.map((food) => ({
    source: 'food',
    food,
  }))
  const allItems = [...allMealItems, ...allFoods]

  const query = search.trim().toLowerCase()
  const matches = query
    ? allItems.filter((item) =>
        item.source === 'food'
          ? item.food[locale].toLowerCase().includes(query)
          : item.mealItem.name.toLowerCase().includes(query),
      )
    : allItems

  const selectedItems = allItems.filter((item) => selectedKeys.has(itemKey(item)))
  const singleSelected = selectedItems.length === 1 ? selectedItems[0] : null

  const quantityNum = parseNumberInput(quantity)
  const canAdd =
    selectedItems.length > 1 ||
    (singleSelected !== null &&
      (singleSelected.source === 'mealItem' ||
        (quantityNum !== undefined && quantityNum > 0)))

  function reset() {
    setSearch('')
    setSelectedKeys(new Set())
    setQuantity('100')
    setEmotion(undefined)
  }

  function toggleSelected(item: PickableItem) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      const key = itemKey(item)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleAdd() {
    if (selectedItems.length === 0) return
    const single = selectedItems.length === 1
    const results: PickedFoodValues[] = selectedItems.map((item) => {
      if (item.source === 'food') {
        const singleQuantity = single ? quantityNum : undefined
        const scale = (singleQuantity ?? 100) / 100
        const { food } = item
        return {
          amountKcal: Math.round(food.kcal100 * scale),
          proteinG: Math.round(food.protein100 * scale * 10) / 10,
          fatG: Math.round(food.fat100 * scale * 10) / 10,
          carbsG: Math.round(food.carbs100 * scale * 10) / 10,
          note: food[locale],
          amountG: singleQuantity ?? 100,
          emotion: single ? emotion : undefined,
        }
      }
      const { mealItem } = item
      return {
        amountKcal: mealItem.lastAmountKcal,
        proteinG: mealItem.lastProteinG ?? 0,
        fatG: mealItem.lastFatG ?? 0,
        carbsG: mealItem.lastCarbsG ?? 0,
        note: mealItem.name,
        amountG: mealItem.lastAmountG,
        emotion: single ? emotion : undefined,
      }
    })
    onAdd(results)
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
            onChange={(e) => setSearch(e.target.value)}
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
              {matches.map((item) => {
                // Checked state survives a search-text change (#183) — the
                // whole point of checking off several dishes is being able
                // to search again for the next one without losing what's
                // already picked.
                const checked = selectedKeys.has(itemKey(item))
                return (
                  <li key={itemKey(item)}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      className={cn(
                        'flex w-full items-start gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted',
                        // Border + tint, not bg-muted alone — --muted sits
                        // too close to --background in dark mode to read as
                        // selected (#84, same fix reused here).
                        checked && 'border-2 border-primary bg-primary/15 font-medium',
                      )}
                      onClick={() => toggleSelected(item)}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-border',
                          checked && 'border-primary bg-primary text-primary-foreground',
                        )}
                      >
                        {checked && <Check className="size-3" />}
                      </span>
                      <span className="flex flex-col">
                        {item.source === 'food' ? (
                          <>
                            <span>{item.food[locale]}</span>
                            {/* Per-100g preview (#75) — sanity-check a
                             * food's numbers before picking it, not just
                             * after. */}
                            <span className="text-xs font-normal text-muted-foreground">
                              {formatNumber(item.food.kcal100, locale, 0)}{' '}
                              {t.dailyEntry.kcalUnit}{' '}
                              {t.dailyEntry.per100gLabel} ·{' '}
                              {macrosSummaryTextCompact(
                                item.food.protein100,
                                item.food.fat100,
                                item.food.carbs100,
                                locale,
                                t,
                              )}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>{item.mealItem.name}</span>
                            {/* Distinguishes personal items from the
                             * curated database (#86) — a fixed last-used
                             * amount, not a scalable per-100g figure. */}
                            <span className="text-xs font-normal text-muted-foreground">
                              {formatNumber(
                                item.mealItem.lastAmountKcal,
                                locale,
                                0,
                              )}{' '}
                              {t.dailyEntry.kcalUnit}{' '}
                              {t.dailyEntry.lastLoggedLabel} ·{' '}
                              {macrosSummaryTextCompact(
                                item.mealItem.lastProteinG,
                                item.mealItem.lastFatG,
                                item.mealItem.lastCarbsG,
                                locale,
                                t,
                              )}
                            </span>
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {/* Sticky footer (#91) — with 300+ results and no independent
           * list scroll region (#74), the confirm button used to sit below
           * the entire list, off-screen until scrolled all the way past it.
           * Pinning it to the bottom of the dialog's own scrollport keeps it
           * reachable regardless of scroll position; bg-card + border-top
           * stop list rows showing through as they scroll underneath. */}
          <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-card pt-3">
            {/* Per-dish quantity/reaction fields (#183) only make sense
             * while exactly one dish is checked — matches the pre-#183
             * single-pick UX exactly, no regression there. A multi-pick
             * defaults to 100g/no reaction; either can be fine-tuned
             * afterward via that item's own pencil once it's in the meal. */}
            {singleSelected?.source === 'food' && (
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
            {singleSelected && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">
                  {t.dailyEntry.itemEmotionLabel}
                </span>
                <EmotionPicker
                  value={emotion}
                  onChange={setEmotion}
                  options={MEAL_EMOTIONS}
                  labelFor={t.dailyEntry.mealEmotionLabel}
                  contextLabel={
                    singleSelected.source === 'food'
                      ? singleSelected.food[locale]
                      : singleSelected.mealItem.name
                  }
                />
              </div>
            )}
            <Button type="button" disabled={!canAdd} onClick={handleAdd}>
              {t.dailyEntry.addSelectedFoodsButton(selectedItems.length)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
