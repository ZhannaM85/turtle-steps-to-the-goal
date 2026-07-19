export interface Dictionary {
  common: {
    loading: string
    kg: string
    lb: string
    /** The goal's own anchored 7-day window (#135) — just the date range,
     * no week number: the window starts whenever the target was last
     * saved, not a fixed calendar grid, so a running "Week N" count no
     * longer corresponds to anything meaningful here. */
    weekRangeLabel: (start: string, end: string) => string
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
    /** Label above the day's total-macros field (#152) — previously a
     * caption line tucked under the Calories card, promoted to a field
     * of its own matching Weight/Sleep/Calories' treatment. */
    macrosLabel: string
    kcalUnit: string
    noteLabel: string
    noteFieldPlaceholder: string
    editWeightLabel: string
    editNoteLabel: string
    saveWeightLabel: string
    saveNoteLabel: string
    mealLabel: (n: number) => string
    editMealLabel: (n: number) => string
    /** Exits edit mode without saving or deleting (#169) — before this,
     * Save/Delete were the only ways out of an accidentally-opened or
     * changed-mind edit state. */
    cancelEditMealLabel: (n: number) => string
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
    /** Count of 100g portions (#93, reframed by #140) — e.g. "2" for 200g,
     * "1.5" for 150g, matching how nutrition labels are usually printed as
     * "per 100g" rather than typing the raw gram total. In per-100g mode
     * this multiplies the typed rates into the saved total; in "per
     * portion" mode it's inert, a memory aid only. */
    itemPortionsLabel: string
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
    /** App-level clear button for the collapsed "+ Add item" trigger
     * (#151) — resets the whole staged item draft (name, mode, kcal,
     * macros, emotion) back to blank without reopening the full sheet. */
    clearItemDraftLabel: string
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
    /** Opt-in digestion tracking's per-day toggle, on both Today and in
     * DayDetail.tsx — tracks the problem (constipation), not the normal
     * day, so logging it is only ever needed on an exception day. */
    hadConstipationLabel: string
    hadConstipationNoOption: string
    hadConstipationYesOption: string
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
    /** Shown instead of saving when isDuplicateGoalSave() catches a
     * same-day re-submission of an unchanged target (#174) — a no-op, not
     * an error, so this reads as informational rather than a validation
     * message. */
    duplicateTargetNotice: string
    /** Goal history section (#147) — every past (non-active) target. */
    pastTargetsTitle: string
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
    /** Per-row delete on the past-targets history (#174) — same two-step
     * confirm shape as history/EntryRow.tsx's own delete, own copy rather
     * than cross-feature reuse since the wording differs ("target" vs
     * "entry"). */
    deletePastTargetLabel: (weekRange: string) => string
    confirmDeletePastTargetLabel: string
    confirmDeletePastTargetYes: string
    confirmDeletePastTargetNo: string
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
    /** Local storage usage (#176) — `navigator.storage.estimate()`'s
     * `usage` only, not `quota`: the quota is usually a large
     * browser-computed ceiling (often a big fraction of free disk space),
     * not a small fixed number, so framing it as "X of Y (Z%)" reads as
     * near-meaningless noise rather than useful — just the amount used. */
    storageUsedLabel: (size: string) => string
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
    hadConstipationColumn: string
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
    /** Sleep-hours-vs-next-day-weight correlation (#167), same shape as
     * lateMeal* above. */
    sleepCorrelationTitle: string
    sleepCorrelationEmptyDescription: string
    sleepCorrelationSummary: (thresholdHours: string, direction: string) => string
    sleepCorrelationDayCount: (n: number) => string
    sleepCorrelationLagCaveat: string
    sleepHoursLegend: string
    /** Step-count-vs-next-day-weight correlation (#167), same shape. */
    stepsCorrelationTitle: string
    stepsCorrelationEmptyDescription: string
    stepsCorrelationSummary: (thresholdSteps: string, direction: string) => string
    stepsCorrelationDayCount: (n: number) => string
    stepsCorrelationLagCaveat: string
    stepsCountLegend: string
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
    /** Filters by day-note text content (#172) — case-insensitive substring
     * match, alongside the existing date-range filter. */
    searchLabel: string
    searchPlaceholder: string
    /** Filters by the day's overall mood (#172) — reuses EmotionPicker's
     * existing click-again-to-clear toggle semantics. */
    moodFilterLabel: string
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
    /** Filter-as-you-type above the list + "no matches" text (#179) — same
     * pattern as dailyEntry.foodSearchLabel/foodSearchPlaceholder for the
     * curated food list, mirrored here for the personal meal dictionary. */
    mealItemSearchLabel: string
    mealItemSearchPlaceholder: string
    noMealItemResultsText: string
    mealItemNameLabel: string
    deleteMealItemLabel: (name: string) => string
    editMealItemLabel: (name: string) => string
    saveMealItemLabel: (name: string) => string
    /** Opens the create-a-new-dictionary-entry form (#149) — same
     * name + per-100g nutrition fields as an existing row's own editor,
     * calling the same touch() upsert, just starting from a blank draft
     * instead of an existing MealItem. */
    addMealItemButton: string
    cancelAddMealItemLabel: string
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
    /** Wipes every local IndexedDB table (#164) — two-step confirm, same
     * pattern as deleting a single entry/meal, scaled up in wording since
     * this is irreversible and total. */
    clearAllDataLabel: string
    clearAllDataDescription: string
    clearAllDataButton: string
    clearAllDataConfirmPrompt: string
    clearAllDataConfirmYes: string
    clearAllDataConfirmNo: string
    clearingAllDataButton: string
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
    /** Current release-notes version number (simple incrementing counter,
     * ReleaseNotesSection.tsx) — lets a reported bug be pinned to a
     * specific version rather than just a date. */
    currentVersionLabel: (version: number) => string
  }
}
