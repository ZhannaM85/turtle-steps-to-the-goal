export interface SettingsDict {
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
    /** #402 — live-tracks the OS's own `prefers-color-scheme`, including
     * while the app stays open across an OS-level change; distinct from
     * `light`/`dark` below, which are an explicit, OS-independent pick. */
    systemColorScheme: string
    light: string
    dark: string
    mealItemsLabel: string
    mealItemsDescription: string
    mealItemsEmpty: string
    /** #570 — total personal foods in Settings → Dishes (and filtered subset). */
    mealItemsCount: (total: number) => string
    mealItemsFilteredCount: (shown: number, total: number) => string
    /** #684 — Settings → Dishes list sort control. */
    mealItemsSortLabel: string
    mealItemsSortTitleAsc: string
    mealItemsSortTitleDesc: string
    mealItemsSortAddedNewest: string
    mealItemsSortAddedOldest: string
    /** #541 — opt-in backfill from day meal history into the personal library. */
    mealLibraryBackfillDescription: string
    mealLibraryBackfillButton: string
    mealLibraryBackfillRemoveButton: (count: number) => string
    mealLibraryBackfillDoneMessage: (added: number) => string
    mealLibraryBackfillTruncatedMessage: (
      added: number,
      totalUniqueNamed: number,
    ) => string
    mealLibraryBackfillRemovedMessage: (removed: number) => string
    mealLibraryBackfillErrorMessage: string
    /** #542 — after editing a library food, offer to rewrite matching past lines. */
    mealLibraryPropagateConfirmPrompt: (
      count: number,
      name: string,
    ) => string
    mealLibraryPropagateConfirmYes: string
    mealLibraryPropagateConfirmNo: string
    mealLibraryPropagateDoneMessage: (updated: number) => string
    mealLibraryPropagateErrorMessage: string
    /** Filter-as-you-type above the list + "no matches" text (#179) — same
     * pattern as dailyEntry.foodSearchLabel/foodSearchPlaceholder for the
     * curated food list, mirrored here for the personal meal dictionary. */
    mealItemSearchLabel: string
    /** #789 — name or barcode. */
    mealItemSearchPlaceholder: string
    /** #790 — in-field X when the search query is not empty. */
    mealItemSearchClearLabel: string
    noMealItemResultsText: string
    mealItemNameLabel: string
    /** #779 — field on an existing saved food so a barcode can be typed
     * later; stored as `MealItem.barcode` for `lookupBarcode`. */
    mealItemBarcodeLabel: string
    /** #784 — unique `&barcode` index; shown when save would steal another
     * food's code instead of silently dropping the typed value. */
    mealItemBarcodeTakenMessage: (name: string) => string
    /** #785 — take the unique code off the named food and put it on this
     * one; then a link to jump to that leftover row. */
    mealItemBarcodeMoveHereButton: string
    mealItemBarcodeMovedMessage: (name: string) => string
    mealItemBarcodeOpenOtherLabel: (name: string) => string
    deleteMealItemLabel: (name: string) => string
    /** #787 — confirm before removing a library food. Past day meals keep
     * the name; this is not a history wipe. */
    mealItemDeleteConfirmTitle: (name: string) => string
    mealItemDeleteConfirmDescription: string
    mealItemDeleteConfirmCloseLabel: string
    editMealItemLabel: (name: string) => string
    saveMealItemLabel: (name: string) => string
    /** #661 — share a personal library food via OS share sheet / QR. */
    shareMealItemLabel: (name: string) => string
    shareFoodDialogTitle: string
    shareFoodDialogDescription: (name: string) => string
    shareFoodCloseLabel: string
    shareFoodQrAlt: (name: string) => string
    shareFoodQrHint: string
    shareFoodNativeShareButton: string
    shareFoodCopyLinkButton: string
    shareFoodLinkCopiedLabel: string
    shareFoodShareTitle: (name: string) => string
    shareFoodShareText: (name: string) => string
    shareFoodShareFailedMessage: string
    /** #982 — one QR / link for every named dish in the open meal. */
    shareFoodsDialogTitle: string
    shareFoodsDialogDescription: (count: number) => string
    shareFoodsQrAlt: (count: number) => string
    shareFoodsShareTitle: (count: number) => string
    shareFoodsShareText: (names: string) => string
    importSharedFoodsDialogTitle: string
    importSharedFoodsDialogDescription: string
    importSharedFoodsAddButton: string
    importSharedFoodsAlreadyHaveLabel: string
    importSharedFoodButton: string
    importSharedFoodEntryTitle: string
    importSharedFoodEntryDescription: string
    importSharedFoodScanQrButton: string
    importSharedFoodScanQrTitle: string
    importSharedFoodScanQrInstructions: string
    importSharedFoodPasteLabel: string
    importSharedFoodPastePlaceholder: string
    importSharedFoodPasteSubmitButton: string
    importSharedFoodPasteInvalidMessage: string
    importSharedFoodIsDaySnippet: string
    importSharedFoodDialogTitle: string
    importSharedFoodDialogDescription: string
    importSharedFoodBrandLabel: string
    importSharedFoodBrandHint: string
    importSharedFoodBarcodeLabel: string
    importSharedFoodGramsLabel: string
    importSharedFoodMatchMessage: (name: string) => string
    importSharedFoodAddButton: string
    importSharedFoodUpdateButton: string
    importSharedFoodSkipButton: string
    importSharedFoodCancelButton: string
    /** #603 — named serving descriptors for a personal meal item, same
     * "1 slice"/"1 cup" convenience #254 gave curated foods. Commits
     * immediately on add/remove (own `setServings` store call), same
     * "doesn't wait for the nutrition Save button" shape favoriting
     * already has in this row. */
    mealItemServingsLabel: string
    mealItemServingNameLabel: string
    mealItemServingNamePlaceholder: string
    mealItemServingGramsLabel: string
    addMealItemServingButton: string
    removeMealItemServingLabel: (name: string) => string
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
    /** #811 — rename a saved meal-name preset in Settings. */
    editPresetLabel: (name: string) => string
    savePresetLabel: (name: string) => string
    releaseNotesLabel: string
    showReleaseNotes: string
    hideReleaseNotes: string
    cycleTrackingLabel: string
    digestionTrackingLabel: string
    /** #607 — same opt-in shape as digestionTrackingLabel above. */
    alcoholTrackingLabel: string
    waterTrackingLabel: string
    /** #626 — opt-in toggle for `PlannedMealsSection.tsx` (#614), same
     * "What to track" card as the other opt-in sections above. */
    plannedMealsTrackingLabel: string
    /** #764 — opt-in "Why am I eating?" on Add meal. */
    eatingReasonTrackingLabel: string
    /** #765 — extra reason labels shown in the Add-meal dropdown. */
    customEatingReasonsLabel: string
    customEatingReasonsDescription: string
    customEatingReasonsPlaceholder: string
    customEatingReasonsEmpty: string
    deleteCustomEatingReasonLabel: (name: string) => string
    /** #767 — rename a custom reason already on the list. */
    editCustomEatingReasonLabel: (name: string) => string
    /** #768 — check icon while that rename field is open. */
    saveCustomEatingReasonLabel: (name: string) => string
    /** #692 — opt-in for Day's "Copy yesterday's meals" control (default off). */
    copyYesterdayMealsTrackingLabel: string
    /** #836 — Day meal-card vs-yesterday kcal arrows (default on, same
     * family as entry comparisons #664). */
    mealKcalVsYesterdayTrackingLabel: string
    /** #237: unified "what to track" section — folds cycle/digestion
     * tracking's own opt-in toggles in with the 5 fields below, which
     * didn't have an opt-out at all before this. */
    /** #604 — one-tap Simple/Full layout presets, right above "What to
     * track": Simple turns off the advanced optional fields + their Today
     * stat cards (weight, meals/calories, and the weekly target stay);
     * Full restores this app's own shipped defaults. Neither touches
     * cycle/digestion tracking (a personal-data opt-in, not a density
     * preference) — see `stores/trackingPreset.ts`. Purely a starting
     * point; every field stays individually editable in the card below
     * afterward. */
    trackingPresetLabel: string
    trackingPresetDescription: string
    trackingPresetSimpleButton: string
    trackingPresetFullButton: string
    trackingPresetAppliedLabel: string
    trackedFieldsLabel: string
    trackedFieldsDescription: string
    /** #528 — subgroup headings inside What to track (Morning / Evening / Other). */
    trackedFieldsMorningGroupLabel: string
    trackedFieldsEveningGroupLabel: string
    trackedFieldsOtherGroupLabel: string
    /** #530 — electrolytes subgroup inside What to track. */
    trackedFieldsElectrolytesGroupLabel: string
    /** #749 — screenshot-fill toggles, listed only when the parent field
     * (sleep / body composition) is tracked. */
    trackedFieldsScreenshotsGroupLabel: string
    zeppScreenshotTrackingLabel: string
    autoSleepScreenshotTrackingLabel: string
    /** #837 — one-line definition under each What-to-track row. */
    trackedFieldHintSleep: string
    trackedFieldHintBodyMeasurements: string
    trackedFieldHintBodyComposition: string
    trackedFieldHintMorningNote: string
    trackedFieldHintSteps: string
    trackedFieldHintNote: string
    trackedFieldHintMood: string
    trackedFieldHintDigestion: string
    trackedFieldHintAlcohol: string
    trackedFieldHintNightEating: string
    trackedFieldHintCycle: string
    trackedFieldHintWater: string
    trackedFieldHintDayTotals: string
    trackedFieldHintFiber: string
    trackedFieldHintPlannedMeals: string
    trackedFieldHintCopyYesterdayMeals: string
    trackedFieldHintMealKcalVsYesterday: string
    trackedFieldHintEatingReason: string
    trackedFieldHintSodium: string
    trackedFieldHintPotassium: string
    trackedFieldHintMagnesium: string
    trackedFieldHintAutoSleepScreenshot: string
    trackedFieldHintZeppScreenshot: string
    /** #233 — height/age/sex, entered once (rarely changed) purely to
     * compute BMI/BMR on Today; included in the JSON backup settings blob
     * (#594), same category as unit/theme/week-start. */
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
     * shape as cycle/digestion tracking. Originally just an in-app banner
     * on Today; #605 adds a real OS notification at `dailyReminderTime`
     * on native platforms only (web/PWA keeps the banner only). */
    dailyReminderLabel: string
    dailyReminderDescription: string
    dailyReminderOn: string
    dailyReminderOff: string
    /** #663 — nutrition-facts encouragement (on by default), same on/off
     * shape as dailyReminder above. Gates both the Day screen's card and
     * the meal-composition screen's inline praise. */
    nutritionFactsLabel: string
    nutritionFactsDescription: string
    nutritionFactsOn: string
    nutritionFactsOff: string
    /** #791 — Day-screen elapsed time since last meal (IF). Off by default. */
    sinceLastMealTimerLabel: string
    sinceLastMealTimerDescription: string
    sinceLastMealTimerOn: string
    sinceLastMealTimerOff: string
    /** #664 — live up/down arrows + post-save ⓘ on daily input fields. */
    entryComparisonLabel: string
    entryComparisonDescription: string
    entryComparisonOn: string
    entryComparisonOff: string
    /** #738 — send this day’s log to another app copy; off by default. */
    localTransferLabel: string
    localTransferDescription: string
    localTransferOn: string
    localTransferOff: string
    /** #605 — only rendered on native (`Capacitor.isNativePlatform()`),
     * since the time has no effect on web/PWA's in-app-only banner. */
    dailyReminderTimeLabel: string
    /** #656 — Android-only (`Capacitor.getPlatform() === 'android'`);
     * Health Connect is an Android platform API, not available on iOS/web.
     * One-time "sync now" action, not a background/ongoing toggle — see
     * HealthConnectSyncSection.tsx's own doc comment for why. */
    healthConnectSyncLabel: string
    healthConnectSyncDescription: string
    healthConnectSyncButton: string
    healthConnectSyncingButton: string
    healthConnectUnavailableMessage: string
    healthConnectInstallButton: string
    healthConnectPermissionDeniedMessage: string
    healthConnectSyncSuccessMessage: (dayCount: number, todayWeight?: string) => string
    healthConnectSyncNoDataMessage: string
    healthConnectSyncErrorMessage: string
    /** #709 — catalog of every built-in Dashboard section (show/hide). */
    dashboardChartsLabel: string
    dashboardChartsDescription: string
    dashboardChartsOn: string
    dashboardChartsOff: string
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
    /** #588 — remembered Breakfast/Lunch/Snack/Dinner clocks for imports. */
    mealSlotDefaultTimesLabel: string
    mealSlotDefaultTimesDescription: string
    /** #595 — confirm applying edited defaults to existing untimed meals. */
    mealSlotApplyConfirmLabel: (count: number) => string
    mealSlotApplyConfirmYes: string
    mealSlotApplyConfirmNo: string
    mealSlotApplyDoneLabel: (count: number) => string
    foodListLabel: string
    foodListDescription: string
    manageFoodListButton: string
    aboutLabel: string
    aboutDescription: string
    viewAboutButton: string
    pinCardLabel: string
    unpinCardLabel: string
    collapseCardLabel: string
    expandCardLabel: string
    /** #498 — Features/Capabilities entry at the top of Settings (same
     * card shape as About), linking to `/features`. Distinct from
     * about.viewFeaturesLabel's longer About-page CTA. */
    featuresLabel: string
    featuresDescription: string
    viewFeaturesButton: string
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
    /** #377 — deletes DailyEntry/CustomMetricEntry rows within a chosen
     * date range, resolved via AskUserQuestion to also cover everything
     * else date-scoped tied to those dates (not just DailyEntry itself).
     * Distinct from clearAllData* above, which has no range concept —
     * same two-step confirm shape, plus an exact row count in the prompt
     * since a range delete's blast radius isn't obvious up front the way
     * "delete literally everything" is. */
    deleteRangeLabel: string
    deleteRangeDescription: string
    deleteRangeButton: string
    deletingRangeButton: string
    deleteRangeNothingToDelete: string
    deleteRangeConfirmPrompt: (
      dailyEntryCount: number,
      customMetricEntryCount: number,
    ) => string
    deleteRangeConfirmYes: string
    deleteRangeConfirmNo: string
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
    /** #612 — short "Using two devices" help card, directly above Export:
     * with no live sync (by design, local-first), phone/laptop users need
     * the manual export/import mental model spelled out rather than
     * guessing at it or risking a duplicate/partial restore. */
    twoDevicesHelpLabel: string
    twoDevicesHelpIntro: string
    twoDevicesHelpSteps: string[]
    /** #877 — Settings page group headings. */
    settingsGroupLogging: string
    settingsGroupAppearance: string
    settingsGroupLibrary: string
    settingsGroupBackup: string
    settingsGroupDanger: string
    collapseSettingsGroupLabel: (section: string) => string
    expandSettingsGroupLabel: (section: string) => string
  }
