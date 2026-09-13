import type { GoalDict, WeeklyReviewDict } from '../types/goal'

export const goal: GoalDict = {
    title: 'Goal',
    description: "This week's target — small steps, renewed week to week",
    thisWeeksTarget: "This week's target",
    targetLabel: (unit) => `This week's target (${unit} to lose)`,
    targetRequired: "Enter this week's target, greater than 0",
    deficitEstimate: (kcal, direction) =>
      `Rough estimate: about ${kcal} kcal/day ${direction}.`,
    deficitCaveat:
      'This is a simple arithmetic estimate (~7700 kcal ≈ 1kg of fat), not medical or nutritional advice.',
    paceCaloriesMismatchHint:
      'Your daily calories and weekly pace don’t match (one looks like loss, the other like maintenance or gain). Use Recalculate from calories or from weekly pace — nothing updates automatically.',
    decreaseWeeklyTargetLabel: 'Decrease weekly target',
    increaseWeeklyTargetLabel: 'Increase weekly target',
    weeklyTargetStepHint: (step, unit) =>
      `Use ± for ${step} ${unit} steps, or type any value.`,
    aggressivePaceWarning: (kcal) =>
      `That’s a steep weekly pace (about ${kcal} kcal/day deficit). Most people aim for around 0.5–1 kg per week — you can still save this if you mean it.`,
    weekStartDateLabel: 'Starts on',
    weekStartDateHint:
      'Defaults to today (or tomorrow if you’re restarting on the day the previous goal ended). Change freely — overlapping a previous goal only shows a warning, it does not block saving.',
    goalWindowOverlapWarning:
      'This window overlaps a previous goal. You can still save — just check that the dates are what you meant.',
    weekEndDateLabel: 'Ends on',
    weekEndDateHint:
      'Defaults to 7 days after the window starts. Change it if your week should end on a different day.',
    dailyCalorieTargetLabel: 'Daily calories target',
    dailyCalorieTargetHint: 'Optional — leave blank to skip.',
    dailyProteinTargetLabel: 'Daily protein target',
    dailyProteinTargetHint: 'Optional — leave blank to skip.',
    dailyFatTargetLabel: 'Daily fat target',
    dailyFatTargetHint: 'Optional — leave blank to skip.',
    dailyCarbTargetLabel: 'Daily carb target',
    dailyCarbTargetHint: 'Optional — leave blank to skip.',
    dailyFiberTargetLabel: 'Daily fiber target',
    dailyFiberTargetHint: 'Optional — leave blank to skip.',
    useFiberSuggestionButton: 'Use suggested fiber',
    fiberSuggestionHint: (grams) =>
      `A common adult ballpark is about ${grams} g/day (rough guide, not medical advice).`,
    dailySodiumTargetLabel: 'Daily sodium target',
    dailySodiumTargetHint: 'Optional — leave blank to skip.',
    dailyPotassiumTargetLabel: 'Daily potassium target',
    dailyPotassiumTargetHint: 'Optional — leave blank to skip.',
    dailyMagnesiumTargetLabel: 'Daily magnesium target',
    dailyMagnesiumTargetHint: 'Optional — leave blank to skip.',
    dailyWaterTargetLabel: 'Daily water target',
    dailyWaterTargetHint: 'Optional — leave blank to skip.',
    useWaterRecommendationButton: 'Use recommended mid value',
    waterRecommendationGoalHint: (low, high) =>
      `From your latest weight: about ${low}–${high} L/day (not medical advice).`,
    suggestTargetButton: 'Suggest a target',
    suggestTargetCaveat:
      'Fills in the four fields below from your weight, height, age, sex, and activity level — not medical or nutritional advice. Review and edit before saving.',
    suggestTargetMissingProfileHint:
      'Log a weight, and set your height, age, sex, and activity level in Settings, to use this.',
    recalculateFromPaceButton: 'Recalculate from weekly pace',
    recalculateFromCaloriesButton: 'Recalculate from calories',
    recalculateFromFieldCaveat:
      'Rough estimate from your profile — not medical advice. Review before saving.',
    updateButton: 'Update this week’s target',
    setButton: 'Set this week’s target',
    cancelButton: 'Cancel',
    confirmDiscardEditsLabel: 'Leave without saving your goal changes?',
    startNewGoalButton: 'Start a new goal',
    startNewGoalHint:
      'Begins a fresh window (defaults from today). If it overlaps the previous goal, you’ll see a warning — saving is still allowed.',
    startNewGoalAvailableFromLabel: (weekEndDate) =>
      `Available once this week's target ends, on ${weekEndDate}.`,
    savedConfirmation: 'Saved',
    currentGoalTitle: 'Current goal',
    notSetLabel: 'Not set',
    editGoalLabel: 'Edit goal',
    deleteGoalLabel: 'Delete goal',
    confirmDeleteGoalLabel: "Delete this goal? This can't be undone.",
    pastTargetsTitle: 'Past targets',
    weekColumnLabel: 'Week',
    targetColumnLabel: 'Target',
    statusColumnLabel: 'Status',
    targetPerWeek: (target, unit) => `${target} ${unit}/week`,
    targetMetLabel: 'Target met',
    targetMetOnLabel: (date) => `Target met on ${date}`,
    targetMissedLabel: 'Target not met',
    targetNoDataLabel: 'Not enough data to tell',
    previousToCurrentWeightLabel: (previous, current, unit) =>
      `${previous} → ${current} ${unit}`,
    activeGoalReachedNudge: (weekEndDate) =>
      `You've reached this week's target — keep it up through ${weekEndDate} to earn your badge!`,
    activeGoalReachedSectionTitle: 'Target reached',
    goalCompletedNudge:
      "You completed this week's goal! Start a new one below whenever you're ready.",
    goalCompletedSectionTitle: 'Goal completed',
    goalMissedNudge:
      "This week's target wasn't reached — that's okay. Start a new one below whenever you're ready.",
    goalMissedSectionTitle: "This week's result",
    paceCheckLostMessage: (actual, target) =>
      `Recent weeks you lost about ${actual} vs. your ${target} target — consider adjusting the weekly pace.`,
    paceCheckGainedMessage: (actual, target) =>
      `Recent weeks you gained about ${actual} vs. your ${target} loss target — consider adjusting the weekly pace.`,
    paceCheckUnchangedMessage: (target) =>
      `Recent weeks weight stayed about the same vs. your ${target} target — consider adjusting the weekly pace.`,
    paceCheckPerWeekLabel: (value, unit) => `${value} ${unit}/week`,
    paceCheckSectionTitle: 'Pace check',
    deletePastTargetLabel: (weekRange) => `Delete target for ${weekRange}`,
    confirmDeletePastTargetLabel: 'Delete this target?',
    confirmDeletePastTargetYes: 'Delete',
    confirmDeletePastTargetNo: 'Cancel',
  }

export const weeklyReview: WeeklyReviewDict = {
    screenTitle: 'Weekly review',
    screenDescription:
      'A calm look at this week — no scores, no shame, just where things stand.',
    viewWeeklyReviewButton: 'Weekly review',
    backToGoalLabel: '← Goal',
    noActiveGoalMessage: 'Set a weekly target on Goal to see a review here.',
    progressSectionLabel: "This week's progress",
    progressMetLabel: (date) => `Target reached on ${date}.`,
    progressNotYetLabel: "Still working toward this week's target — no rush.",
    progressNoBaselineYetMessage:
      "No weigh-in logged yet for this week's start — progress will show once there is one.",
    averagesSectionLabel: 'Average this week',
    averagesSummary: (kcal, protein) => `${kcal} kcal/day, ${protein} protein/day.`,
    noAveragesYetMessage: 'Nothing logged yet this week.',
    insightSectionLabel: 'What stood out',
    adjustPaceButton: "Adjust next week's pace",
  }
