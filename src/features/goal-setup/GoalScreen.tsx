import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import {
  unitLabel,
  formatNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
} from '@/i18n'
import { kgToLb } from '@/domain/goal'
import { useCurrentWeekInfo } from '@/shared/hooks'
import { PageHeader } from '@/shared/ui/page-header'
import { StatCard } from '@/shared/ui/stat-card'
import { useGoalStore } from '@/stores'
import { GoalForm } from './GoalForm'

export function GoalScreen() {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const { goal, status, error, loadActiveGoal, saveGoal } = useGoalStore()
  const weekInfo = useCurrentWeekInfo()

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])

  const displayUnit = goal?.displayUnit ?? 'kg'
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.goal.title} description={t.goal.description} />

      {status === 'loading' || status === 'idle' ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : (
        <>
          {status === 'error' && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {goal && (
            <StatCard
              label={t.goal.thisWeeksTarget}
              value={formatNumber(toDisplay(goal.targetWeeklyLossKg), locale)}
              unit={t.today.toLose(unitLabel(displayUnit, t))}
              description={
                weekInfo
                  ? t.common.weekLabel(
                      weekInfo.weekNumber,
                      format(parseISO(weekInfo.weekStart), 'MMM d', {
                        locale: dateFnsLocale,
                      }),
                      format(parseISO(weekInfo.weekEnd), 'MMM d', {
                        locale: dateFnsLocale,
                      }),
                    )
                  : undefined
              }
            />
          )}

          <GoalForm existingGoal={goal} onSubmit={saveGoal} />
        </>
      )}
    </div>
  )
}
