export interface DashboardDict {
    title: string
    description: string
    reorderSectionLabel: (n: number) => string
    reorderSectionsButton: string
    /** #356 — reported live: no way back to the original section order
     * short of manually re-dragging everything. Shown only while
     * `isReordering` is true, next to the existing Save button. */
    resetSectionOrderButton: string
    weightLegend: string
    caloriesLegend: string
    rollingAverageLegend: string
    trendChartEmptyDescription: string
    /** #217 — shown by the weight/calorie/macro trend charts instead of the
     * chart itself when there are too few logged days to plot a trend that
     * means anything (e.g. two far-apart points connected by a straight
     * line can visually read as a confident trend that isn't real). */
    notEnoughTrendDataMessage: string
    /** #708 — generic empty copy when a Dashboard section stays mounted
     * but has nothing to plot yet (or the period filter left it empty). */
    dashboardSectionEmptyDescription: string
    /** #380 — one global period control above the Weight/Calorie/Macro/
     * Body composition trend charts (resolved via `AskUserQuestion`: one
     * shared control, not a picker per chart), mirroring #240's "Export
     * period" shape. `'all'` matches every chart's pre-#380 behavior. */
    trendChartPeriodLabel: string
    trendChartPeriodAllOption: string
    trendChartPeriodWeekOption: string
    trendChartPeriodMonthOption: string
    trendChartPeriodYearOption: string
    trendChartPeriodCustomOption: string
    weightTrendTitle: string
    calorieTrendTitle: string
    macrosTitle: string
    /** #267 — trend chart for the 5 body-composition fields (#233 +
     * #263's body fat %), same "trend chart per tracked metric" shape as
     * the above, only rendered while that section is toggled on. */
    bodyCompositionTrendTitle: string
    /** #277 — shown instead of the chart once every series is unchecked
     * via the series picker, same shape as customChartEmptyDescription. */
    bodyCompositionEmptyDescription: string
    /** #530 — electrolytes trend (Na/K/Mg day totals). */
    electrolytesTrendTitle: string
    electrolytesEmptyDescription: string
    hideChartLabel: (title: string) => string
    showChartLabel: (title: string) => string
    weeklySummaryTitle: string
    weekRange: (start: string, end: string) => string
    weightChangeLabel: string
    averageCaloriesLabel: string
    targetMetNote: string
    /** #557 — freeform note on each weekly recap card. */
    addWeeklyNoteLabel: string
    editWeeklyNoteLabel: string
    saveWeeklyNoteLabel: string
    cancelWeeklyNoteLabel: string
    weeklyNoteLabel: string
    weeklyNotePlaceholder: string
    /** #571 — expand truncated weekly-note preview on the week card. */
    expandWeeklyNoteLabel: string
    collapseWeeklyNoteLabel: string
    /** #226 — a calendar month has one unambiguous boundary, unlike a
     * week, so no separate "monthRange" formatter is needed the way
     * weekRange is — the card's own label is just the localized month
     * name + year (date-fns 'MMMM yyyy'), formatted directly in the
     * component. */
    monthlySummaryTitle: string
    /** #215 — "as of today" rolling averages, distinct from the calendar-
     * based weekly/monthly summary cards above. */
    recentAveragesTitle: string
    last7DaysLabel: string
    last30DaysLabel: string
    /** Custom date-range comparison (#222) — two user-picked ranges shown
     * side by side, defaulting to this month vs. last month. */
    compareRangesTitle: string
    rangeALabel: string
    rangeBLabel: string
    rangeStartLabel: string
    rangeEndLabel: string
    compareRangesDayCount: (n: number) => string
    compareRangesWeightDelta: (delta: string, unit: string) => string
    emptyTitle: string
    emptyDescription: string
    correlationTitle: string
    correlationEmptyDescription: string
    correlationSummary: (
      thresholdKcal: number | string,
      direction: 'lower' | 'higher',
    ) => string
    /** #710 — day-pair sample size (was weekly `correlationWeekCount`). */
    correlationDayCount: (n: number) => string
    correlationLagCaveat: string
    /** Kept for older copy / unused after #710 day-pair switch; weekly
     * `CorrelationView` no longer shows this. */
    correlationCurrentWeekExcludedNote: string
    correlationExpandLabel: string
    correlationCollapseLabel: string
    /** #224 — shared plain-language strength label, reused by every
     * correlation view below (weekly calories one and the four day-pair
     * ones) rather than a separate copy per view, since the concept and
     * wording is identical everywhere it appears. */
    correlationStrengthLabel: (
      strength: 'weak' | 'moderate' | 'strong',
    ) => string
    /** #224 — shared outlier-flagging UI, reused by all 6 correlation
     * views (`shared/hooks/useOutlierExclusion.ts`,
     * `OutlierPointsList.tsx`). A flagged point (Tukey's-fences outlier on
     * either axis) can be tapped to drop it from that one view's own
     * correlation math — e.g. a vacation or illness week. */
    outlierPointsHeading: string
    excludeOutlierLabel: (label: string) => string
    restoreOutlierLabel: (label: string) => string
    /** #524 — why a chip/tooltip point was flagged (Tukey's on X, Y, or both).
     * `metricLabel` is that view's x-axis legend; `otherAxisLabel` is the
     * short Y noun when composing "unusual A and B" (defaults to weight). */
    outlierReasonWeightChange: string
    outlierReasonWeightChangeShort: string
    outlierReasonMetric: (metricLabel: string) => string
    outlierReasonBoth: (metricLabel: string, otherAxisLabel: string) => string
    /** #372 — a small separate link icon next to each outlier chip,
     * navigating to that day in History — deliberately a distinct action
     * from the chip's own tap-to-exclude (#224), not an overload of it,
     * resolved via `AskUserQuestion`. */
    viewOutlierDayLabel: (label: string) => string
    weeklyChangeLegend: string
    chartNavigationHint: string
    /** #615 — one-line factual note on the weight trend chart, shown only
     * when cycle tracking is on: a template fact, not a prediction — no
     * ovulation/fertile-window logic, no per-user computed window, just a
     * general reminder that period days are a known source of weight
     * noise. Cycle-off users never see this string rendered anywhere. */
    cyclePeriodWeightNote: string
    /** #443 — per-chart prev/next paging within the shared Week/Month/Year
     * period type, see `useChartPeriodPager`'s own doc comment. */
    previousPeriodLabel: string
    nextPeriodLabel: string
    viewDayLink: string
    /** #713 — accessible label for the correlation scatter tooltip ✕. */
    correlationTooltipCloseLabel: string
    /** Latest-meal-time vs. next-day weight chart (#116) — distinct from
     * the calories-vs-weekly-change correlation above (correlationTitle
     * etc.): this pairs each day's latest meal time with the *next*
     * calendar day's weight change, not a weekly average. */
    lateMealTitle: string
    lateMealEmptyDescription: string
    lateMealSummary: (
      thresholdTime: string,
      direction: 'earlier' | 'later',
    ) => string
    lateMealDayCount: (n: number) => string
    lateMealLagCaveat: string
    lateMealTimeLegend: string
    nextDayChangeLegend: string
    /** #338 — meal *count* vs. next-day weight, same median-split shape
     * as lateMealTitle above. Distinct from #257 (meal *timing*) and #322
     * (meal *composition*) — this is "3 larger meals vs. 5 smaller ones,"
     * derived from data already logged (meal group count per day), no new
     * manual entry needed. */
    mealFrequencyTitle: string
    mealFrequencyEmptyDescription: string
    mealFrequencySummary: (
      thresholdCount: number,
      direction: 'fewer' | 'more',
    ) => string
    mealFrequencyDayCount: (n: number) => string
    mealFrequencyLagCaveat: string
    mealCountLegend: string
    /** #257 — actual elapsed fasting duration (previous day's last meal to
     * current day's first meal) vs. next-day weight, median-split same
     * shape as lateMeal* above. Distinct from lateMeal*, which only looks
     * at a raw clock time, not the real gap between meals. */
    fastingWindowTitle: string
    fastingWindowEmptyDescription: string
    fastingWindowSummary: (
      thresholdHours: string,
      direction: 'shorter' | 'longer',
    ) => string
    fastingWindowDayCount: (n: number) => string
    fastingWindowLagCaveat: string
    fastingHoursLegend: string
    /** Sleep-hours-vs-next-day-weight correlation (#167), same shape as
     * lateMeal* above. */
    sleepCorrelationTitle: string
    sleepCorrelationEmptyDescription: string
    sleepCorrelationSummary: (
      thresholdHours: string,
      direction: string,
    ) => string
    sleepCorrelationDayCount: (n: number) => string
    sleepCorrelationLagCaveat: string
    sleepHoursLegend: string
    /** Step-count-vs-next-day-weight correlation (#167), same shape. */
    stepsCorrelationTitle: string
    stepsCorrelationEmptyDescription: string
    stepsCorrelationSummary: (
      thresholdSteps: string,
      direction: string,
    ) => string
    stepsCorrelationDayCount: (n: number) => string
    stepsCorrelationLagCaveat: string
    stepsCountLegend: string
    /** Protein-vs-next-day-weight correlation (#216), same day-pair shape
     * as sleep/steps above — deliberately distinct from the existing
     * calories-vs-weekly-change correlation (correlationTitle etc.), which
     * stays a weekly-average comparison, not a day-pair one. #322: splits
     * on protein as a percent of that day's total calories, not raw grams
     * (see proteinCorrelation.ts's own ProteinPoint comment for why) —
     * thresholdProteinPercent below is a percent, not a gram amount. */
    proteinCorrelationTitle: string
    proteinCorrelationEmptyDescription: string
    proteinCorrelationSummary: (
      thresholdProteinPercent: string,
      direction: string,
    ) => string
    proteinCorrelationDayCount: (n: number) => string
    proteinCorrelationLagCaveat: string
    /** #322 — scatter-chart X-axis name/tooltip label for the protein
     * correlation's percent-of-calories metric (distinct from
     * dailyEntry.proteinLabel, a plain gram amount used elsewhere). */
    proteinPercentOfCaloriesLabel: string
    /** #383 — night eating (hadNightEating()) vs. next-day weight. Unlike
     * every other correlation view above, the predictor here is already
     * boolean (no threshold to find), so this is a plain two-group
     * comparison rather than a median split — see
     * nightEatingCorrelation.ts's own doc comment. Kept as its own view
     * despite the conceptual overlap with #116's lateMeal* (median-splits
     * the exact last-meal-time instead), confirmed with the user. */
    nightEatingCorrelationTitle: string
    nightEatingCorrelationEmptyDescription: string
    nightEatingCorrelationSummary: (direction: 'more' | 'less') => string
    nightEatingCorrelationDayCount: (n: number) => string
    nightEatingCorrelationLagCaveat: string
    /** #607 — logged `hadAlcohol` vs. next-day weight. Same boolean-
     * predictor shape as nightEatingCorrelation* above (plain two-group
     * comparison, not a median split) — unlike every other correlation
     * view here, this one is also Settings-gated (`useAlcoholTrackingStore`)
     * and renders nothing at all when the toggle is off. */
    alcoholCorrelationTitle: string
    alcoholCorrelationEmptyDescription: string
    alcoholCorrelationSummary: (direction: 'more' | 'less') => string
    alcoholCorrelationDayCount: (n: number) => string
    alcoholCorrelationLagCaveat: string
    /** Logging-consistency heatmap (#223) — GitHub-contribution-graph style,
     * one square per day colored by how many of the app's core fields
     * (weight/meals/sleep/steps) were logged that day, not a chosen metric. */
    loggingConsistencyTitle: string
    heatmapLessLabel: string
    heatmapMoreLabel: string
    /** #268 — plain totals next to the heatmap so "how many days did I
     * actually log" doesn't require counting colored boxes by eye.
     * Informational/curiosity framing only, not a guilt/streak metric.
     * #272: one stat per line (not one joined sentence, which wrapped
     * awkwardly on a real phone) — each of these three renders on its own
     * row. */
    daysLoggedSummaryText: (daysLogged: string) => string
    totalCaloriesOverLoggedDaysText: (total: string) => string
    totalCaloriesLast7DaysText: (total: string) => string
    /** Per-dish reaction rollup (#128, built on #129's per-item emotion) —
     * two ranked lists under one shared heading, each row using
     * dailyEntry.mealEmotionLabel for its per-count accessible text. */
    foodReactionsTitle: string
    mostLikedFoodsTitle: string
    mostDislikedFoodsTitle: string
    /** #812 — ranked dishes by times logged in last 7 / 30 days. */
    mostEatenTitle: string
    mostEatenDescription: string
    mostEatenModeGroupLabel: string
    mostEatenCountModeLabel: string
    mostEatenKcalModeLabel: string
    mostEatenKcalValue: (kcal: string, percent: number) => string
    /** #814 — ranked eating reasons in last 7 / 30 days. */
    eatingReasonsTallyTitle: string
    eatingReasonsTallyDescription: string
    /** #815 — meals by morning/afternoon/evening/night. */
    mealTimeBucketsTitle: string
    mealTimeBucketsDescription: string
    mealTimeBucketMorning: string
    mealTimeBucketAfternoon: string
    mealTimeBucketEvening: string
    mealTimeBucketNight: string
    mealTimeBucketsMissingTime: (n: number) => string
    /** #816 — meal slot names (Breakfast / Lunch / custom) recently. */
    mealNameFrequencyTitle: string
    mealNameFrequencyDescription: string
    /** #823 — what tends to happen after a meal (not a count table). */
    eatingPatternsTitle: string
    eatingPatternsDescription: string
    eatingPatternsLearningDescription: string
    eatingPatternsCaveat: string
    eatingPatternsDetailsLabel: string
    eatingPatternsDetailsBody: string
    eatingPatternsSampleSize: (n: number) => string
    eatingPatternsCarbGap: (higher: string, lower: string) => string
    eatingPatternsCarbGapCraving: (k: number, n: number) => string
    eatingPatternsEveningNight: (
      nightCount: number,
      eveningCount: number,
      average: string,
    ) => string
    eatingPatternsEveningNightReason: (reason: string, k: number) => string
    /** Customizable multi-series chart (#132) — checkboxes toggle which
     * series overlay on one chart. Weight/Calories/Fasting hours get their
     * own Title-case labels here since dailyEntry's weightLegend/
     * caloriesLegend and dashboard's own fastingHoursLegend (#445) are
     * lowercase sentence-fragment forms, not standalone labels;
     * Protein/Fat/Carbs/Steps/On period/Bowel movement reuse
     * dailyEntry.proteinLabel etc. directly, already Title-case. */
    customChartTitle: string
    customChartWeightLabel: string
    customChartCaloriesLabel: string
    customChartFastingHoursLabel: string
    /** Per-series chart type picker (#137) — three icon buttons (line/bar/
     * dots) shown next to each selected series in the legend. */
    customChartTypeLine: string
    customChartTypeBar: string
    customChartTypeDots: string
    customChartTypeGroupLabel: (seriesLabel: string) => string
    customChartNormalizedCaveat: string
    /** #502 — tooltip suffix for a boolean day marker (period, constipation,
     * night eating) whose single dot stands for several flagged days on a
     * long range. Only rendered when the count is above 1. */
    customChartMarkerDaysText: (dayCount: number) => string
    /** #502 — shown under the chart only while day markers are actually
     * being grouped, explaining that one dot can cover several days and
     * that a shorter period shows each of them. */
    customChartGroupedMarkersCaveat: string
    /** #543 — shown under Compare Data while a gesture zoom is active. */
    customChartZoomHint: string
    customChartResetZoomButton: string
    customChartEmptyDescription: string
    /** #336 — one card per user-defined `CustomCorrelation`, rendered after
     * every fixed built-in correlation view above. Unlike those (always
     * "metric vs. the *next* day's weight change"), this pairs both sides
     * on the *same* day — see `domain/stats/customCorrelationEngine.ts`'s
     * own doc comment for why. `aLabel`/`bLabel` are whichever metric
     * labels (built-in or a custom metric's own name) the user picked when
     * defining it. */
    customCorrelationSummary: (
      aLabel: string,
      thresholdValue: string,
      direction: 'higher' | 'lower',
      bLabel: string,
    ) => string
    customCorrelationDayCount: (n: number) => string
    customCorrelationLagCaveat: string
    customCorrelationEmptyDescription: string
    /** Links from the Dashboard's custom-correlations block down to
     * `CustomMetricsScreen.tsx`, same "manage elsewhere" shape recipes'
     * own settings-card link uses. */
    manageCustomCorrelationsLabel: string
  }
