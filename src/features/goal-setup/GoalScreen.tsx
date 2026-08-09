import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  unitLabel,
  formatExactNumber,
  formatSignedNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
} from '@/i18n'
import {
  goalWeekEnd,
  goalWindowHasEnded,
  kgToLb,
  paceCheckInsight,
} from '@/domain/goal'
import { useActiveGoalProgress, useLatestWeight, usePastGoals } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
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
  // #610 — calm pace check: null unless the last 3 completed windows all
  // missed, so it stays silent for a mixed or generally-on-track history.
  const paceCheck = goal
    ? paceCheckInsight(pastTargets, goal.targetWeeklyLossKg)
    : null
  // #155: whether the active goal's own window has already been reached
  // mid-week — drives the "Reached on [date]" badge/nudge below. #386:
  // no longer decides which record a `GoalForm` save touches — that's now
  // an explicit choice (Edit vs. "Start a new goal"), not auto-detected
  // from this.
  const activeGoalProgress = useActiveGoalProgress()
  const activeGoalWindowEnded = activeGoalProgress
    ? goalWindowHasEnded(activeGoalProgress.weekEnd)
    : false
  // #639: the mid-week "reached" badge/nudge only while the window is
  // still open — once it ends, goalNudgePhase below (completed/missed)
  // takes over, so the two moments never show contradictory messages
  // side by side (a sticky mid-week "reached" claim next to a corrected
  // "not met" final verdict).
  const activeGoalReachedOn = activeGoalWindowEnded
    ? null
    : (activeGoalProgress?.metOnDate ?? null)
  // #639 — which of the three nudge moments (if any) to show below the
  // weekly-target card: still-running-and-reached, ended-and-completed,
  // or ended-and-missed. Uses finalTargetMet (the window's real final
  // state), not the sticky targetMet, once the window has ended — see
  // goalWindowProgress.ts.
  const goalNudgePhase =
    !activeGoalProgress || !activeGoalWindowEnded
      ? activeGoalReachedOn
        ? ('reachedInProgress' as const)
        : null
      : activeGoalProgress.finalTargetMet === true
        ? ('completed' as const)
        : activeGoalProgress.finalTargetMet === false
          ? ('missed' as const)
          : null
  const goalNudgeWeekEndLabel = activeGoalProgress
    ? format(parseISO(activeGoalProgress.weekEnd), 'PP', {
        locale: dateFnsLocale,
      })
    : ''
  const goalNudgeSectionTitle =
    goalNudgePhase === 'completed'
      ? t.goal.goalCompletedSectionTitle
      : goalNudgePhase === 'missed'
        ? t.goal.goalMissedSectionTitle
        : t.goal.activeGoalReachedSectionTitle
  const goalNudgeBody =
    goalNudgePhase === 'completed'
      ? t.goal.goalCompletedNudge
      : goalNudgePhase === 'missed'
        ? t.goal.goalMissedNudge
        : goalNudgePhase === 'reachedInProgress'
          ? t.goal.activeGoalReachedNudge(goalNudgeWeekEndLabel)
          : null
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

      {/* #602 — one-tap entry point to the calm end-of-week glance. */}
      <Button variant="outline" size="sm" className="self-start" asChild>
        <Link to="/goal/weekly-review">
          {t.weeklyReview.viewWeeklyReviewButton}
        </Link>
      </Button>

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
                value={formatExactNumber(toDisplay(goal.targetWeeklyLossKg), locale)}
                unit={t.today.toLose(unitLabel(displayUnit, t))}
                description={
                  goal.weekStart
                    ? [
                        t.common.weekRangeLabel(
                          format(parseISO(goal.weekStart), 'PP', {
                            locale: dateFnsLocale,
                          }),
                          format(
                            parseISO(goal.weekEnd ?? goalWeekEnd(goal.weekStart)),
                            'PP',
                            { locale: dateFnsLocale },
                          ),
                        ),
                        // #551 — same baseline as Today (#469): weight
                        // logged on goal.weekStart, not latest weigh-in.
                        activeGoalProgress?.baselineWeightKg !== undefined
                          ? t.today.weeklyTargetFromWeight(
                              `${formatExactNumber(toDisplay(activeGoalProgress.baselineWeightKg), locale)} ${unitLabel(displayUnit, t)}`,
                            )
                          : null,
                        // #155: named alongside the range, same badge copy
                        // PastTargetsList uses for a reached past target.
                        activeGoalReachedOn &&
                          t.goal.targetMetOnLabel(
                            format(parseISO(activeGoalReachedOn), 'PP', {
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

          {/* #155/#639: quiet nudge covering three mutually-exclusive
           * moments for the active goal's own window — still running and
           * reached mid-week (not final yet), or ended with the target
           * either completed or missed. Same tone/style as #38's
           * goalRenewalReminder on TodayScreen; no link needed since the
           * form (with the now-unlocked restart button once ended) is
           * right below. */}
          {goalNudgePhase && (
            <div className="flex flex-col gap-1.5">
              {sectionTitle('goalReachedNudge', goalNudgeSectionTitle)}
              {sectionVisible.goalReachedNudge && (
                <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                  {goalNudgeBody}
                </div>
              )}
            </div>
          )}

          {/* #610 — calm pace check, same "quiet nudge" shape as the
           * goalReachedNudge card above (own hideable section, no forecast
           * chart or finish-date estimate, dismissible without blocking
           * logging). */}
          {paceCheck && (
            <div className="flex flex-col gap-1.5">
              {sectionTitle('goalPaceCheckNudge', t.goal.paceCheckSectionTitle)}
              {sectionVisible.goalPaceCheckNudge && (
                <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                  {t.goal.paceCheckMessage(
                    t.goal.paceCheckPerWeekLabel(
                      formatSignedNumber(
                        toDisplay(paceCheck.averageWeeklyDeltaKg),
                        locale,
                      ),
                      unitLabel(displayUnit, t),
                    ),
                    t.goal.paceCheckPerWeekLabel(
                      formatExactNumber(
                        toDisplay(paceCheck.targetWeeklyLossKg),
                        locale,
                      ),
                      unitLabel(displayUnit, t),
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          <GoalForm
            existingGoal={goal}
            onSubmit={saveGoal}
            latestWeightKg={latestWeightKg}
          />

          <PastTargetsList records={pastTargets} onDelete={deleteGoal} />
        </>
      )}
    </div>
  )
}
