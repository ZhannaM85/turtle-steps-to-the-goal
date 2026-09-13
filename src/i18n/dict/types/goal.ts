export interface GoalDict {
    title: string
    description: string
    thisWeeksTarget: string
    targetLabel: (unit: string) => string
    targetRequired: string
    deficitEstimate: (kcal: number, direction: 'deficit' | 'surplus') => string
    deficitCaveat: string
    /** #574 — when weekly pace and daily calories imply opposite directions. */
    paceCaloriesMismatchHint: string
    /** #529 — ± buttons on the weekly-pace field. */
    decreaseWeeklyTargetLabel: string
    increaseWeeklyTargetLabel: string
    weeklyTargetStepHint: (step: string, unit: string) => string
    /** #529 — soft warning when pace > ~1 kg/week; does not block save. */
    aggressivePaceWarning: (kcal: string) => string
    /** #671 — editable start date for a new goal's window (defaults via
     * `defaultWeekStartDate`, including the same-day-reach bump). */
    weekStartDateLabel: string
    weekStartDateHint: string
    /** #683 — soft warning when the draft window overlaps a previous goal. */
    goalWindowOverlapWarning: string
    /** #659 — editable end date for the goal's own window, alongside the
     * pace fields above (`goalWeekEnd`'s `weekStart + 6` default, unless
     * overridden). */
    weekEndDateLabel: string
    weekEndDateHint: string
    /** #208 — genuinely optional, unlike the weekly target above; hint
     * clarifies that leaving it blank is fine, not an error state. */
    dailyCalorieTargetLabel: string
    dailyCalorieTargetHint: string
    /** #220 — same shape/reasoning as dailyCalorieTarget above, an
     * independent optional field. */
    dailyProteinTargetLabel: string
    dailyProteinTargetHint: string
    /** #252 — same shape/reasoning again, two more independent optional
     * fields. */
    dailyFatTargetLabel: string
    dailyFatTargetHint: string
    dailyCarbTargetLabel: string
    dailyCarbTargetHint: string
    /** #341 — same shape/reasoning as the other daily macro targets above. */
    dailyFiberTargetLabel: string
    dailyFiberTargetHint: string
    /** #582 — soft fiber suggest (sex-based ballpark), same role as water's. */
    useFiberSuggestionButton: string
    fiberSuggestionHint: (grams: string) => string
    /** #530 — optional daily electrolyte targets (mg). */
    dailySodiumTargetLabel: string
    dailySodiumTargetHint: string
    dailyPotassiumTargetLabel: string
    dailyPotassiumTargetHint: string
    dailyMagnesiumTargetLabel: string
    dailyMagnesiumTargetHint: string
    /** #258 — same shape again, independent of the macro targets. */
    dailyWaterTargetLabel: string
    dailyWaterTargetHint: string
    /** #548 — fill water target from recommended mid range. */
    useWaterRecommendationButton: string
    waterRecommendationGoalHint: (lowLiters: string, highLiters: string) => string
    /** #259 — deterministic TDEE/macro-ratio suggestion, prefills but
     * never auto-saves the four target fields above. */
    suggestTargetButton: string
    suggestTargetCaveat: string
    suggestTargetMissingProfileHint: string
    /** #569/#573 — contextual recalculate beside last-edited pace or calories. */
    recalculateFromPaceButton: string
    recalculateFromCaloriesButton: string
    recalculateFromFieldCaveat: string
    updateButton: string
    setButton: string
    /** #534 — abandon in-progress goal edits without saving. */
    cancelButton: string
    confirmDiscardEditsLabel: string
    /** #382 — shown alongside `updateButton` only while there's a still-live,
     * not-yet-reached window to edit in place (the ambiguous case #181's
     * automatic edit-in-place logic used to silently resolve on its own).
     * Forces a fresh weekStart=today record instead, same as saving once
     * the current window has actually run its course. */
    startNewGoalButton: string
    startNewGoalHint: string
    /** #639 — shown instead of startNewGoalHint, and the button disabled,
     * until the current goal's window has actually ended: restarting mid-
     * week used to let a fresh, short window quietly replace the current
     * one before it ran its course, producing the overlapping-windows bug
     * this whole issue was filed for. */
    startNewGoalAvailableFromLabel: (weekEndDate: string) => string
    savedConfirmation: string
    currentGoalTitle: string
    notSetLabel: string
    editGoalLabel: string
    /** #668 — deletes the currently active goal entirely (not just a past
     * target — see pastTargetsTitle's own deletePastTargetLabel below for
     * that). Two-step inline confirm, same shape as confirmDiscardEditsLabel
     * above; reuses history.confirmDelete's Yes/No since this is a real
     * delete, not a discard. */
    deleteGoalLabel: string
    confirmDeleteGoalLabel: string
    /** Goal history section (#147) — every past (non-active) target. */
    pastTargetsTitle: string
    weekColumnLabel: string
    targetColumnLabel: string
    statusColumnLabel: string
    targetPerWeek: (target: string, unit: string) => string
    targetMetLabel: string
    /** Same "met" state as targetMetLabel, but naming the date it was
     * first reached (#177) — used whenever progress.metOnDate is known,
     * which is always the case once targetMet is true. targetMetLabel
     * stays as a defensive fallback for the (should-never-happen) case
     * where targetMet is true without a metOnDate. */
    targetMetOnLabel: (date: string) => string
    targetMissedLabel: string
    targetNoDataLabel: string
    /** #339 — shows which two weigh-ins a past-goal row's status is
     * actually based on: the weight logged on the window's start date,
     * and either the weight that met the target or (if not met) the most
     * recently logged weight in the window. */
    previousToCurrentWeightLabel: (
      previous: string,
      current: string,
      unit: string,
    ) => string
    /** Quiet nudge (#155) on GoalScreen once the *active* goal's own window
     * has been reached mid-week — same no-badges/no-streaks tone as
     * today.goalRenewalReminder, shown alongside the targetMetOnLabel badge
     * on the StatCard rather than replacing it. #639: reframed as a
     * "keep going," not "you can restart now" (the restart button stays
     * disabled until the window actually ends) — takes the window's own
     * weekEnd date. Only shown while the window is still in progress; once
     * it ends, `goalCompletedNudge`/`goalMissedNudge` below take over.
     * #665: same inclusive last-day phrasing as `today.targetMetBanner`. */
    activeGoalReachedNudge: (weekEndDate: string) => string
    /** #232 — short title for the nudge's own show/hide toggle row,
     * distinct from the full-sentence body text above (same reasoning as
     * today.targetMetSectionTitle etc.). Reused for all three
     * activeGoalReachedNudge/goalCompletedNudge/goalMissedNudge phases —
     * one show/hide preference for "the goal-status nudge" as a concept,
     * not per phase. */
    activeGoalReachedSectionTitle: string
    /** #639 — end-of-window completion nudge: the window has ended and its
     * final state still met the target. Persistent complement to
     * `today.celebrationComplete*`'s one-time modal, same "second chance to
     * notice" reasoning #235 already established for the mid-week case.
     * No link needed — GoalForm's now-unlocked restart button sits right
     * below on the same page. */
    goalCompletedNudge: string
    goalCompletedSectionTitle: string
    /** #639 — end-of-window "soft" miss nudge: the window has ended and its
     * final state did not meet the target. Deliberately calm/factual, no
     * guilt language, matching this app's established tone (#599, #610) —
     * acknowledges the outcome instead of going silent on it. */
    goalMissedNudge: string
    goalMissedSectionTitle: string
    /** #610 / #881 — calm, weekly-framed pace check: shown only when the
     * last `PACE_CHECK_MIN_CONSECUTIVE_MISSES` (3) completed goal windows
     * all missed. Direction lives in the words (lost / gained / stayed
     * the same), never a signed loss-positive number. `actual`/`target`
     * are unsigned "X kg/week" strings (paceCheckPerWeekLabel). */
    paceCheckLostMessage: (actual: string, target: string) => string
    paceCheckGainedMessage: (actual: string, target: string) => string
    paceCheckUnchangedMessage: (target: string) => string
    paceCheckPerWeekLabel: (value: string, unit: string) => string
    paceCheckSectionTitle: string
    /** Per-row delete on the past-targets history (#174) — same two-step
     * confirm shape as history/EntryRow.tsx's own delete, own copy rather
     * than cross-feature reuse since the wording differs ("target" vs
     * "entry"). */
    deletePastTargetLabel: (weekRange: string) => string
    confirmDeletePastTargetLabel: string
    confirmDeletePastTargetYes: string
    confirmDeletePastTargetNo: string
  }

export interface WeeklyReviewDict {
    screenTitle: string
    screenDescription: string
    viewWeeklyReviewButton: string
    backToGoalLabel: string
    noActiveGoalMessage: string
    progressSectionLabel: string
    progressMetLabel: (date: string) => string
    progressNotYetLabel: string
    progressNoBaselineYetMessage: string
    averagesSectionLabel: string
    averagesSummary: (kcal: string, protein: string) => string
    noAveragesYetMessage: string
    insightSectionLabel: string
    adjustPaceButton: string
  }
