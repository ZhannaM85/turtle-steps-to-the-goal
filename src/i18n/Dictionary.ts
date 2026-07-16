export interface Dictionary {
  common: {
    loading: string
    kg: string
    lb: string
    weekLabel: (weekNumber: number, start: string, end: string) => string
  }
  nav: {
    appName: string
    today: string
    dashboard: string
    history: string
    goal: string
    settings: string
    about: string
  }
  today: {
    title: string
    description: string
    thisWeeksTarget: string
    toLose: (unit: string) => string
    emptyGoalTitle: string
    emptyGoalDescription: string
    setGoalButton: string
    dateLabel: string
    goalRenewalReminder: string
    reviewGoalLink: string
    vsYesterdayLabel: string
    celebrationTitle: string
    celebrationDescription: string
    celebrationCta: string
    celebrationCloseLabel: string
  }
  dailyEntry: {
    weightLabel: string
    caloriesLabel: string
    caloriesTooltip: string
    caloriesTooltipLabel: string
    /** Label/aria-label for the manual add row's kcal field (#96) — a
     * per-100g rate, not the total eaten; scaled by the quantity field to
     * compute the total. Reused verbatim by the item-edit row's kcal field
     * (composed with a `— Meal N` suffix there for multi-item disambiguation). */
    addCaloriesLabel: string
    addCaloriesPlaceholder: string
    addButton: string
    caloriesTodaySuffix: string
    kcalUnit: string
    noteLabel: string
    noteFieldPlaceholder: string
    editWeightLabel: string
    editNoteLabel: string
    saveWeightLabel: string
    saveNoteLabel: string
    mealLabel: (n: number) => string
    editMealLabel: (n: number) => string
    deleteMealLabel: (n: number) => string
    reorderMealLabel: (n: number) => string
    saveButton: string
    mealNoteLabel: string
    mealNotePlaceholder: string
    itemNameLabel: string
    itemNamePlaceholder: string
    deleteItemLabel: string
    addItemButton: string
    emotionLabel: (emotion: 'happy' | 'unhappy' | 'neutral') => string
    mealEmotionLabel: (emotion: 'thumbsUp' | 'thumbsDown' | 'bellissimo') => string
    dayMoodLabel: string
    proteinLabel: string
    fatLabel: string
    carbsLabel: string
    /** Optional portion-weight field on manually-entered items (#93) — a
     * memory aid for scaling macros next time the same food is logged at a
     * different portion size, not itself used to compute anything. */
    itemAmountGLabel: string
    gramsUnit: string
    macrosSummary: (protein: string, fat: string, carbs: string) => string
    macrosSummaryCompact: (protein: string, fat: string, carbs: string) => string
    timeEatenLabel: string
    addFoodButton: string
    addFoodDialogTitle: string
    closeFoodDialogLabel: string
    foodSearchLabel: string
    foodSearchPlaceholder: string
    foodQuantityLabel: string
    noFoodResultsText: string
    addFoodConfirmLabel: string
    per100gLabel: string
    lastLoggedLabel: string
    sleepLabel: string
    sleepHoursLabel: string
    deepSleepLabel: string
    editSleepLabel: string
    saveSleepLabel: string
    hoursUnit: string
    minutesUnit: string
    hoursFieldLabel: string
    minutesFieldLabel: string
    sleepSummary: (hours: string, deepHours: string) => string
    stepsLabel: string
    editStepsLabel: string
    saveStepsLabel: string
    onPeriodLabel: string
  }
  goal: {
    title: string
    description: string
    thisWeeksTarget: string
    targetLabel: (unit: string) => string
    targetRequired: string
    deficitEstimate: (kcal: number, direction: 'deficit' | 'surplus') => string
    deficitCaveat: string
    updateButton: string
    setButton: string
  }
  export: {
    title: string
    description: string
    exportBlurb: string
    exportButton: string
    exportingButton: string
    importBlurb: string
    importButton: string
    importingButton: string
    summary: (goals: number, entries: number) => string
    exportedSummary: (summary: string) => string
    importedSummary: (summary: string) => string
    invalidBackup: string
    notValidJson: string
    exportFailed: string
    importFailed: string
  }
  dashboard: {
    title: string
    description: string
    weightLegend: string
    caloriesLegend: string
    rollingAverageLegend: string
    macrosTitle: string
    weeklySummaryTitle: string
    weekRange: (start: string, end: string) => string
    weightChangeLabel: string
    averageCaloriesLabel: string
    targetMetNote: string
    emptyTitle: string
    emptyDescription: string
    correlationTitle: string
    correlationEmptyDescription: string
    correlationSummary: (
      thresholdKcal: number,
      direction: 'lower' | 'higher',
    ) => string
    correlationWeekCount: (n: number) => string
    correlationLagCaveat: string
    correlationExpandLabel: string
    correlationCollapseLabel: string
    weeklyChangeLegend: string
    chartNavigationHint: string
    viewDayLink: string
  }
  history: {
    title: string
    description: string
    emptyTitle: string
    emptyDescription: string
    dateColumn: string
    weightColumn: string
    caloriesColumn: string
    noteColumn: string
    actionsColumn: string
    sortToggleLabel: string
    editLabel: string
    deleteLabel: string
    doneEditingButton: string
    confirmDeleteLabel: string
    confirmDeleteYes: string
    confirmDeleteNo: string
    metTargetTitle: string
    expandLabel: string
    collapseLabel: string
    noDetailsLabel: string
    dateFromLabel: string
    dateToLabel: string
    clearFilterButton: string
    noFilterResultsTitle: string
    noFilterResultsDescription: string
    viewModeLabel: string
    listViewLabel: string
    calendarViewLabel: string
    previousMonthLabel: string
    nextMonthLabel: string
    todayButton: string
    emptyDayLabel: string
    editThisDayLink: string
  }
  settings: {
    title: string
    description: string
    unitsLabel: string
    languageLabel: string
    english: string
    russian: string
    appearanceLabel: string
    moodLabel: string
    moodPond: string
    moodDusk: string
    moodSage: string
    moodTortoise: string
    moodLagoon: string
    colorSchemeLabel: string
    light: string
    dark: string
    mealItemsLabel: string
    mealItemsDescription: string
    mealItemsEmpty: string
    mealItemNameLabel: string
    deleteMealItemLabel: (name: string) => string
    releaseNotesLabel: string
    showReleaseNotes: string
    hideReleaseNotes: string
    cycleTrackingLabel: string
    cycleTrackingDescription: string
    cycleTrackingOn: string
    cycleTrackingOff: string
    weekStartLabel: string
    weekStartDescription: string
    weekStartMonday: string
    weekStartFirstEntry: string
    foodListLabel: string
    foodListDescription: string
    manageFoodListButton: string
    backToSettingsLabel: string
    hideButtonLabel: string
    showButtonLabel: string
    restoreDefaultButtonLabel: string
    hideFoodLabel: (name: string) => string
    showFoodLabel: (name: string) => string
    editFoodLabel: (name: string) => string
    saveFoodLabel: (name: string) => string
    restoreDefaultLabel: (name: string) => string
    hiddenBadgeLabel: string
  }
  about: {
    title: string
    description: string
    intro: string
    philosophy: string
    privacy: string
    madeBy: (author: string) => string
  }
}
