import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import {
  unitLabel,
  formatNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
} from '@/i18n'
import { goalWeekEnd, kgToLb } from '@/domain/goal'
import { useActiveGoalProgress, useLatestWeight, usePastGoals } from '@/shared/hooks'
import { PageHeader } from '@/shared/ui/page-header'
import { SectionTitleWithToggle } from '@/shared/ui/section-title-with-toggle'
import { StatCard } from '@/shared/ui/stat-card'
import { VisibilityToggleButton } from '@/shared/ui/visibility-toggle-button'
import {
  useGoalStore,
  useSectionVisibilityStore,
  useUnitStore,
  type SectionKey,
} from '@/stores'
import { GoalForm } from './GoalForm'
import { PastTargetsList } from './PastTargetsList'

export function GoalScreen() {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const { goal, status, error, loadActiveGoal, saveGoal } = useGoalStore()
  const displayUnit = useUnitStore((state) => state.unit)
  const { records: pastTargets, deleteGoal } = usePastGoals(goal)
  // #155: whether the active goal's own window has already been reached
  // mid-week — drives both the "Reached on [date]" badge/nudge below and
  // (via GoalForm's activeGoalReached prop) whether the next save starts a
  // fresh record instead of editing this now-succeeded one in place.
  const activeGoalProgress = useActiveGoalProgress()
  const activeGoalReachedOn = activeGoalProgress?.metOnDate ?? null
  // #259 — the most recently logged weight, needed by GoalForm's "Suggest
  // a target" TDEE helper. `goal` as the refresh key isn't quite right
  // (weight logging doesn't change the goal), but there's no cheaper
  // signal already available here to key off of, and a stale weight for
  // one render is harmless — the helper is opt-in, triggered by a button
  // click, not something that silently applies on its own.
  const latestWeightKg = useLatestWeight(goal)
  // #232 — same mechanism #245/#247 gave every Dashboard section and
  // #232 gave Today's own insight cards. Two small local helpers, same
  // reasoning as TodayScreen.tsx's own `sectionTitle`/`statCardAction`.
  const sectionVisible = useSectionVisibilityStore((state) => state.visible)
  const toggleSection = useSectionVisibilityStore(
    (state) => state.toggleVisible,
  )
  function sectionTitle(key: SectionKey, title: string) {
    return (
      <SectionTitleWithToggle
        title={title}
        visible={sectionVisible[key]}
        onToggle={() => toggleSection(key)}
        hideLabel={t.common.hideSectionLabel(title)}
        showLabel={t.common.showSectionLabel(title)}
      />
    )
  }
  function statCardAction(key: SectionKey, title: string) {
    return (
      <VisibilityToggleButton
        visible={sectionVisible[key]}
        onToggle={() => toggleSection(key)}
        hideLabel={t.common.hideSectionLabel(title)}
        showLabel={t.common.showSectionLabel(title)}
      />
    )
  }

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])
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

          {goal &&
            (sectionVisible.goalWeeklyTargetCard ? (
              <StatCard
                label={t.goal.thisWeeksTarget}
                value={formatNumber(-toDisplay(goal.targetWeeklyLossKg), locale)}
                unit={t.today.toLose(unitLabel(displayUnit, t))}
                description={
                  goal.weekStart
                    ? [
                        t.common.weekRangeLabel(
                          format(parseISO(goal.weekStart), 'MMM d', {
                            locale: dateFnsLocale,
                          }),
                          format(
                            parseISO(goalWeekEnd(goal.weekStart)),
                            'MMM d',
                            { locale: dateFnsLocale },
                          ),
                        ),
                        // #155: named alongside the range, same badge copy
                        // PastTargetsList uses for a reached past target.
                        activeGoalReachedOn &&
                          t.goal.targetMetOnLabel(
                            format(parseISO(activeGoalReachedOn), 'MMM d', {
                              locale: dateFnsLocale,
                            }),
                          ),
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : undefined
                }
                action={statCardAction(
                  'goalWeeklyTargetCard',
                  t.goal.thisWeeksTarget,
                )}
              />
            ) : (
              sectionTitle('goalWeeklyTargetCard', t.goal.thisWeeksTarget)
            ))}

          {/* #155: quiet nudge once the active goal's own window has been
           * reached mid-week — a save from here on starts a fresh record
           * (GoalForm's activeGoalReached prop) rather than editing this
           * now-succeeded one in place. Same tone/style as #38's
           * goalRenewalReminder on TodayScreen; no link needed since the
           * form is right below. */}
          {activeGoalReachedOn && (
            <div className="flex flex-col gap-1.5">
              {sectionTitle(
                'goalReachedNudge',
                t.goal.activeGoalReachedSectionTitle,
              )}
              {sectionVisible.goalReachedNudge && (
                <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                  {t.goal.activeGoalReachedNudge}
                </div>
              )}
            </div>
          )}

          <GoalForm
            existingGoal={goal}
            onSubmit={saveGoal}
            activeGoalReached={activeGoalReachedOn !== null}
            latestWeightKg={latestWeightKg}
          />

          <PastTargetsList records={pastTargets} onDelete={deleteGoal} />
        </>
      )}
    </div>
  )
}
