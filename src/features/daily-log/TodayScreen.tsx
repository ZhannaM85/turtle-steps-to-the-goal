import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { kgToLb } from '@/domain/goal'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { StatCard } from '@/shared/ui/stat-card'
import { useGoalStore } from '@/stores'

export function TodayScreen() {
  const { goal, status, loadActiveGoal } = useGoalStore()

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])

  const displayUnit = goal?.displayUnit ?? 'kg'
  const weeklyPace = goal
    ? displayUnit === 'lb'
      ? kgToLb(goal.targetWeeklyLossKg)
      : goal.targetWeeklyLossKg
    : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Today"
        description="Quick entry for today's weight/calories, this week's target reminder"
      />

      {status === 'loading' || status === 'idle' ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : goal ? (
        <StatCard
          label="This week's target"
          value={weeklyPace!.toFixed(1)}
          unit={`${displayUnit} to lose`}
        />
      ) : (
        <EmptyState
          title="No goal set yet"
          description="Set a starting weight, target weight, and weekly pace to see this week's target here."
          action={
            <Button asChild>
              <Link to="/goal">Set a goal</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
