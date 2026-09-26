import type { DailyEntryDict } from '../types/dailyEntry'

export const dailyEntry: DailyEntryDict = {
    morningEntriesTitle: 'Утренние записи',
    eveningEntriesTitle: 'Вечерние записи',
    expandMorningEntriesLabel: 'Показать утренние записи',
    collapseMorningEntriesLabel: 'Скрыть утренние записи',
    expandEveningEntriesLabel: 'Показать вечерние записи',
    collapseEveningEntriesLabel: 'Скрыть вечерние записи',
    expandNightFoodCardLabel: 'Показать ночную еду',
    collapseNightFoodCardLabel: 'Скрыть ночную еду',
    expandNextMorningWeightCardLabel: 'Показать вес следующим утром',
    collapseNextMorningWeightCardLabel: 'Скрыть вес следующим утром',
    weightLabel: 'Вес (кг)',
    addCaloriesLabel: 'ккал/100г',
    addCaloriesPortionLabel: 'ккал',
    addCaloriesPlaceholder: 'ккал',
    macroModeLabel: 'Режим ввода',
    macroModePer100gOption: '100 г',
    macroModePerPortionOption: 'Порция',
    addButton: 'Добавить',
    macrosLabel: 'КБЖУ',
    consumedMacrosLabel: 'Употреблено',
    kcalUnit: 'ккал',
    noteLabel: 'Заметка дня',
    noteFieldPlaceholder: 'Как прошёл день?',
    morningNoteLabel: 'Утренняя заметка',
    morningNoteFieldPlaceholder: 'Что-нибудь про ночь или утро?',
    editWeightLabel: 'Изменить вес',
    editNoteLabel: 'Изменить заметку',
    editMorningNoteLabel: 'Изменить утреннюю заметку',
    saveWeightLabel: 'Сохранить вес',
    saveNoteLabel: 'Сохранить заметку',
    saveMorningNoteLabel: 'Сохранить утреннюю заметку',
    cancelEditWeightLabel: 'Отменить редактирование веса',
    cancelEditNoteLabel: 'Отменить редактирование заметки',
    cancelEditMorningNoteLabel: 'Отменить редактирование утренней заметки',
    deleteNoteLabel: 'Удалить заметку',
    deleteMorningNoteLabel: 'Удалить утреннюю заметку',
    deleteWeightLabel: 'Удалить вес',
    deleteSleepLabel: 'Удалить сон',
    deleteBodyMeasurementsLabel: 'Удалить измерения тела',
    deleteBodyCompositionLabel: 'Удалить состав тела',
    invalidValueMessage: 'Неверное значение.',
    unusualWeightWarning:
      'Необычное значение веса — проверьте, прежде чем сохранить.',
    saveUnusualWeightAnywayLabel: 'Сохранить как есть',
    fixWeightLabel: 'Исправить',
    unusualBodyCompositionWarning:
      'Необычное изменение по сравнению со вчерашним днём — проверьте, прежде чем сохранить.',
    saveUnusualBodyCompositionAnywayLabel: 'Сохранить как есть',
    fixBodyCompositionLabel: 'Исправить',
    unusualDailyCaloriesWarning:
      'Необычно много калорий за один день — проверьте свои записи.',
    mealLabel: (n) => `Приём пищи ${n}`,
    editMealLabel: (n) => `Изменить приём пищи ${n}`,
    cancelEditMealLabel: (n) => `Отменить редактирование приёма пищи ${n}`,
    deleteMealLabel: (n) => `Удалить приём пищи ${n}`,
    deleteWholeMealButton: 'Удалить приём пищи',
    mealDeletedToastMessage: 'Приём пищи удалён.',
    undoDeleteMealButton: 'Отменить',
    editMealScreenTitle: 'Редактировать приём пищи',
    backLabel: 'Назад',
    mealNotFoundText: 'Этот приём пищи не найден.',
    mealLabelFieldLabel: 'Название приёма пищи',
    clearMealLabelFieldLabel: 'Очистить название приёма пищи',
    saveMealNameAsTemplateLabel: 'Сохранить как шаблон',
    mealTypeUnsetLabel: 'Не выбрано',
    defaultMealNamePresets: ['Завтрак', 'Обед', 'Ужин', 'Перекус'],
    saveButton: 'Сохранить',
    saveAndAddAnotherButton: 'Сохранить и добавить ещё',
    mealNoteLabel: 'Заметка о приёме пищи',
    // #480 — meal-aware note placeholder; not the reaction's «Было вкусно?».
    // Known presets use the prepositional («о завтраке»); custom names fall
    // back to the lowercase label as-is.
    mealNotePlaceholder: (mealLabel) => {
      const about: Record<string, string> = {
        Завтрак: 'завтраке',
        Обед: 'обеде',
        Ужин: 'ужине',
        Перекус: 'перекусе',
      }
      return `Заметка о ${about[mealLabel] ?? mealLabel.toLowerCase()}`
    },
    itemNameLabel: 'Название блюда',
    itemNamePlaceholder: 'Создать блюдо?',
    itemBrandLabel: 'Бренд (необязательно)',
    itemBrandPlaceholder: 'например, Ермолино',
    homemadeDishLabel: 'Домашнее',
    itemQuantitySectionLabel: 'Количество',
    itemNutritionSectionLabel: (isPer100g) =>
      isPer100g ? 'Пищевая ценность (на 100 г)' : 'Пищевая ценность',
    itemNoteLabel: 'Заметка (необязательно)',
    itemNotePlaceholder: 'Добавьте заметку...',
    deleteItemLabel: 'Удалить блюдо',
    emotionLabel: (emotion) =>
      emotion === 'happy'
        ? 'Радостно'
        : emotion === 'unhappy'
          ? 'Грустно'
          : 'Нейтрально',
    mealReactionValueLabel: (emotion) =>
      emotion === 'happy' ? 'Да' : emotion === 'unhappy' ? 'Нет' : 'Так себе',
    mealEmotionLabel: (emotion) =>
      emotion === 'thumbsUp'
        ? 'Нравится'
        : emotion === 'thumbsDown'
          ? 'Не понравилось'
          : 'Объедение',
    itemEmotionLabel: 'Реакция',
    dayMoodLabel: 'Настроение за день',
    eatingReasonFieldLabel: 'Почему я сейчас ем?',
    eatingReasonNoneOption: 'Не указано',
    eatingReasonLabel: (reason) =>
      reason === 'hunger'
        ? 'Голод'
        : reason === 'angry'
          ? 'Злость'
          : reason === 'lonely'
            ? 'Одиночество'
            : reason === 'tired'
              ? 'Усталость'
              : reason === 'habit'
                ? 'Привычка'
                : reason === 'craving'
                  ? 'Хочется конкретного продукта'
                  : reason === 'stress'
                    ? 'Стресс / эмоции'
                    : reason === 'boredom'
                      ? 'Скука'
                      : reason === 'company'
                        ? 'Просто за компанию'
                        : reason,
    proteinLabel: 'Белки',
    fatLabel: 'Жиры',
    carbsLabel: 'Углеводы',
    proteinPer100gLabel: 'Белки/100г',
    fatPer100gLabel: 'Жиры/100г',
    carbsPer100gLabel: 'Углеводы/100г',
    fiberLabel: 'Клетчатка',
    sodiumLabel: 'Натрий',
    potassiumLabel: 'Калий',
    magnesiumLabel: 'Магний',
    itemPortionsLabel: '× 100 г',
    itemWeightLabel: 'Вес (г)',
    gramsUnit: 'г',
    mgUnit: 'мг',
    macrosSummary: (protein, fat, carbs) =>
      `Белки ${protein} · Жиры ${fat} · Углеводы ${carbs}`,
    macrosSummaryCompact: (protein, fat, carbs) =>
      `Б ${protein} · Ж ${fat} · У ${carbs}`,
    macrosSummaryWithCalories: (kcal, protein, fat, carbs) =>
      `${kcal} · Белки ${protein} · Жиры ${fat} · Углеводы ${carbs}`,
    macrosSummaryCompactWithCalories: (kcal, protein, fat, carbs) =>
      `${kcal} · Б ${protein} · Ж ${fat} · У ${carbs}`,
    remainingMacrosLabel: 'Осталось',
    expandMacrosLabel: 'Показать калории и БЖУ',
    collapseMacrosLabel: 'Скрыть калории и БЖУ',
    timeEatenLabel: 'Время',
    clearTimeLabel: 'Очистить время',
    clearFoodSearchLabel: 'Очистить поиск',
    addMealLabel: '+ Добавить приём пищи',
    emptyMealsTitle: 'Пока нет приёмов пищи',
    emptyMealsDescription: 'Добавьте первый приём за этот день, когда будете готовы.',
    expandAddMealLabel: '+ Добавить ещё приём пищи',
    sinceLastMealLabel: 'С последнего приёма',
    sinceLastMealDuration: (hours, minutes, seconds) =>
      `${hours} ч ${minutes} м ${String(seconds).padStart(2, '0')} с`,
    sinceLastMealOnCard: (hours, minutes) =>
      minutes === 0
        ? `${hours} ч с последнего приёма`
        : `${hours} ч ${minutes} м с последнего приёма`,
    repeatMealDialogTitle: (mealLabel) => {
      const name = mealLabel.trim()
      return name
        ? `Повторить вчерашний ${name.toLowerCase()}?`
        : 'Повторить вчерашний приём пищи?'
    },
    copyYesterdayMealsLabel: 'Скопировать вчерашние приёмы пищи',
    copyDayMealsDialogTitle: 'Скопировать вчерашние приёмы пищи',
    orDivider: 'или',
    addFoodButton: 'Найти блюдо',
    addFoodDialogTitle: 'Добавить из списка продуктов',
    closeFoodDialogLabel: 'Закрыть',
    scanBarcodeButton: 'Сканировать штрихкод',
    scanBarcodeDialogTitle: 'Сканировать штрихкод',
    scanBarcodeInstructions:
      'Наведите камеру на штрихкод. Нажмите внутри рамки, чтобы сфокусироваться.',
    scanBarcodeCameraErrorMessage: (detail) =>
      `Не удалось получить доступ к камере — проверьте разрешения и попробуйте снова.${detail ? ` (${detail})` : ''}`,
    scanBarcodeSearchingMessage: 'Ищем этот продукт…',
    scanBarcodeStillScanningTip:
      'Всё ещё сканируем — убедитесь, что штрихкод хорошо освещён, в фокусе и полностью помещается в кадр выше. Нажмите на рамку, чтобы перефокусироваться.',
    scanBarcodeTapToFocusLabel: 'Нажмите, чтобы сфокусироваться на штрихкоде',
    scanQrFromPhotoLabel: 'Сканировать из фото',
    scanQrFromPhotoUnreadable:
      'Не удалось прочитать QR-код на этом фото. Попробуйте другой снимок или камеру.',
    scanBarcodeManualLabel: 'Или введите номер штрихкода',
    scanBarcodeManualPlaceholder: 'Номер штрихкода',
    scanBarcodeManualSubmitLabel: 'Найти',
    noFoodFoundForBarcodeMessage:
      'Еда с таким штрихкодом не найдена — вы можете добавить её вручную ниже.',
    itemBarcodeLabel: (code) => `Штрихкод: ${code}`,
    copyBarcodeLabel: 'Скопировать штрихкод',
    barcodeCopiedLabel: 'Скопировано',
    barcodeCopiedToastMessage: 'Штрихкод скопирован в буфер обмена',
    recentFoodsLabel: 'Недавние',
    showAllRecentLabel: 'Показать все',
    collapseRecentLabel: 'Свернуть',
    cantFindItLeadIn: 'Не нашли?',
    cantFindItAddManuallyLabel: 'Добавить вручную',
    quickActionAddFoodLabel: 'Добавить блюдо',
    quickActionImportSharedFoodLabel: 'QR / ссылка',
    mealSoFarLabel: 'Состав приёма пищи',
    shareMealCompositionLabel: 'Поделиться составом приёма пищи',
    selectMealItemLabel: (name) => `Выбрать «${name}»`,
    shareSelectedMealItemsButton: 'Поделиться выбранным',
    cancelMealSelectionButton: 'Отмена',
    createRecipeFromMealButton: 'Создать рецепт',
    createRecipeFromMealTitle: 'Создать рецепт',
    createRecipeFromMealDescription:
      'Выбранные блюда станут одним рецептом. Калории и БЖУ суммируются, а значения на 100 г считаются от общего веса.',
    createRecipeFromMealPer100gLabel: 'На 100 г',
    createRecipeFromMealSaveButton: 'Сохранить рецепт',
    createRecipeExistingRecipesWarning: 'Эти блюда уже есть как рецепты',
    createRecipeCopyExistingNameButton: 'Скопировать название',
    createRecipeCopyExistingNameLabel: (name) =>
      `Скопировать название «${name}»`,
    createRecipeSameIngredientsWarning:
      'Такой набор блюд уже сохранён как рецепт',
    createRecipeTitleTakenWarning: 'Рецепт с таким названием уже есть',
    createRecipeAddToMealTitle: 'Вы создали рецепт',
    createRecipeAddToMealPrompt: (name) =>
      `Добавить «${name}» в этот приём пищи и убрать блюда, из которых он собран?`,
    createRecipeAddToMealYes: 'Добавить',
    createRecipeAddToMealNo: 'Не добавлять',
    wasItTastyLabel: 'Было вкусно?',
    doneAddingMealButton: 'Готово',
    confirmDiscardInProgressMealLabel:
      'Выйти без сохранения? Добавленные здесь блюда будут удалены.',
    confirmDiscardInProgressMealYes: 'Да',
    confirmDiscardInProgressMealNo: 'Нет',
    confirmDiscardEditedMealLabel:
      'Выйти без сохранения? Изменения в этом приёме пищи будут отменены.',
    confirmDeleteItemLabel: 'Убрать это блюдо?',
    confirmDeleteItemYes: 'Убрать',
    confirmDeleteItemNo: 'Отмена',
    confirmDeleteNoteLabel: 'Удалить эту заметку?',
    confirmDeleteMorningNoteLabel: 'Удалить утреннюю заметку?',
    confirmDeleteStepsLabel: 'Удалить эти шаги?',
    confirmDeleteWaterLabel: 'Удалить эту запись воды?',
    confirmDeleteDayTotalsLabel: 'Удалить итоги дня?',
    confirmDeleteNightFoodNoteLabel: 'Удалить эту заметку о ночной еде?',
    confirmDeleteNamedLabel: (name) => `Удалить «${name}»?`,
    confirmDeleteCustomMetricNoteLabel: 'Удалить заметку к метрике?',
    fastingWindowToastMessage: (hours, minutes) =>
      minutes === 0
        ? `Ваше окно голодания составило ${hours} ч.`
        : `Ваше окно голодания составило ${hours} ч ${minutes} м.`,
    foodSearchLabel: 'Поиск продуктов',
    foodSearchPlaceholder: 'Поиск…',
    foodQuantityLabel: 'Количество (г)',
    servingModeLabel: 'Порция',
    gramsModeOption: 'Граммы',
    servingCountLabel: 'Сколько',
    favoriteFoodLabel: (name) => `Добавить «${name}» в избранное`,
    unfavoriteFoodLabel: (name) => `Убрать «${name}» из избранного`,
    noFoodResultsText: 'Ничего не найдено.',
    searchOnlineButton: 'Искать онлайн',
    searchingOnlineLabel: 'Ищем онлайн…',
    onlineFoodResultsHeading: 'Онлайн-результаты',
    noOnlineFoodResultsText: 'Онлайн ничего с калориями не нашлось.',
    searchOnlineOfflineHint: 'Подключитесь к интернету, чтобы искать онлайн.',
    searchOnlineOfflineBundledHint:
      'Нет сети — ищем только во встроенном списке обычных продуктов.',
    onlineFoodUnavailableText:
      'Онлайн-базы продуктов временно недоступны. Попробуйте позже или выберите совпадение из встроенного списка, если оно есть.',
    addSelectedFoodsButton: (n) =>
      n > 1 ? `Добавить выбранное (${n})` : 'Добавить выбранное',
    per100gLabel: 'на 100 г',
    computedTotalPrefix: 'Итого:',
    todayWouldBeLabel: (newTotal, previousTotal) =>
      `Итог за сегодня будет: ${newTotal} (было ${previousTotal})`,
    todayRemainingWouldBeLabel: (newRemaining, previousRemaining) =>
      `Останется: ${newRemaining} (было ${previousRemaining})`,
    macroMismatchNote:
      'Калории не совсем сходятся с указанными белками/жирами/углеводами — стоит перепроверить.',
    lastLoggedLabel: 'в прошлый раз',
    perServingLabel: 'на порцию',
    catalogDeleteDuplicateTitle: (name) =>
      `Удалить лишнюю копию «${name}»?`,
    catalogDeleteDuplicateDescription: 'Строка в списке останется.',
    catalogItemInUseMessage: 'Это есть в дневнике — удалить нельзя.',
    catalogItemInUseDismiss: 'Понятно',
    sleepLabel: 'Сон',
    sleepHoursLabel: 'Часов сна',
    deepSleepLabel: 'Глубокий сон',
    editSleepLabel: 'Изменить сон',
    saveSleepLabel: 'Сохранить сон',
    cancelEditSleepLabel: 'Отменить редактирование сна',
    hoursUnit: 'ч',
    minutesUnit: 'м',
    hoursFieldLabel: 'часов',
    minutesFieldLabel: 'минут',
    sleepSummary: (hours, deepHours) => `${hours} сна · ${deepHours} глубокого`,
    stepsLabel: 'Шаги',
    editStepsLabel: 'Изменить шаги',
    saveStepsLabel: 'Сохранить шаги',
    cancelEditStepsLabel: 'Отменить редактирование шагов',
    deleteStepsLabel: 'Удалить шаги',
    mealsLabel: 'Приёмы пищи',
    expandMealsLabel: 'Показать приёмы пищи',
    collapseMealsLabel: 'Скрыть приёмы пищи',
    bodyMeasurementsLabel: 'Измерения тела',
    editBodyMeasurementsLabel: 'Изменить измерения тела',
    saveBodyMeasurementsLabel: 'Сохранить измерения тела',
    cancelEditBodyMeasurementsLabel: 'Отменить редактирование измерений тела',
    waistLabel: 'Талия',
    hipLabel: 'Бёдра',
    bodyFatLabel: 'Процент жира',
    cmUnit: 'см',
    percentUnit: '%',
    bodyMeasurementsSummary: (waist, hip) => `Талия ${waist} · Бёдра ${hip}`,
    bodyCompositionLabel: 'Состав тела',
    editBodyCompositionLabel: 'Изменить состав тела',
    saveBodyCompositionLabel: 'Сохранить состав тела',
    cancelEditBodyCompositionLabel: 'Отменить редактирование состава тела',
    muscleMassLabel: 'Мышечная масса',
    visceralFatLabel: 'Висцеральный жир',
    bodyWaterLabel: 'Вода в организме',
    boneMassLabel: 'Костная масса',
    kgUnit: 'кг',
    muscleMassShortLabel: 'Мышцы',
    visceralFatShortLabel: 'Висц. жир',
    bodyWaterShortLabel: 'Вода',
    boneMassShortLabel: 'Кости',
    bodyFatShortLabel: 'Жир',
    fillBodyCompositionFromScreenshotLabel: 'Заполнить из скриншота Zepp',
    zeppScreenshotDialogTitle: 'Из скриншота Zepp',
    zeppScreenshotDialogDescription:
      'Проверьте цифры и сохраните. Ничего не запишется, пока вы не подтвердите.',
    zeppScreenshotReadingLabel: 'Читаю скриншот…',
    zeppScreenshotNoValues:
      'Не удалось прочитать состав тела на этом изображении. Нужен скриншот списка измерений Zepp.',
    zeppScreenshotFailed: 'Не удалось прочитать изображение. Попробуйте другой скриншот.',
    zeppScreenshotSaveLabel: 'Сохранить эти числа',
    zeppScreenshotCloseLabel: 'Закрыть',
    zeppScreenshotDateHint: (date) =>
      `На скриншоте дата ${date}. Сохранится на тот день, который сейчас открыт.`,
    zeppScreenshotHelpLabel: 'О заполнении из скриншота Zepp',
    zeppScreenshotHelpText:
      'Выберите скриншот состава тела или достигнутых целей из Zepp Life. Проверьте цифры и сохраните — ничего не запишется, пока вы не подтвердите.',
    fillSleepFromScreenshotLabel: 'Заполнить из скриншота AutoSleep',
    autoSleepScreenshotDialogTitle: 'Из скриншота AutoSleep',
    autoSleepScreenshotDialogDescription:
      'Проверьте цифры и сохраните. Ничего не запишется, пока вы не подтвердите.',
    autoSleepScreenshotReadingLabel: 'Читаю скриншот…',
    autoSleepScreenshotNoValues:
      'Не удалось прочитать сон на этом изображении. Нужен скриншот AutoSleep (Today или History).',
    autoSleepScreenshotFailed: 'Не удалось прочитать изображение. Попробуйте другой скриншот.',
    autoSleepScreenshotSaveLabel: 'Сохранить эти числа',
    autoSleepScreenshotCloseLabel: 'Закрыть',
    autoSleepScreenshotDateHint: (date) =>
      `На скриншоте дата ${date}. Сохранится на тот день, который сейчас открыт.`,
    autoSleepScreenshotHelpLabel: 'О заполнении из скриншота AutoSleep',
    autoSleepScreenshotHelpText:
      'Выберите скриншот AutoSleep (Today или History). Проверьте часы и сохраните — ничего не запишется, пока вы не подтвердите.',
    entryComparisonComparedToYesterday: (arrow, amount) =>
      `${arrow} ${amount} по сравнению со вчера`,
    entryComparisonComparedToDate: (arrow, amount, dateLabel) =>
      `${arrow} ${amount} по сравнению с ${dateLabel}`,
    entryComparisonVsYesterday: (arrow, amount) =>
      `${arrow} ${amount} к вчера`,
    entryComparisonVsDate: (arrow, amount, dateLabel) =>
      `${arrow} ${amount} к ${dateLabel}`,
    entryComparisonVs30DaysAgo: (arrow, amount) =>
      `${arrow} ${amount} к 30 дням назад`,
    entryComparisonInfoLabel: 'Сравнение с предыдущими днями',
    onPeriodLabel: 'Менструация',
    hadConstipationLabel: 'Запор',
    hadConstipationNoOption: 'Нет',
    hadConstipationYesOption: 'Да',
    hadAlcoholLabel: 'Алкоголь',
    hadAlcoholNoOption: 'Нет',
    hadAlcoholYesOption: 'Да',
    nightEatingLabel: (sex) =>
      sex === 'female'
        ? 'Ела поздно вечером'
        : sex === 'male'
          ? 'Ел поздно вечером'
          : 'Ел(а) поздно вечером',
    nightEatingNoOption: 'Нет',
    nightEatingYesOption: 'Да',
    nightFoodCardTitle: 'Ночная еда',
    nightFoodCardHint: (sex) =>
      sex === 'female'
        ? 'Еда после того, как легла спать'
        : sex === 'male'
          ? 'Еда после того, как лёг спать'
          : 'Еда после того, как лёг(ла) спать',
    nextMorningWeightCardTitle: 'Вес следующим утром',
    nextMorningWeightCardHint: 'Вес на следующее утро',
    nightEatingRememberLabel: (sex) =>
      sex === 'female'
        ? 'Помню, как ела'
        : sex === 'male'
          ? 'Помню, как ел'
          : 'Помню, как ел(а)',
    nightEatingRememberYesOption: 'Да',
    nightEatingRememberPartialOption: 'Частично',
    nightEatingRememberNoOption: 'Нет',
    nightEatingReasonLabel: 'Причина',
    nightEatingReasonFieldPlaceholder: 'Почему была ночная еда',
    saveNightEatingReasonLabel: 'Сохранить причину',
    editNightEatingReasonLabel: 'Изменить причину',
    cancelEditNightEatingReasonLabel: 'Отменить редактирование причины',
    deleteNightEatingReasonLabel: 'Удалить причину',
    nightEatingNoEasyLabel: 'Было легко?',
    nightEatingNoWhatHelpedLabel: 'Что помогло?',
    nightEatingNoWhatHelpedFieldPlaceholder: 'Что помогло удержаться',
    saveNightEatingNoWhatHelpedLabel: 'Сохранить, что помогло',
    editNightEatingNoWhatHelpedLabel: 'Изменить, что помогло',
    cancelEditNightEatingNoWhatHelpedLabel:
      'Отменить редактирование того, что помогло',
    deleteNightEatingNoWhatHelpedLabel: 'Удалить, что помогло',
    clearNightEatingOverrideLabel: 'Сбросить',
    waterLabel: 'Вода',
    dayTotalsLabel: 'Итоги дня',
    dayTotalsHint:
      'Без названий блюд — суммируется с приёмами пищи для «Осталось» по калориям и макросам.',
    dayTotalsKcalLabel: 'Калории за день',
    dayTotalsProteinLabel: 'Белки за день',
    dayTotalsFatLabel: 'Жиры за день',
    dayTotalsCarbsLabel: 'Углеводы за день',
    dayTotalsFiberLabel: 'Клетчатка за день',
    expandDayTotalsLabel: 'Показать итоги дня',
    collapseDayTotalsLabel: 'Скрыть итоги дня',
    saveDayTotalsLabel: 'Сохранить итоги дня',
    cancelEditDayTotalsLabel: 'Отменить изменение итогов дня',
    deleteDayTotalsLabel: 'Удалить итоги дня',
    editDayTotalsLabel: 'Изменить итоги дня',
    expandWaterLabel: 'Показать воду',
    collapseWaterLabel: 'Скрыть воду',
    mlUnit: 'мл',
    addGlassLabel: '+1 стакан (250мл)',
    addBottleLabel: '+1 бутылка (500мл)',
    removeWaterEntryLabel: (amount) => `Удалить запись ${amount}`,
    editWaterEntryLabel: (amount) => `Изменить запись ${amount}`,
    editWaterEntryDialogTitle: 'Изменить воду',
    waterAmountLabel: 'Количество',
    addItemSheetTitle: 'Добавить блюдо',
    editItemSheetTitle: 'Редактировать блюдо',
    closeItemEditorLabel: 'Закрыть редактор блюда',
    editItemLabel: 'Редактировать блюдо',
  }
