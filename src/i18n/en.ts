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
    weekRangeLabel: (start, end) => `${start} – ${end}`,
    hideSectionLabel: (title) => `Hide ${title}`,
    showSectionLabel: (title) => `Show ${title}`,
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
    reloadingText: 'Reloading…',
  },
  offline: {
    offlineText: "You're offline — your data is still saved on this device.",
  },
  nav: {
    appName: 'Turtle Steps to the Goal',
    today: 'Day',
    dashboard: 'Dashboard',
    history: 'History',
    goal: 'Goal',
    settings: 'Settings',
    about: 'About',
  },
  today: {
    title: 'Day',
    description: "Entry for the day's data, this week's target reminder",
    thisWeeksTarget: "This week's target",
    // #527 — positive magnitude + "to lose" (signed −X from #56 read as a
    // gain, especially in RU with "похудения"). GoalForm targetLabel matches.
    toLose: (unit) => `${unit} to lose`,
    weeklyTargetFromWeight: (weight) => `from ${weight}`,
    emptyGoalTitle: 'No goal set yet',
    emptyGoalDescription: 'Set a weekly target to see it here.',
    setGoalButton: 'Set a goal',
    dateLabel: 'Date',
    previousDayLabel: 'Previous day',
    nextDayLabel: 'Next day',
    jumpToTodayButton: 'Today',
    dayHasEntriesLabel: 'This day has logged entries',
    startTodayEarlyBanner: "It's already a new day.",
    startTodayEarlyButton: "Start today's log now",
    goalRenewalReminder:
      "This week's target is ready to renew — worth checking in on it.",
    reviewGoalLink: 'Review goal',
    targetMetBanner: (weekEndDate) =>
      `You reached this week's target — keep it up through ${weekEndDate} to earn your badge!`,
    dailyReminderText: 'No entry yet today — whenever you’re ready.',
    dailyReminderNotificationTitle: 'Turtle Steps',
    dailyReminderNotificationBody:
      'A quiet reminder to log today, whenever you’re ready.',
    targetMetSectionTitle: 'Target met',
    goalRenewalReminderSectionTitle: 'Goal renewal reminder',
    dailyReminderSectionTitle: 'Daily reminder',
    importDayTitle: 'Add this day’s log?',
    importDayDescription: (date) =>
      `This will fill empty fields on ${date}. Existing values stay unless you choose to replace them.`,
    importDayDisabled:
      'Turn on “Another copy” in Settings before receiving a day’s log.',
    importDayFillCount: (n) =>
      n === 1 ? '1 empty field will be filled.' : `${n} empty fields will be filled.`,
    importDayConflictCount: (n) =>
      n === 1
        ? '1 field already has a different value:'
        : `${n} fields already have a different value:`,
    importDayMealCount: (add, skip) =>
      `${add} meal${add === 1 ? '' : 's'} to add${skip ? `, ${skip} already here skipped` : ''}.`,
    importDayWaterCount: (add, skip) =>
      `${add} water log${add === 1 ? '' : 's'} to add${skip ? `, ${skip} already here skipped` : ''}.`,
    importDayNothingToApply: 'This copy already has everything from that snippet.',
    importDayAddMissing: 'Add missing',
    importDayAddAndReplace: 'Add missing and replace listed',
    importDayCancel: 'Cancel',
    sendDayLogLabel: 'Send or receive this day’s log',
    sendDayDialogTitle: 'This day’s log',
    sendDayDialogDescription:
      'Send the whole day to another Turtle Steps copy, or paste one you received.',
    sendDayWholeDayLabel: 'Whole day',
    sendDayCopyButton: 'Copy link',
    sendDayShareButton: 'Share',
    sendDayCopied: 'Copied',
    sendDayShareFailed: 'Couldn’t share. Copy the link instead.',
    sendDayNothingLogged: 'Nothing is logged on this day yet.',
    sendDayShareTitle: (date) => `Turtle Steps — ${date}`,
    sendDayShareText: (date) => `Day log for ${date}`,
    sendDayQrAlt: 'QR code for this day’s log',
    sendDayQrHint: 'Scan with another phone to preview this day.',
    sendDayQrTooLarge:
      'This day’s log is too large for a reliable QR code. Copy or share the link instead.',
    receiveDayPasteLabel: 'Paste a link',
    receiveDayPastePlaceholder: 'Paste a Turtle Steps day link',
    receiveDayPasteSubmit: 'Preview',
    receiveDayPasteInvalid: 'That doesn’t look like a day’s log from Turtle Steps.',
    receiveDayScanQrButton: 'Scan QR code',
    receiveDayScanQrTitle: 'Scan a day’s log',
    receiveDayScanQrInstructions:
      'Point the camera at the QR on the other phone, or pick a photo of it.',
    receiveDayScanIsFood:
      'That QR is a shared food, not a day’s log. Import it from Settings → Meal items.',
    receiveDayScanUnreadable:
      'Couldn’t read that as a day’s log. Try again, or paste the link.',
    nutritionFactsSectionTitle: 'Nutrition highlights',
    vsYesterdayLabel: 'vs. yesterday',
    vsMaxWeightLabel: 'vs. highest weight',
    remainingCaloriesLabel: 'Remaining calories',
    kcalRemainingUnit: 'kcal remaining',
    kcalOverUnit: 'kcal over',
    remainingProteinLabel: 'Remaining protein',
    gRemainingUnit: 'g remaining',
    remainingFatLabel: 'Remaining fat',
    remainingCarbLabel: 'Remaining carbs',
    remainingFiberLabel: 'Remaining fiber',
    remainingSodiumLabel: 'Remaining sodium',
    remainingPotassiumLabel: 'Remaining potassium',
    remainingMagnesiumLabel: 'Remaining magnesium',
    mgRemainingUnit: 'mg remaining',
    mgOverUnit: 'mg over',
    reorderCardLabel: (n) => `Reorder card ${n}`,
    reorderCardsButton: 'Reorder',
    resetCardOrderButton: 'Reset order',
    statsSectionLabel: 'Stats',
    expandStatsLabel: 'Show stats',
    collapseStatsLabel: 'Hide stats',
    collapseAllSectionsLabel: 'Collapse all',
    expandAllSectionsLabel: 'Expand all',
    targetMinusConsumedText: (target, consumed) => `${target} − ${consumed}`,
    proteinOverTargetLabel: (target, consumed) =>
      `${target} − ${consumed} — great job!`,
    gOverUnit: 'g over',
    remainingWaterLabel: 'Remaining water',
    mlRemainingUnit: 'ml remaining',
    mlOverUnit: 'ml over',
    bmiLabel: 'BMI',
    bmrLabel: 'Estimated daily calories (BMR)',
    bmrUnit: 'kcal/day',
    bmrTooltipLabel: 'About estimated daily calories',
    celebrationTitle: "You reached this week's target!",
    celebrationDescription: (weekEndDate) =>
      `Keep it up through ${weekEndDate} to earn your badge.`,
    celebrationCta: 'Review goal',
    celebrationCloseLabel: 'Close',
    celebrationCompleteTitle: 'You completed your weekly goal!',
    celebrationCompleteDescription:
      'Congratulations! Ready to set the next tiny step?',
    celebrationCompleteCta: "Set next week's goal",
    deepSleepDescription: (hours) => `${hours} deep sleep`,
  },
  dailyEntry: {
    morningEntriesTitle: 'Morning entries',
    // #528 — was "Fill in after waking up" (read as required). Point at Settings.
    morningEntriesSubtitle:
      "You don't have to fill these in. Turn off the ones you don't need in Settings.",
    eveningEntriesTitle: 'Evening entries',
    eveningEntriesSubtitle:
      "You don't have to fill these in. Turn off the ones you don't need in Settings.",
    expandMorningEntriesLabel: 'Show morning entries',
    collapseMorningEntriesLabel: 'Hide morning entries',
    expandEveningEntriesLabel: 'Show evening entries',
    collapseEveningEntriesLabel: 'Hide evening entries',
    weightLabel: 'Weight (kg)',
    addCaloriesLabel: 'kcal/100g',
    addCaloriesPortionLabel: 'kcal',
    addCaloriesPlaceholder: 'kcal',
    macroModeLabel: 'Entry mode',
    macroModePer100gOption: '100g',
    macroModePerPortionOption: 'Portion',
    addButton: 'Add',
    macrosLabel: 'Calories & macros',
    consumedMacrosLabel: 'Consumed',
    kcalUnit: 'kcal',
    noteLabel: "Day's note",
    noteFieldPlaceholder: 'Want to share anything for the day?',
    morningNoteLabel: 'Morning note',
    morningNoteFieldPlaceholder:
      'Anything from last night or this morning?',
    editWeightLabel: 'Edit weight',
    editNoteLabel: 'Edit note',
    editMorningNoteLabel: 'Edit morning note',
    saveWeightLabel: 'Save weight',
    saveNoteLabel: 'Save note',
    saveMorningNoteLabel: 'Save morning note',
    cancelEditWeightLabel: 'Cancel editing weight',
    cancelEditNoteLabel: 'Cancel editing note',
    cancelEditMorningNoteLabel: 'Cancel editing morning note',
    deleteWeightLabel: 'Delete weight',
    deleteSleepLabel: 'Delete sleep',
    deleteBodyMeasurementsLabel: 'Delete body measurements',
    deleteBodyCompositionLabel: 'Delete body composition',
    invalidValueMessage: 'Invalid value.',
    unusualWeightWarning:
      "That's an unusual weight — please double-check it before saving.",
    saveUnusualWeightAnywayLabel: 'Save anyway',
    fixWeightLabel: 'Fix it',
    unusualBodyCompositionWarning:
      "That's an unusual change from yesterday — please double-check it before saving.",
    saveUnusualBodyCompositionAnywayLabel: 'Save anyway',
    fixBodyCompositionLabel: 'Fix it',
    unusualDailyCaloriesWarning:
      "That's unusually high for one day — worth double-checking your entries.",
    mealLabel: (n) => `Meal ${n}`,
    editMealLabel: (n) => `Edit meal ${n}`,
    cancelEditMealLabel: (n) => `Cancel editing meal ${n}`,
    deleteMealLabel: (n) => `Delete meal ${n}`,
    deleteWholeMealButton: 'Delete meal',
    mealDeletedToastMessage: 'Meal deleted.',
    undoDeleteMealButton: 'Undo',
    editMealScreenTitle: 'Edit meal',
    backLabel: 'Back',
    mealNotFoundText: "This meal couldn't be found.",
    mealLabelFieldLabel: 'Meal name',
    defaultMealNamePresets: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    saveButton: 'Save',
    saveAndAddAnotherButton: 'Save and add one more',
    mealNoteLabel: 'Meal note',
    // Group-level note (#81 / #480) — free-text comment about the meal as
    // a whole. Meal-aware placeholder; not the reaction's "Was it tasty?".
    mealNotePlaceholder: (mealLabel) => `Note about ${mealLabel.toLowerCase()}`,
    itemNameLabel: 'Dish name',
    itemNamePlaceholder: 'Add a dish?',
    itemBrandLabel: 'Brand (optional)',
    itemBrandPlaceholder: 'e.g. Perdue',
    itemQuantitySectionLabel: 'Quantity',
    itemNutritionSectionLabel: (isPer100g) =>
      isPer100g ? 'Nutrition (per 100g)' : 'Nutrition',
    itemNoteLabel: 'Note (optional)',
    itemNotePlaceholder: 'Add a note...',
    deleteItemLabel: 'Delete item',
    emotionLabel: (emotion) =>
      emotion === 'happy'
        ? 'Happy'
        : emotion === 'unhappy'
          ? 'Unhappy'
          : 'Neutral',
    mealReactionValueLabel: (emotion) =>
      emotion === 'happy' ? 'Yes' : emotion === 'unhappy' ? 'No' : 'So-so',
    mealEmotionLabel: (emotion) =>
      emotion === 'thumbsUp'
        ? 'Thumbs up'
        : emotion === 'thumbsDown'
          ? 'Thumbs down'
          : 'Bellissimo',
    itemEmotionLabel: 'Reaction',
    dayMoodLabel: 'Mood today',
    eatingReasonFieldLabel: 'Why am I eating?',
    eatingReasonNoneOption: 'Not specified',
    eatingReasonLabel: (reason) =>
      reason === 'hunger'
        ? 'Hunger'
        : reason === 'angry'
          ? 'Angry'
          : reason === 'lonely'
            ? 'Lonely'
            : reason === 'tired'
              ? 'Tired'
              : reason === 'habit'
                ? 'Habit'
                : reason === 'craving'
                  ? 'Craving a specific food'
                  : reason === 'stress'
                    ? 'Stress / emotions'
                    : reason === 'boredom'
                      ? 'Boredom'
                      : reason === 'company'
                        ? 'Just for company'
                        : reason,
    proteinLabel: 'Protein',
    fatLabel: 'Fat',
    carbsLabel: 'Carbs',
    proteinPer100gLabel: 'Protein/100g',
    fatPer100gLabel: 'Fat/100g',
    carbsPer100gLabel: 'Carbs/100g',
    fiberLabel: 'Fiber',
    sodiumLabel: 'Sodium',
    potassiumLabel: 'Potassium',
    magnesiumLabel: 'Magnesium',
    itemPortionsLabel: '× 100g',
    itemWeightLabel: 'Weight (g)',
    gramsUnit: 'g',
    mgUnit: 'mg',
    macrosSummary: (protein, fat, carbs) =>
      `Protein ${protein} · Fat ${fat} · Carbs ${carbs}`,
    macrosSummaryCompact: (protein, fat, carbs) =>
      `P ${protein} · F ${fat} · C ${carbs}`,
    macrosSummaryWithCalories: (kcal, protein, fat, carbs) =>
      `${kcal} · Protein ${protein} · Fat ${fat} · Carbs ${carbs}`,
    macrosSummaryCompactWithCalories: (kcal, protein, fat, carbs) =>
      `${kcal} · P ${protein} · F ${fat} · C ${carbs}`,
    remainingMacrosLabel: 'Remaining',
    expandMacrosLabel: 'Show calories & macros',
    collapseMacrosLabel: 'Hide calories & macros',
    timeEatenLabel: 'Time',
    clearTimeLabel: 'Clear time',
    clearFoodSearchLabel: 'Clear search',
    addMealLabel: '+ Add a meal',
    expandAddMealLabel: '+ Add another meal',
    sinceLastMealLabel: 'Since last meal',
    sinceLastMealDuration: (hours, minutes, seconds) =>
      `${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`,
    repeatMealLabel: (mealLabel) => `Repeat yesterday's ${mealLabel}`,
    repeatMealDialogTitle: (mealLabel) => `Repeat ${mealLabel}`,
    copyYesterdayMealsLabel: "Copy yesterday's meals",
    copyDayMealsDialogTitle: "Copy yesterday's meals",
    orDivider: 'or',
    addFoodButton: 'Find food',
    addFoodDialogTitle: 'Add from food list',
    closeFoodDialogLabel: 'Close',
    scanBarcodeButton: 'Scan barcode',
    scanBarcodeDialogTitle: 'Scan barcode',
    scanBarcodeInstructions:
      'Point your camera at the barcode. Tap inside the frame to focus.',
    scanBarcodeCameraErrorMessage: (detail) =>
      `Couldn't access the camera — check camera permissions and try again.${detail ? ` (${detail})` : ''}`,
    scanBarcodeSearchingMessage: 'Searching for this product…',
    scanBarcodeStillScanningTip:
      'Still scanning — make sure the barcode is well-lit, in focus, and fills the frame above. Tap the frame to refocus.',
    scanBarcodeTapToFocusLabel: 'Tap to focus on barcode',
    scanQrFromPhotoLabel: 'Scan from photo',
    scanQrFromPhotoUnreadable:
      'Couldn’t read a QR code in that photo. Try another picture or the camera.',
    scanBarcodeManualLabel: 'Or enter the barcode number',
    scanBarcodeManualPlaceholder: 'Barcode number',
    scanBarcodeManualSubmitLabel: 'Search',
    noFoodFoundForBarcodeMessage:
      'No food found for this barcode — you can still add it by hand below.',
    itemBarcodeLabel: (code) => `Barcode: ${code}`,
    copyBarcodeLabel: 'Copy barcode',
    barcodeCopiedLabel: 'Copied',
    barcodeCopiedToastMessage: 'Barcode copied to clipboard',
    recentFoodsLabel: 'Recent',
    showAllRecentLabel: 'Show all',
    collapseRecentLabel: 'Show less',
    cantFindItAddManuallyLabel: "Can't find it? Add manually",
    quickActionAddFoodLabel: 'Add food',
    mealSoFarLabel: 'This meal so far',
    wasItTastyLabel: 'Was it tasty?',
    doneAddingMealButton: 'Done',
    confirmDiscardInProgressMealLabel:
      'Leave without saving? Foods added here will be discarded.',
    confirmDiscardInProgressMealYes: 'Yes',
    confirmDiscardInProgressMealNo: 'No',
    confirmDiscardEditedMealLabel:
      'Leave without saving? Changes to this meal will be discarded.',
    confirmDeleteItemLabel: 'Remove this food?',
    confirmDeleteItemYes: 'Remove',
    confirmDeleteItemNo: 'Cancel',
    fastingWindowToastMessage: (hours) => `Your fasting window was ${hours}.`,
    foodSearchLabel: 'Search foods',
    foodSearchPlaceholder: 'Search…',
    foodQuantityLabel: 'Quantity (g)',
    servingModeLabel: 'Serving',
    gramsModeOption: 'Grams',
    servingCountLabel: 'How many',
    favoriteFoodLabel: (name) => `Add ${name} to favorites`,
    unfavoriteFoodLabel: (name) => `Remove ${name} from favorites`,
    noFoodResultsText: 'No foods found.',
    searchOnlineButton: 'Search online',
    searchingOnlineLabel: 'Searching online…',
    onlineFoodResultsHeading: 'Online results',
    noOnlineFoodResultsText: 'No online matches with usable calories.',
    searchOnlineOfflineHint: 'Connect to the internet to search online.',
    searchOnlineOfflineBundledHint:
      'You’re offline — searching the built-in staple list only.',
    onlineFoodUnavailableText:
      'Online food databases are temporarily unavailable. Try again later, or pick a built-in staple if one matched.',
    addSelectedFoodsButton: (n) =>
      n > 1 ? `Add selected (${n})` : 'Add selected',
    per100gLabel: 'per 100g',
    computedTotalPrefix: 'Total:',
    todayWouldBeLabel: (newTotal, previousTotal) =>
      `Today would be: ${newTotal} (was ${previousTotal})`,
    todayRemainingWouldBeLabel: (newRemaining, previousRemaining) =>
      `${newRemaining} remaining (was ${previousRemaining} remaining)`,
    macroMismatchNote:
      "The calories don't quite match the protein/fat/carbs entered — worth a second look.",
    lastLoggedLabel: 'last logged',
    sleepLabel: 'Sleep',
    sleepHoursLabel: 'Hours slept',
    deepSleepLabel: 'Deep sleep',
    editSleepLabel: 'Edit sleep',
    saveSleepLabel: 'Save sleep',
    cancelEditSleepLabel: 'Cancel editing sleep',
    hoursUnit: 'h',
    minutesUnit: 'm',
    hoursFieldLabel: 'hours',
    minutesFieldLabel: 'minutes',
    sleepSummary: (hours, deepHours) => `${hours} slept · ${deepHours} deep`,
    stepsLabel: 'Steps',
    editStepsLabel: 'Edit steps',
    saveStepsLabel: 'Save steps',
    cancelEditStepsLabel: 'Cancel editing steps',
    mealsLabel: 'Meals',
    expandMealsLabel: 'Show meals',
    collapseMealsLabel: 'Hide meals',
    bodyMeasurementsLabel: 'Body measurements',
    editBodyMeasurementsLabel: 'Edit body measurements',
    saveBodyMeasurementsLabel: 'Save body measurements',
    cancelEditBodyMeasurementsLabel: 'Cancel editing body measurements',
    waistLabel: 'Waist',
    hipLabel: 'Hip',
    bodyFatLabel: 'Body fat',
    cmUnit: 'cm',
    percentUnit: '%',
    bodyMeasurementsSummary: (waist, hip) => `Waist ${waist} · Hip ${hip}`,
    bodyCompositionLabel: 'Body composition',
    editBodyCompositionLabel: 'Edit body composition',
    saveBodyCompositionLabel: 'Save body composition',
    cancelEditBodyCompositionLabel: 'Cancel editing body composition',
    muscleMassLabel: 'Muscle mass',
    visceralFatLabel: 'Visceral fat',
    bodyWaterLabel: 'Body water',
    boneMassLabel: 'Bone mass',
    kgUnit: 'kg',
    muscleMassShortLabel: 'Muscle',
    visceralFatShortLabel: 'Visceral fat',
    bodyWaterShortLabel: 'Water',
    boneMassShortLabel: 'Bone',
    bodyFatShortLabel: 'Body fat',
    fillBodyCompositionFromScreenshotLabel: 'Fill from Zepp screenshot',
    zeppScreenshotDialogTitle: 'From Zepp screenshot',
    zeppScreenshotDialogDescription:
      'Check the numbers, then save. Nothing is written until you confirm.',
    zeppScreenshotReadingLabel: 'Reading the screenshot…',
    zeppScreenshotNoValues:
      'Could not read body composition from this image. Use a screenshot of the Zepp measurement list.',
    zeppScreenshotFailed: 'Could not read this image. Try another screenshot.',
    zeppScreenshotSaveLabel: 'Save these numbers',
    zeppScreenshotCloseLabel: 'Close',
    zeppScreenshotDateHint: (date) =>
      `This screenshot looks like ${date}. It will still save to the day you have open.`,
    fillSleepFromScreenshotLabel: 'Fill from AutoSleep screenshot',
    autoSleepScreenshotDialogTitle: 'From AutoSleep screenshot',
    autoSleepScreenshotDialogDescription:
      'Check the numbers, then save. Nothing is written until you confirm.',
    autoSleepScreenshotReadingLabel: 'Reading the screenshot…',
    autoSleepScreenshotNoValues:
      'Could not read sleep from this image. Use an AutoSleep Today or History screenshot.',
    autoSleepScreenshotFailed: 'Could not read this image. Try another screenshot.',
    autoSleepScreenshotSaveLabel: 'Save these numbers',
    autoSleepScreenshotCloseLabel: 'Close',
    autoSleepScreenshotDateHint: (date) =>
      `This screenshot looks like ${date}. It will still save to the day you have open.`,
    entryComparisonComparedToYesterday: (arrow, amount) =>
      `${arrow} ${amount} compared to yesterday`,
    entryComparisonComparedToDate: (arrow, amount, dateLabel) =>
      `${arrow} ${amount} compared to ${dateLabel}`,
    entryComparisonVsYesterday: (arrow, amount) =>
      `${arrow} ${amount} vs yesterday`,
    entryComparisonVsDate: (arrow, amount, dateLabel) =>
      `${arrow} ${amount} vs ${dateLabel}`,
    entryComparisonVs30DaysAgo: (arrow, amount) =>
      `${arrow} ${amount} vs 30 days ago`,
    entryComparisonInfoLabel: 'Comparison with previous days',
    onPeriodLabel: 'On period',
    hadConstipationLabel: 'Constipation',
    hadConstipationNoOption: 'No',
    hadConstipationYesOption: 'Yes',
    hadAlcoholLabel: 'Alcohol',
    hadAlcoholNoOption: 'No',
    hadAlcoholYesOption: 'Yes',
    nightEatingLabel: () => 'Ate late tonight',
    nightEatingNoOption: 'No',
    nightEatingYesOption: 'Yes',
    clearNightEatingOverrideLabel: 'Clear',
    waterLabel: 'Water',
    dayTotalsLabel: 'Day totals',
    dayTotalsHint:
      'No food names needed — adds to your meals for Remaining calories and macros.',
    dayTotalsKcalLabel: 'Day total calories',
    dayTotalsProteinLabel: 'Day total protein',
    dayTotalsFatLabel: 'Day total fat',
    dayTotalsCarbsLabel: 'Day total carbs',
    dayTotalsFiberLabel: 'Day total fiber',
    expandDayTotalsLabel: 'Show day totals',
    collapseDayTotalsLabel: 'Hide day totals',
    saveDayTotalsLabel: 'Save day totals',
    clearDayTotalsLabel: 'Clear',
    editDayTotalsLabel: 'Edit',
    expandWaterLabel: 'Show water',
    collapseWaterLabel: 'Hide water',
    mlUnit: 'ml',
    addGlassLabel: '+1 glass (250ml)',
    addBottleLabel: '+1 bottle (500ml)',
    removeWaterEntryLabel: (amount) => `Remove ${amount} entry`,
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
    paceCaloriesMismatchHint:
      'Your daily calories and weekly pace don’t match (one looks like loss, the other like maintenance or gain). Use Recalculate from calories or from weekly pace — nothing updates automatically.',
    decreaseWeeklyTargetLabel: 'Decrease weekly target',
    increaseWeeklyTargetLabel: 'Increase weekly target',
    weeklyTargetStepHint: (step, unit) =>
      `Use ± for ${step} ${unit} steps, or type any value.`,
    aggressivePaceWarning: (kcal) =>
      `That’s a steep weekly pace (about ${kcal} kcal/day deficit). Most people aim for around 0.5–1 kg per week — you can still save this if you mean it.`,
    weekStartDateLabel: 'Starts on',
    weekStartDateHint:
      'Defaults to today (or tomorrow if you’re restarting on the day the previous goal ended). Change freely — overlapping a previous goal only shows a warning, it does not block saving.',
    goalWindowOverlapWarning:
      'This window overlaps a previous goal. You can still save — just check that the dates are what you meant.',
    weekEndDateLabel: 'Ends on',
    weekEndDateHint:
      'Defaults to 7 days after the window starts. Change it if your week should end on a different day.',
    dailyCalorieTargetLabel: 'Daily calories target',
    dailyCalorieTargetHint: 'Optional — leave blank to skip.',
    dailyProteinTargetLabel: 'Daily protein target',
    dailyProteinTargetHint: 'Optional — leave blank to skip.',
    dailyFatTargetLabel: 'Daily fat target',
    dailyFatTargetHint: 'Optional — leave blank to skip.',
    dailyCarbTargetLabel: 'Daily carb target',
    dailyCarbTargetHint: 'Optional — leave blank to skip.',
    dailyFiberTargetLabel: 'Daily fiber target',
    dailyFiberTargetHint: 'Optional — leave blank to skip.',
    useFiberSuggestionButton: 'Use suggested fiber',
    fiberSuggestionHint: (grams) =>
      `A common adult ballpark is about ${grams} g/day (rough guide, not medical advice).`,
    dailySodiumTargetLabel: 'Daily sodium target',
    dailySodiumTargetHint: 'Optional — leave blank to skip.',
    dailyPotassiumTargetLabel: 'Daily potassium target',
    dailyPotassiumTargetHint: 'Optional — leave blank to skip.',
    dailyMagnesiumTargetLabel: 'Daily magnesium target',
    dailyMagnesiumTargetHint: 'Optional — leave blank to skip.',
    dailyWaterTargetLabel: 'Daily water target',
    dailyWaterTargetHint: 'Optional — leave blank to skip.',
    useWaterRecommendationButton: 'Use recommended mid value',
    waterRecommendationGoalHint: (low, high) =>
      `From your latest weight: about ${low}–${high} L/day (not medical advice).`,
    suggestTargetButton: 'Suggest a target',
    suggestTargetCaveat:
      'Fills in the four fields below from your weight, height, age, sex, and activity level — not medical or nutritional advice. Review and edit before saving.',
    suggestTargetMissingProfileHint:
      'Log a weight, and set your height, age, sex, and activity level in Settings, to use this.',
    recalculateFromPaceButton: 'Recalculate from weekly pace',
    recalculateFromCaloriesButton: 'Recalculate from calories',
    recalculateFromFieldCaveat:
      'Rough estimate from your profile — not medical advice. Review before saving.',
    updateButton: 'Update this week’s target',
    setButton: 'Set this week’s target',
    cancelButton: 'Cancel',
    confirmDiscardEditsLabel: 'Leave without saving your goal changes?',
    startNewGoalButton: 'Start a new goal',
    startNewGoalHint:
      'Begins a fresh window (defaults from today). If it overlaps the previous goal, you’ll see a warning — saving is still allowed.',
    startNewGoalAvailableFromLabel: (weekEndDate) =>
      `Available once this week's target ends, on ${weekEndDate}.`,
    savedConfirmation: 'Saved',
    currentGoalTitle: 'Current goal',
    notSetLabel: 'Not set',
    editGoalLabel: 'Edit goal',
    deleteGoalLabel: 'Delete goal',
    confirmDeleteGoalLabel: "Delete this goal? This can't be undone.",
    pastTargetsTitle: 'Past targets',
    weekColumnLabel: 'Week',
    targetColumnLabel: 'Target',
    statusColumnLabel: 'Status',
    targetPerWeek: (target, unit) => `${target} ${unit}/week`,
    targetMetLabel: 'Target met',
    targetMetOnLabel: (date) => `Target met on ${date}`,
    targetMissedLabel: 'Target not met',
    targetNoDataLabel: 'Not enough data to tell',
    previousToCurrentWeightLabel: (previous, current, unit) =>
      `${previous} → ${current} ${unit}`,
    activeGoalReachedNudge: (weekEndDate) =>
      `You've reached this week's target — keep it up through ${weekEndDate} to earn your badge!`,
    activeGoalReachedSectionTitle: 'Target reached',
    goalCompletedNudge:
      "You completed this week's goal! Start a new one below whenever you're ready.",
    goalCompletedSectionTitle: 'Goal completed',
    goalMissedNudge:
      "This week's target wasn't reached — that's okay. Start a new one below whenever you're ready.",
    goalMissedSectionTitle: "This week's result",
    paceCheckMessage: (actual, target) =>
      `Recent weeks moved about ${actual} vs. your ${target} target — consider adjusting the weekly pace.`,
    paceCheckPerWeekLabel: (value, unit) => `${value} ${unit}/week`,
    paceCheckSectionTitle: 'Pace check',
    deletePastTargetLabel: (weekRange) => `Delete target for ${weekRange}`,
    confirmDeletePastTargetLabel: 'Delete this target?',
    confirmDeletePastTargetYes: 'Delete',
    confirmDeletePastTargetNo: 'Cancel',
  },
  weeklyReview: {
    screenTitle: 'Weekly review',
    screenDescription:
      'A calm look at this week — no scores, no shame, just where things stand.',
    viewWeeklyReviewButton: 'Weekly review',
    backToGoalLabel: '← Goal',
    noActiveGoalMessage: 'Set a weekly target on Goal to see a review here.',
    progressSectionLabel: "This week's progress",
    progressMetLabel: (date) => `Target reached on ${date}.`,
    progressNotYetLabel: "Still working toward this week's target — no rush.",
    progressNoBaselineYetMessage:
      "No weigh-in logged yet for this week's start — progress will show once there is one.",
    averagesSectionLabel: 'Average this week',
    averagesSummary: (kcal, protein) => `${kcal} kcal/day, ${protein} protein/day.`,
    noAveragesYetMessage: 'Nothing logged yet this week.',
    insightSectionLabel: 'What stood out',
    adjustPaceButton: "Adjust next week's pace",
  },
  pdfSummary: {
    documentTitle: 'Turtle Steps — Summary',
    rangeLabel: (start, end) => `${start} – ${end}`,
    generatedOnLabel: (date) => `Generated on ${date}`,
    weightTrendSectionTitle: 'Weight trend',
    noWeightDataMessage: 'No weight logged in this period.',
    weeklyAveragesSectionTitle: 'Weekly averages',
    weekColumnHeader: 'Week',
    avgWeightColumnHeader: (unit) => `Avg weight (${unit})`,
    weightChangeColumnHeader: 'Change vs. prior week',
    avgCaloriesColumnHeader: 'Avg calories',
    noWeeklyDataMessage: 'No complete weeks logged in this period.',
    bodyMeasurementsSectionTitle: 'Body measurements (most recent)',
    waistLabel: (value, date) => `Waist: ${value} cm (${date})`,
    hipLabel: (value, date) => `Hip: ${value} cm (${date})`,
    bodyFatLabel: (value, date) => `Body fat: ${value}% (${date})`,
    bodyCompositionSectionTitle: 'Body composition (most recent)',
    muscleMassLabel: (value, date) => `Muscle mass: ${value} kg (${date})`,
    visceralFatLabel: (value, date) => `Visceral fat rating: ${value} (${date})`,
    bodyWaterLabel: (value, date) => `Body water: ${value}% (${date})`,
    boneMassLabel: (value, date) => `Bone mass: ${value} kg (${date})`,
    averageValueLabel: (name, value, days) =>
      `${name}: avg ${value} (${days} days logged)`,
    averageValueOnlyLabel: (value, days) =>
      `Average: ${value} (${days} days logged)`,
    daySignalsSectionTitle: 'Day signals',
    daySignalLabel: (name, trueDays, loggedDays) =>
      `${name}: ${trueDays} of ${loggedDays} logged days`,
    customMetricsSectionTitle: 'Custom metrics',
    disclaimer:
      'This document is a personal summary generated from self-reported data in Turtle Steps to the Goal. It is not medical advice — consult a healthcare professional for guidance about your health.',
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
    lastBackupNeverLabel: "You haven't exported a backup yet.",
    lastBackupAgoLabel: (days) =>
      days === 0
        ? 'Last backup: today.'
        : days === 1
          ? 'Last backup: yesterday.'
          : `Last backup: ${days} days ago.`,
    backupReminderGoToExportLabel: 'Go to Export',
    dismissBackupReminderLabel: 'Dismiss backup reminder',
    exportedCsvSummary: (entries) => `Exported ${entryCount(entries)}.`,
    importedSummary: (summary) => `Imported ${summary}.`,
    invalidBackup: "This file doesn't look like a valid Turtle Steps backup.",
    notValidJson: "That file isn't valid JSON.",
    exportFailed: 'Export failed.',
    importFailed: 'Import failed.',
    fileTooLarge: 'This file is too large to import (maximum 200 MB).',
    exportPeriodLabel: 'Export period',
    exportPeriodDescription:
      'Optional — applies to Excel, CSV, and Markdown below, and the ranged backup below that, not the full JSON backup above. Leave blank to export everything.',
    exportRangedBackupBlurb:
      'Download a JSON backup scoped to the period above instead of your full history — useful for sharing or archiving a slice without the whole thing. Not a substitute for the full backup above, which stays the one guaranteed-complete restore source.',
    exportRangedBackupButton: 'Export ranged backup',
    exportingRangedBackupButton: 'Exporting…',
    encryptedBackupBlurb:
      'Password-protect the backup file itself, e.g. before it sits in a Downloads or cloud-synced folder. The plain backup above still works exactly the same either way.',
    exportEncryptedButton: 'Encrypted backup',
    exportedEncryptedSummary: 'Encrypted backup downloaded.',
    exportEncryptedFailed: 'Could not create the encrypted backup.',
    encryptedExportDialogTitle: 'Set a backup password',
    encryptedExportDialogDescription:
      'This password encrypts the downloaded file. Type it twice to catch typos.',
    encryptedBackupUnrecoverableWarning:
      "If you forget this password, the backup cannot be recovered — there's no reset or backdoor.",
    encryptedBackupPasswordLabel: 'Password',
    encryptedBackupConfirmPasswordLabel: 'Confirm password',
    encryptedBackupPasswordMismatch: "Passwords don't match.",
    encryptingBackupButton: 'Encrypting…',
    encryptedExportSubmitButton: 'Encrypt and download',
    closeEncryptedDialogLabel: 'Close',
    encryptedImportDialogTitle: 'Enter the backup password',
    encryptedImportDialogDescription:
      'This backup file is password-protected. Enter the password it was encrypted with.',
    decryptingBackupButton: 'Decrypting…',
    encryptedImportSubmitButton: 'Decrypt and import',
    wrongEncryptedBackupPassword:
      'Wrong password, or the file is corrupted.',
    exportPdfBlurb:
      'Download a one-page PDF summary — weight trend, weekly averages, and body measurements if logged — for sharing outside the app, e.g. with a clinician.',
    exportPdfButton: 'Export PDF summary',
    exportingPdfButton: 'Generating…',
    exportedPdfSummary: 'PDF summary downloaded.',
    exportPdfFailed: 'Could not create the PDF summary.',
    exportPdfRangeLabel: 'Summary covers',
    exportPdfRange30Label: 'Last 30 days',
    exportPdfRange90Label: 'Last 90 days',
    pdfSectionsDialogTitle: 'Choose what to include',
    pdfSectionsDialogDescription:
      'Pick which sections go into the PDF. The non-medical disclaimer is always included.',
    pdfSectionWeightTrendLabel: 'Weight trend',
    pdfSectionWeeklyAveragesLabel: 'Weekly averages',
    pdfSectionBodyMeasurementsLabel: 'Body measurements',
    pdfSectionsGenerateButton: 'Generate PDF',
    closePdfSectionsDialogLabel: 'Close',
    pdfSectionsCustomMetricsGroupLabel: 'Custom metrics',
    pdfSectionDisabledNotTrackedTooltip:
      'Not currently tracked — turn this on in Settings’ "What to track" to include it.',
    pdfSectionDisabledNoDataTooltip:
      'No data logged for this in the selected date range.',
    pdfSectionDisabledTooltipLabel: 'Why this is disabled',
    exportExcelBlurb:
      'Download your data as an Excel file for viewing or analysis — this is not a backup and can’t be imported back in.',
    exportExcelButton: 'Export as Excel',
    exportingExcelButton: 'Exporting…',
    exportExcelFailed: 'Excel export failed.',
    exportCsvBlurb:
      'Download your daily log as a CSV file — a compact table format, good for viewing or for pasting into an AI assistant for analysis.',
    exportCsvButton: 'Export as CSV',
    exportingCsvButton: 'Exporting…',
    exportCsvFailed: 'CSV export failed.',
    exportCsvLlmTooltip:
      'CSV is the best format to paste into an LLM (like ChatGPT or Claude) if you want it to analyze your data — it’s compact and easy for AI tools to read accurately.',
    exportCsvLlmTooltipLabel: 'Why CSV for AI analysis',
    exportMarkdownBlurb:
      'Download your daily log as a Markdown file — a table format that reads well in text editors and note-taking apps.',
    exportMarkdownButton: 'Export as Markdown',
    exportingMarkdownButton: 'Exporting…',
    exportMarkdownFailed: 'Markdown export failed.',
    exportedMarkdownSummary: (entries) =>
      `Exported ${entries} ${entries === 1 ? 'entry' : 'entries'} as Markdown.`,
    storageUsedLabel: (size) => `~${size} used on this device`,
    storageUsedOfQuotaLabel: (used, quota) =>
      `~${used} used of ~${quota} available on this device`,
    dataToImportLabel: 'Data to import',
    importConflictModeLabel: 'If a day already has a value',
    importConflictModeDescription:
      'Fill gaps only keeps values you already logged or corrected. Overwrite replaces them with the import — useful when the wearable should win.',
    importConflictModeFillGaps: 'Fill gaps only',
    importConflictModeOverwrite: 'Overwrite with import',
  },
  zeppLifeImport: {
    importBlurb:
      'Import weight, body composition, and step data from a Zepp Life export file.',
    howToExportLabel: 'How do I get this file?',
    howToExportSteps:
      'In the Zepp Life app: Profile → Settings → Personal information security and privacy → Exercising user rights → export data. It arrives by email as a password-protected zip.',
    importButton: 'Import from Zepp Life',
    importingButton: 'Importing…',
    importedSummary: (days, updated) =>
      `Imported data for ${days} ${days === 1 ? 'day' : 'days'} from Zepp Life (${updated} updated an existing entry).`,
    importedNothingSummary:
      "This export didn't have any weight or step data to import.",
    invalidFile: "This doesn't look like a Zepp Life export file.",
    importFailed: 'Import failed.',
    closeDialogLabel: 'Close',
    passwordDialogTitle: 'Enter the export password',
    passwordDialogDescription:
      'This is the password from the export email Zepp Life sent you — not your Zepp account login password.',
    passwordLabel: 'Password',
    passwordSubmitButton: 'Unlock and import',
    wrongPassword:
      "That password didn't work — check the export email and try again.",
    profileDialogTitle: 'Whose scale readings?',
    profileDialogDescription:
      'This export has body readings for more than one height — common when a shared scale syncs to one Zepp account. Pick which person to import.',
    profileOptionLabel: ({
      heightCm,
      minWeightKg,
      maxWeightKg,
      readingCount,
      nickName,
    }) => {
      const base = `${heightCm} cm · ${minWeightKg}–${maxWeightKg} kg · ${readingCount} ${readingCount === 1 ? 'reading' : 'readings'}`
      return nickName ? `${base} · ${nickName}` : base
    },
    profileSubmitButton: 'Import selected',
  },
  appleHealthImport: {
    importBlurb:
      'Import weight, body fat, waist, water, sleep, and step data from an Apple Health export file.',
    howToExportLabel: 'How do I get this file?',
    howToExportSteps:
      'In the Health app: tap your profile icon (top right) → Export All Health Data. This can take a while to process for a large export.',
    importButton: 'Import from Apple Health',
    importingButton: (percent) => `Importing… ${percent}%`,
    importedSummary: (days, updated) =>
      `Imported data for ${days} ${days === 1 ? 'day' : 'days'} from Apple Health (${updated} updated an existing entry).`,
    importedNothingSummary:
      "This export didn't have any data this app tracks to import.",
    invalidFile: "This doesn't look like an Apple Health export file.",
    importFailed: 'Import failed.',
  },
  myFitnessPalImport: {
    importBlurb:
      'Import meal and weight history from a MyFitnessPal data export.',
    howToExportLabel: 'How do I get this file?',
    howToExportSteps:
      'Request a Data Access Request export from MyFitnessPal (myfitnesspal.com → Settings → Privacy Center → Manage My Data — this option requires a Premium subscription). If it\'s not available on your account, you can instead email MyFitnessPal support directly and ask them for your data. It arrives by email as an .xlsx file, often password-protected — the password is in the same email. This can take a few days to be ready.',
    importButton: 'Import from MyFitnessPal',
    importingButton: 'Importing…',
    importedSummary: (days, updated) =>
      `Imported data for ${days} ${days === 1 ? 'day' : 'days'} from MyFitnessPal (${updated} updated an existing entry).`,
    importedNothingSummary:
      "This export didn't have any meal or weight data to import.",
    invalidFile: "This doesn't look like a MyFitnessPal export file.",
    importFailed: 'Import failed.',
    closeDialogLabel: 'Close',
    passwordDialogTitle: 'Enter the export password',
    passwordDialogDescription:
      'This is the password from the export email MyFitnessPal sent you — not your MyFitnessPal account login password.',
    passwordLabel: 'Password',
    passwordSubmitButton: 'Unlock and import',
    wrongPassword:
      "That password didn't work — check the export email and try again.",
    slotTimesDialogTitle: 'Default meal times',
    slotTimesDialogDescription:
      "MyFitnessPal exports don't include clock times. Set when Breakfast, Lunch, Snack, and Dinner should land for this import — saved for next time.",
    slotTimesImportButton: 'Import',
    slotTimesContinueButton: 'Continue',
  },
  exportXlsx: {
    dailyLogSheetName: 'Daily Log',
    mealsSheetName: 'Meals',
    goalsSheetName: 'Goals',
    dateColumn: 'Date',
    weightColumn: 'Weight (kg)',
    caloriesColumn: 'Calories (kcal)',
    proteinColumn: 'Protein (g)',
    fatColumn: 'Fat (g)',
    carbsColumn: 'Carbs (g)',
    sleepHoursColumn: 'Sleep (h)',
    deepSleepHoursColumn: 'Deep sleep (h)',
    stepsColumn: 'Steps',
    waistColumn: 'Waist (cm)',
    hipColumn: 'Hip (cm)',
    bodyFatColumn: 'Body fat (%)',
    moodColumn: 'Mood',
    noteColumn: 'Note',
    morningNoteColumn: 'Morning note',
    onPeriodColumn: 'On period',
    hadConstipationColumn: 'Constipation',
    hadAlcoholColumn: 'Alcohol',
    nightEatingColumn: () => 'Ate late tonight',
    waterColumn: 'Water (ml)',
    muscleMassColumn: 'Muscle (kg)',
    visceralFatColumn: 'Visceral fat',
    bodyWaterColumn: 'Body water (%)',
    boneMassColumn: 'Bone (kg)',
    fiberColumn: 'Fiber (g)',
    sodiumColumn: 'Sodium (mg)',
    potassiumColumn: 'Potassium (mg)',
    magnesiumColumn: 'Magnesium (mg)',
    mealReactionColumn: 'Meal reaction',
    eatingReasonColumn: 'Why eating',
    itemNoteColumn: 'Item note',
    mealColumn: 'Meal',
    itemColumn: 'Item',
    brandColumn: 'Brand',
    gramsColumn: 'Grams',
    timeColumn: 'Time',
    reactionColumn: 'Reaction',
    createdColumn: 'Created',
    weeklyTargetColumn: 'Weekly target (kg)',
  },
  dashboard: {
    title: 'Dashboard',
    description:
      'Weight trend, calorie trend, weekly summary cards, correlation view',
    reorderSectionLabel: (n: number) => `Reorder section ${n}`,
    reorderSectionsButton: 'Reorder',
    resetSectionOrderButton: 'Reset order',
    weightLegend: 'weight',
    caloriesLegend: 'calories',
    rollingAverageLegend: '7-day average',
    trendChartEmptyDescription: 'Pick at least one series to show.',
    notEnoughTrendDataMessage:
      'Not enough data yet to show a trend — log a few more days and check back.',
    dashboardSectionEmptyDescription:
      'Nothing to show here yet — keep logging, or widen the date range if you filtered it.',
    trendChartPeriodLabel: 'Chart period',
    trendChartPeriodAllOption: 'All time',
    trendChartPeriodWeekOption: 'Week',
    trendChartPeriodMonthOption: 'Month',
    trendChartPeriodYearOption: 'Year',
    trendChartPeriodCustomOption: 'Custom',
    weightTrendTitle: 'Weight trend',
    calorieTrendTitle: 'Calorie trend',
    macrosTitle: 'Protein, fat & carbs',
    bodyCompositionTrendTitle: 'Body composition',
    bodyCompositionEmptyDescription: 'Pick at least one to see a chart.',
    electrolytesTrendTitle: 'Electrolytes',
    electrolytesEmptyDescription: 'Pick at least one to see a chart.',
    hideChartLabel: (title) => `Hide ${title}`,
    showChartLabel: (title) => `Show ${title}`,
    weeklySummaryTitle: 'Weekly summary',
    weekRange: (start, end) => `${start} – ${end}`,
    weightChangeLabel: 'Change this week',
    averageCaloriesLabel: 'Average calories',
    targetMetNote: 'target met',
    addWeeklyNoteLabel: 'Add weekly note',
    editWeeklyNoteLabel: 'Edit weekly note',
    saveWeeklyNoteLabel: 'Save note',
    cancelWeeklyNoteLabel: 'Cancel',
    weeklyNoteLabel: 'Weekly note',
    weeklyNotePlaceholder:
      'Notes for this week — e.g. advice from reviewing your export…',
    expandWeeklyNoteLabel: 'Show full note',
    collapseWeeklyNoteLabel: 'Show less',
    monthlySummaryTitle: 'Monthly summary',
    recentAveragesTitle: 'Recent averages',
    last7DaysLabel: 'Last 7 days',
    last30DaysLabel: 'Last 30 days',
    compareRangesTitle: 'Compare date ranges',
    rangeALabel: 'Range A',
    rangeBLabel: 'Range B',
    rangeStartLabel: 'Start date',
    rangeEndLabel: 'End date',
    compareRangesDayCount: (n) => `${n} day${n === 1 ? '' : 's'} logged`,
    compareRangesWeightDelta: (delta, unit) =>
      `Range B averaged ${delta} ${unit} vs. Range A.`,
    emptyTitle: 'No entries yet',
    emptyDescription: 'Log a few days on the Day screen to see trends here.',
    correlationTitle: 'Calories vs. next-day weight',
    correlationEmptyDescription:
      'Not enough data yet to see a pattern — log calories and keep tracking weight, then check back in a few weeks.',
    correlationSummary: (thresholdKcal, direction) =>
      direction === 'lower'
        ? `Days under ${thresholdKcal} kcal averaged more weight gain the next morning than days over that.`
        : `Days over ${thresholdKcal} kcal averaged more weight gain the next morning than days under that.`,
    correlationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    correlationLagCaveat:
      "Compares each day's calories to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    correlationCurrentWeekExcludedNote:
      "This week isn't finished yet, so it's left out of the count above.",
    correlationExpandLabel: 'Show chart',
    correlationCollapseLabel: 'Hide chart',
    correlationStrengthLabel: (strength) =>
      strength === 'strong'
        ? 'Strong pattern'
        : strength === 'moderate'
          ? 'Moderate pattern'
          : 'Weak pattern',
    outlierPointsHeading: 'Unusual data points',
    excludeOutlierLabel: (label) => `Exclude ${label} from this pattern`,
    restoreOutlierLabel: (label) => `Restore ${label} to this pattern`,
    outlierReasonWeightChange: 'unusual weight change',
    outlierReasonWeightChangeShort: 'weight change',
    outlierReasonMetric: (metricLabel) => `unusual ${metricLabel}`,
    outlierReasonBoth: (metricLabel, otherAxisLabel) =>
      `unusual ${metricLabel} and ${otherAxisLabel}`,
    viewOutlierDayLabel: (label) => `Edit ${label}`,
    weeklyChangeLegend: 'weekly change',
    chartNavigationHint: 'Tap a point for details',
    cyclePeriodWeightNote:
      'Weight often fluctuates around your period — worth keeping in mind when reading day-to-day swings here.',
    previousPeriodLabel: 'Previous period',
    nextPeriodLabel: 'Next period',
    viewDayLink: 'View this day',
    correlationTooltipCloseLabel: 'Close',
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
    mealFrequencyTitle: 'Meal frequency vs. next-day weight',
    mealFrequencyEmptyDescription:
      'Not enough data yet to see a pattern — log your meals and keep tracking weight, then check back in a few weeks.',
    mealFrequencySummary: (thresholdCount, direction) =>
      direction === 'more'
        ? `Days with more than ${thresholdCount} meals logged averaged more weight gain the next morning than days with fewer, larger meals.`
        : `Days with ${thresholdCount} or fewer meals logged averaged more weight gain the next morning than days with more, smaller meals.`,
    mealFrequencyDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    mealFrequencyLagCaveat:
      "Compares each day's number of logged meals to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    mealCountLegend: 'meals logged',
    fastingWindowTitle: 'Fasting window vs. next-day weight',
    fastingWindowEmptyDescription:
      'Not enough data yet to see a pattern — log meal times on consecutive days and keep tracking weight, then check back in a few weeks.',
    fastingWindowSummary: (thresholdHours, direction) =>
      direction === 'longer'
        ? `Days you fasted longer than ${thresholdHours} averaged more weight gain the next morning than days you fasted less.`
        : `Days you fasted less than ${thresholdHours} averaged more weight gain the next morning than days you fasted longer.`,
    fastingWindowDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    fastingWindowLagCaveat:
      "Compares the actual gap between meals (previous day's last meal to the next day's first) to that next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    fastingHoursLegend: 'fasting hours',
    sleepCorrelationTitle: 'Sleep vs. next-day weight',
    sleepCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — log sleep hours and keep tracking weight, then check back in a few weeks.',
    sleepCorrelationSummary: (thresholdHours, direction) =>
      direction === 'less'
        ? `Days you slept less than ${thresholdHours}h averaged more weight gain the next morning than days you slept more.`
        : `Days you slept more than ${thresholdHours}h averaged more weight gain the next morning than days you slept less.`,
    sleepCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    sleepCorrelationLagCaveat:
      "Compares each day's logged sleep to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    sleepHoursLegend: 'sleep hours',
    stepsCorrelationTitle: 'Steps vs. next-day weight',
    stepsCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — log step counts and keep tracking weight, then check back in a few weeks.',
    stepsCorrelationSummary: (thresholdSteps, direction) =>
      direction === 'fewer'
        ? `Days you took fewer than ${thresholdSteps} steps averaged more weight gain the next morning than days you took more.`
        : `Days you took more than ${thresholdSteps} steps averaged more weight gain the next morning than days you took fewer.`,
    stepsCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    stepsCorrelationLagCaveat:
      "Compares each day's logged steps to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    stepsCountLegend: 'steps',
    proteinCorrelationTitle: 'Protein vs. next-day weight',
    proteinCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — log protein and keep tracking weight, then check back in a few weeks.',
    proteinCorrelationSummary: (thresholdProteinPercent, direction) =>
      direction === 'less'
        ? `Days when protein was less than ${thresholdProteinPercent}% of your calories averaged more weight gain the next morning than days when it was more.`
        : `Days when protein was more than ${thresholdProteinPercent}% of your calories averaged more weight gain the next morning than days when it was less.`,
    proteinCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    proteinCorrelationLagCaveat:
      "Compares each day's protein share of calories to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    proteinPercentOfCaloriesLabel: 'Protein (% of calories)',
    nightEatingCorrelationTitle: 'Night eating vs. next-day weight',
    nightEatingCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — keep logging meal times (or the night-eating toggle directly) and tracking weight, then check back in a few weeks.',
    nightEatingCorrelationSummary: (direction) =>
      direction === 'more'
        ? "Nights you ate late averaged more weight gain the next morning than nights you didn't."
        : "Nights you ate late averaged less weight gain the next morning than nights you didn't.",
    nightEatingCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    nightEatingCorrelationLagCaveat:
      "Compares each day's night-eating status to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    alcoholCorrelationTitle: 'Alcohol vs. next-day weight',
    alcoholCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — keep logging alcohol days and tracking weight, then check back in a few weeks.',
    alcoholCorrelationSummary: (direction) =>
      direction === 'more'
        ? "Days you logged alcohol averaged more weight gain the next morning than days you didn't."
        : "Days you logged alcohol averaged less weight gain the next morning than days you didn't.",
    alcoholCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    alcoholCorrelationLagCaveat:
      "Compares each day's alcohol signal to the very next day's weight, not a proven cause-and-effect relationship — water retention, sodium, and many other factors also affect day-to-day weight.",
    loggingConsistencyTitle: 'Logging consistency',
    heatmapLessLabel: 'Less',
    heatmapMoreLabel: 'More',
    daysLoggedSummaryText: (daysLogged) => `${daysLogged} days logged`,
    totalCaloriesOverLoggedDaysText: (total) => `${total} over the logged days`,
    totalCaloriesLast7DaysText: (total) => `${total} in the last 7 days`,
    foodReactionsTitle: 'Food reactions',
    mostLikedFoodsTitle: 'Most liked',
    mostDislikedFoodsTitle: 'Most disliked',
    customChartTitle: 'Compare your data',
    customChartWeightLabel: 'Weight',
    customChartCaloriesLabel: 'Calories',
    customChartFastingHoursLabel: 'Fasting hours',
    customChartTypeLine: 'Line',
    customChartTypeBar: 'Bar',
    customChartTypeDots: 'Dots',
    customChartTypeGroupLabel: (seriesLabel) => `Chart type for ${seriesLabel}`,
    customChartNormalizedCaveat:
      "Each line is scaled to its own range so different units (kg, kcal, steps) can share one chart — shapes and trends are comparable, but the chart's height doesn't represent an absolute value. See the exact number for any day in the tooltip.",
    customChartMarkerDaysText: (dayCount) =>
      `${dayCount} day${dayCount === 1 ? '' : 's'}`,
    customChartGroupedMarkersCaveat:
      'On a long range, day markers are grouped — one dot can stand for several marked days. Tap a dot to see how many, or pick a shorter period to see every day on its own.',
    customChartZoomHint:
      'Pinch to zoom, drag sideways to pan. Double-tap to reset.',
    customChartResetZoomButton: 'Reset zoom',
    customChartEmptyDescription: 'Pick at least one to compare.',
    customCorrelationSummary: (aLabel, thresholdValue, direction, bLabel) =>
      `Days when "${aLabel}" was above ${thresholdValue} averaged a ${direction} "${bLabel}" than days with lower "${aLabel}".`,
    customCorrelationDayCount: (n) =>
      `Based on ${n} day${n === 1 ? '' : 's'} of data.`,
    customCorrelationLagCaveat:
      'Compares both metrics on the same day, not a proven cause-and-effect relationship — many other factors can affect either one.',
    customCorrelationEmptyDescription:
      'Not enough data yet to see a pattern — log both metrics on the same days, then check back in a few weeks.',
    manageCustomCorrelationsLabel: 'Manage custom metrics & correlations',
  },
  history: {
    title: 'History',
    description: 'Table of all past entries — edit/delete',
    emptyTitle: 'No entries yet',
    emptyDescription: 'Log a few days on the Day screen to see them here.',
    dateColumn: 'Date',
    weightColumn: (unit) => `Weight (${unit})`,
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
    searchLabel: 'Search notes',
    searchPlaceholder: 'Search day notes…',
    moodFilterLabel: 'Filter by mood',
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
    previousPageButton: 'Previous',
    nextPageButton: 'Next',
    pageIndicator: (current, total) => `Page ${current} of ${total}`,
    reachedGoalWindowDayLabel: 'Weight dropped on the way to your target',
    reachedGoalDayLabel: 'You reached your target this day',
    reachedGoalLegendLabel: 'Reached-target highlighting',
    calendarMarkersButton: 'Markers',
    calendarMarkersDialogLabel: 'Calendar markers',
    calendarMarkerLegendLabel: 'Calendar markers',
    calendarMarkerEntryLabel: 'Logged day',
    calendarMarkerNightEatingLabel: 'Night eating',
  },
  settings: {
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
      'On the Day screen, show how long it has been since your last meal — useful for intermittent fasting. Off by default.',
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
  },
  nutritionFacts: {
    proteinRichMeal: 'Protein-rich meal — a solid amount for supporting muscle.',
    excellentFiberMeal: 'Excellent source of fiber in this meal.',
    balancedPlateMeal:
      'Nicely balanced plate — a healthy mix of protein, fat, and carbs.',
    highQualityCarbsMeal: 'Good source of high-fiber carbs in this meal.',
    dailyFiberGoal: "You've hit today's fiber goal.",
    sodiumConsciousDay: 'Nice work keeping sodium in check today.',
    potassiumRichDay: 'Great potassium intake today.',
    goodPotassiumSodiumRatio: 'Good potassium-to-sodium balance today.',
    magnesiumRichDay: 'Great magnesium intake today.',
    wellHydrated: 'Well hydrated today.',
    onTargetCalories: "Right on target with today's calories.",
    proteinSpreadThroughDay: "Protein spread nicely across today's meals.",
    balancedDay: 'Well-balanced macros for the day overall.',
  },
  recipes: {
    settingsSectionLabel: 'Recipes',
    settingsSectionDescription:
      'Multi-ingredient dishes you make in a batch, logged by the serving — a pot of chili, a batch of soup.',
    manageRecipesButton: 'Manage recipes',
    screenTitle: 'Recipes',
    screenDescription:
      'Build a recipe from its ingredients once, then log servings of it from the daily log any time.',
    emptyStateText: 'Nothing yet — add a recipe to log servings of it later.',
    addRecipeButton: 'Add recipe',
    editRecipeLabel: (name) => `Edit ${name}`,
    deleteRecipeLabel: (name) => `Delete ${name}`,
    servingsCountLabel: (n) => `Makes ${n} serving${n === 1 ? '' : 's'}`,
    addRecipeDialogTitle: 'Add recipe',
    editRecipeDialogTitle: 'Edit recipe',
    closeRecipeDialogLabel: 'Close recipe editor',
    recipeNameLabel: 'Recipe name',
    recipeNamePlaceholder: 'Recipe name',
    servingsFieldLabel: 'Servings',
    ingredientsSectionLabel: 'Ingredients',
    noIngredientsYetText: 'No ingredients yet — add at least one below.',
    removeIngredientLabel: (name) => `Remove ${name}`,
    copyIngredientsLabel: (name) => `Copy ${name} ingredients as a shopping list`,
    ingredientsCopiedLabel: 'Copied',
    ingredientsCopiedToastMessage: 'Ingredients copied to clipboard',
    addIngredientButton: 'Add ingredient',
    ingredientNameLabel: 'Ingredient name',
    ingredientNamePlaceholder: 'Ingredient name',
    perServingPreviewPrefix: 'Per serving:',
    cancelLabel: 'Cancel',
    logRecipeButton: 'Log recipe',
    logRecipeDialogTitle: 'Log recipe',
    closeLogRecipeDialogLabel: 'Close log recipe dialog',
    pickRecipeLabel: 'Which recipe?',
    servingsEatenLabel: 'Servings eaten',
    noRecipesYetMessage:
      "You haven't added any recipes yet — manage them from Settings.",
    logButtonLabel: 'Log',
  },
  customMetrics: {
    settingsSectionLabel: 'Custom metrics & correlations',
    settingsSectionDescription:
      'Track things this app doesn’t have a built-in field for, and see how they relate to anything else you log.',
    manageCustomMetricsButton: 'Manage custom metrics',
    screenTitle: 'Custom metrics & correlations',
    screenDescription:
      'Define your own things to track, log values for them, and correlate any two metrics against each other.',
    backToSettingsLabel: 'Back to Settings',

    metricsSectionLabel: 'Your metrics',
    emptyMetricsText: 'No custom metrics yet.',
    addMetricButton: '+ Add metric',
    addMetricDialogTitle: 'Add metric',
    closeMetricDialogLabel: 'Close',
    metricNameLabel: 'Name',
    metricNamePlaceholder: 'e.g. Training session, Acne',
    metricInputKindLabel: 'How is this logged?',
    metricInputKindNumberOption: 'Number',
    metricInputKindBooleanOption: 'Yes / No',
    metricInputKindScaleOption: '1-5 scale',
    metricUnitLabel: 'Unit (optional)',
    metricUnitPlaceholder: 'e.g. reps, hours',
    deleteMetricLabel: (name) => `Delete ${name}`,
    cancelLabel: 'Cancel',
    saveButton: 'Save',

    logValuesSectionLabel: 'Custom metrics',
    logValuesMovedText: "Log today's values from the Day screen.",
    expandLogValuesLabel: 'Show custom metrics',
    collapseLogValuesLabel: 'Hide custom metrics',
    logValuesCollapsedSummary: (logged, total) =>
      `${logged} logged / ${total} metrics`,
    booleanYesOption: 'Yes',
    booleanNoOption: 'No',
    scaleValueLabel: (n) => `Rate ${n} out of 5`,
    valueSavedLabel: 'Saved',
    noteLabel: 'Note',
    notePlaceholder: 'Add a note about this value...',
    saveNoteLabel: 'Save note',
    editNoteLabel: 'Edit note',
    cancelEditNoteLabel: 'Cancel editing note',
    addNoteLabel: 'Add note',

    correlationsSectionLabel: 'Custom correlations',
    emptyCorrelationsText: 'No custom correlations yet.',
    addCorrelationButton: '+ Add correlation',
    addCorrelationDialogTitle: 'Add correlation',
    closeCorrelationDialogLabel: 'Close',
    correlationNameLabel: 'Name (optional)',
    correlationNamePlaceholder: 'e.g. Acne vs. carbs',
    metricALabel: 'First metric',
    metricBLabel: 'Second metric',
    selectMetricPlaceholder: 'Select a metric',
    deleteCorrelationLabel: (name) => `Delete ${name}`,
    sameMetricErrorText: 'Pick two different metrics to correlate.',
  },
  plannedMeals: {
    sectionLabel: 'Planned meals',
    expandSectionLabel: 'Show planned meals',
    collapseSectionLabel: 'Hide planned meals',
    collapsedSummary: (count) =>
      count === 0 ? 'Nothing planned' : `${count} planned`,
    sectionBlurb:
        "Jot down a meal you're planning for a future day. It won't count toward any totals until you add it to that day's log.",
    stagedListLabel: 'Planned for this day',
    plannedKcalLabel: (kcal) => `${kcal} kcal`,
    addToLogButton: 'Add to log',
    discardPlannedMealLabel: (name) => `Discard planned meal: ${name}`,
    addPlanTriggerLabel: 'Plan a meal for tomorrow',
    planNameLabel: 'What are you planning?',
    planNamePlaceholder: 'e.g. Chicken and rice',
    planKcalLabel: 'Calories (optional)',
    planKcalPlaceholder: 'e.g. 450',
    savePlanButton: 'Save plan',
    cancelPlanLabel: 'Cancel',
  },
  about: {
    title: 'About',
    description: 'What this app is, and why it exists',
    intro:
      'Turtle Steps is a private, local-first companion for understanding weight, nutrition, and the everyday factors around them.',
    tracking:
      'Bring meals, macros, hydration, sleep, activity, body measurements, and any custom metrics you choose together in one place. Explore Features for the full list.',
    philosophy:
      'Instead of focusing on perfect days, Turtle Steps encourages steady weekly progress through small, consistent steps.',
    privacyHeading: 'Private by design.',
    privacy:
      'Everything is stored locally on your device. No accounts. No cloud.',
    readPrivacyPolicyLabel: 'Read the full privacy policy',
    viewFeaturesLabel: 'See everything the app can do',
    madeBy: (author) => `Made by ${author}`,
    currentVersionLabel: (version) => `Version ${version}`,
  },
  privacyPolicy: {
    title: 'Privacy Policy',
    description: 'How Turtle Steps handles your data',
    lastUpdatedLabel: (date) => `Last updated: ${date}`,
    collectionHeading: 'What we collect',
    collectionBody:
      "Turtle Steps doesn't collect any data automatically. Everything you see in the app was entered by you, or explicitly pulled in at your request — weight, calories, meals, sleep, activity, cycle, notes, and any other field you choose to fill in, plus anything you choose to sync from Health Connect (see below) or import from a backup file.",
    healthConnectPrivacyHeading: 'Health Connect (Android)',
    healthConnectPrivacyBody:
      "On Android, tapping \"Sync from Health Connect\" in Settings reads recent weight, step totals, and sleep sessions (today plus the last several days) from Health Connect, Android's on-device health data store — nothing is read automatically, and nothing is ever written back to Health Connect. This only happens when you tap that button, requires your explicit permission grant, and only ever reads weight, steps, and sleep. Synced values are stored locally the same as any other entry — see \"Where your data lives\" below.",
    storageHeading: 'Where your data lives',
    storageBody:
      "All data is stored locally on your own device, in your browser's or app's own storage. There is no account, no server, and no cloud sync — Turtle Steps never sees your data.",
    sharingHeading: 'Sharing with third parties',
    sharingBody:
      'Your data is never sold, shared, or transmitted anywhere. The app contains no analytics, advertising, or tracking of any kind.',
    exportHeading: 'Exporting your data',
    exportBody:
      'The only way your data ever leaves your device is if you choose to export it yourself (as a JSON backup, Excel, CSV, or Markdown file) from Settings. Where that file goes afterward is entirely up to you.',
    childrenHeading: 'Children',
    childrenBody:
      "Turtle Steps isn't directed at children and doesn't knowingly collect data from anyone, including children — nothing is collected automatically regardless of age.",
    changesHeading: 'Changes to this policy',
    changesBody:
      'If this policy ever changes, the update will be posted on this same page.',
    contactHeading: 'Contact',
    contactBody:
      'Questions about this policy can be sent via the project’s GitHub page.',
    backToAboutLabel: 'Back to About',
  },
  featuresOverview: {
    title: 'Features',
    description: 'What Turtle Steps can do, all in one place',
    categories: [
      {
        id: 'dailyLogging',
        heading: 'Daily logging',
        items: [
          'Track weight, calories, protein, fat, carbs, and fiber every day',
          'Log sleep, steps, water, and mood alongside your weight',
          'Create number, yes/no, or five-point custom metrics for anything else that matters to you',
          'Optional menstrual cycle and digestion tracking — off by default, and never shown unless you turn it on',
        ],
      },
      {
        id: 'meals',
        heading: 'Meals & food',
        items: [
          'Search a large built-in food database, or build your own personal food list',
          'Scan a barcode to add a packaged food automatically',
          'Build multi-ingredient recipes with the nutrition calculated for you',
          'Mark favorites and reuse your last-logged amount with one tap',
          "React to a dish with an emoji, and copy a whole day's meals to today",
        ],
      },
      {
        id: 'goals',
        heading: 'Goals & progress',
        items: [
          'Set a weekly weight-loss pace instead of one big target number',
          'Optional daily calorie, protein, fat, and carb targets',
          "See whether each week's target was reached, and which weigh-ins it was based on",
        ],
      },
      {
        id: 'dashboard',
        heading: 'Dashboard & trends',
        items: [
          'Weight, calorie, and macro trend charts, plus weekly and monthly summaries',
          'Track waist, hip, body fat, muscle mass, visceral fat, body water, and bone mass over time',
          'Build your own comparison chart from any two tracked metrics',
          "Reorder the Dashboard's sections to match what matters to you",
        ],
      },
      {
        id: 'correlations',
        heading: 'Correlations & insights',
        items: [
          'See how protein intake, cycle phase, or fasting window relate to your weight',
          'Spot patterns without doing any of the math yourself',
        ],
      },
      {
        id: 'history',
        heading: 'History',
        items: [
          'Browse past days as a searchable, filterable list or calendar',
          'Use calendar markers for weight, meals, water, mood, notes, custom metrics, and reached goals',
          'Open any day to review or edit its complete log',
        ],
      },
      {
        id: 'yourData',
        heading: 'Your data, your device',
        items: [
          'Everything is stored locally — no account, no cloud, no tracking',
          'Export a full backup, or as Excel, CSV, or Markdown, any time',
          'Import a backup to restore your data or move to a new device',
          'Import weight, body composition, steps, and meals from Zepp Life, Apple Health, or MyFitnessPal exports',
        ],
      },
      {
        id: 'makeItYours',
        heading: 'Make it yours',
        items: [
          'English and Russian',
          'Light and dark mode, with several color themes',
          'kg or lb, plus a configurable week-start day and day-start time',
        ],
      },
    ],
    screenshotAlt: (heading) => `App screenshot — ${heading}`,
    backToAboutLabel: 'Back to About',
  },
}
