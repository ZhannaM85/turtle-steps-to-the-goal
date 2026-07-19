import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { useTranslation } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { MealList } from './MealList'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * Dedicated single-meal edit route (#157) — `/entry/:date/meal/:mealId`,
 * reached by tapping a meal's pencil on Today or History. Replaces #145's
 * "expand inline alongside the rest of the day" behavior with a focused
 * screen showing just that one meal.
 *
 * Reuses `MealList` (and every bit of its existing add-item/macro-mode/
 * drag/food-picker machinery) unchanged rather than duplicating any of
 * it — this screen just constrains it to a single-element
 * `calorieEntries` array via `focusMealId`, which auto-opens that meal's
 * edit mode on mount and hides the "add a new meal" row. Same direct-
 * repository pattern as `useHistoryData`/`useDashboardData` (no shared
 * store — this is the only place that needs one specific day's entry).
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

  function handleChange(next: CalorieEntry[]) {
    if (!entry || !mealId) return
    const updated = next[0]
    const calorieEntries = entry.calorieEntries ?? []
    const merged = updated
      ? calorieEntries.map((item) => (item.id === mealId ? updated : item))
      : calorieEntries.filter((item) => item.id !== mealId)
    const nextEntry: DailyEntry = {
      ...entry,
      calorieEntries: merged,
      updatedAt: new Date().toISOString(),
    }
    setEntry(nextEntry)
    dailyEntryRepository.upsert(nextEntry)
  }

  const targetMealIndex =
    entry?.calorieEntries?.findIndex((item) => item.id === mealId) ?? -1
  const targetMeal =
    targetMealIndex >= 0 ? entry?.calorieEntries?.[targetMealIndex] : undefined

  return (
    <div className="flex flex-col gap-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit gap-1.5 px-1"
        onClick={goBack}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.dailyEntry.backLabel}
      </Button>
      <PageHeader title={t.dailyEntry.editMealScreenTitle} />

      {entry === undefined ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : !targetMeal || !date ? (
        <p className="text-sm text-muted-foreground">
          {t.dailyEntry.mealNotFoundText}
        </p>
      ) : (
        <MealList
          calorieEntries={[targetMeal]}
          date={date}
          focusMealId={mealId}
          // #187: the meal's real position within the full day's list —
          // calorieEntries here is always a single-element array, so
          // MealList's own index-based fallback would always read as 1.
          focusMealPosition={targetMealIndex + 1}
          onChange={handleChange}
          onFocusedMealDone={goBack}
        />
      )}
    </div>
  )
}
