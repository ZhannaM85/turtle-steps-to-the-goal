import type { Sex } from '@/domain/stats/bodyComposition'

export interface DailyEntryMealsDict {
    /** #454 — the "add a meal" flyout's own copy: a short recent-items
     * heading shown while the search box is empty, the fallback link to
     * manual entry once a search comes up empty, the live "meal so far"
     * heading, the whole-meal "was it tasty?" reaction question (distinct
     * from `dayMoodLabel`'s whole-day framing), the quantity-confirm
     * step's own Cancel, and the flyout's final "Done" action. */
    recentFoodsLabel: string
    /** #459 — expands the Recent list past its default 3-item cap to the
     * full list, matching the mockup's "Show all" link. */
    showAllRecentLabel: string
    /** #459 — the same link's other state, once expanded: collapses the
     * Recent list back to its 3-item cap. Reported live after the initial
     * "Show all" had no way back. */
    collapseRecentLabel: string
    cantFindItAddManuallyLabel: string
    /** #459 — the quick-action row's bordered cards (Add food / Scan
     * barcode / Log recipe), replacing the old plain-text links.
     * scanBarcodeButton/recipes.logRecipeButton are reused for the other
     * two cards' labels. **#802** adds a fourth tile for shared-food QR/link. */
    quickActionAddFoodLabel: string
    /** #802 — scan a food-share QR or paste a share link into this meal. */
    quickActionImportSharedFoodLabel: string
    mealSoFarLabel: string
    /** #982 — section share beside «Состав приёма пищи» for every named dish. */
    shareMealCompositionLabel: string
    /** #983 — long-press selection: share the checked dishes, or save them as one recipe. */
    selectMealItemLabel: (name: string) => string
    shareSelectedMealItemsButton: string
    cancelMealSelectionButton: string
    createRecipeFromMealButton: string
    createRecipeFromMealTitle: string
    createRecipeFromMealDescription: string
    createRecipeFromMealPer100gLabel: string
    createRecipeFromMealSaveButton: string
    /** #986 — selected dishes that already match a saved recipe. */
    createRecipeExistingRecipesWarning: string
    createRecipeCopyExistingNameButton: string
    createRecipeCopyExistingNameLabel: (name: string) => string
    wasItTastyLabel: string
    doneAddingMealButton: string
    /** #494 — confirm before X/escape discards an in-progress new meal
     * that already has foods from this flyout session (#491). */
    confirmDiscardInProgressMealLabel: string
    confirmDiscardInProgressMealYes: string
    confirmDiscardInProgressMealNo: string
    /** #509 — same shape as #494's discard confirm, for Close on an
     * already-saved meal whose draft has uncommitted edits. */
    confirmDiscardEditedMealLabel: string
    /** #509 — confirm before trash removes a composition row (new or edit). */
    confirmDeleteItemLabel: string
    confirmDeleteItemYes: string
    confirmDeleteItemNo: string
    /** #870 — field-specific `ConfirmDeleteEntryBar` copy. */
    confirmDeleteNoteLabel: string
    confirmDeleteMorningNoteLabel: string
    confirmDeleteStepsLabel: string
    confirmDeleteWaterLabel: string
    confirmDeleteDayTotalsLabel: string
    confirmDeleteNightFoodNoteLabel: string
    confirmDeleteNamedLabel: (name: string) => string
    confirmDeleteCustomMetricNoteLabel: string
    /** #287 — a quiet, dismissible in-app note shown right after saving the
     * day's first meal with a recorded time, if the previous day also had
     * one — not a background/push notification (see #261, closed as
     * infeasible for that). `fastingHoursBetween` (domain/stats, #257)
     * does the actual elapsed-hours math. #794 — hours + minutes, not a
     * one-decimal float (`13h 36m` / `13 ч 36 м`). */
    fastingWindowToastMessage: (hours: number, minutes: number) => string
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
    /** #531 — explicit Open Food Facts name search (never per-keystroke). */
    searchOnlineButton: string
    searchingOnlineLabel: string
    onlineFoodResultsHeading: string
    noOnlineFoodResultsText: string
    searchOnlineOfflineHint: string
    /** #535 — offline still searches bundled RU staples. */
    searchOnlineOfflineBundledHint: string
    /** #535 — OFF/USDA outage (not the same as empty results). */
    onlineFoodUnavailableText: string
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
    /** #399 — sibling to `todayWouldBeLabel` above, shown only when the
     * active goal has a `dailyCalorieTargetKcal` set: "150 kcal remaining
     * (was 500 kcal remaining)". Same before/after shape, but against the
     * target instead of a running total — lets the user see whether
     * they're about to go over before confirming, not just after saving. */
    todayRemainingWouldBeLabel: (
      newRemaining: string,
      previousRemaining: string,
    ) => string
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
    /** #424 */
    cancelEditSleepLabel: string
    hoursUnit: string
    minutesUnit: string
    hoursFieldLabel: string
    minutesFieldLabel: string
    sleepSummary: (hours: string, deepHours: string) => string
    stepsLabel: string
    editStepsLabel: string
    saveStepsLabel: string
    /** #424 */
    cancelEditStepsLabel: string
    /** #855 — delete a saved step count after confirm. */
    deleteStepsLabel: string
    /** #367 — generic "meals" data-type label, for the MyFitnessPal import
     * field picker. Meals aren't a single pencil-to-edit field the way
     * weight/steps are (they're the existing MealList.tsx flow), so this
     * doesn't pair with an edit/save label the way the others above do. */
    mealsLabel: string
    /** #468 — accordion trigger wrapping the meal list, same
     * expand/collapse aria-label pair shape as expandMacrosLabel/
     * collapseMacrosLabel and t.today's own expandStatsLabel/
     * collapseStatsLabel. */
    expandMealsLabel: string
    collapseMealsLabel: string
    /** Body measurements (#225) — waist/hip circumference + body fat %,
     * bundled as one editable section (same shape as sleep's hours+deep
     * hours bundling) rather than three separate top-level fields. */
    bodyMeasurementsLabel: string
    editBodyMeasurementsLabel: string
    saveBodyMeasurementsLabel: string
    /** #424 */
    cancelEditBodyMeasurementsLabel: string
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
    /** #424 */
    cancelEditBodyCompositionLabel: string
    muscleMassLabel: string
    visceralFatLabel: string
    bodyWaterLabel: string
    boneMassLabel: string
    kgUnit: string
    /** #515 — compact labels for the collapsed Body composition grid, where
     * five metrics share a narrow row. The full `*Label` keys above stay on
     * the edit inputs, where there's room for them. */
    muscleMassShortLabel: string
    visceralFatShortLabel: string
    bodyWaterShortLabel: string
    boneMassShortLabel: string
    bodyFatShortLabel: string
    /** #742 — fill the five body-composition fields from a Zepp screenshot. */
    fillBodyCompositionFromScreenshotLabel: string
    zeppScreenshotDialogTitle: string
    zeppScreenshotDialogDescription: string
    zeppScreenshotReadingLabel: string
    zeppScreenshotNoValues: string
    zeppScreenshotFailed: string
    zeppScreenshotSaveLabel: string
    zeppScreenshotCloseLabel: string
    zeppScreenshotDateHint: (date: string) => string
    /** #806 — ⓘ next to the Zepp ImageUp on Day. */
    zeppScreenshotHelpLabel: string
    zeppScreenshotHelpText: string
    /** #748 — fill sleep + deep sleep from an AutoSleep screenshot. */
    fillSleepFromScreenshotLabel: string
    autoSleepScreenshotDialogTitle: string
    autoSleepScreenshotDialogDescription: string
    autoSleepScreenshotReadingLabel: string
    autoSleepScreenshotNoValues: string
    autoSleepScreenshotFailed: string
    autoSleepScreenshotSaveLabel: string
    autoSleepScreenshotCloseLabel: string
    autoSleepScreenshotDateHint: (date: string) => string
    /** #806 — ⓘ next to the AutoSleep ImageUp on Day. */
    autoSleepScreenshotHelpLabel: string
    autoSleepScreenshotHelpText: string
    /**
     * #664 — live arrow + short text under an input while editing, and the
     * post-save ⓘ tooltip. `amount` already includes the signed magnitude
     * and unit (e.g. "0.5 kg"); `dateLabel` is a localized month+day.
     */
    entryComparisonComparedToYesterday: (
      arrow: string,
      amount: string,
    ) => string
    entryComparisonComparedToDate: (
      arrow: string,
      amount: string,
      dateLabel: string,
    ) => string
    entryComparisonVsYesterday: (arrow: string, amount: string) => string
    entryComparisonVsDate: (
      arrow: string,
      amount: string,
      dateLabel: string,
    ) => string
    entryComparisonVs30DaysAgo: (arrow: string, amount: string) => string
    entryComparisonInfoLabel: string
    onPeriodLabel: string
    /** Opt-in digestion tracking's per-day toggle, on both Today and in
     * DayDetail.tsx — tracks the problem (constipation), not the normal
     * day, so logging it is only ever needed on an exception day. */
    hadConstipationLabel: string
    hadConstipationNoOption: string
    hadConstipationYesOption: string
    /** #607 — opt-in alcohol day signal, same shape/gating as
     * hadConstipation above (DailyEntryFormBottom.tsx's Evening group,
     * DayDetail.tsx). A plain yes/no day signal, not a drinks count or
     * beverage database, per the issue's own explicit scope. */
    hadAlcoholLabel: string
    hadAlcoholNoOption: string
    hadAlcoholYesOption: string
    /** #383 — always shown (no Settings opt-in, unlike hadConstipation
     * above): reflects a value derived from today's own logged meal times,
     * unless manually overridden via this same toggle. #398: takes the
     * optional Profile `sex` so the toggle's own label can use the
     * grammatically-correct Russian verb form; callers with no sex context
     * (the chart legend, the correlation view) call it with no argument for
     * the neutral placeholder form. */
    nightEatingLabel: (sex?: Sex) => string
    nightEatingNoOption: string
    nightEatingYesOption: string
    /** #818 — standalone Night food card title (not nested under Evening). */
    nightFoodCardTitle: string
    nightFoodCardHint: (sex?: Sex) => string
    /** #829 — read-only card: next calendar day's weigh-in + signed delta. */
    nextMorningWeightCardTitle: string
    nextMorningWeightCardHint: string
    nightEatingRememberLabel: (sex?: Sex) => string
    nightEatingRememberYesOption: string
    nightEatingRememberPartialOption: string
    nightEatingRememberNoOption: string
    nightEatingReasonLabel: string
    nightEatingReasonFieldPlaceholder: string
    saveNightEatingReasonLabel: string
    editNightEatingReasonLabel: string
    cancelEditNightEatingReasonLabel: string
    /** #855 — delete a saved Night food reason after confirm. */
    deleteNightEatingReasonLabel: string
    /** #835 / #842 — Night food No-path follow-ups (not Yes remember/reason). */
    nightEatingNoEasyLabel: string
    nightEatingNoWhatHelpedLabel: string
    nightEatingNoWhatHelpedFieldPlaceholder: string
    saveNightEatingNoWhatHelpedLabel: string
    editNightEatingNoWhatHelpedLabel: string
    cancelEditNightEatingNoWhatHelpedLabel: string
    /** #855 — delete a saved What-helped note after confirm. */
    deleteNightEatingNoWhatHelpedLabel: string
    /** #413 — History's own single-button night-eating toggle (unlike
     * Today's two-option ToggleGroup, #406) has no built-in third click
     * state, so a small separate "×" button clears an explicit override
     * back to the derived value. */
    clearNightEatingOverrideLabel: string
    /** Opt-in water tracking (#258), a list of discrete entries rather
     * than a single running total (#271) — same gating shape as onPeriod/
     * hadConstipation above. #549: manual ml input restored alongside
     * the two fixed-amount quick-add buttons. */
    waterLabel: string
    /** #549 — day-level kcal/macros without meal items; additive with meals. */
    dayTotalsLabel: string
    dayTotalsHint: string
    dayTotalsKcalLabel: string
    dayTotalsProteinLabel: string
    dayTotalsFatLabel: string
    dayTotalsCarbsLabel: string
    /** #582 — optional day-level fiber, same shape as the macros above. */
    dayTotalsFiberLabel: string
    expandDayTotalsLabel: string
    collapseDayTotalsLabel: string
    saveDayTotalsLabel: string
    cancelEditDayTotalsLabel: string
    deleteDayTotalsLabel: string
    editDayTotalsLabel: string
    /** #476 — accordion trigger wrapping the water quick-add + chips,
     * same expand/collapse aria-label pair shape as expandMealsLabel/
     * collapseMealsLabel and expandMacrosLabel/collapseMacrosLabel. */
    expandWaterLabel: string
    collapseWaterLabel: string
    mlUnit: string
    addGlassLabel: string
    addBottleLabel: string
    /** #271 — aria-label for a logged water entry's own remove (X) button,
     * e.g. "Remove 250ml entry". */
    removeWaterEntryLabel: (amount: string) => string
    /** #849 — aria-label for tapping a water chip to edit time/amount. */
    editWaterEntryLabel: (amount: string) => string
    editWaterEntryDialogTitle: string
    waterAmountLabel: string
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
