import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import type { Goal, GoalWindowProgress } from '@/domain/goal'
import { goalWeekEnd } from '@/domain/goal'
import {
  formatExactNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { StatCard } from '@/shared/ui/stat-card'
import { useTodaySectionChrome } from './useTodaySectionChrome'

export function TodayWeeklyTarget({
  goalStatus,
  goal,
  dayGoal,
  dayGoalProgress,
  weeklyPace,
  latestWeightKg,
  displayUnit,
  toDisplay,
}: {
  goalStatus: string
  goal: Goal | null
  dayGoal: Goal | null
  dayGoalProgress: GoalWindowProgress | null
  weeklyPace: number | null
  latestWeightKg: number | null
  displayUnit: 'kg' | 'lb'
  toDisplay: (kg: number) => number
}) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const { sectionVisible, sectionTitle, statCardAction } =
    useTodaySectionChrome()

  if (goalStatus === 'loading' || goalStatus === 'idle') {
    return <p className="text-sm text-muted-foreground">{t.common.loading}</p>
  }
  if (dayGoal) {
    return sectionVisible.todayWeeklyTarget ? (
      <StatCard
        label={t.today.thisWeeksTarget}
        value={formatExactNumber(weeklyPace!, locale)}
        unit={t.today.toLose(unitLabel(displayUnit, t))}
        description={
          dayGoal.weekStart
            ? [
                t.common.weekRangeLabel(
                  format(parseISO(dayGoal.weekStart), 'PP', {
                    locale: dateFnsLocale,
                  }),
                  format(
                    parseISO(dayGoal.weekEnd ?? goalWeekEnd(dayGoal.weekStart)),
                    'PP',
                    { locale: dateFnsLocale },
                  ),
                ),
                dayGoalProgress?.baselineWeightKg !== undefined
                  ? t.today.weeklyTargetFromWeight(
                      `${formatExactNumber(toDisplay(dayGoalProgress.baselineWeightKg), locale)} ${unitLabel(displayUnit, t)}`,
                    )
                  : latestWeightKg !== null
                    ? t.today.weeklyTargetFromWeight(
                        `${formatExactNumber(toDisplay(latestWeightKg), locale)} ${unitLabel(displayUnit, t)}`,
                      )
                    : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : undefined
        }
        action={statCardAction('todayWeeklyTarget', t.today.thisWeeksTarget)}
      />
    ) : (
      sectionTitle('todayWeeklyTarget', t.today.thisWeeksTarget)
    )
  }
  if (!goal) {
    return (
      <EmptyState
        title={t.today.emptyGoalTitle}
        description={t.today.emptyGoalDescription}
        action={
          <Button asChild>
            <Link to="/goal">{t.today.setGoalButton}</Link>
          </Button>
        }
      />
    )
  }
  return null
}
