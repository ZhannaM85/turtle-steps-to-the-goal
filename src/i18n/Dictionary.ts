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
    /** #232 — generic show/hide labels for a dismissible Today/Goal
     * section, same shape as `dashboard.hideChartLabel`/`showChartLabel`
     * but not Dashboard-specific, so it lives here instead. */
    hideSectionLabel: (title: string) => string
    showSectionLabel: (title: string) => string
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
   * when a newer deploy is detected. #163: the service worker's own
   * autoUpdate registration already installs a new version silently in
   * the background, but a page reload is still needed to actually load
   * it — this banner is what surfaces "click to get it now" explicitly,
   * rather than leaving the user on stale content until their next
   * unrelated reload. */
  update: {
    availableText: string
    reloadButton: string
    reloadingText: string
  }
  /** Quiet "you're offline" indicator (#163) — the app stays fully usable
   * offline (all data is IndexedDB-local, the service worker precaches the
   * app shell), so this is informational, not a blocker: mainly explains
   * why the update-check banner above never appears while offline. */
  offline: {
    offlineText: string
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
    targetMetBanner: string
    /** Quiet, opt-in nudge (#171) — only shown when the Settings toggle is
     * on and today has no entry yet. Same no-badges/no-streaks tone as
     * goalRenewalReminder above, no dismiss state to persist. */
    dailyReminderText: string
    /** #232 — short titles for the show/hide toggle row above each of the
     * three banners, distinct from their own full-sentence body text
     * above (`goalRenewalReminder`/`targetMetBanner`/`dailyReminderText`)
     * — showing the whole sentence twice as both a title and the banner
     * itself would read as an obvious duplicate. */
    targetMetSectionTitle: string
    goalRenewalReminderSectionTitle: string
    dailyReminderSectionTitle: string
    vsYesterdayLabel: string
    vsMaxWeightLabel: string
    /** #208 — only shown once the active goal has a dailyCalorieTargetKcal
     * set; the StatCard's own value is always the absolute difference,
     * these two supply the unit text so "under budget" and "over" read as
     * different states rather than a plain (and possibly confusing
     * negative) signed number. */
    remainingCaloriesLabel: string
    kcalRemainingUnit: string
    kcalOverUnit: string
    /** #220 — same shape as the calories trio above, shown once the
     * active goal has a dailyProteinTargetG set. "Remaining" here just
     * means not yet reached, no "over" framing the way calories has —
     * eating more protein than planned isn't the same kind of "went over
     * budget" concept a calorie ceiling is. */
    remainingProteinLabel: string
    gRemainingUnit: string
    /** #252 — same shape as remainingProteinLabel above, reusing
     * gRemainingUnit for the unit text. */
    remainingFatLabel: string
    remainingCarbLabel: string
    /** #266 — shown as each remaining-nutrient card's `description`, so
     * "0g remaining" also says what it's out of. Same text for all four
     * cards; protein's own over-target state uses `proteinOverTargetLabel`
     * instead (denominator + positive message combined), not this one. */
    targetDenominatorText: (target: string) => string
    /** #266 — protein-only: once intake exceeds the target, the card
     * switches from "0g remaining" to a signed surplus (paired with
     * `gOverProteinUnit` below) plus this positive description — a
     * deliberate, scoped exception to #220's "no over-target framing"
     * reasoning above, since exceeding a protein target is a good outcome
     * unlike a calorie ceiling. Calories/fat/carb are unaffected. */
    proteinOverTargetLabel: (target: string) => string
    gOverProteinUnit: string
    /** #258 — same shape again, reusing dailyEntry.mlUnit for the unit
     * text instead of gRemainingUnit (a volume, not a gram weight). */
    remainingWaterLabel: string
    mlRemainingUnit: string
    /** #233 — computed from today's logged weight plus the Settings
     * Profile card's height/age/sex, so only rendered once both exist.
     * BMI has no unit of its own (a dimensionless ratio); BMR needs one. */
    bmiLabel: string
    bmrLabel: string
    bmrUnit: string
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
    /** #218: soft warning (not a hard block, unlike weightSchema's own
     * 20-400kg range) for a weight technically valid but unusual enough
     * to likely be a typo — a second tap on Save confirms it anyway. */
    unusualWeightWarning: string
    saveUnusualWeightAnywayLabel: string
    fixWeightLabel: string
    /** #218: a quiet inline note, not blocking anything — a day's total
     * calories crossing this can't map to a single "save" action to
     * intercept the way the weight warning above does, since it's a
     * running sum across however many meals get added. */
    unusualDailyCaloriesWarning: string
    mealLabel: (n: number) => string
    editMealLabel: (n: number) => string
    /** Exits edit mode without saving or deleting (#169) — before this,
     * Save/Delete were the only ways out of an accidentally-opened or
     * changed-mind edit state. */
    cancelEditMealLabel: (n: number) => string
    deleteMealLabel: (n: number) => string
    reorderMealLabel: (n: number) => string
    /** Dedicated single-meal edit route (#157) — replaces #145's inline
     * expand-in-place; a meal's pencil on Today/History now navigates
     * here instead. */
    editMealScreenTitle: string
    backLabel: string
    /** Shown only if the route's mealId no longer matches anything in that
     * day's entry (a stale link, or the meal was deleted elsewhere in the
     * meantime) — should be rare in normal use. */
    mealNotFoundText: string
    /** Custom meal name field (#110) — aria-label composed with mealLabel(n),
     * same pattern as itemNameLabel etc. */
    mealLabelFieldLabel: string
    /** Built-in quick-pick suggestions for the custom meal name field
     * (#110) — offered as one-click adds in Settings, not auto-seeded into
     * useMealLabelPresetStore (so a later language switch doesn't leave
     * stale-language presets behind for someone who never touched them). */
    defaultMealNamePresets: string[]
    saveButton: string
    /** MealItemEditorSheet's second footer action (#183) — saves the
     * current dish and keeps the sheet open, reset for the next one,
     * instead of closing. Only shown while adding a genuinely new item
     * (the add row, or a freshly-added blank row in an existing meal's
     * edit mode), not while editing an already-existing dish. */
    saveAndAddAnotherButton: string
    mealNoteLabel: string
    mealNotePlaceholder: string
    itemNameLabel: string
    itemNamePlaceholder: string
    /** Optional brand name (#248), e.g. "Perdue" — shown right after the
     * dish name field in the item editor. */
    itemBrandLabel: string
    itemBrandPlaceholder: string
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
    /** #199, redesigned by #201: collapses the trailing "add a new meal"
     * row — not a delete, just hides the row behind a small link
     * (expandAddMealLabel) they can tap to bring it back. For *today*
     * specifically this now persists across navigation
     * (useAddMealRowCollapseStore); past days always default collapsed
     * already and don't need this button to reach that state, only to
     * re-collapse after manually expanding within the same visit. */
    collapseAddMealLabel: string
    /** Replaces the whole add-meal row while collapsed (#199) — tapping it
     * re-expands the full row. */
    expandAddMealLabel: string
    /** #190: "Repeat yesterday's [meal]" quick action on the add row —
     * only shown when the day before has a meal at this same position
     * (#141's positional identity, not label matching). Clones that
     * meal's items (name/macros/amountG only, not time/note/emotion) in
     * one tap, for a routine that's logged the same way most days. */
    repeatMealLabel: (mealLabel: string) => string
    /** #202: title of the preview dialog "Repeat yesterday's [meal]" opens
     * into — lets a specific dish be unchecked before confirming, rather
     * than #190's original all-or-nothing immediate commit. */
    repeatMealDialogTitle: (mealLabel: string) => string
    /** #253 — "Copy yesterday's meals": whole-day sibling of #190/#202's
     * single-meal repeat above, reusing the exact same preview/selective-
     * pick pattern extended over every meal group in the source day rather
     * than one. Only meal/food data is copied — weight, sleep, steps,
     * note, mood, time-eaten, and per-item reactions are not, same
     * reasoning #190 used for a single meal. */
    copyYesterdayMealsLabel: string
    copyDayMealsDialogTitle: string
    orDivider: string
    addFoodButton: string
    addFoodDialogTitle: string
    closeFoodDialogLabel: string
    /** #256 — barcode scanning, alongside "Find food". Local-first lookup
     * with an Open Food Facts fallback on a barcode's first scan; every
     * repeat scan is a fully offline local match. */
    scanBarcodeButton: string
    scanBarcodeDialogTitle: string
    scanBarcodeInstructions: string
    /** #291 — appends the underlying caught error's name (e.g.
     * "NotAllowedError") when known, so a report already includes that
     * detail without needing separate debug logging. */
    scanBarcodeCameraErrorMessage: (detail?: string) => string
    /** #292 — shown for the gap between "barcode decoded" and "lookup
     * finished," which previously had zero visible feedback (the camera
     * dialog closed instantly on decode). */
    scanBarcodeSearchingMessage: string
    scanBarcodeStillScanningTip: string
    /** #291 — manual entry, always available alongside the camera: useful
     * on its own, and a way to tell whether a report is a camera problem
     * or a lookup problem. */
    scanBarcodeManualLabel: string
    scanBarcodeManualPlaceholder: string
    scanBarcodeManualSubmitLabel: string
    noFoodFoundForBarcodeMessage: string
    /** #287 — a quiet, dismissible in-app note shown right after saving the
     * day's first meal with a recorded time, if the previous day also had
     * one — not a background/push notification (see #261, closed as
     * infeasible for that). `fastingHoursBetween` (domain/stats, #257)
     * does the actual elapsed-hours math. */
    fastingWindowToastMessage: (hours: string) => string
    dismissFastingWindowToastLabel: string
    foodSearchLabel: string
    foodSearchPlaceholder: string
    foodQuantityLabel: string
    /** #254 — a friendlier alternative to grams for a curated food with
     * known serving sizes (egg, bread slice, medium fruit...). Toggle
     * between plain grams and each of that food's own descriptors;
     * `servingCountLabel` is "how many of this serving" once one's
     * picked, replacing the grams field for that item. */
    servingModeLabel: string
    gramsModeOption: string
    servingCountLabel: string
    /** #276 — a "go-to" food toggle in the picker, for either source.
     * Favorited items sort first, both unfiltered and within filtered
     * search results. */
    favoriteFoodLabel: (name: string) => string
    unfavoriteFoodLabel: (name: string) => string
    noFoodResultsText: string
    /** Find food's confirm button (#183) — e.g. "Add selected (3)". Also
     * used with n=1 for a single pick, replacing the old static "Add". */
    addSelectedFoodsButton: (n: number) => string
    per100gLabel: string
    /** Live preview prefix for the manual add row/item-edit row's computed
     * total (#98) — e.g. "Total: 300 kcal · ..." — recomputed on every
     * keystroke from the per-100g rate × quantity fields (#96), so the
     * multiplication result is visible before Add/Save, not just after. */
    computedTotalPrefix: string
    /** #260: today's prospective running total shown alongside the
     * per-item preview above, only for a brand-new (not-yet-saved) meal
     * draft — "Today would be: 1,850 kcal (was 1,550)". */
    todayWouldBeLabel: (newTotal: string, previousTotal: string) => string
    /** #255 — gentle, non-blocking note when the entered kcal doesn't
     * match the protein/fat/carbs entered (`isInconsistentMacros`).
     * Deliberately muted styling, not a red/destructive warning. */
    macroMismatchNote: string
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
    /** Body measurements (#225) — waist/hip circumference + body fat %,
     * bundled as one editable section (same shape as sleep's hours+deep
     * hours bundling) rather than three separate top-level fields. */
    bodyMeasurementsLabel: string
    editBodyMeasurementsLabel: string
    saveBodyMeasurementsLabel: string
    waistLabel: string
    hipLabel: string
    bodyFatLabel: string
    cmUnit: string
    percentUnit: string
    bodyMeasurementsSummary: (waist: string, hip: string) => string
    /** Body composition (#233) — bioimpedance-scale-style numbers (muscle
     * mass, visceral fat, body water %, bone mass), bundled as one
     * editable section same as bodyMeasurements above — a distinct group
     * since these come from a smart scale, not a tape measure/caliper.
     * #263: body fat % moved here from bodyMeasurements — same scale
     * sync as the other four, not a tape measure/caliper reading. */
    bodyCompositionLabel: string
    editBodyCompositionLabel: string
    saveBodyCompositionLabel: string
    muscleMassLabel: string
    visceralFatLabel: string
    bodyWaterLabel: string
    boneMassLabel: string
    kgUnit: string
    bodyCompositionSummary: (
      muscleMass: string,
      visceralFat: string,
      bodyWater: string,
      boneMass: string,
      bodyFat: string,
    ) => string
    onPeriodLabel: string
    /** Opt-in digestion tracking's per-day toggle, on both Today and in
     * DayDetail.tsx — tracks the problem (constipation), not the normal
     * day, so logging it is only ever needed on an exception day. */
    hadConstipationLabel: string
    hadConstipationNoOption: string
    hadConstipationYesOption: string
    /** Opt-in water tracking (#258), a list of discrete entries rather
     * than a single running total (#271) — same gating shape as onPeriod/
     * hadConstipation above. #282: only the two fixed-amount quick-add
     * buttons remain (no manual "type any amount" input/confirm button). */
    waterLabel: string
    mlUnit: string
    addGlassLabel: string
    addBottleLabel: string
    /** #271 — aria-label for a logged water entry's own remove (X) button,
     * e.g. "Remove 250ml entry". */
    removeWaterEntryLabel: (amount: string) => string
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
    /** #258 — same shape again, independent of the macro targets. */
    dailyWaterTargetLabel: string
    dailyWaterTargetHint: string
    /** #259 — deterministic TDEE/macro-ratio suggestion, prefills but
     * never auto-saves the four target fields above. */
    suggestTargetButton: string
    suggestTargetCaveat: string
    suggestTargetMissingProfileHint: string
    updateButton: string
    setButton: string
    savedConfirmation: string
    currentGoalTitle: string
    notSetLabel: string
    editGoalLabel: string
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
    /** Quiet nudge (#155) on GoalScreen once the *active* goal's own window
     * has been reached mid-week — same no-badges/no-streaks tone as
     * today.goalRenewalReminder, shown alongside the targetMetOnLabel badge
     * on the StatCard rather than replacing it. */
    activeGoalReachedNudge: string
    /** #232 — short title for the nudge's own show/hide toggle row,
     * distinct from the full-sentence body text above (same reasoning as
     * today.targetMetSectionTitle etc.). */
    activeGoalReachedSectionTitle: string
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
    exportPeriodLabel: string
    exportPeriodDescription: string
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
    /** Markdown export (#219) — same flat Daily Log table as the CSV export,
     * rendered as a Markdown table instead. Distinct copy, same reasoning as
     * exportCsvBlurb above. */
    exportMarkdownBlurb: string
    exportMarkdownButton: string
    exportingMarkdownButton: string
    exportMarkdownFailed: string
    exportedMarkdownSummary: (entries: number) => string
    /** Local storage usage (#176) — fallback copy for when
     * `navigator.storage.estimate()`'s `quota` isn't available (some
     * browsers only return `usage`); `storageUsedOfQuotaLabel` below is
     * used whenever both numbers are known. */
    storageUsedLabel: (size: string) => string
    /** #191: usage + quota together — originally quota was left out
     * (reasoning: it's usually a large browser-computed ceiling, not a
     * small meaningful number, so "X of Y" would read as noise), but users
     * asked directly how much space is left and whether there's even a
     * limit, so the real number is shown and left for them to judge. */
    storageUsedOfQuotaLabel: (used: string, quota: string) => string
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
    /** Body measurements (#225) — same fields as DailyEntryForm's bundled
     * "Body measurements" section. */
    waistColumn: string
    hipColumn: string
    bodyFatColumn: string
    moodColumn: string
    noteColumn: string
    onPeriodColumn: string
    hadConstipationColumn: string
    waterColumn: string
    mealColumn: string
    itemColumn: string
    brandColumn: string
    gramsColumn: string
    timeColumn: string
    reactionColumn: string
    createdColumn: string
    weeklyTargetColumn: string
  }
  dashboard: {
    title: string
    description: string
    reorderSectionLabel: (n: number) => string
    reorderSectionsButton: string
    weightLegend: string
    caloriesLegend: string
    rollingAverageLegend: string
    trendChartEmptyDescription: string
    /** #217 — shown by the weight/calorie/macro trend charts instead of the
     * chart itself when there are too few logged days to plot a trend that
     * means anything (e.g. two far-apart points connected by a straight
     * line can visually read as a confident trend that isn't real). */
    notEnoughTrendDataMessage: string
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
    hideChartLabel: (title: string) => string
    showChartLabel: (title: string) => string
    weeklySummaryTitle: string
    weekRange: (start: string, end: string) => string
    weightChangeLabel: string
    averageCaloriesLabel: string
    targetMetNote: string
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
      thresholdKcal: number,
      direction: 'lower' | 'higher',
    ) => string
    correlationWeekCount: (n: number) => string
    correlationLagCaveat: string
    correlationExpandLabel: string
    correlationCollapseLabel: string
    /** #224 — shared plain-language strength label, reused by every
     * correlation view below (weekly calories one and the four day-pair
     * ones) rather than a separate copy per view, since the concept and
     * wording is identical everywhere it appears. */
    correlationStrengthLabel: (strength: 'weak' | 'moderate' | 'strong') => string
    /** #224 — shared outlier-flagging UI, reused by all 6 correlation
     * views (`shared/hooks/useOutlierExclusion.ts`,
     * `OutlierPointsList.tsx`). A flagged point (Tukey's-fences outlier on
     * either axis) can be tapped to drop it from that one view's own
     * correlation math — e.g. a vacation or illness week. */
    outlierPointsHeading: string
    excludeOutlierLabel: (label: string) => string
    restoreOutlierLabel: (label: string) => string
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
    /** Protein-vs-next-day-weight correlation (#216), same day-pair shape
     * as sleep/steps above — deliberately distinct from the existing
     * calories-vs-weekly-change correlation (correlationTitle etc.), which
     * stays a weekly-average comparison, not a day-pair one. */
    proteinCorrelationTitle: string
    proteinCorrelationEmptyDescription: string
    proteinCorrelationSummary: (
      thresholdProteinG: string,
      direction: string,
    ) => string
    proteinCorrelationDayCount: (n: number) => string
    proteinCorrelationLagCaveat: string
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
    /** Takes the current unit label ('kg'/'lb') — the unit lives in the
     * header instead of every row's cell so the Actions column's icons
     * don't get pushed off screen on narrow phones (#246). */
    weightColumn: (unit: string) => string
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
    /** List-view pagination (#162) — 20 rows/page, so a growing history
     * never renders every entry into the DOM at once. */
    previousPageButton: string
    nextPageButton: string
    pageIndicator: (current: number, total: number) => string
    /** #155: sr-only text appended to a day that falls within a reached
     * goal window ([weekStart, metOnDate]) but isn't the exact reach day —
     * the visual tint alone (List's date-cell background, Calendar's day
     * background) isn't accessible on its own. */
    reachedGoalWindowDayLabel: string
    /** #155: sr-only text for the exact day a goal's target was first
     * met — distinct from reachedGoalWindowDayLabel above. */
    reachedGoalDayLabel: string
  }
  settings: {
    title: string
    description: string
    unitsLabel: string
    languageLabel: string
    english: string
    russian: string
    appearanceLabel: string
    /** #193: displayed copy is "Theme"/"Тема", not "Mood" — the key name is
     * unchanged (still ties to the `Mood` type/`useMoodStore`) but the old
     * label confused users with the day/meal emotion pickers elsewhere in
     * the app, which already use "mood" for something unrelated. Can't
     * reuse "Color scheme" either — `colorSchemeLabel` below already means
     * the light/dark toggle. */
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
    /** #290 — the create-a-new-dictionary-entry form moved from an inline
     * reveal at the bottom of the (potentially long) saved-foods list into
     * a full-screen dialog, reachable instantly regardless of scroll
     * position. */
    addMealItemDialogTitle: string
    closeAddMealItemDialogLabel: string
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
    digestionTrackingLabel: string
    waterTrackingLabel: string
    /** #237: unified "what to track" section — folds cycle/digestion
     * tracking's own opt-in toggles in with the 5 fields below, which
     * didn't have an opt-out at all before this. */
    trackedFieldsLabel: string
    trackedFieldsDescription: string
    /** #233 — height/age/sex, entered once (rarely changed) purely to
     * compute BMI/BMR on Today; local preference only, not part of the
     * export bundle, same category as unit/theme/week-start. */
    profileLabel: string
    profileDescription: string
    heightLabel: string
    ageLabel: string
    sexLabel: string
    sexFemaleOption: string
    sexMaleOption: string
    /** #259 — a 5th optional profile field, only used by GoalForm's
     * "Suggest a target" TDEE helper (not by BMI/BMR, so leaving it unset
     * doesn't affect the #233 stats above). */
    activityLevelLabel: string
    activityLevelSedentary: string
    activityLevelLight: string
    activityLevelModerate: string
    activityLevelActive: string
    activityLevelVeryActive: string
    saveProfileLabel: string
    /** #265: read-only display + pencil-to-edit, same shape as the daily
     * log's Weight/Body composition summaries — shown once height/age/sex/
     * activity level have been saved at least once. */
    editProfileLabel: string
    profileSummary: (
      height: string,
      age: string,
      sex: string,
      activityLevel: string,
    ) => string
    /** Opt-in "haven't logged today" reminder (#171) — off by default, same
     * shape as cycle/digestion tracking. Deliberately just an in-app
     * banner on Today, not a real push notification. */
    dailyReminderLabel: string
    dailyReminderDescription: string
    dailyReminderOn: string
    dailyReminderOff: string
    trendChartsLabel: string
    trendChartsDescription: string
    weightTrendLabel: string
    calorieTrendLabel: string
    weekStartLabel: string
    weekStartDescription: string
    weekStartMonday: string
    weekStartFirstEntry: string
    dayStartLabel: string
    dayStartDescription: string
    foodListLabel: string
    foodListDescription: string
    manageFoodListButton: string
    aboutLabel: string
    aboutDescription: string
    viewAboutButton: string
    /** #283 — compact clickable version badge at the top of Settings
     * (PageHeader's action slot), navigating to /about — the About card
     * further down the page was otherwise the only way to find the
     * version. Distinct from about.currentVersionLabel's full sentence,
     * which stays as-is on the About page itself. */
    versionBadgeLabel: (version: number) => string
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
  /** #251 — multi-ingredient, servings-based templates. Reached from a
   * Settings card (settingsSectionLabel/Description, manageRecipesButton)
   * into `RecipesSettingsScreen.tsx`'s management screen, which opens
   * `RecipeEditorDialog.tsx` to build/edit one. Logging one from the daily
   * log goes through `LogRecipeDialog.tsx` instead. */
  recipes: {
    settingsSectionLabel: string
    settingsSectionDescription: string
    manageRecipesButton: string
    screenTitle: string
    screenDescription: string
    emptyStateText: string
    addRecipeButton: string
    editRecipeLabel: (name: string) => string
    deleteRecipeLabel: (name: string) => string
    servingsCountLabel: (n: number) => string
    addRecipeDialogTitle: string
    editRecipeDialogTitle: string
    closeRecipeDialogLabel: string
    recipeNameLabel: string
    recipeNamePlaceholder: string
    servingsFieldLabel: string
    ingredientsSectionLabel: string
    noIngredientsYetText: string
    removeIngredientLabel: (name: string) => string
    addIngredientButton: string
    ingredientNameLabel: string
    ingredientNamePlaceholder: string
    perServingPreviewPrefix: string
    cancelLabel: string
    logRecipeButton: string
    logRecipeDialogTitle: string
    closeLogRecipeDialogLabel: string
    pickRecipeLabel: string
    servingsEatenLabel: string
    noRecipesYetMessage: string
    logButtonLabel: string
  }
  about: {
    title: string
    description: string
    intro: string
    /** #213 rewrite: why the app tracks more than just weight/calories. */
    tracking: string
    philosophy: string
    /** #213 rewrite: a short standalone heading right before `privacy`,
     * not part of that paragraph's own sentence flow. */
    privacyHeading: string
    privacy: string
    madeBy: (author: string) => string
    /** Current release-notes version number (simple incrementing counter,
     * ReleaseNotesSection.tsx) — lets a reported bug be pinned to a
     * specific version rather than just a date. */
    currentVersionLabel: (version: number) => string
  }
}
