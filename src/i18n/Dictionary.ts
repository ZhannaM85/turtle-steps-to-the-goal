export interface Dictionary {
  common: {
    loading: string
    kg: string
    lb: string
    weekLabel: (weekNumber: number, start: string, end: string) => string
  }
  /** Top-level crash fallback (#102) — shown by the router's errorElement
   * when a render error escapes anywhere in the app, instead of a silent
   * blank screen. */
  error: {
    title: string
    description: string
    reloadButton: string
  }
  /** New-version-available banner (#115) — shown by `useAppUpdateAvailable`
   * when a newer deploy is detected, since there's no pull-to-refresh in
   * the iOS home-screen standalone context and no service worker to
   * auto-update in the background. */
  update: {
    availableText: string
    reloadButton: string
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
    /** Prev/next-day arrows flanking the Date field (#138) — quicker than
     * opening the date picker to check yesterday/tomorrow. */
    previousDayLabel: string
    nextDayLabel: string
    goalRenewalReminder: string
    reviewGoalLink: string
    vsYesterdayLabel: string
    vsMaxWeightLabel: string
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
    /** kcal field label/aria-label in "per portion" mode (#111) — the typed
     * number is the actual total eaten, not a per-100g rate. */
    addCaloriesPortionLabel: string
    addCaloriesPlaceholder: string
    /** Per 100g / Per portion entry-mode toggle (#111) — lets someone who
     * knows a meal's total (e.g. "this sandwich is 450 kcal") skip
     * converting it to a per-100g rate. Toggling converts the currently
     * typed numbers rather than discarding them, so nothing is lost. */
    macroModeLabel: string
    macroModePer100gOption: string
    macroModePerPortionOption: string
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
    /** Custom meal name field (#110) — aria-label composed with mealLabel(n),
     * same pattern as itemNameLabel etc. */
    mealLabelFieldLabel: string
    /** Built-in quick-pick suggestions for the custom meal name field
     * (#110) — offered as one-click adds in Settings, not auto-seeded into
     * useMealLabelPresetStore (so a later language switch doesn't leave
     * stale-language presets behind for someone who never touched them). */
    defaultMealNamePresets: string[]
    saveButton: string
    mealNoteLabel: string
    mealNotePlaceholder: string
    itemNameLabel: string
    itemNamePlaceholder: string
    deleteItemLabel: string
    addItemButton: string
    emotionLabel: (emotion: 'happy' | 'unhappy' | 'neutral') => string
    mealEmotionLabel: (
      emotion: 'thumbsUp' | 'thumbsDown' | 'bellissimo',
    ) => string
    /** Heading above the per-dish reaction picker in MealItemEditorSheet
     * (#129) — mealEmotionLabel above is the per-value aria-label function
     * ("Thumbs up"), this is the static section heading ("Reaction"). */
    itemEmotionLabel: string
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
    macrosSummaryCompact: (
      protein: string,
      fat: string,
      carbs: string,
    ) => string
    timeEatenLabel: string
    /** App-level clear button for the Time field (#117) — the native iOS
     * time picker's own Reset doesn't reliably clear the value back to
     * empty once tapped, so this sets state to '' directly instead. */
    clearTimeLabel: string
    orDivider: string
    addFoodButton: string
    addFoodDialogTitle: string
    closeFoodDialogLabel: string
    foodSearchLabel: string
    foodSearchPlaceholder: string
    foodQuantityLabel: string
    noFoodResultsText: string
    addFoodConfirmLabel: string
    per100gLabel: string
    /** Live preview prefix for the manual add row/item-edit row's computed
     * total (#98) — e.g. "Total: 300 kcal · ..." — recomputed on every
     * keystroke from the per-100g rate × quantity fields (#96), so the
     * multiplication result is visible before Add/Save, not just after. */
    computedTotalPrefix: string
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
    /** Opt-in digestion tracking's per-day toggle in DayDetail.tsx, same
     * shape/precedent as onPeriodLabel above. */
    hadBowelMovementLabel: string
    /** Full-screen meal-item editor sheet (#122) — replaces the cramped
     * inline fields row for both adding a new meal's first item and
     * editing/adding an item within an already-existing meal. */
    addItemSheetTitle: string
    editItemSheetTitle: string
    closeItemEditorLabel: string
    /** Aria-label for the pencil button on a compact item-summary row
     * (#122) — same unsuffixed-string convention as deleteItemLabel. */
    editItemLabel: string
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
    /** CSV export (#125) has no goals data, so it gets its own entries-only
     * summary rather than reusing `summary`/`exportedSummary` above. */
    exportedCsvSummary: (entries: number) => string
    importedSummary: (summary: string) => string
    invalidBackup: string
    notValidJson: string
    exportFailed: string
    importFailed: string
    /** Excel export (#123) — a separate, human-readable view of the same
     * data, distinct from the JSON backup above: not re-importable, so its
     * own blurb/button/error copy rather than reusing the JSON ones. */
    exportExcelBlurb: string
    exportExcelButton: string
    exportingExcelButton: string
    exportExcelFailed: string
    /** CSV export (#125) — a single flat Daily Log table, same shape as the
     * Excel export's first sheet. Distinct copy from both the JSON and
     * Excel export sections, same reasoning as exportExcelBlurb above. */
    exportCsvBlurb: string
    exportCsvButton: string
    exportingCsvButton: string
    exportCsvFailed: string
    /** Popover remark next to the CSV button noting it's the best format
     * for pasting into an LLM conversation — text + trigger aria-label,
     * same InfoTooltip shape as dailyEntry.caloriesTooltip. */
    exportCsvLlmTooltip: string
    exportCsvLlmTooltipLabel: string
  }
  /** Column headers / sheet names for the Excel export (#123) — kept
   * separate from the daily-entry form's own field labels (`dailyEntry.*`)
   * even where the underlying concept matches, so wording changes to one
   * don't silently ripple into the other. */
  exportXlsx: {
    dailyLogSheetName: string
    mealsSheetName: string
    goalsSheetName: string
    dateColumn: string
    weightColumn: string
    caloriesColumn: string
    proteinColumn: string
    fatColumn: string
    carbsColumn: string
    sleepHoursColumn: string
    deepSleepHoursColumn: string
    stepsColumn: string
    moodColumn: string
    noteColumn: string
    onPeriodColumn: string
    hadBowelMovementColumn: string
    mealColumn: string
    itemColumn: string
    gramsColumn: string
    timeColumn: string
    reactionColumn: string
    createdColumn: string
    weeklyTargetColumn: string
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
    /** Per-dish reaction rollup (#128, built on #129's per-item emotion) —
     * two ranked lists under one shared heading, each row using
     * dailyEntry.mealEmotionLabel for its per-count accessible text. */
    foodReactionsTitle: string
    mostLikedFoodsTitle: string
    mostDislikedFoodsTitle: string
    /** Customizable multi-series chart (#132) — checkboxes toggle which
     * series overlay on one chart. Weight/Calories get their own
     * Title-case labels here since dailyEntry's weightLegend/caloriesLegend
     * are lowercase sentence-fragment forms, not standalone labels;
     * Protein/Fat/Carbs/Steps/On period/Bowel movement reuse
     * dailyEntry.proteinLabel etc. directly, already Title-case. */
    customChartTitle: string
    customChartWeightLabel: string
    customChartCaloriesLabel: string
    /** Per-series chart type picker (#137) — three icon buttons (line/bar/
     * dots) shown next to each selected series in the legend. */
    customChartTypeLine: string
    customChartTypeBar: string
    customChartTypeDots: string
    customChartTypeGroupLabel: (seriesLabel: string) => string
    customChartNormalizedCaveat: string
    customChartEmptyDescription: string
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
    editMealItemLabel: (name: string) => string
    saveMealItemLabel: (name: string) => string
    mealNamePresetsLabel: string
    mealNamePresetsDescription: string
    mealNamePresetsEmpty: string
    addPresetPlaceholder: string
    addDefaultPresetLabel: (name: string) => string
    deletePresetLabel: (name: string) => string
    releaseNotesLabel: string
    showReleaseNotes: string
    hideReleaseNotes: string
    cycleTrackingLabel: string
    cycleTrackingDescription: string
    cycleTrackingOn: string
    cycleTrackingOff: string
    digestionTrackingLabel: string
    digestionTrackingDescription: string
    digestionTrackingOn: string
    digestionTrackingOff: string
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
