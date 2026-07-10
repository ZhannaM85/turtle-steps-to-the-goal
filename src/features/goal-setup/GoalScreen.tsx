import { useEffect } from 'react'
import { kgToLb } from '@/domain/goal'
import { PageHeader } from '@/shared/ui/page-header'
import { StatCard } from '@/shared/ui/stat-card'
import { useGoalStore } from '@/stores'
import { GoalForm } from './GoalForm'

export function GoalScreen() {
  const { goal, status, error, loadActiveGoal, saveGoal } = useGoalStore()

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])

  const displayUnit = goal?.displayUnit ?? 'kg'
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Goal"
        description="View/edit the active goal and weekly pace"
      />

      {status === 'loading' || status === 'idle' ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {status === 'error' && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {goal && (
            <StatCard
              label="Weekly pace"
              value={toDisplay(goal.targetWeeklyLossKg).toFixed(1)}
              unit={`${displayUnit}/week`}
              description={`${toDisplay(goal.startWeightKg).toFixed(1)}${displayUnit} → ${toDisplay(goal.targetWeightKg).toFixed(1)}${displayUnit}`}
            />
          )}

          <GoalForm existingGoal={goal} onSubmit={saveGoal} />
        </>
      )}
    </div>
  )
}
