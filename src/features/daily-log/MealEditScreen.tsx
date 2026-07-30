import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { CalorieEntry, CalorieItem, DailyEntry, Emotion } from '@/domain/dailyEntry'
import { useTranslation } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { effectiveMealLabel } from '@/shared/lib/mealLabel'
import { AddMealDialog } from './AddMealDialog'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * Dedicated single-meal edit route (#157) — `/entry/:date/meal/:mealId`,
 * reached by tapping a meal's pencil on Today or History.
 *
 * #459 — migrated onto `AddMealDialog` (the #454 flyout) instead of
 * `MealList` in its old single-meal-focus mode, so editing an
 * already-saved meal gets the same redesigned look as adding a new one.
 * `AddMealDialog` already fit this case via its existing prop shape; the
 * only additions it needed were per-item edit-in-place (`onUpdateItem`)
 * and whole-meal delete (`onDeleteMeal`), both otherwise unused by
 * `MealList.tsx`'s own in-progress-new-meal wiring. Same direct-repository
 * pattern as `useHistoryData`/`useDashboardData` (no shared store — this
 * is the only place that needs one specific day's entry).
 */
export function MealEditScreen() {
  const t = useTranslation()
  const navigate = useNavigate()
  const { date, mealId } = useParams<{ date: string; mealId: string }>()
  // undefined = still loading, null = no entry exists for this date at all.
  const [entry, setEntry] = useState<DailyEntry | null | undefined>(undefined)

  useEffect(() => {
    if (!date) return
    let cancelled = false
    dailyEntryRepository.getByDate(date).then((result) => {
      if (!cancelled) setEntry(result ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [date])

  function goBack() {
    navigate(-1)
  }

  function persist(nextCalorieEntries: CalorieEntry[]) {
    if (!entry) return
    const nextEntry: DailyEntry = {
      ...entry,
      calorieEntries: nextCalorieEntries,
      updatedAt: new Date().toISOString(),
    }
    setEntry(nextEntry)
    dailyEntryRepository.upsert(nextEntry)
  }

  function withTargetMeal(
    update: (meal: CalorieEntry) => CalorieEntry,
  ): CalorieEntry[] {
    return (entry?.calorieEntries ?? []).map((meal) =>
      meal.id === mealId ? update(meal) : meal,
    )
  }

  function handleAppendItems(newItems: CalorieItem[]) {
    if (!entry || !mealId) return
    persist(withTargetMeal((meal) => ({ ...meal, items: [...meal.items, ...newItems] })))
  }

  function handleUpdateItem(updatedItem: CalorieItem) {
    if (!entry || !mealId) return
    persist(
      withTargetMeal((meal) => ({
        ...meal,
        items: meal.items.map((item) =>
          item.id === updatedItem.id ? updatedItem : item,
        ),
      })),
    )
  }

  // Same "a group with its last item removed is itself removed" invariant
  // CalorieEntry.items documents elsewhere (MealList.tsx's own
  // removeItemFromNewMeal) — removing this meal's last item here leaves
  // nothing to keep editing, so it also navigates back.
  function handleRemoveItem(itemId: string) {
    if (!entry || !mealId) return
    const nextEntries = withTargetMeal((meal) => ({
      ...meal,
      items: meal.items.filter((item) => item.id !== itemId),
    })).filter((meal) => meal.id !== mealId || meal.items.length > 0)
    persist(nextEntries)
    if (!nextEntries.some((meal) => meal.id === mealId)) goBack()
  }

  function handleDeleteMeal() {
    if (!entry || !mealId) return
    persist((entry.calorieEntries ?? []).filter((meal) => meal.id !== mealId))
    goBack()
  }

  function handleTimeEatenChange(value: string) {
    if (!entry || !mealId) return
    persist(withTargetMeal((meal) => ({ ...meal, timeEaten: value || undefined })))
  }

  function handleNoteChange(value: string) {
    if (!entry || !mealId) return
    persist(withTargetMeal((meal) => ({ ...meal, note: value || undefined })))
  }

  function handleReactionChange(reaction: Emotion | undefined) {
    if (!entry || !mealId) return
    persist(withTargetMeal((meal) => ({ ...meal, reaction })))
  }

  const targetMealIndex =
    entry?.calorieEntries?.findIndex((item) => item.id === mealId) ?? -1
  const targetMeal =
    targetMealIndex >= 0 ? entry?.calorieEntries?.[targetMealIndex] : undefined

  if (entry === undefined || !targetMeal || !date) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          {entry === undefined ? t.common.loading : t.dailyEntry.mealNotFoundText}
        </p>
      </div>
    )
  }

  return (
    <AddMealDialog
      open
      onOpenChange={(next) => {
        if (!next) goBack()
      }}
      mealLabel={effectiveMealLabel(t, targetMealIndex + 1, targetMeal.label)}
      mealPosition={targetMealIndex + 1}
      timeEaten={targetMeal.timeEaten ?? ''}
      onTimeEatenChange={handleTimeEatenChange}
      note={targetMeal.note ?? ''}
      onNoteChange={handleNoteChange}
      items={targetMeal.items}
      reaction={targetMeal.reaction}
      onReactionChange={handleReactionChange}
      onAppendItems={handleAppendItems}
      onRemoveItem={handleRemoveItem}
      onUpdateItem={handleUpdateItem}
      onDeleteMeal={handleDeleteMeal}
    />
  )
}
