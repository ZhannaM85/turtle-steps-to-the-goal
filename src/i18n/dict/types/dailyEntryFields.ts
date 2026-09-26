export interface DailyEntryFieldsDict {
    /** #404 — group headers wrapping the daily-entry fields into two
     * always-expanded (not collapsible, confirmed via `AskUserQuestion`)
     * sections by when they're naturally filled in: Morning (Weight,
     * Sleep, Body measurements, Body composition) and Evening (Steps,
     * Note, Mood, Constipation, Night eating). Meals and Water stay
     * ungrouped, matching the user's own reference mockup. */
    morningEntriesTitle: string
    eveningEntriesTitle: string
    /** #472 — accordion triggers wrapping the Morning/Evening entries
     * groups, same expand/collapse aria-label pair shape as
     * expandMacrosLabel/collapseMacrosLabel and expandMealsLabel/
     * collapseMealsLabel above. */
    expandMorningEntriesLabel: string
    collapseMorningEntriesLabel: string
    expandEveningEntriesLabel: string
    collapseEveningEntriesLabel: string
    /** #831 — Night food / Next Morning Weight accordions, same pair. */
    expandNightFoodCardLabel: string
    collapseNightFoodCardLabel: string
    expandNextMorningWeightCardLabel: string
    collapseNextMorningWeightCardLabel: string
    weightLabel: string
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
    /** Label above the day's total-macros field (#152) — previously a
     * caption line tucked under the Calories card, promoted to a field
     * of its own matching Weight/Sleep/Calories' treatment. */
    macrosLabel: string
    /** Label on the day-total macros StatCard once it's split out of the
     * combined section label above (#467) — the "consumed so far"
     * counterpart to remainingMacrosLabel below. */
    consumedMacrosLabel: string
    kcalUnit: string
    noteLabel: string
    noteFieldPlaceholder: string
    /** #763 — opt-in morning free-text, parallel to evening noteLabel. */
    morningNoteLabel: string
    morningNoteFieldPlaceholder: string
    editWeightLabel: string
    editNoteLabel: string
    editMorningNoteLabel: string
    saveWeightLabel: string
    saveNoteLabel: string
    saveMorningNoteLabel: string
    /** #424 — same "leave edit mode without saving" affordance
     * cancelEditMealLabel already established for meals, applied to
     * Weight/Sleep/Steps/Body measurements/Body composition. #437 extends
     * it to the day note (custom-metric notes get their own key, see
     * customMetrics below). */
    cancelEditWeightLabel: string
    cancelEditNoteLabel: string
    cancelEditMorningNoteLabel: string
    /** #855 — delete a saved day / morning note after confirm. */
    deleteNoteLabel: string
    deleteMorningNoteLabel: string
    /** #670 — deletes a logged weight entry (today or any past date) after
     * a confirmation step; reuses the generic `history.confirmDelete*`
     * strings for that step, same as `deleteMealLabel`'s confirm flow. */
    deleteWeightLabel: string
    /** #745 — same trash + confirm as deleteWeightLabel, for the Sleep /
     * Body measurements / Body composition morning cards. */
    deleteSleepLabel: string
    deleteBodyMeasurementsLabel: string
    deleteBodyCompositionLabel: string
    /** #436 — every hard-bounds field validator in `useDailyEntryFormState.ts`
     * (weight, note, sleep/deep sleep, steps, waist/hip, the 5 body-
     * composition fields) used to set its error message straight from
     * zod's own `safeParse` issue — always raw English text, never routed
     * through this dictionary like every other user-facing string. Fixed
     * by using this one shared generic message everywhere instead of the
     * raw zod text, rather than writing ~10 fields' worth of specific
     * bounds copy (resolved directly: plain translated wording over
     * mentioning each field's exact numeric limits). */
    invalidValueMessage: string
    /** #218: soft warning (not a hard block, unlike weightSchema's own
     * 20-400kg range) for a weight technically valid but unusual enough
     * to likely be a typo — a second tap on Save confirms it anyway. */
    unusualWeightWarning: string
    saveUnusualWeightAnywayLabel: string
    fixWeightLabel: string
    /** #401 — same soft-warning shape as unusualWeightWarning above, but for
     * an unusual jump vs. yesterday's own logged value in any of the 5 body
     * composition fields (a second tap on Save confirms it anyway). */
    unusualBodyCompositionWarning: string
    saveUnusualBodyCompositionAnywayLabel: string
    fixBodyCompositionLabel: string
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
    /** Visible text of Add meal's whole-meal delete button (#508), which
     * moved out of the header icon cluster down to the Done footer. The
     * positioned `deleteMealLabel(n)` stays as its aria-label, so the two
     * meal-delete controls (Day meal row, this dialog) remain
     * distinguishable to assistive tech. */
    deleteWholeMealButton: string
    /** #600 — short-lived undo toast after a meal delete commits (both the
     * list row's own two-step confirm and Add meal dialog's Delete button
     * funnel through the same `deleteMealById`/undo state in
     * `MealList.tsx`). Auto-clears after `MEAL_DELETE_UNDO_WINDOW_MS`;
     * deleting a second meal while one is still showing replaces it rather
     * than stacking. Clear-all data (Settings) is unrelated and keeps its
     * own permanent two-step confirm. */
    mealDeletedToastMessage: string
    undoDeleteMealButton: string
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
    /** #869 — save a current name that is not already a template. */
    saveMealNameAsTemplateLabel: string
    /** Closed meal-name dropdown when the selection is cleared (#845/#1002). */
    mealTypeUnsetLabel: string
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
    /** Group-level note placeholder (#480) — meal-aware, e.g. "Note about
     * breakfast"; must not reuse the reaction block's "Was it tasty?" copy. */
    mealNotePlaceholder: (mealLabel: string) => string
    itemNameLabel: string
    itemNamePlaceholder: string
    /** Optional brand name (#248), e.g. "Perdue" — shown right after the
     * dish name field in the item editor. */
    itemBrandLabel: string
    itemBrandPlaceholder: string
    /** #994 — homemade catalog flag on Add/Edit dish, and the meal-search chip. */
    homemadeDishLabel: string
    /** #344 — section headings for the redesigned Add Dish form's
     * card-grouped layout (mockup-driven): "Quantity" groups the per100g/
     * portion mode toggle with the amount+quantity fields; "Nutrition"
     * groups protein/fat/carbs/fiber. Nutrition's own heading is mode-aware
     * — "(per 100g)" only makes sense in that mode, omitted in portion
     * mode where the typed numbers are already the dish's real total. */
    itemQuantitySectionLabel: string
    itemNutritionSectionLabel: (isPer100g: boolean) => string
    /** Per-dish free-text note (#344), distinct from the meal-group's own
     * `mealNoteLabel` above — shown in the redesigned Add Dish form's own
     * card, right below the reaction picker. */
    itemNoteLabel: string
    itemNotePlaceholder: string
    deleteItemLabel: string
    emotionLabel: (emotion: 'happy' | 'unhappy' | 'neutral') => string
    /** #459 — the "meal so far" footer's own "Was it tasty?" reaction
     * reuses the day-mood Emotion type/icons, but with Yes/So-so/No
     * wording rather than emotionLabel's Happy/Neutral/Sad framing (that
     * one's for the day's own mood, a different question). */
    mealReactionValueLabel: (emotion: 'happy' | 'unhappy' | 'neutral') => string
    mealEmotionLabel: (
      emotion: 'thumbsUp' | 'thumbsDown' | 'bellissimo',
    ) => string
    /** Heading above the per-dish reaction picker in MealItemEditorSheet
     * (#129) — mealEmotionLabel above is the per-value aria-label function
     * ("Thumbs up"), this is the static section heading ("Reaction"). */
    itemEmotionLabel: string
    dayMoodLabel: string
    /** #764 — why this meal happened; optional. */
    eatingReasonFieldLabel: string
    eatingReasonNoneOption: string
    eatingReasonLabel: (reason: string) => string
    proteinLabel: string
    fatLabel: string
    carbsLabel: string
    /** #583 — per-100g cue on Settings Dishes (and anywhere else that
     * mirrors kcal/100g), so Protein/Fat/Carbs match `addCaloriesLabel`'s
     * `/100g` clarity when that mode is selected. Portion mode keeps the
     * plain `proteinLabel`/`fatLabel`/`carbsLabel` above. */
    proteinPer100gLabel: string
    fatPer100gLabel: string
    carbsPer100gLabel: string
    /** Dietary fiber in grams (#341) — same optional shape as the three
     * macros above, entered on the Add Dish form only (see
     * MealItemEditorSheet.tsx's own scope note on why this doesn't ripple
     * into every macrosSummaryText call site). */
    fiberLabel: string
    /** #530 — electrolyte labels for meal entry / Settings chips. */
    sodiumLabel: string
    potassiumLabel: string
    magnesiumLabel: string
    /** Count of 100g portions (#93, reframed by #140) — e.g. "2" for 200g,
     * "1.5" for 150g, matching how nutrition labels are usually printed as
     * "per 100g" rather than typing the raw gram total. In per-100g mode
     * this multiplies the typed rates into the saved total; in "per
     * portion" mode it's inert, a memory aid only. */
    itemPortionsLabel: string
    /** #457 — the same field's own label while in "per portion" mode: an
     * optional weight in grams, recorded (not multiplied) so a per-100g
     * rate can still be back-calculated later (`ratesFromAbsolute`) even
     * for an item entered as a direct total. */
    itemWeightLabel: string
    gramsUnit: string
    /** #530 — milligrams for electrolyte fields/targets. */
    mgUnit: string
    macrosSummary: (protein: string, fat: string, carbs: string) => string
    macrosSummaryCompact: (
      protein: string,
      fat: string,
      carbs: string,
    ) => string
    /** #462 — Today's day-level БЖУ row and its "remaining" counterpart,
     * both of which need calories alongside the three macros unlike
     * macrosSummary above (used everywhere calories are already shown
     * separately). */
    macrosSummaryWithCalories: (
      kcal: string,
      protein: string,
      fat: string,
      carbs: string,
    ) => string
    /** #473 — the meal card's own totals line, which absorbed the calories
     * figure that used to sit in the header. The full-word form wrapped to
     * three lines in Russian ("Белки/Жиры/Углеводы"), so this line uses the
     * single-initial macro names macrosSummaryCompact already established
     * — also matching the dish rows directly underneath it. */
    macrosSummaryCompactWithCalories: (
      kcal: string,
      protein: string,
      fat: string,
      carbs: string,
    ) => string
    /** Label above the "remaining macros" row (#462) — same "Осталось ..."
     * wording family as the individual t.today.remaining*Label strings,
     * but one combined label for the whole row rather than per-macro. */
    remainingMacrosLabel: string
    /** Accordion trigger wrapping the two macros StatCards (#467), same
     * expand/collapse aria-label pair shape as t.today's own
     * expandStatsLabel/collapseStatsLabel. */
    expandMacrosLabel: string
    collapseMacrosLabel: string
    timeEatenLabel: string
    /** App-level clear button for the Time field (#117) — the native iOS
     * time picker's own Reset doesn't reliably clear the value back to
     * empty once tapped, so this sets state to '' directly instead. */
    clearTimeLabel: string
    /** #533 — clear the Add meal / FoodPicker search field when non-empty. */
    clearFoodSearchLabel: string
    /** #691 — empty-day trigger opening the "add a meal" flyout
     * (`AddMealDialog`); no «another» / «ещё» because nothing is logged yet. */
    addMealLabel: string
    /** #879 — Day meals empty (EmptyState), no illustration. */
    emptyMealsTitle: string
    emptyMealsDescription: string
    /** #454 — same trigger when the day already has ≥1 meal; superseded
     * #199/#201's collapse/expand accordion (and its now-removed sibling
     * `collapseAddMealLabel`). #691 keeps «another» / «ещё» only here. */
    expandAddMealLabel: string
    /** #791 — live elapsed time since last meal (IF timer). */
    sinceLastMealLabel: string
    sinceLastMealDuration: (hours: number, minutes: number, seconds: number) => string
    /** #792 — static gap on a meal card (hours + minutes, no seconds). */
    sinceLastMealOnCard: (hours: number, minutes: number) => string
    /** #1000 — name of the repeat icon and the confirm sheet. #190/#202
     * still copy yesterday's same-position foods after the user confirms,
     * with dishes unchecked first. #997: callers pass the positional meal
     * type when the name field is blank. A blank argument names the meal
     * without empty quotes. */
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
    /** #564 — accessible name for the tappable framing rectangle. */
    scanBarcodeTapToFocusLabel: string
    /** #723 — QR scan-from-photo fallback (shared food + day snippet). */
    scanQrFromPhotoLabel: string
    scanQrFromPhotoUnreadable: string
    /** #291 — manual entry, always available alongside the camera: useful
     * on its own, and a way to tell whether a report is a camera problem
     * or a lookup problem. */
    scanBarcodeManualLabel: string
    scanBarcodeManualPlaceholder: string
    scanBarcodeManualSubmitLabel: string
    noFoodFoundForBarcodeMessage: string
    /** #519 — quiet secondary line on Add/Edit food when a barcode is
     * attached (scan-sourced or already stored on the MealItem). Omitted
     * entirely when there is no barcode — do not show an empty state.
     * #520 — callers pass a display-grouped code via formatBarcodeDisplay
     * (e.g. `1 123456 654321`), not the raw stored digit string. */
    itemBarcodeLabel: (code: string) => string
    /** #644 — iOS Safari's native text selection on the barcode row shows
     * selection handles but they can't actually be dragged to select the
     * full number, so there was no working way to copy it. Dedicated copy
     * button instead, same clipboard + auto-clearing "Copied" shape
     * `RecipesSettingsScreen.tsx`'s `copyIngredientsLabel`/
     * `ingredientsCopiedLabel`/`ingredientsCopiedToastMessage` already
     * established (#611/#636). Copies the raw undelimited digit string
     * (what's actually stored/looked-up), not the display-grouped one. */
    copyBarcodeLabel: string
    barcodeCopiedLabel: string
    barcodeCopiedToastMessage: string
}
