import type { SettingsDict } from '../types/settings'

export const settings: SettingsDict = {
    title: 'Settings',
    description: 'Units (kg/lb), language, and other preferences',
    unitsLabel: 'Units',
    languageLabel: 'Language',
    english: 'English',
    russian: 'Russian',
    appearanceLabel: 'Appearance',
    moodLabel: 'Theme',
    moodPond: 'Pond',
    moodDusk: 'Dusk',
    moodSage: 'Sage',
    moodTortoise: 'Tortoise',
    moodLagoon: 'Lagoon',
    colorSchemeLabel: 'Light / dark / system',
    systemColorScheme: 'System',
    light: 'Light',
    dark: 'Dark',
    mealItemsLabel: 'Meal items',
    mealItemsDescription:
      "Meals you've logged before, suggested while you type. Rename or remove them here, or add one directly.",
    mealItemsEmpty:
      "Nothing yet — items appear here once you've logged a meal.",
    mealItemsCount: (total) =>
      `${total} ${total === 1 ? 'food' : 'foods'}`,
    mealItemsFilteredCount: (shown, total) =>
      `${shown} of ${total} matching`,
    mealItemsSortLabel: 'Sort by',
    mealItemsSortTitleAsc: 'Title A→Z',
    mealItemsSortTitleDesc: 'Title Z→A',
    mealItemsSortAddedNewest: 'Date added (newest first)',
    mealItemsSortAddedOldest: 'Date added (oldest first)',
    mealLibraryBackfillDescription:
      'If you imported meals (or have years of history), you can copy unique dish names into this library so Find food can reuse them. You can remove only those copied items later — day history stays intact.',
    mealLibraryBackfillButton: 'Add foods from meal history',
    mealLibraryBackfillRemoveButton: (count) =>
      `Remove backfilled foods (${count})`,
    mealLibraryBackfillDoneMessage: (added) =>
      added === 0
        ? 'No new foods to add — everything named in your history is already in the library.'
        : `Added ${added} ${added === 1 ? 'food' : 'foods'} from meal history.`,
    mealLibraryBackfillTruncatedMessage: (added, totalUniqueNamed) =>
      `Added ${added} of ${totalUniqueNamed} unique foods (capped for performance). Remove backfilled foods and try again later if you need the rest.`,
    mealLibraryBackfillRemovedMessage: (removed) =>
      `Removed ${removed} backfilled ${removed === 1 ? 'food' : 'foods'} from the library. Your day meals were not changed.`,
    mealLibraryBackfillErrorMessage:
      'Could not update the food library. Try again.',
    mealLibraryPropagateConfirmPrompt: (count, name) =>
      `Update ${count} past ${count === 1 ? 'use' : 'uses'} of “${name}” in your meal history with this library change? Day notes and other foods stay as they are.`,
    mealLibraryPropagateConfirmYes: 'Update past uses',
    mealLibraryPropagateConfirmNo: 'Library only',
    mealLibraryPropagateDoneMessage: (updated) =>
      `Updated ${updated} past ${updated === 1 ? 'use' : 'uses'} in meal history.`,
    mealLibraryPropagateErrorMessage:
      'Could not update past meals. Try again.',
    mealItemSearchLabel: 'Search meal items',
    mealItemSearchPlaceholder: 'Name or barcode...',
    mealItemSearchClearLabel: 'Clear search',
    noMealItemResultsText: 'No meal items match your search.',
    mealItemNameLabel: 'Meal item name',
    mealItemBarcodeLabel: 'Barcode',
    mealItemBarcodeTakenMessage: (name) =>
      `This barcode is already on “${name}”.`,
    mealItemBarcodeMoveHereButton: 'Move barcode here',
    mealItemBarcodeMovedMessage: (name) =>
      `Barcode moved off “${name}”. You can delete that food if you no longer need it.`,
    mealItemBarcodeOpenOtherLabel: (name) => `Open “${name}”`,
    deleteMealItemLabel: (name) => `Delete "${name}"`,
    mealItemDeleteConfirmTitle: (name) =>
      `Delete “${name}” from the food list?`,
    mealItemDeleteConfirmDescription:
      'Past meals that used this name stay in your history.',
    mealItemDeleteConfirmCloseLabel: 'Close delete confirmation',
    editMealItemLabel: (name) => `Edit ${name}`,
    saveMealItemLabel: (name) => `Save ${name}`,
    shareMealItemLabel: (name) => `Share ${name}`,
    shareFoodDialogTitle: 'Share food',
    shareFoodDialogDescription: (name) =>
      `Send “${name}” to someone else via the share sheet or a QR code. They can review it before adding it to their food list.`,
    shareFoodCloseLabel: 'Close',
    shareFoodQrAlt: (name) => `QR code for ${name}`,
    shareFoodQrHint:
      'The other person can scan this QR code in Settings → Import shared food.',
    shareFoodNativeShareButton: 'Share…',
    shareFoodCopyLinkButton: 'Copy link',
    shareFoodLinkCopiedLabel: 'Copied',
    shareFoodShareTitle: (name) => `Food: ${name}`,
    shareFoodShareText: (name) =>
      `Here’s “${name}” from Turtle Steps — open the link to review and add it to your food list.`,
    shareFoodShareFailedMessage: 'Could not open the share sheet. Try copying the link instead.',
    importSharedFoodButton: 'Import shared food',
    importSharedFoodEntryTitle: 'Import shared food',
    importSharedFoodEntryDescription:
      'Scan a QR code from another person’s share screen, or paste the share link.',
    importSharedFoodScanQrButton: 'Scan QR code',
    importSharedFoodScanQrTitle: 'Scan shared food QR',
    importSharedFoodScanQrInstructions:
      'Point the camera at the QR code on the other person’s screen.',
    importSharedFoodPasteLabel: 'Or paste a share link',
    importSharedFoodPastePlaceholder: 'Paste link here',
    importSharedFoodPasteSubmitButton: 'Continue',
    importSharedFoodPasteInvalidMessage:
      'That doesn’t look like a shared food link. Check the link or QR and try again.',
    importSharedFoodIsDaySnippet:
      'That QR is a day’s log, not a shared food. Open it from Day → send/receive.',
    importSharedFoodDialogTitle: 'Review shared food',
    importSharedFoodDialogDescription:
      'Check the details, then add this food to your list — or update a matching one you already have.',
    importSharedFoodBrandLabel: 'Brand (optional)',
    importSharedFoodBrandHint:
      'For your reference — the food list stores the name only. Put the brand in the name if you want to keep it.',
    importSharedFoodBarcodeLabel: 'Barcode (optional)',
    importSharedFoodGramsLabel: 'Grams',
    importSharedFoodMatchMessage: (name) =>
      `You already have “${name}”. You can update it with these details, or skip.`,
    importSharedFoodAddButton: 'Add to my foods',
    importSharedFoodUpdateButton: 'Update existing',
    importSharedFoodSkipButton: 'Skip',
    importSharedFoodCancelButton: 'Cancel',
    mealItemServingsLabel: 'Named servings',
    mealItemServingNameLabel: 'Serving name',
    mealItemServingNamePlaceholder: 'e.g. 1 slice',
    mealItemServingGramsLabel: 'Grams',
    addMealItemServingButton: 'Add serving',
    removeMealItemServingLabel: (name) => `Remove serving ${name}`,
    addMealItemButton: 'Add custom food',
    addMealItemDialogTitle: 'Add custom food',
    closeAddMealItemDialogLabel: 'Close add food dialog',
    cancelAddMealItemLabel: 'Cancel',
    mealNamePresetsLabel: 'Meal name presets',
    mealNamePresetsDescription:
      'Quick-pick names offered when naming a meal, e.g. "Breakfast" or "Lunch".',
    mealNamePresetsEmpty: 'No presets yet — add one below.',
    addPresetPlaceholder: 'Add a preset',
    addDefaultPresetLabel: (name) => `Add "${name}"`,
    deletePresetLabel: (name) => `Delete "${name}"`,
    editPresetLabel: (name) => `Edit "${name}"`,
    savePresetLabel: (name) => `Save "${name}"`,
    releaseNotesLabel: 'Release notes',
    showReleaseNotes: 'Show release notes',
    hideReleaseNotes: 'Hide release notes',
    cycleTrackingLabel: 'Cycle tracking',
    digestionTrackingLabel: 'Digestion tracking',
    alcoholTrackingLabel: 'Alcohol tracking',
    waterTrackingLabel: 'Water tracking',
    plannedMealsTrackingLabel: 'Planned meals',
    eatingReasonTrackingLabel: 'Why am I eating?',
    customEatingReasonsLabel: 'Your reasons',
    customEatingReasonsDescription:
      'Built-in reasons plus any you add. They all show up in the meal dropdown.',
    customEatingReasonsPlaceholder: 'Add a reason',
    customEatingReasonsEmpty: 'No extra reasons yet — add one below.',
    deleteCustomEatingReasonLabel: (name) => `Delete "${name}"`,
    editCustomEatingReasonLabel: (name) => `Edit "${name}"`,
    saveCustomEatingReasonLabel: (name) => `Save "${name}"`,
    copyYesterdayMealsTrackingLabel: "Copy yesterday's meals",
    mealKcalVsYesterdayTrackingLabel: 'Meal kcal vs yesterday',
    trackingPresetLabel: 'Layout preset',
    trackingPresetDescription:
      "Quick starting point for Day: Simple keeps weight, meals/calories, and your weekly target; Full turns everything on. You can still adjust anything below afterward.",
    trackingPresetSimpleButton: 'Simple',
    trackingPresetFullButton: 'Full',
    trackingPresetAppliedLabel: 'Applied',
    trackedFieldsLabel: 'What to track',
    trackedFieldsDescription:
      'Choose which optional fields appear on the Day screen. Turning one off just hides it going forward — anything already logged stays visible in History, Export, and the Dashboard.',
    trackedFieldsMorningGroupLabel: 'Morning',
    trackedFieldsEveningGroupLabel: 'Evening',
    trackedFieldsOtherGroupLabel: 'Other',
    trackedFieldsElectrolytesGroupLabel: 'Electrolytes',
    trackedFieldsScreenshotsGroupLabel: 'From screenshots',
    zeppScreenshotTrackingLabel: 'Zepp body composition screenshot',
    autoSleepScreenshotTrackingLabel: 'AutoSleep screenshot',
    trackedFieldHintSleep:
      'Hours slept and deep sleep on Day. Type them in, fill from an AutoSleep screenshot, or sync with Health Connect.',
    trackedFieldHintBodyMeasurements:
      'Waist, hip, and body fat on Day. Entered by hand.',
    trackedFieldHintBodyComposition:
      'Muscle, visceral fat, body water, and bone mass on Day. Type them in, fill from a Zepp screenshot, or import a Zepp Life file.',
    trackedFieldHintMorningNote: 'A short morning text field on Day.',
    trackedFieldHintSteps:
      'Step count on Day. Type it in or sync with Health Connect.',
    trackedFieldHintNote: 'Evening free-text note on Day.',
    trackedFieldHintMood: 'Overall mood picker on Day.',
    trackedFieldHintDigestion: 'Constipation yes/no on Day evening.',
    trackedFieldHintAlcohol: 'Alcohol yes/no on Day evening.',
    trackedFieldHintNightEating:
      'Night food card on Day — yes/no and a few follow-up questions.',
    trackedFieldHintCycle:
      'Marks period days in History and on the weight chart. Not a Day card field.',
    trackedFieldHintWater:
      'Water log on Day, with glass and bottle quick-add.',
    trackedFieldHintDayTotals:
      'Day totals block for calories and macros, including amounts not logged as meals.',
    trackedFieldHintFiber:
      'Fiber on meals, Day totals, Goal, and Remaining.',
    trackedFieldHintPlannedMeals:
      'Stage meals for another day. Drafts are not added to today’s totals.',
    trackedFieldHintCopyYesterdayMeals:
      'A Day button that copies yesterday’s meals into today.',
    trackedFieldHintMealKcalVsYesterday:
      'On each meal card, an up/down arrow for calories vs yesterday’s meal with the same name (green if less, red if more).',
    trackedFieldHintEatingReason:
      'Reason chips when adding or editing a meal.',
    trackedFieldHintSodium:
      'Sodium on Day meals and totals, plus Remaining when a Goal target is set.',
    trackedFieldHintPotassium:
      'Potassium on Day meals and totals, plus Remaining when a Goal target is set.',
    trackedFieldHintMagnesium:
      'Magnesium on Day meals and totals, plus Remaining when a Goal target is set.',
    trackedFieldHintAutoSleepScreenshot:
      'On Day Sleep, a button to read hours from an AutoSleep screenshot. Nothing is saved until you confirm.',
    trackedFieldHintZeppScreenshot:
      'On Day Body composition, a button to read numbers from a Zepp screenshot. Nothing is saved until you confirm.',
    profileLabel: 'Profile',
    profileDescription:
      'Optional — used only to compute BMI and estimated daily calorie needs (BMR) on the Day screen. Included in JSON backups with your other Settings preferences.',
    heightLabel: 'Height (cm)',
    ageLabel: 'Age',
    sexLabel: 'Sex',
    sexFemaleOption: 'Female',
    sexMaleOption: 'Male',
    activityLevelLabel: 'Activity level',
    activityLevelSedentary: 'Sedentary',
    activityLevelLight: 'Lightly active',
    activityLevelModerate: 'Moderately active',
    activityLevelActive: 'Active',
    activityLevelVeryActive: 'Very active',
    saveProfileLabel: 'Save profile',
    editProfileLabel: 'Edit profile',
    profileSummary: (height, age, sex, activityLevel) =>
      `Height ${height} · Age ${age} · ${sex} · ${activityLevel}`,
    dailyReminderLabel: 'Daily reminder',
    dailyReminderDescription:
      'Optional — shows a quiet note on the Day screen if you haven’t logged anything yet, plus a daily notification in the native app. Off by default.',
    dailyReminderOn: 'On',
    dailyReminderOff: 'Off',
    nutritionFactsLabel: 'Nutrition highlights',
    nutritionFactsDescription:
      'Small encouraging notes on the Day screen and when saving a meal, when what you logged matches a common nutrition guideline (e.g. a protein-rich meal, a balanced plate). On by default — turn off anytime.',
    nutritionFactsOn: 'On',
    nutritionFactsOff: 'Off',
    sinceLastMealTimerLabel: 'Time since last meal',
    sinceLastMealTimerDescription:
      'On the Day screen, show how long it has been since your last meal, and how long had passed before each meal — useful for intermittent fasting. Off by default.',
    sinceLastMealTimerOn: 'On',
    sinceLastMealTimerOff: 'Off',
    entryComparisonLabel: 'Entry comparisons',
    entryComparisonDescription:
      'While typing a daily value, show an up/down arrow versus the previous logged day (colored by whether that change is good for that metric). After save, an info icon shows the same comparison plus versus exactly 30 days ago. On by default — turn off anytime.',
    entryComparisonOn: 'On',
    entryComparisonOff: 'Off',
    localTransferLabel: 'Another copy',
    localTransferDescription:
      'Send this day’s log (sleep, weight, meals, and the rest) to another Turtle Steps on this phone or another device. Leave off if you only use one copy. Turn it on in each copy that should send or receive.',
    localTransferOn: 'On',
    localTransferOff: 'Off',
    dailyReminderTimeLabel: 'Remind me at',
    healthConnectSyncLabel: 'Health Connect',
    healthConnectSyncDescription:
      'Sync weight, steps, and sleep from Health Connect for today and the last several days — including data other apps have written there. Each Sync pulls the latest values per day and updates this app (safe to tap again after you change the source).',
    healthConnectSyncButton: 'Sync from Health Connect',
    healthConnectSyncingButton: 'Syncing…',
    healthConnectUnavailableMessage:
      'Health Connect isn’t installed on this device.',
    healthConnectInstallButton: 'Install Health Connect',
    healthConnectPermissionDeniedMessage:
      'Permission to read Health Connect data was denied.',
    healthConnectSyncSuccessMessage: (dayCount, todayWeight) =>
      todayWeight === undefined
        ? `Synced ${dayCount} day${dayCount === 1 ? '' : 's'}.`
        : `Synced ${dayCount} day${dayCount === 1 ? '' : 's'}; today ${todayWeight}.`,
    healthConnectSyncNoDataMessage:
      'No weight, steps, or sleep in Health Connect for the last 7 days.',
    healthConnectSyncErrorMessage: 'Couldn’t sync from Health Connect. Try again.',
    dashboardChartsLabel: 'Dashboard graphs',
    dashboardChartsDescription:
      'Every built-in Dashboard section. Turn one off to hide it on the Dashboard; turn it back on here or with the eye icon on the card. Custom correlations are managed under Custom metrics.',
    dashboardChartsOn: 'On',
    dashboardChartsOff: 'Off',
    trendChartsLabel: 'Dashboard trend charts',
    trendChartsDescription:
      'Which series show on the Weight and Calorie trend charts — a safe place to bring one back if it was turned off on the Dashboard itself.',
    weightTrendLabel: 'Weight trend',
    calorieTrendLabel: 'Calorie trend',
    weekStartLabel: 'Week start',
    weekStartDescription:
      'Which day each week begins on, used for "This week" and weekly summaries.',
    weekStartMonday: 'Monday',
    weekStartFirstEntry: 'Day of my first entry',
    dayStartLabel: 'Day start time',
    dayStartDescription:
      "When your day begins — anything logged before this time counts toward the previous day, and this week's progress, the fasting-window and late-meal charts, and other places that depend on \"today\" follow the same day-start too. Only affects new entries and analytics going forward; already-logged history is never re-bucketed. Default midnight matches today's date exactly.",
    mealSlotDefaultTimesLabel: 'Default meal times',
    mealSlotDefaultTimesDescription:
      'Used when importing meals that have a Breakfast/Lunch/Snack/Dinner label but no clock time (e.g. MyFitnessPal). You can also set these during import.',
    mealSlotApplyConfirmLabel: (count) =>
      count === 1
        ? 'Apply these times to 1 existing meal that has no clock time?'
        : `Apply these times to ${count} existing meals that have no clock time?`,
    mealSlotApplyConfirmYes: 'Yes, apply',
    mealSlotApplyConfirmNo: 'No, prefs only',
    mealSlotApplyDoneLabel: (count) =>
      count === 1
        ? 'Updated 1 meal with a default time.'
        : `Updated ${count} meals with default times.`,
    foodListLabel: 'Food list',
    foodListDescription:
      'Hide items you don’t want to see, or correct their calories/macros.',
    manageFoodListButton: 'Manage food list',
    aboutLabel: 'About',
    aboutDescription: 'What this app is, who made it, and release notes.',
    viewAboutButton: 'View About',
    pinCardLabel: 'Pin to top',
    unpinCardLabel: 'Unpin',
    collapseCardLabel: 'Collapse',
    expandCardLabel: 'Expand',
    featuresLabel: 'Features',
    featuresDescription: 'Everything the app can do, with screenshots.',
    viewFeaturesButton: 'View Features',
    versionBadgeLabel: (version) => `v${version}`,
    clearAllDataLabel: 'Clear all data',
    clearAllDataDescription:
      'Permanently delete everything stored on this device — weight, meals, goals, and custom dishes. This is different from just uninstalling the app or clearing site data, which you might not know how to do.',
    clearAllDataButton: 'Clear all data',
    clearAllDataConfirmPrompt:
      "This can't be undone. Consider exporting a backup first if you might want this data later.",
    clearAllDataConfirmYes: 'Yes, delete everything',
    clearAllDataConfirmNo: 'Cancel',
    clearingAllDataButton: 'Deleting…',
    deleteRangeLabel: 'Delete a date range',
    deleteRangeDescription:
      'Permanently delete logged data (weight, meals, custom metric logs, etc.) between two dates, without touching anything outside that range or definitions like recipes/custom metrics themselves.',
    deleteRangeButton: 'Delete',
    deletingRangeButton: 'Deleting…',
    deleteRangeNothingToDelete: "There's no logged data in that range.",
    deleteRangeConfirmPrompt: (dailyEntryCount, customMetricEntryCount) =>
      `This will permanently delete ${dailyEntryCount} ${dailyEntryCount === 1 ? 'daily entry' : 'daily entries'}${customMetricEntryCount > 0 ? ` and ${customMetricEntryCount} custom metric ${customMetricEntryCount === 1 ? 'log' : 'logs'}` : ''} in this range. This can't be undone.`,
    deleteRangeConfirmYes: 'Yes, delete this range',
    deleteRangeConfirmNo: 'Cancel',
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
    twoDevicesHelpLabel: 'Using two devices',
    twoDevicesHelpIntro:
      'There is no automatic sync between devices. If you use this app on more than one, keep this in mind:',
    twoDevicesHelpSteps: [
      'This device holds the live, up-to-date data — nothing leaves it on its own.',
      'Export (below) creates a portable backup file you can carry to another device.',
      'Import merges that backup into whatever is already on the other device — read its result message before relying on it, especially before a fresh install.',
    ],
  }
