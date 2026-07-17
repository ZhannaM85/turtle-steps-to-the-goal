import type { Dictionary } from './Dictionary'

function goalCount(n: number): string {
  return `${n} goal${n === 1 ? '' : 's'}`
}

function entryCount(n: number): string {
  return `${n} daily ${n === 1 ? 'entry' : 'entries'}`
}

export const en: Dictionary = {
  common: {
    loading: 'Loading…',
    kg: 'kg',
    lb: 'lb',
    weekLabel: (weekNumber, start, end) =>
      `Week ${weekNumber} · ${start} – ${end}`,
  },
  error: {
    title: 'Something went wrong',
    description:
      "The app hit an unexpected error. Your data is safe — it's all stored on this device. Reloading usually fixes it.",
    reloadButton: 'Reload',
  },
  update: {
    availableText: 'A new version is available.',
    reloadButton: 'Reload',
  },
  nav: {
    appName: 'Turtle Steps to the Goal',
    today: 'Today',
    dashboard: 'Dashboard',
    history: 'History',
    goal: 'Goal',
    settings: 'Settings',
    about: 'About',
  },
  today: {
    title: 'Today',
    description:
      "Quick entry for today's weight/calories, this week's target reminder",
    thisWeeksTarget: "This week's target",
    toLose: (unit) => `${unit} to lose`,
    emptyGoalTitle: 'No goal set yet',
    emptyGoalDescription: 'Set a weekly target to see it here.',
    setGoalButton: 'Set a goal',
    dateLabel: 'Date',
    goalRenewalReminder:
      "This week wraps up today — worth checking next week's target.",
    reviewGoalLink: 'Review goal',
    vsYesterdayLabel: 'vs. yesterday',
    vsMaxWeightLabel: 'vs. highest weight',
    celebrationTitle: "You reached this week's goal!",
    celebrationDescription: 'Nice work — want to set a target for next week?',
    celebrationCta: "Set next week's goal",
    celebrationCloseLabel: 'Close',
  },
  dailyEntry: {
    weightLabel: 'Weight (kg)',
    caloriesLabel: 'Calories',
    caloriesTooltip:
      "Today's weight reflects what you ate yesterday — digestion takes time, so don't expect these two numbers to match up same-day.",
    caloriesTooltipLabel: 'About the calories field',
    addCaloriesLabel: 'kcal/100g',
    addCaloriesPortionLabel: 'kcal',
    addCaloriesPlaceholder: 'kcal',
    macroModeLabel: 'Entry mode',
    macroModePer100gOption: '100g',
    macroModePerPortionOption: 'Portion',
    addButton: 'Add',
    caloriesTodaySuffix: 'kcal today',
    kcalUnit: 'kcal',
    noteLabel: "Day's note",
    noteFieldPlaceholder: 'Want to share anything for the day?',
    editWeightLabel: 'Edit weight',
    editNoteLabel: 'Edit note',
    saveWeightLabel: 'Save weight',
    saveNoteLabel: 'Save note',
    mealLabel: (n) => `Meal ${n}`,
    editMealLabel: (n) => `Edit meal ${n}`,
    deleteMealLabel: (n) => `Delete meal ${n}`,
    reorderMealLabel: (n) => `Reorder meal ${n}`,
    mealLabelFieldLabel: 'Meal name',
    defaultMealNamePresets: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    saveButton: 'Save',
    mealNoteLabel: 'Meal note',
    // Group-level note (#81) — not a dish name (see itemNamePlaceholder for
    // that), a free-text comment about the meal as a whole.
    mealNotePlaceholder: 'Anything else about this meal?',
    itemNameLabel: 'Dish name',
    itemNamePlaceholder: 'Add a dish?',
    deleteItemLabel: 'Delete item',
    addItemButton: '+ Add item',
    emotionLabel: (emotion) =>
      emotion === 'happy'
        ? 'Happy'
        : emotion === 'unhappy'
          ? 'Unhappy'
          : 'Neutral',
    mealEmotionLabel: (emotion) =>
      emotion === 'thumbsUp'
        ? 'Thumbs up'
        : emotion === 'thumbsDown'
          ? 'Thumbs down'
          : 'Bellissimo',
    dayMoodLabel: 'Mood today',
    proteinLabel: 'Protein',
    fatLabel: 'Fat',
    carbsLabel: 'Carbs',
    itemAmountGLabel: 'Grams',
    gramsUnit: 'g',
    macrosSummary: (protein, fat, carbs) =>
      `Protein ${protein} · Fat ${fat} · Carbs ${carbs}`,
    macrosSummaryCompact: (protein, fat, carbs) =>
      `P ${protein} · F ${fat} · C ${carbs}`,
    timeEatenLabel: 'Time',
    clearTimeLabel: 'Clear time',
    orDivider: 'or',
    addFoodButton: 'Find food',
    addFoodDialogTitle: 'Add from food list',
    closeFoodDialogLabel: 'Close',
    foodSearchLabel: 'Search foods',
    foodSearchPlaceholder: 'Search…',
    foodQuantityLabel: 'Quantity (g)',
    noFoodResultsText: 'No foods found.',
    addFoodConfirmLabel: 'Add food',
    per100gLabel: 'per 100g',
    computedTotalPrefix: 'Total:',
    lastLoggedLabel: 'last logged',
    sleepLabel: 'Sleep',
    sleepHoursLabel: 'Hours slept',
    deepSleepLabel: 'Deep sleep',
    editSleepLabel: 'Edit sleep',
    saveSleepLabel: 'Save sleep',
    hoursUnit: 'h',
    minutesUnit: 'm',
    hoursFieldLabel: 'hours',
    minutesFieldLabel: 'minutes',
    sleepSummary: (hours, deepHours) => `${hours} slept · ${deepHours} deep`,
    stepsLabel: 'Steps',
    editStepsLabel: 'Edit steps',
    saveStepsLabel: 'Save steps',
    onPeriodLabel: 'On period',
    hadBowelMovementLabel: 'Bowel movement',
    addItemSheetTitle: 'Add item',
    editItemSheetTitle: 'Edit item',
    closeItemEditorLabel: 'Close item editor',
    editItemLabel: 'Edit item',
  },
  goal: {
    title: 'Goal',
    description: "This week's target — small steps, renewed week to week",
    thisWeeksTarget: "This week's target",
    targetLabel: (unit) => `This week's target (${unit} to lose)`,
    targetRequired: "Enter this week's target, greater than 0",
    deficitEstimate: (kcal, direction) =>
      `Rough estimate: about ${kcal} kcal/day ${direction}.`,
    deficitCaveat:
      'This is a simple arithmetic estimate (~7700 kcal ≈ 1kg of fat), not medical or nutritional advice.',
    updateButton: 'Update this week’s target',
    setButton: 'Set this week’s target',
  },
  export: {
    title: 'Export',
    description: 'Export/import a JSON backup',
    exportBlurb:
      'Download every goal and daily entry as a single JSON file. This is the only backup for your data, since everything is stored locally on this device.',
    exportButton: 'Export backup',
    exportingButton: 'Exporting…',
    importBlurb:
      'Restore from a previously exported file. This merges into your existing data (matching entries are updated by date; nothing is deleted).',
    importButton: 'Import backup',
    importingButton: 'Importing…',
    summary: (goals, entries) =>
      `${goalCount(goals)} and ${entryCount(entries)}`,
    exportedSummary: (summary) => `Exported ${summary}.`,
    importedSummary: (summary) => `Imported ${summary}.`,
    invalidBackup: "This file doesn't look like a valid Turtle Steps backup.",
    notValidJson: "That file isn't valid JSON.",
    exportFailed: 'Export failed.',
    importFailed: 'Import failed.',
  },
  dashboard: {
    title: 'Dashboard',
    description:
      'Weight trend, calorie trend, weekly summary cards, correlation view',
    weightLegend: 'weight',
    caloriesLegend: 'calories',
    rollingAverageLegend: '7-day average',
    macrosTitle: 'Protein, fat & carbs',
    weeklySummaryTitle: 'Weekly summary',
    weekRange: (start, end) => `${start} – ${end}`,
    weightChangeLabel: 'Change this week',
    averageCaloriesLabel: 'Average calories',
    targetMetNote: 'target met',
    emptyTitle: 'No entries yet',
    emptyDescription: 'Log a few days on the Today screen to see trends here.',
    correlationTitle: 'Calories vs. weight change',
    correlationEmptyDescription:
      'Not enough data yet to see a pattern — keep logging and check back in a few weeks.',
    correlationSummary: (thresholdKcal, direction) =>
      direction === 'lower'
        ? `Weeks under ${thresholdKcal} kcal/day averaged more loss than weeks over that.`
        : `Weeks over ${thresholdKcal} kcal/day averaged more loss than weeks under that.`,
    correlationWeekCount: (n) => `Based on ${n} weeks of data.`,
    correlationLagCaveat:
      "Compares each week's average calories to that week's weight change, not same-day numbers — digestion takes time, so today's weight reflects prior days' intake.",
    correlationExpandLabel: 'Show chart',
    correlationCollapseLabel: 'Hide chart',
    weeklyChangeLegend: 'weekly change',
    chartNavigationHint: 'Tap a point for details',
    viewDayLink: 'View this day',
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
  },
  history: {
    title: 'History',
    description: 'Table of all past entries — edit/delete',
    emptyTitle: 'No entries yet',
    emptyDescription: 'Log a few days on the Today screen to see them here.',
    dateColumn: 'Date',
    weightColumn: 'Weight',
    caloriesColumn: 'Calories',
    noteColumn: 'Note',
    actionsColumn: 'Actions',
    sortToggleLabel: 'Sort by date',
    editLabel: 'Edit entry',
    deleteLabel: 'Delete entry',
    doneEditingButton: 'Done',
    confirmDeleteLabel: 'Delete this entry?',
    confirmDeleteYes: 'Delete',
    confirmDeleteNo: 'Cancel',
    metTargetTitle: 'Weeks you hit your target',
    expandLabel: 'View details',
    collapseLabel: 'Hide details',
    noDetailsLabel: 'Nothing else logged for this day.',
    dateFromLabel: 'From',
    dateToLabel: 'To',
    clearFilterButton: 'Clear filter',
    noFilterResultsTitle: 'No entries in this range',
    noFilterResultsDescription:
      'Try a different date range, or clear the filter.',
    viewModeLabel: 'View mode',
    listViewLabel: 'List',
    calendarViewLabel: 'Calendar',
    previousMonthLabel: 'Previous month',
    nextMonthLabel: 'Next month',
    todayButton: 'Today',
    emptyDayLabel: 'Nothing logged for this day.',
    editThisDayLink: 'Edit this day',
  },
  settings: {
    title: 'Settings',
    description: 'Units (kg/lb), language, and other preferences',
    unitsLabel: 'Units',
    languageLabel: 'Language',
    english: 'English',
    russian: 'Russian',
    appearanceLabel: 'Appearance',
    moodLabel: 'Mood',
    moodPond: 'Pond',
    moodDusk: 'Dusk',
    moodSage: 'Sage',
    moodTortoise: 'Tortoise',
    moodLagoon: 'Lagoon',
    colorSchemeLabel: 'Light / dark',
    light: 'Light',
    dark: 'Dark',
    mealItemsLabel: 'Meal items',
    mealItemsDescription:
      "Meals you've logged before, suggested while you type. Rename or remove them here.",
    mealItemsEmpty:
      "Nothing yet — items appear here once you've logged a meal.",
    mealItemNameLabel: 'Meal item name',
    deleteMealItemLabel: (name) => `Delete "${name}"`,
    editMealItemLabel: (name) => `Edit ${name}`,
    saveMealItemLabel: (name) => `Save ${name}`,
    mealNamePresetsLabel: 'Meal name presets',
    mealNamePresetsDescription:
      'Quick-pick names offered when naming a meal, e.g. "Breakfast" or "Lunch".',
    mealNamePresetsEmpty: 'No presets yet — add one below.',
    addPresetPlaceholder: 'Add a preset',
    addDefaultPresetLabel: (name) => `Add "${name}"`,
    deletePresetLabel: (name) => `Delete "${name}"`,
    releaseNotesLabel: 'Release notes',
    showReleaseNotes: 'Show release notes',
    hideReleaseNotes: 'Hide release notes',
    cycleTrackingLabel: 'Cycle tracking',
    cycleTrackingDescription:
      'Optional — turns on a daily "on your period" toggle on Today. Off by default.',
    cycleTrackingOn: 'On',
    cycleTrackingOff: 'Off',
    digestionTrackingLabel: 'Digestion tracking',
    digestionTrackingDescription:
      'Optional — turns on a daily "bowel movement" toggle when viewing a day in History. Off by default.',
    digestionTrackingOn: 'On',
    digestionTrackingOff: 'Off',
    weekStartLabel: 'Week start',
    weekStartDescription:
      'Which day each week begins on, used for "This week" and weekly summaries.',
    weekStartMonday: 'Monday',
    weekStartFirstEntry: 'Day of my first entry',
    foodListLabel: 'Food list',
    foodListDescription:
      'Hide items you don’t want to see, or correct their calories/macros.',
    manageFoodListButton: 'Manage food list',
    backToSettingsLabel: '← Settings',
    hideButtonLabel: 'Hide',
    showButtonLabel: 'Show',
    restoreDefaultButtonLabel: 'Restore default',
    hideFoodLabel: (name) => `Hide ${name}`,
    showFoodLabel: (name) => `Show ${name}`,
    editFoodLabel: (name) => `Edit ${name}`,
    saveFoodLabel: (name) => `Save ${name}`,
    restoreDefaultLabel: (name) => `Restore ${name} to default`,
    hiddenBadgeLabel: 'Hidden',
  },
  about: {
    title: 'About',
    description: 'What this app is, and why it exists',
    intro:
      'Turtle Steps to the Goal is a small, personal weight-tracking app built around one idea: change happens through small, steady steps — not big, pressured goals.',
    philosophy:
      "There's no long-term target to chase, no streaks to protect, no badges to collect. Just this week's small step, one day at a time.",
    privacy:
      'All your data stays on your own device — nothing is sent anywhere else.',
    madeBy: (author) => `Made by ${author}`,
  },
}
