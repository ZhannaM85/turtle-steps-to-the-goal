import type { NutritionFactId } from '@/domain/nutritionFacts'

export type NutritionFactsDict = Record<NutritionFactId, string>

export interface RecipesDict {
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
    /** #611 — "Copy ingredients as a shopping list" icon button on each
     * `RecipesSettingsScreen.tsx` row, next to Edit/Delete. Clipboard-only
     * (no Markdown-file download) — the acceptance bar was "one action
     * copies a readable list," and every other export path in this app
     * already goes through Settings → Export instead of duplicating a
     * file-download mechanism per feature. */
    copyIngredientsLabel: (name: string) => string
    ingredientsCopiedLabel: string
    /** #636 — visible text confirmation shown next to the copy button,
     * since the icon swap (`ingredientsCopiedLabel`, its aria-label) alone
     * was reported live as too easy to miss and not specific about what
     * got copied. Same short-lived, auto-clearing shape as `GoalForm.tsx`'s
     * `justSaved` confirmation. */
    ingredientsCopiedToastMessage: string
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

export interface CustomMetricsDict {
    settingsSectionLabel: string
    settingsSectionDescription: string
    manageCustomMetricsButton: string
    screenTitle: string
    screenDescription: string
    backToSettingsLabel: string

    metricsSectionLabel: string
    emptyMetricsText: string
    addMetricButton: string
    addMetricDialogTitle: string
    closeMetricDialogLabel: string
    metricNameLabel: string
    metricNamePlaceholder: string
    metricInputKindLabel: string
    metricInputKindNumberOption: string
    metricInputKindBooleanOption: string
    metricInputKindScaleOption: string
    metricUnitLabel: string
    metricUnitPlaceholder: string
    deleteMetricLabel: (name: string) => string
    cancelLabel: string
    saveButton: string

    /** Per-date value entry, one row per defined metric — mounted on
     * `TodayScreen.tsx` via `CustomMetricLogSection.tsx` (#362), not this
     * screen. `logValuesSectionLabel` is that section's own heading there;
     * `logValuesMovedText` is the note shown here in its place once at
     * least one metric is defined. #478: expand/collapse + collapsed
     * summary for the bordered accordion wrap. */
    logValuesSectionLabel: string
    logValuesMovedText: string
    expandLogValuesLabel: string
    collapseLogValuesLabel: string
    /** Collapsed-header summary, e.g. "2 logged / 3 metrics". */
    logValuesCollapsedSummary: (logged: number, total: number) => string
    booleanYesOption: string
    booleanNoOption: string
    /** Accessible label for one of the five 1-5 scale buttons, e.g. "Rate
     * 3 out of 5". */
    scaleValueLabel: (n: number) => string
    valueSavedLabel: string
    /** Free-text note attached to one day's logged value (#363) — e.g. "started
     * a new skincare product" on an Acne entry. Shown once a value for that
     * day already exists, not before. */
    noteLabel: string
    notePlaceholder: string
    /** Accessible label for the note's own explicit Save button (#364) —
     * same checkmark-`Button` pattern `t.dailyEntry.saveNoteLabel` already
     * uses for the day note, since blur-only commit gave no visible
     * confirmation the note was saved. */
    saveNoteLabel: string
    /** Accessible label for the pencil button that reopens an already-saved
     * note for editing (#364 reopened) — same read/edit-mode toggle
     * `t.dailyEntry.editNoteLabel` already uses for the day note. */
    editNoteLabel: string
    /** #437 — same #424/#437 Cancel-without-saving affordance
     * `t.dailyEntry.cancelEditNoteLabel` already gives the day note. */
    cancelEditNoteLabel: string
    /** #855 — delete a saved custom-metric note after confirm. */
    deleteNoteLabel: string
    /** #855 — delete a saved custom-metric day value after confirm. */
    deleteValueLabel: string
    /** #620 — trigger for the "nothing logged yet" idle state, reached by
     * canceling a fresh note that was never saved (a real idle state,
     * distinct from the read-mode box above which is only for an actual
     * saved note). */
    addNoteLabel: string

    correlationsSectionLabel: string
    emptyCorrelationsText: string
    addCorrelationButton: string
    addCorrelationDialogTitle: string
    closeCorrelationDialogLabel: string
    correlationNameLabel: string
    correlationNamePlaceholder: string
    metricALabel: string
    metricBLabel: string
    selectMetricPlaceholder: string
    deleteCorrelationLabel: (name: string) => string
    /** Shown when both pickers resolve to the same metric — a correlation
     * needs two distinct sides. */
    sameMetricErrorText: string
  }

export interface PlannedMealsDict {
    sectionLabel: string
    expandSectionLabel: string
    collapseSectionLabel: string
    /** Collapsed-header summary, e.g. "2 planned" / "Nothing planned". */
    collapsedSummary: (count: number) => string
    /** Calm, reassuring blurb (#614 acceptance: "drafts do not distort
     * today's totals until promoted") — shown above the drafts list/add
     * trigger so this is clear before anyone stages anything. */
    sectionBlurb: string
    stagedListLabel: string
    /** Takes the already-formatted calorie estimate, e.g. "450 kcal" —
     * omitted from the row entirely when the draft has none. */
    plannedKcalLabel: (kcal: string) => string
    addToLogButton: string
    discardPlannedMealLabel: (name: string) => string
    addPlanTriggerLabel: string
    planNameLabel: string
    planNamePlaceholder: string
    planKcalLabel: string
    planKcalPlaceholder: string
    savePlanButton: string
    cancelPlanLabel: string
  }
