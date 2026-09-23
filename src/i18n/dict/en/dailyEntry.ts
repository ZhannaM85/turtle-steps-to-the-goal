import type { DailyEntryDict } from '../types/dailyEntry'

export const dailyEntry: DailyEntryDict = {
    morningEntriesTitle: 'Morning entries',
    eveningEntriesTitle: 'Evening entries',
    expandMorningEntriesLabel: 'Show morning entries',
    collapseMorningEntriesLabel: 'Hide morning entries',
    expandEveningEntriesLabel: 'Show evening entries',
    collapseEveningEntriesLabel: 'Hide evening entries',
    expandNightFoodCardLabel: 'Show night food',
    collapseNightFoodCardLabel: 'Hide night food',
    expandNextMorningWeightCardLabel: 'Show next morning weight',
    collapseNextMorningWeightCardLabel: 'Hide next morning weight',
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
    deleteNoteLabel: 'Delete note',
    deleteMorningNoteLabel: 'Delete morning note',
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
    clearMealLabelFieldLabel: 'Clear meal name',
    saveMealNameAsTemplateLabel: 'Save as template',
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
    emptyMealsTitle: 'No meals yet',
    emptyMealsDescription: 'Add the first meal for this day when you are ready.',
    expandAddMealLabel: '+ Add another meal',
    sinceLastMealLabel: 'Since last meal',
    sinceLastMealDuration: (hours, minutes, seconds) =>
      `${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`,
    sinceLastMealOnCard: (hours, minutes) =>
      minutes === 0
        ? `${hours}h since last meal`
        : `${hours}h ${minutes}m since last meal`,
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
    quickActionImportSharedFoodLabel: 'Shared food',
    mealSoFarLabel: 'This meal so far',
    shareMealCompositionLabel: 'Share this meal',
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
    confirmDeleteNoteLabel: 'Delete this note?',
    confirmDeleteMorningNoteLabel: 'Delete this morning note?',
    confirmDeleteStepsLabel: 'Delete these steps?',
    confirmDeleteWaterLabel: 'Delete this water entry?',
    confirmDeleteDayTotalsLabel: 'Delete these day totals?',
    confirmDeleteNightFoodNoteLabel: 'Delete this night-food note?',
    confirmDeleteNamedLabel: (name) => `Delete ${name}?`,
    confirmDeleteCustomMetricNoteLabel: 'Delete this metric note?',
    fastingWindowToastMessage: (hours, minutes) =>
      minutes === 0
        ? `Your fasting window was ${hours}h.`
        : `Your fasting window was ${hours}h ${minutes}m.`,
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
    deleteStepsLabel: 'Delete steps',
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
    zeppScreenshotHelpLabel: 'About filling from a Zepp screenshot',
    zeppScreenshotHelpText:
      'Choose a screenshot from Zepp Life’s body composition or reached-goals screen. Check the numbers, then save — nothing is recorded until you confirm.',
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
    autoSleepScreenshotHelpLabel: 'About filling from an AutoSleep screenshot',
    autoSleepScreenshotHelpText:
      'Choose a screenshot from AutoSleep (Today or History). Check the hours, then save — nothing is recorded until you confirm.',
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
    nightFoodCardTitle: 'Night food',
    nightFoodCardHint: () => 'Food after going to sleep',
    nextMorningWeightCardTitle: 'Next Morning Weight',
    nextMorningWeightCardHint: 'Weight the following morning',
    nightEatingRememberLabel: () => 'I remember how I ate',
    nightEatingRememberYesOption: 'Yes',
    nightEatingRememberPartialOption: 'Partially',
    nightEatingRememberNoOption: 'No',
    nightEatingReasonLabel: 'Reason',
    nightEatingReasonFieldPlaceholder: 'Why this night food happened',
    saveNightEatingReasonLabel: 'Save reason',
    editNightEatingReasonLabel: 'Edit reason',
    cancelEditNightEatingReasonLabel: 'Cancel editing reason',
    deleteNightEatingReasonLabel: 'Delete reason',
    nightEatingNoEasyLabel: 'Was it easy?',
    nightEatingNoWhatHelpedLabel: 'What helped?',
    nightEatingNoWhatHelpedFieldPlaceholder: 'What helped you stick with it',
    saveNightEatingNoWhatHelpedLabel: 'Save what helped',
    editNightEatingNoWhatHelpedLabel: 'Edit what helped',
    cancelEditNightEatingNoWhatHelpedLabel: 'Cancel editing what helped',
    deleteNightEatingNoWhatHelpedLabel: 'Delete what helped',
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
    cancelEditDayTotalsLabel: 'Cancel editing day totals',
    deleteDayTotalsLabel: 'Delete day totals',
    editDayTotalsLabel: 'Edit day totals',
    expandWaterLabel: 'Show water',
    collapseWaterLabel: 'Hide water',
    mlUnit: 'ml',
    addGlassLabel: '+1 glass (250ml)',
    addBottleLabel: '+1 bottle (500ml)',
    removeWaterEntryLabel: (amount) => `Remove ${amount} entry`,
    editWaterEntryLabel: (amount) => `Edit ${amount} entry`,
    editWaterEntryDialogTitle: 'Edit water',
    waterAmountLabel: 'Amount',
    addItemSheetTitle: 'Add item',
    editItemSheetTitle: 'Edit item',
    closeItemEditorLabel: 'Close item editor',
    editItemLabel: 'Edit item',
  }
