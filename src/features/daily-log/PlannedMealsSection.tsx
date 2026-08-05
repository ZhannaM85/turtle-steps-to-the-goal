import { useEffect, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { ChevronDown, Plus, X } from 'lucide-react'
import type { CalorieEntry } from '@/domain/dailyEntry'
import type { PlannedMeal } from '@/domain/plannedMeal'
import { useTranslation } from '@/i18n'
import { usePlannedMealStore, useTodaySectionsCollapseStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { Input } from '@/shared/ui/input'

/**
 * Lightweight "stage a meal for a future day" drafts (#614) — mounted
 * right after Meals on the Day screen (`DailyEntryFormTop.tsx`). Two
 * independent halves: (1) any drafts already staged *for* `date` render
 * with a promote/discard action, and (2) a quick-add trigger stages a new
 * draft for the day *after* `date` — so opening today's log is enough to
 * plan tomorrow, matching the issue's "materializes into the day when
 * opened" framing for the promote side.
 *
 * Promoting a draft calls `onChange` with the same shape `MealList.tsx`'s
 * own `onChange` expects — the parent wires both to the same live
 * `calorieEntries`/`persist()` closure, so a promoted draft autosaves
 * exactly like a normally-added meal, not a separate write path that
 * could race with unsaved form state (the #285 class of bug).
 */
export function PlannedMealsSection({
  date,
  calorieEntries,
  onChange,
}: {
  date: string
  calorieEntries: CalorieEntry[]
  onChange: (next: CalorieEntry[]) => void
}) {
  const t = useTranslation()
  const plannedMeals = usePlannedMealStore((state) => state.plannedMeals)
  const loadAll = usePlannedMealStore((state) => state.loadAll)
  const addPlannedMeal = usePlannedMealStore((state) => state.addPlannedMeal)
  const deletePlannedMeal = usePlannedMealStore(
    (state) => state.deletePlannedMeal,
  )
  const collapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.plannedMeals,
  )
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const stagedForThisDate = plannedMeals
    .filter((meal) => meal.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const tomorrow = format(addDays(parseISO(date), 1), 'yyyy-MM-dd')

  const [isAdding, setIsAdding] = useState(false)
  const [planName, setPlanName] = useState('')
  const [planKcal, setPlanKcal] = useState('')

  function promote(plannedMeal: PlannedMeal) {
    const entry: CalorieEntry = {
      id: crypto.randomUUID(),
      items: [
        {
          id: crypto.randomUUID(),
          name: plannedMeal.name,
          amountKcal: plannedMeal.amountKcal ?? 0,
        },
      ],
      createdAt: new Date().toISOString(),
    }
    onChange([...calorieEntries, entry])
    deletePlannedMeal(plannedMeal.id)
  }

  async function handleSavePlan() {
    if (!planName.trim()) return
    const parsedKcal = planKcal.trim() === '' ? undefined : Number(planKcal)
    await addPlannedMeal(
      tomorrow,
      planName,
      parsedKcal === undefined || Number.isNaN(parsedKcal)
        ? undefined
        : parsedKcal,
    )
    setPlanName('')
    setPlanKcal('')
    setIsAdding(false)
  }

  return (
    <section className="rounded-lg border border-border p-3">
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => setCollapsed('plannedMeals', !open)}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={
              collapsed
                ? t.plannedMeals.expandSectionLabel
                : t.plannedMeals.collapseSectionLabel
            }
            className="group flex w-full items-center justify-between gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
              <span>{t.plannedMeals.sectionLabel}</span>
              {collapsed && (
                <span className="text-xs font-normal text-muted-foreground">
                  {t.plannedMeals.collapsedSummary(stagedForThisDate.length)}
                </span>
              )}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-2 pt-3">
            <p className="text-sm text-muted-foreground">
              {t.plannedMeals.sectionBlurb}
            </p>

            {stagedForThisDate.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">
                  {t.plannedMeals.stagedListLabel}
                </h3>
                {stagedForThisDate.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted px-2.5 py-1.5"
                  >
                    <span className="min-w-0 truncate text-sm text-foreground">
                      {meal.name}
                      {meal.amountKcal !== undefined && (
                        <span className="text-muted-foreground">
                          {' · '}
                          {t.plannedMeals.plannedKcalLabel(
                            String(meal.amountKcal),
                          )}
                        </span>
                      )}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => promote(meal)}
                      >
                        {t.plannedMeals.addToLogButton}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.plannedMeals.discardPlannedMealLabel(
                          meal.name,
                        )}
                        onClick={() => deletePlannedMeal(meal.id)}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isAdding ? (
              <div className="flex flex-col gap-2">
                <Input
                  type="text"
                  aria-label={t.plannedMeals.planNameLabel}
                  placeholder={t.plannedMeals.planNamePlaceholder}
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  autoFocus
                />
                <Input
                  type="text"
                  inputMode="numeric"
                  aria-label={t.plannedMeals.planKcalLabel}
                  placeholder={t.plannedMeals.planKcalPlaceholder}
                  value={planKcal}
                  onChange={(e) => setPlanKcal(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSavePlan}
                    disabled={!planName.trim()}
                  >
                    {t.plannedMeals.savePlanButton}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAdding(false)
                      setPlanName('')
                      setPlanKcal('')
                    }}
                  >
                    {t.plannedMeals.cancelPlanLabel}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => setIsAdding(true)}
              >
                <Plus aria-hidden="true" />
                {t.plannedMeals.addPlanTriggerLabel}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
