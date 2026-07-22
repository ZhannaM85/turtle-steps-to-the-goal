import { useEffect, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { type FoodItem, type FoodServing, foods } from '@/data/foods'
import type { MealEmotion } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { applyFoodOverrides } from '@/shared/lib/applyFoodOverrides'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import { ratesFromAbsolute } from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { rankBySearchMatch } from '@/shared/lib/searchRank'
import { cn } from '@/shared/lib/utils'
import { useFoodOverrideStore, useMealItemStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { EmotionPicker } from './EmotionPicker'

export interface PickedFoodValues {
  amountKcal: number
  proteinG: number
  fatG: number
  carbsG: number
  note: string
  /** Quantity the totals were scaled from (#96) — lets the created item
   * be edited later the same per-100g + quantity way a manually-entered
   * one can. #264: always populated now (every pick is quantity-scaled,
   * including a personal item with no previously recorded quantity of its
   * own) — stays optional in the type only for shape-compatibility with
   * other `CalorieItem`-adjacent call sites that predate this. */
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

// #264 — a curated food has no "last used" quantity of its own (it's a
// catalog reference, not a log), so 100g (its own per-100g reference
// amount) is the sensible default. A personal item does have one — its
// own last-logged amount — so that's what it defaults to instead.
function defaultQuantityFor(item: PickableItem): string {
  if (item.source === 'mealItem' && item.mealItem.lastAmountG !== undefined) {
    return String(item.mealItem.lastAmountG)
  }
  return '100'
}

/** Quantity-based entry against the static food list (#62), merged with the
 * personal meal-item library (#86) — search, check off one or more dishes
 * (#183), each independently quantity-adjustable (#264) before committing.
 * A curated food scales its per-100g macros by quantity directly; a
 * personal item first derives a per-100g-equivalent rate from its own
 * last-logged absolute amount (`ratesFromAbsolute`) and scales from that,
 * same helper the add row's own autocomplete already uses. Either way,
 * hands the whole batch back to the caller in one `onAdd` call as a normal
 * meal (flat CalorieEntry shape, same as manual entry produces).
 *
 * Reaction editing (#183) is only offered while exactly one dish is
 * checked, matching the pre-#183 single-pick UX with no regression there.
 * Quantity used to share that same single-pick-only restriction (#264
 * lifted it): exactly one checked dish gets one shared field in the
 * sticky footer; two or more each grow their own per-row field instead,
 * since a single shared field can no longer say which dish it applies to.
 * Fine-tuning a specific dish's reaction after a multi-add still works the
 * normal way, via that item's own pencil once it's in the meal.
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
  // #264 — per-item quantity (keyed same as selectedKeys), not a single
  // shared field: once more than one dish is checked, a shared field
  // couldn't disambiguate which one it applies to. Falls back to
  // `defaultQuantityFor` for any item not yet touched.
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  // #254 — a friendlier alternative to grams for a food with known serving
  // sizes (egg, bread slice, medium fruit, a cup of cooked rice/pasta...):
  // 'grams' (default) uses the quantity field above as-is; any other value
  // is the stringified index into that food's own `servings[]`, and the
  // "how many" count below multiplies that descriptor's own gram weight.
  // Single-select only — a shared descriptor across several different
  // foods checked at once wouldn't mean the same thing for each of them.
  const [servingMode, setServingMode] = useState('grams')
  const [servingCount, setServingCount] = useState('1')
  const [emotion, setEmotion] = useState<MealEmotion | undefined>(undefined)
  // #209: lets a personal item be removed right from here, not just via
  // Settings → Meal items — same store action, same immediate (no confirm
  // step) delete MealItemsSection.tsx already uses.
  const deleteMealItem = useMealItemStore((state) => state.deleteItem)

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

  // #204: "сыр" substring-matching inside "сырой" (an unrelated word that
  // happens to share a root) buried genuine "сыр" results below it —
  // matching itself is unchanged, rankBySearchMatch only reorders so
  // exact/whole-word matches surface first.
  const textFor = (item: PickableItem) =>
    item.source === 'food' ? item.food[locale] : item.mealItem.name
  const query = search.trim().toLowerCase()
  const matches = query
    ? rankBySearchMatch(
        allItems.filter((item) => textFor(item).toLowerCase().includes(query)),
        query,
        textFor,
      )
    : allItems

  const selectedItems = allItems.filter((item) => selectedKeys.has(itemKey(item)))
  const singleSelected = selectedItems.length === 1 ? selectedItems[0] : null

  function quantityFor(item: PickableItem): string {
    return quantities[itemKey(item)] ?? defaultQuantityFor(item)
  }
  function setQuantityFor(item: PickableItem, value: string) {
    setQuantities((prev) => ({ ...prev, [itemKey(item)]: value }))
  }
  // #254 — resolves to the active serving descriptor only for the single
  // selected food currently in serving mode; `undefined` (grams mode, a
  // different item, a personal item, or a stale index left over from a
  // previously selected food with fewer/no servings of its own) falls
  // through to the plain quantity field everywhere below.
  function activeServingFor(item: PickableItem): FoodServing | undefined {
    if (item !== singleSelected || item.source !== 'food' || servingMode === 'grams') {
      return undefined
    }
    return item.food.servings?.[Number(servingMode)]
  }
  function hasValidQuantity(item: PickableItem): boolean {
    const serving = activeServingFor(item)
    if (serving) {
      const num = parseNumberInput(servingCount)
      return num !== undefined && num > 0
    }
    const num = parseNumberInput(quantityFor(item))
    return num !== undefined && num > 0
  }
  function gramsFor(item: PickableItem): number {
    const serving = activeServingFor(item)
    if (serving) {
      const countNum = parseNumberInput(servingCount)
      const count = countNum && countNum > 0 ? countNum : 1
      return serving.grams * count
    }
    const quantityNum = parseNumberInput(quantityFor(item))
    return quantityNum && quantityNum > 0 ? quantityNum : 100
  }
  const canAdd =
    selectedItems.length > 0 && selectedItems.every(hasValidQuantity)

  function reset() {
    setSearch('')
    setSelectedKeys(new Set())
    setQuantities({})
    setServingMode('grams')
    setServingCount('1')
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

  // #209 — also drops it from selectedKeys if it happened to be checked,
  // same as any other item that stops existing.
  function handleDeletePersonalItem(item: PickableItem & { source: 'mealItem' }) {
    deleteMealItem(item.mealItem.id)
    setSelectedKeys((prev) => {
      const key = itemKey(item)
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  // #264 — each item's own checked quantity now feeds the calculation,
  // whether it's the one field shown for a single pick or its own per-row
  // field in a multi-pick. A personal item has no per-100g rate of its
  // own to scale from, so `ratesFromAbsolute` derives one from its last
  // logged amount first — same helper the add row's own autocomplete
  // already uses to make a reused personal item's fields editable.
  // #254 — `gramsFor` resolves either the grams-quantity field or a
  // selected serving descriptor × count, whichever is active for this item.
  function scaledValuesFor(
    item: PickableItem,
  ): Omit<PickedFoodValues, 'emotion'> {
    const grams = gramsFor(item)
    const scale = grams / 100
    if (item.source === 'food') {
      const { food } = item
      return {
        amountKcal: Math.round(food.kcal100 * scale),
        proteinG: Math.round(food.protein100 * scale * 10) / 10,
        fatG: Math.round(food.fat100 * scale * 10) / 10,
        carbsG: Math.round(food.carbs100 * scale * 10) / 10,
        note: food[locale],
        amountG: grams,
      }
    }
    const { mealItem } = item
    const rates = ratesFromAbsolute(
      mealItem.lastAmountKcal,
      mealItem.lastProteinG,
      mealItem.lastFatG,
      mealItem.lastCarbsG,
      mealItem.lastAmountG,
    )
    return {
      amountKcal: Math.round(rates.kcal100 * scale),
      proteinG:
        rates.protein100 === undefined
          ? 0
          : Math.round(rates.protein100 * scale * 10) / 10,
      fatG:
        rates.fat100 === undefined
          ? 0
          : Math.round(rates.fat100 * scale * 10) / 10,
      carbsG:
        rates.carbs100 === undefined
          ? 0
          : Math.round(rates.carbs100 * scale * 10) / 10,
      note: mealItem.name,
      amountG: grams,
    }
  }

  function handleAdd() {
    if (selectedItems.length === 0) return
    const single = selectedItems.length === 1
    const results: PickedFoodValues[] = selectedItems.map((item) => ({
      ...scaledValuesFor(item),
      emotion: single ? emotion : undefined,
    }))
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
            /* #275 — back to its own bounded scroll region (reversing
             * #74's "whole dialog scrolls as one unit" for this one
             * dialog specifically): the footer below can grow tall
             * (serving-size toggle #254, per-row quantity fields #264,
             * reaction picker), and `position: sticky` inside the
             * fixed-position, overflow-y-auto DialogContent had a real,
             * confirmed rendering bug — list rows past the sticky
             * footer's own clipped bounds stayed visible underneath it.
             * Removing the sticky positioning entirely (this list scrolls
             * on its own, the footer is a plain element below it,
             * unconditionally visible) sidesteps the bug outright rather
             * than working around it. max-h-72 ≈ 6 rows, matching #74's
             * own "first ~6 visible rows" sizing. */
            <ul className="flex max-h-72 flex-col overflow-y-auto rounded-lg border border-border">
              {matches.map((item) => {
                // Checked state survives a search-text change (#183) — the
                // whole point of checking off several dishes is being able
                // to search again for the next one without losing what's
                // already picked.
                const checked = selectedKeys.has(itemKey(item))
                return (
                  <li key={itemKey(item)} className="flex items-stretch">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      className={cn(
                        'flex w-full min-w-0 items-start gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted',
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
                            {/* #264: a personal item's last-logged amount,
                             * shown as a preview — no longer "fixed", it's
                             * just the default quantity below/per-row
                             * scales it from via ratesFromAbsolute. */}
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
                    {/* #264: a single check gets one shared quantity field
                     * in the sticky footer below — a per-row field here
                     * too would be redundant. Once a second dish is
                     * checked, that shared field can no longer say which
                     * one it applies to, so each checked row grows its
                     * own instead. */}
                    {checked && selectedItems.length > 1 && (
                      <Input
                        type="text"
                        inputMode="decimal"
                        aria-label={`${t.dailyEntry.foodQuantityLabel} — ${textFor(item)}`}
                        value={quantityFor(item)}
                        onChange={(e) => setQuantityFor(item, e.target.value)}
                        className="my-1 mr-1 h-8 w-16 shrink-0 self-center"
                      />
                    )}
                    {/* #209: only personal items can be removed here — the
                     * curated database isn't user-editable. Same immediate
                     * delete (no confirm step) as Settings' own Meal items
                     * list, since this only drops the reusable "last
                     * logged" suggestion, not any already-logged meal. */}
                    {item.source === 'mealItem' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mr-1 shrink-0 self-center"
                        aria-label={t.settings.deleteMealItemLabel(
                          item.mealItem.name,
                        )}
                        onClick={() => handleDeletePersonalItem(item)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {/* #91 originally made this sticky so the confirm button stayed
           * reachable without scrolling all the way past a 300+-item list.
           * #275 reverses that: now that the list above scrolls in its
           * own bounded region, this footer is always visible below it
           * already, unconditionally — no sticky positioning needed (and
           * sticky here is what caused #275's actual bug: list rows past
           * its clipped bounds stayed visible underneath it). */}
          <div className="flex flex-col gap-3 border-t border-border bg-card pt-3">
            {/* Reaction field (#183) only makes sense while exactly one
             * dish is checked, unchanged. #264: the quantity field used to
             * share that same single-pick-only restriction and only cover
             * curated foods — now shown for either source whenever exactly
             * one dish is checked (a multi-pick gets its own per-row field
             * instead, above); reaction can still be fine-tuned afterward
             * via that item's own pencil once it's in the meal. */}
            {/* #254 — a friendlier alternative to grams, only offered
             * once a single curated food with known serving sizes is
             * checked (a personal item, or a food with none seeded, has
             * nothing to offer here and just shows the grams field). */}
            {singleSelected?.source === 'food' &&
              singleSelected.food.servings &&
              singleSelected.food.servings.length > 0 && (
                <ToggleGroup
                  type="single"
                  aria-label={t.dailyEntry.servingModeLabel}
                  value={servingMode}
                  onValueChange={(value) => value && setServingMode(value)}
                  className="w-fit flex-wrap gap-2 p-1"
                >
                  <ToggleGroupItem value="grams" className="h-8 px-3 text-xs">
                    {t.dailyEntry.gramsModeOption}
                  </ToggleGroupItem>
                  {singleSelected.food.servings.map((serving, index) => (
                    <ToggleGroupItem
                      key={index}
                      value={String(index)}
                      className="h-8 px-3 text-xs"
                    >
                      {serving[locale]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            {singleSelected &&
              (activeServingFor(singleSelected) ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t.dailyEntry.servingCountLabel}
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    aria-label={t.dailyEntry.servingCountLabel}
                    value={servingCount}
                    onChange={(e) => setServingCount(e.target.value)}
                    className="h-8 w-20"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t.dailyEntry.foodQuantityLabel}
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    aria-label={t.dailyEntry.foodQuantityLabel}
                    value={quantityFor(singleSelected)}
                    onChange={(e) =>
                      setQuantityFor(singleSelected, e.target.value)
                    }
                    className="h-8 w-20"
                  />
                </div>
              ))}
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
