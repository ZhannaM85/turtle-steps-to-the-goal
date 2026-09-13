import type { DashboardDict } from '../types/dashboard'

export const dashboard: DashboardDict = {
    title: 'Dashboard',
    description:
      'Weight trend, calorie trend, weekly summary cards, correlation view',
    reorderSectionLabel: (n: number) => `Reorder section ${n}`,
    reorderSectionsButton: 'Reorder',
    resetSectionOrderButton: 'Reset order',
    weightLegend: 'weight',
    caloriesLegend: 'calories',
    rollingAverageLegend: '7-day average',
    trendChartEmptyDescription: 'Pick at least one series to show.',
    notEnoughTrendDataMessage:
      'Not enough data yet to show a trend — log a few more days and check back.',
    dashboardSectionEmptyDescription:
      'Nothing to show here yet — keep logging, or widen the date range if you filtered it.',
    trendChartPeriodLabel: 'Chart period',
    trendChartPeriodAllOption: 'All time',
    trendChartPeriodWeekOption: 'Week',
    trendChartPeriodMonthOption: 'Month',
    trendChartPeriodYearOption: 'Year',
    trendChartPeriodCustomOption: 'Custom',
    weightTrendTitle: 'Weight trend',
    calorieTrendTitle: 'Calorie trend',
    macrosTitle: 'Protein, fat & carbs',
    bodyCompositionTrendTitle: 'Body composition',
    bodyCompositionEmptyDescription: 'Pick at least one to see a chart.',
    electrolytesTrendTitle: 'Electrolytes',
    electrolytesEmptyDescription: 'Pick at least one to see a chart.',
    hideChartLabel: (title) => `Hide ${title}`,
    showChartLabel: (title) => `Show ${title}`,
    weeklySummaryTitle: 'Weekly summary',
    weekRange: (start, end) => `${start} – ${end}`,
    weightChangeLabel: 'Change this week',
    averageCaloriesLabel: 'Average calories',
    targetMetNote: 'target met',
    addWeeklyNoteLabel: 'Add weekly note',
    editWeeklyNoteLabel: 'Edit weekly note',
    saveWeeklyNoteLabel: 'Save note',
    cancelWeeklyNoteLabel: 'Cancel',
    weeklyNoteLabel: 'Weekly note',
    weeklyNotePlaceholder:
      'Notes for this week — e.g. advice from reviewing your export…',
    expandWeeklyNoteLabel: 'Show full note',
    collapseWeeklyNoteLabel: 'Show less',
    monthlySummaryTitle: 'Monthly summary',
    recentAveragesTitle: 'Recent averages',
    last7DaysLabel: 'Last 7 days',
    last30DaysLabel: 'Last 30 days',
    compareRangesTitle: 'Compare date ranges',
    rangeALabel: 'Range A',
    rangeBLabel: 'Range B',
    rangeStartLabel: 'Start date',
    rangeEndLabel: 'End date',
    compareRangesDayCount: (n) => `${n} day${n === 1 ? '' : 's'} logged`,
    compareRangesWeightDelta: (delta, unit) =>
      `Range B averaged ${delta} ${unit} vs. Range A.`,
    emptyTitle: 'No entries yet',
    emptyDescription: 'Log a few days on the Day screen to see trends here.',
    correlationTitle: 'Calories vs. next-day weight',
    correlationEmptyDescription:
      'Not enough data yet to see a pattern — log calories and keep tracking weight, then check back in a few weeks.',
    correlationSummary: (thresholdKcal, direction) =>
      direction === 'lower'
        ? `Days under ${thresholdKcal} kcal averaged more weight gain the next morning than days over that.`
        : `Days over ${thresholdKcal} kcal averaged more weight gain the next morning than days under that.`,
    correlationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    correlationLagCaveat:
      "Compares each day's calories to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    correlationCurrentWeekExcludedNote:
      "This week isn't finished yet, so it's left out of the count above.",
    correlationExpandLabel: 'Show chart',
    correlationCollapseLabel: 'Hide chart',
    correlationStrengthLabel: (strength) =>
      strength === 'strong'
        ? 'Strong pattern'
        : strength === 'moderate'
          ? 'Moderate pattern'
          : 'Weak pattern',
    outlierPointsHeading: 'Unusual data points',
    excludeOutlierLabel: (label) => `Exclude ${label} from this pattern`,
    restoreOutlierLabel: (label) => `Restore ${label} to this pattern`,
    outlierReasonWeightChange: 'unusual weight change',
    outlierReasonWeightChangeShort: 'weight change',
    outlierReasonMetric: (metricLabel) => `unusual ${metricLabel}`,
    outlierReasonBoth: (metricLabel, otherAxisLabel) =>
      `unusual ${metricLabel} and ${otherAxisLabel}`,
    viewOutlierDayLabel: (label) => `Edit ${label}`,
    weeklyChangeLegend: 'weekly change',
    chartNavigationHint: 'Tap a point for details',
    cyclePeriodWeightNote:
      'Weight often fluctuates around your period — worth keeping in mind when reading day-to-day swings here.',
    previousPeriodLabel: 'Previous period',
    nextPeriodLabel: 'Next period',
    viewDayLink: 'View this day',
    correlationTooltipCloseLabel: 'Close',
    lateMealTitle: 'Meal timing vs. next-day weight',
    lateMealEmptyDescription:
      'Not enough data yet to see a pattern — log meal times and keep tracking weight, then check back in a few weeks.',
    lateMealSummary: (thresholdTime, direction) =>
      direction === 'later'
        ? `Days you last ate after ${thresholdTime} averaged more weight gain the next morning than days you ate earlier.`
        : `Days you last ate before ${thresholdTime} averaged more weight gain the next morning than days you ate later.`,
    lateMealDayCount: (n) => `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    lateMealLagCaveat:
      "Compares each day's latest meal time to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    lateMealTimeLegend: 'last meal time',
    nextDayChangeLegend: 'next-day change',
    mealFrequencyTitle: 'Meal frequency vs. next-day weight',
    mealFrequencyEmptyDescription:
      'Not enough data yet to see a pattern — log your meals and keep tracking weight, then check back in a few weeks.',
    mealFrequencySummary: (thresholdCount, direction) =>
      direction === 'more'
        ? `Days with more than ${thresholdCount} meals logged averaged more weight gain the next morning than days with fewer, larger meals.`
        : `Days with ${thresholdCount} or fewer meals logged averaged more weight gain the next morning than days with more, smaller meals.`,
    mealFrequencyDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    mealFrequencyLagCaveat:
      "Compares each day's number of logged meals to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    mealCountLegend: 'meals logged',
    fastingWindowTitle: 'Fasting window vs. next-day weight',
    fastingWindowEmptyDescription:
      'Not enough data yet to see a pattern — log meal times on consecutive days and keep tracking weight, then check back in a few weeks.',
    fastingWindowSummary: (thresholdHours, direction) =>
      direction === 'longer'
        ? `Days you fasted longer than ${thresholdHours} averaged more weight gain the next morning than days you fasted less.`
        : `Days you fasted less than ${thresholdHours} averaged more weight gain the next morning than days you fasted longer.`,
    fastingWindowDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    fastingWindowLagCaveat:
      "Compares the actual gap between meals (previous day's last meal to the next day's first) to that next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    fastingHoursLegend: 'fasting hours',
    sleepCorrelationTitle: 'Sleep vs. next-day weight',
    sleepCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — log sleep hours and keep tracking weight, then check back in a few weeks.',
    sleepCorrelationSummary: (thresholdHours, direction) =>
      direction === 'less'
        ? `Days you slept less than ${thresholdHours}h averaged more weight gain the next morning than days you slept more.`
        : `Days you slept more than ${thresholdHours}h averaged more weight gain the next morning than days you slept less.`,
    sleepCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    sleepCorrelationLagCaveat:
      "Compares each day's logged sleep to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    sleepHoursLegend: 'sleep hours',
    stepsCorrelationTitle: 'Steps vs. next-day weight',
    stepsCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — log step counts and keep tracking weight, then check back in a few weeks.',
    stepsCorrelationSummary: (thresholdSteps, direction) =>
      direction === 'fewer'
        ? `Days you took fewer than ${thresholdSteps} steps averaged more weight gain the next morning than days you took more.`
        : `Days you took more than ${thresholdSteps} steps averaged more weight gain the next morning than days you took fewer.`,
    stepsCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    stepsCorrelationLagCaveat:
      "Compares each day's logged steps to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    stepsCountLegend: 'steps',
    proteinCorrelationTitle: 'Protein vs. next-day weight',
    proteinCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — log protein and keep tracking weight, then check back in a few weeks.',
    proteinCorrelationSummary: (thresholdProteinPercent, direction) =>
      direction === 'less'
        ? `Days when protein was less than ${thresholdProteinPercent}% of your calories averaged more weight gain the next morning than days when it was more.`
        : `Days when protein was more than ${thresholdProteinPercent}% of your calories averaged more weight gain the next morning than days when it was less.`,
    proteinCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    proteinCorrelationLagCaveat:
      "Compares each day's protein share of calories to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    proteinPercentOfCaloriesLabel: 'Protein (% of calories)',
    nightEatingCorrelationTitle: 'Night eating vs. next-day weight',
    nightEatingCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — keep logging meal times (or the night-eating toggle directly) and tracking weight, then check back in a few weeks.',
    nightEatingCorrelationSummary: (direction) =>
      direction === 'more'
        ? "Nights you ate late averaged more weight gain the next morning than nights you didn't."
        : "Nights you ate late averaged less weight gain the next morning than nights you didn't.",
    nightEatingCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    nightEatingCorrelationLagCaveat:
      "Compares each day's night-eating status to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    alcoholCorrelationTitle: 'Alcohol vs. next-day weight',
    alcoholCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — keep logging alcohol days and tracking weight, then check back in a few weeks.',
    alcoholCorrelationSummary: (direction) =>
      direction === 'more'
        ? "Days you logged alcohol averaged more weight gain the next morning than days you didn't."
        : "Days you logged alcohol averaged less weight gain the next morning than days you didn't.",
    alcoholCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    alcoholCorrelationLagCaveat:
      "Compares each day's alcohol signal to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    loggingConsistencyTitle: 'Logging consistency',
    heatmapLessLabel: 'Less',
    heatmapMoreLabel: 'More',
    daysLoggedSummaryText: (daysLogged) => `${daysLogged} days logged`,
    totalCaloriesOverLoggedDaysText: (total) => `${total} over the logged days`,
    totalCaloriesLast7DaysText: (total) => `${total} in the last 7 days`,
    foodReactionsTitle: 'Food reactions',
    mostLikedFoodsTitle: 'Most liked',
    mostDislikedFoodsTitle: 'Most disliked',
    mostEatenTitle: 'Most eaten recently',
    mostEatenDescription:
      'Dishes you logged most often in the last 7 and 30 days — not a weight correlation.',
    mostEatenModeGroupLabel: 'Rank by',
    mostEatenCountModeLabel: 'Count',
    mostEatenKcalModeLabel: 'kcal',
    mostEatenKcalValue: (kcal, percent) => `${kcal} kcal (${percent}%)`,
    eatingReasonsTallyTitle: 'Why meals happened recently',
    eatingReasonsTallyDescription:
      'How often each reason was picked in the last 7 and 30 days — not a weight correlation.',
    mealTimeBucketsTitle: 'When meals happened',
    mealTimeBucketsDescription:
      'Meals by time of day in the last 7 and 30 days — not a weight correlation.',
    mealTimeBucketMorning: 'Morning',
    mealTimeBucketAfternoon: 'Afternoon',
    mealTimeBucketEvening: 'Evening',
    mealTimeBucketNight: 'Night',
    mealTimeBucketsMissingTime: (n) =>
      `${n} meal${n === 1 ? '' : 's'} had no time logged.`,
    mealNameFrequencyTitle: 'Meal names recently',
    mealNameFrequencyDescription:
      'How often each meal name showed up in the last 7 and 30 days — not a dish ranking.',
    eatingPatternsTitle: 'Personal eating patterns',
    eatingPatternsDescription:
      'What tends to happen after a meal in your data — time until the next eating episode, not a count of dishes.',
    eatingPatternsLearningDescription:
      'We’re still learning your patterns… Keep logging meals with times. Insights stay hidden until the sample is large enough.',
    eatingPatternsCaveat:
      'Your data suggests a relationship, not a cause. Correlation is not causation, and this is not medical advice.',
    eatingPatternsDetailsLabel: 'How this was calculated',
    eatingPatternsDetailsBody:
      'Each interval is from one timed meal to the next timed meal (including across midnight). That is time until the next eating episode. Time until hunger is used only when you logged hunger as the next meal’s reason — it is never inferred from the gap. Higher- vs lower-carb uses a median split of carb calories. Evening is 17:00–22:59; night is 23:00–04:59.',
    eatingPatternsSampleSize: (n) =>
      `Based on ${n} meal-to-meal interval${n === 1 ? '' : 's'}.`,
    eatingPatternsCarbGap: (higher, lower) =>
      `In your recent data, higher-carb meals were followed by the next eating episode after ${higher} on average, versus ${lower} after lower-carb meals.`,
    eatingPatternsCarbGapCraving: (k, n) =>
      `The next episode was logged as craving a specific food in ${k} of ${n} higher-carb cases.`,
    eatingPatternsEveningNight: (nightCount, eveningCount, average) =>
      `Your data suggests night eating often follows an evening meal (${nightCount} of ${eveningCount}). Average time to that next episode: ${average}.`,
    eatingPatternsEveningNightReason: (reason, k) =>
      `Most common reason for that next episode: ${reason} (${k}).`,
    customChartTitle: 'Compare your data',
    customChartWeightLabel: 'Weight',
    customChartCaloriesLabel: 'Calories',
    customChartFastingHoursLabel: 'Fasting hours',
    customChartTypeLine: 'Line',
    customChartTypeBar: 'Bar',
    customChartTypeDots: 'Dots',
    customChartTypeGroupLabel: (seriesLabel) => `Chart type for ${seriesLabel}`,
    customChartNormalizedCaveat:
      "Each line is scaled to its own range so different units (kg, kcal, steps) can share one chart — shapes and trends are comparable, but the chart's height doesn't represent an absolute value. See the exact number for any day in the tooltip.",
    customChartMarkerDaysText: (dayCount) =>
      `${dayCount} day${dayCount === 1 ? '' : 's'}`,
    customChartGroupedMarkersCaveat:
      'On a long range, day markers are grouped — one dot can stand for several marked days. Tap a dot to see how many, or pick a shorter period to see every day on its own.',
    customChartZoomHint:
      'Pinch to zoom, drag sideways to pan. Double-tap to reset.',
    customChartResetZoomButton: 'Reset zoom',
    customChartEmptyDescription: 'Pick at least one to compare.',
    customCorrelationSummary: (aLabel, thresholdValue, direction, bLabel) =>
      `Days when "${aLabel}" was above ${thresholdValue} averaged a ${direction} "${bLabel}" than days with lower "${aLabel}".`,
    customCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    customCorrelationLagCaveat:
      'Compares both metrics on the same day, not a proven cause-and-effect relationship — many other factors can affect either one.',
    customCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — log both metrics on the same days, then check back in a few weeks.',
    manageCustomCorrelationsLabel: 'Manage custom metrics & correlations',
  }
