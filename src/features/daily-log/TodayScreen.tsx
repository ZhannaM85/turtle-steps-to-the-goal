import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { kgToLb } from '@/domain/goal'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { StatCard } from '@/shared/ui/stat-card'
import { useDailyEntryStore, useGoalStore } from '@/stores'
import { DailyEntryForm } from './DailyEntryForm'

function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function TodayScreen() {
  const { goal, status: goalStatus, loadActiveGoal } = useGoalStore()
  const {
    entry,
    status: entryStatus,
    loadEntry,
    saveEntry,
  } = useDailyEntryStore()
  const [date, setDate] = useState(todayIso)

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])

  useEffect(() => {
    loadEntry(date)
  }, [date, loadEntry])

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

      {goalStatus === 'loading' || goalStatus === 'idle' ? (
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="log-date">Date</Label>
        <Input
          id="log-date"
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          className="max-w-48"
        />
      </div>

      {entryStatus === 'loading' || entryStatus === 'idle' ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DailyEntryForm
          key={date}
          date={date}
          existingEntry={entry}
          onSubmit={saveEntry}
        />
      )}
    </div>
  )
}
