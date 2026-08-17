import type { Dictionary } from './Dictionary'
import { ruPluralize } from './ruPluralize'

function goalCount(n: number): string {
  return `${n} ${ruPluralize(n, 'цель', 'цели', 'целей')}`
}

function entryCount(n: number): string {
  return `${n} ${ruPluralize(n, 'запись', 'записи', 'записей')}`
}

function dayCount(n: number): string {
  return `${n} ${ruPluralize(n, 'день', 'дня', 'дней')}`
}

export const ru: Dictionary = {
  common: {
    loading: 'Загрузка…',
    weekRangeLabel: (start, end) => `${start} – ${end}`,
    hideSectionLabel: (title) => `Скрыть: ${title}`,
    showSectionLabel: (title) => `Показать: ${title}`,
    kg: 'кг',
    lb: 'фунт',
  },
  error: {
    title: 'Что-то пошло не так',
    description:
      'Произошла непредвиденная ошибка. Ваши данные в безопасности — они хранятся на этом устройстве. Обычно помогает перезагрузка страницы.',
    reloadButton: 'Перезагрузить',
  },
  update: {
    availableText: 'Доступна новая версия.',
    reloadButton: 'Перезагрузить',
    reloadingText: 'Перезагрузка…',
  },
  offline: {
    offlineText:
      'Вы не в сети — данные всё равно сохраняются на этом устройстве.',
  },
  nav: {
    appName: 'Черепашка идёт к цели',
    today: 'День',
    dashboard: 'Обзор',
    history: 'История',
    goal: 'Цель',
    settings: 'Настройки',
    about: 'О проекте',
  },
  today: {
    title: 'День',
    description: 'Ввод данных за день, напоминание о цели на неделю',
    thisWeeksTarget: 'Цель на эту неделю',
    // #527 — positive magnitude + «похудения»; leading minus read as a gain.
    toLose: (unit) => `${unit} похудения`,
    weeklyTargetFromWeight: (weight) => `от ${weight}`,
    emptyGoalTitle: 'Цель ещё не задана',
    emptyGoalDescription: 'Задайте цель на неделю, чтобы увидеть её здесь.',
    setGoalButton: 'Задать цель',
    dateLabel: 'Дата',
    previousDayLabel: 'Предыдущий день',
    nextDayLabel: 'Следующий день',
    jumpToTodayButton: 'Сегодня',
    dayHasEntriesLabel: 'За этот день есть записи',
    startTodayEarlyBanner: 'Уже наступил новый день.',
    startTodayEarlyButton: 'Начать сегодняшний день сейчас',
    goalRenewalReminder:
      'Цель на эту неделю пора обновить — стоит заглянуть и проверить.',
    reviewGoalLink: 'Посмотреть цель',
    targetMetBanner: (weekEndDate) =>
      `Вы достигли цели на эту неделю — держитесь до конца ${weekEndDate}, чтобы получить значок!`,
    dailyReminderText: 'Сегодня пока нет записи — когда будете готовы.',
    dailyReminderNotificationTitle: 'Черепашка идёт к цели',
    dailyReminderNotificationBody:
      'Небольшое напоминание внести запись за сегодня, когда будете готовы.',
    targetMetSectionTitle: 'Цель достигнута',
    goalRenewalReminderSectionTitle: 'Напоминание об обновлении цели',
    dailyReminderSectionTitle: 'Ежедневное напоминание',
    importDayTitle: 'Добавить запись за этот день?',
    importDayDescription: (date) =>
      `Пустые поля за ${date} заполнятся. Уже записанное останется, если вы не выберете замену.`,
    importDayDisabled:
      'Включите «Другая копия» в Настройках, чтобы принимать запись за день.',
    importDayFillCount: (n) =>
      n === 1
        ? 'Заполнится 1 пустое поле.'
        : n < 5
          ? `Заполнятся ${n} пустых поля.`
          : `Заполнятся ${n} пустых полей.`,
    importDayConflictCount: (n) =>
      n === 1
        ? '1 поле уже заполнено другим значением:'
        : n < 5
          ? `${n} поля уже заполнены другим значением:`
          : `${n} полей уже заполнены другим значением:`,
    importDayMealCount: (add, skip) =>
      `Приёмов пищи добавить: ${add}${skip ? `, уже есть и пропущены: ${skip}` : ''}.`,
    importDayWaterCount: (add, skip) =>
      `Записей воды добавить: ${add}${skip ? `, уже есть и пропущены: ${skip}` : ''}.`,
    importDayNothingToApply: 'В этой копии уже есть всё из этого сниппета.',
    importDayAddMissing: 'Добавить недостающее',
    importDayAddAndReplace: 'Добавить и заменить перечисленное',
    importDayCancel: 'Отмена',
    sendDayLogLabel: 'Отправить или принять запись за день',
    sendDayDialogTitle: 'Запись за день',
    sendDayDialogDescription:
      'Отправьте весь день в другую копию Turtle Steps или вставьте полученную ссылку.',
    sendDayWholeDayLabel: 'Весь день',
    sendDayCopyButton: 'Копировать ссылку',
    sendDayShareButton: 'Поделиться',
    sendDayCopied: 'Скопировано',
    sendDayShareFailed: 'Не удалось поделиться. Скопируйте ссылку.',
    sendDayNothingLogged: 'За этот день пока ничего не записано.',
    sendDayShareTitle: (date) => `Черепашка идёт к цели — ${date}`,
    sendDayShareText: (date) => `Запись за ${date}`,
    sendDayQrAlt: 'QR-код записи за этот день',
    sendDayQrHint: 'Наведите камеру другого телефона, чтобы посмотреть этот день.',
    sendDayQrTooLarge:
      'Запись за день слишком большая для надёжного QR-кода. Скопируйте ссылку или поделитесь ею.',
    receiveDayPasteLabel: 'Вставить ссылку',
    receiveDayPastePlaceholder: 'Вставьте ссылку на день из Turtle Steps',
    receiveDayPasteSubmit: 'Посмотреть',
    receiveDayPasteInvalid: 'Это не похоже на запись за день из Turtle Steps.',
    receiveDayScanQrButton: 'Сканировать QR-код',
    receiveDayScanQrTitle: 'Сканировать запись за день',
    receiveDayScanQrInstructions:
      'Наведите камеру на QR на другом телефоне или выберите фото с ним.',
    receiveDayScanIsFood:
      'Этот QR — общее блюдо, а не запись за день. Импортируйте его в Настройках → Блюда.',
    receiveDayScanUnreadable:
      'Не удалось прочитать это как запись за день. Попробуйте снова или вставьте ссылку.',
    nutritionFactsSectionTitle: 'Заметки о питании',
    vsYesterdayLabel: 'по сравнению со вчера',
    vsMaxWeightLabel: 'по сравнению с максимальным весом',
    remainingCaloriesLabel: 'Осталось калорий',
    kcalRemainingUnit: 'ккал осталось',
    kcalOverUnit: 'ккал сверх нормы',
    remainingProteinLabel: 'Осталось белка',
    gRemainingUnit: 'г осталось',
    remainingFatLabel: 'Осталось жиров',
    remainingCarbLabel: 'Осталось углеводов',
    remainingFiberLabel: 'Осталось клетчатки',
    remainingSodiumLabel: 'Осталось натрия',
    remainingPotassiumLabel: 'Осталось калия',
    remainingMagnesiumLabel: 'Осталось магния',
    mgRemainingUnit: 'мг осталось',
    mgOverUnit: 'мг сверх',
    reorderCardLabel: (n) => `Изменить порядок карточки ${n}`,
    reorderCardsButton: 'Порядок карточек',
    resetCardOrderButton: 'Сбросить порядок',
    statsSectionLabel: 'Показатели',
    expandStatsLabel: 'Показать показатели',
    collapseStatsLabel: 'Скрыть показатели',
    collapseAllSectionsLabel: 'Свернуть все',
    expandAllSectionsLabel: 'Развернуть все',
    targetMinusConsumedText: (target, consumed) => `${target} − ${consumed}`,
    proteinOverTargetLabel: (target, consumed) =>
      `${target} − ${consumed} — отличная работа!`,
    gOverUnit: 'г больше нормы',
    remainingWaterLabel: 'Осталось воды',
    mlRemainingUnit: 'мл осталось',
    mlOverUnit: 'мл больше нормы',
    bmiLabel: 'ИМТ',
    bmrLabel: 'Примерная суточная норма калорий (базовый обмен)',
    bmrUnit: 'ккал/день',
    bmrTooltipLabel: 'О примерной суточной норме калорий',
    celebrationTitle: 'Вы достигли цели на эту неделю!',
    celebrationDescription: (weekEndDate) =>
      `Держитесь до конца ${weekEndDate}, чтобы получить значок.`,
    celebrationCta: 'Посмотреть цель',
    celebrationCloseLabel: 'Закрыть',
    celebrationCompleteTitle: 'Вы выполнили недельную цель!',
    celebrationCompleteDescription:
      'Поздравляем! Готовы поставить следующий маленький шаг?',
    celebrationCompleteCta: 'Задать цель на следующую неделю',
    deepSleepDescription: (hours) => `${hours} глубокого сна`,
  },
  dailyEntry: {
    morningEntriesTitle: 'Утренние записи',
    // #528 — было «Заполните…» (звучало как обязательное).
    morningEntriesSubtitle:
      'Эти поля заполнять не обязательно. Ненужные можно отключить в настройках.',
    eveningEntriesTitle: 'Вечерние записи',
    eveningEntriesSubtitle:
      'Эти поля заполнять не обязательно. Ненужные можно отключить в настройках.',
    expandMorningEntriesLabel: 'Показать утренние записи',
    collapseMorningEntriesLabel: 'Скрыть утренние записи',
    expandEveningEntriesLabel: 'Показать вечерние записи',
    collapseEveningEntriesLabel: 'Скрыть вечерние записи',
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
    editWeightLabel: 'Изменить вес',
    editNoteLabel: 'Изменить заметку',
    saveWeightLabel: 'Сохранить вес',
    saveNoteLabel: 'Сохранить заметку',
    cancelEditWeightLabel: 'Отменить редактирование веса',
    cancelEditNoteLabel: 'Отменить редактирование заметки',
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
    expandAddMealLabel: '+ Добавить ещё приём пищи',
    repeatMealLabel: (mealLabel) => `Повторить вчерашний «${mealLabel}»`,
    repeatMealDialogTitle: (mealLabel) => `Повторить «${mealLabel}»`,
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
    cantFindItAddManuallyLabel: 'Не нашли? Добавить вручную',
    quickActionAddFoodLabel: 'Добавить блюдо',
    mealSoFarLabel: 'Состав приёма пищи',
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
    fastingWindowToastMessage: (hours) =>
      `Ваше окно голодания составило ${hours}.`,
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
    clearDayTotalsLabel: 'Очистить',
    editDayTotalsLabel: 'Изменить',
    expandWaterLabel: 'Показать воду',
    collapseWaterLabel: 'Скрыть воду',
    mlUnit: 'мл',
    addGlassLabel: '+1 стакан (250мл)',
    addBottleLabel: '+1 бутылка (500мл)',
    removeWaterEntryLabel: (amount) => `Удалить запись ${amount}`,
    addItemSheetTitle: 'Добавить блюдо',
    editItemSheetTitle: 'Редактировать блюдо',
    closeItemEditorLabel: 'Закрыть редактор блюда',
    editItemLabel: 'Редактировать блюдо',
  },
  goal: {
    title: 'Цель',
    description:
      'Цель на эту неделю — маленькие шаги, обновляется каждую неделю',
    thisWeeksTarget: 'Цель на эту неделю',
    targetLabel: (unit) => `Цель на эту неделю (${unit} похудения)`,
    targetRequired: 'Укажите цель на неделю больше 0',
    deficitEstimate: (kcal, direction) =>
      `Примерная оценка: около ${kcal} ккал/день ${direction === 'deficit' ? 'дефицита' : 'профицита'}.`,
    deficitCaveat:
      'Это простая арифметическая оценка (~7700 ккал ≈ 1 кг жира), не медицинская и не диетологическая рекомендация.',
    paceCaloriesMismatchHint:
      'Дневные калории и темп недели не совпадают (одно похоже на похудение, другое — на поддержание или набор). Используйте «Пересчитать по калориям» или «по темпу недели» — поля сами не меняются.',
    decreaseWeeklyTargetLabel: 'Уменьшить цель на неделю',
    increaseWeeklyTargetLabel: 'Увеличить цель на неделю',
    weeklyTargetStepHint: (step, unit) =>
      `Кнопки ± меняют на ${step} ${unit}, или введите своё значение.`,
    aggressivePaceWarning: (kcal) =>
      `Это очень быстрый темп (около ${kcal} ккал дефицита в день). Обычно ориентируются на 0,5–1 кг в неделю — сохранить всё равно можно, если вы так задумали.`,
    weekStartDateLabel: 'Начинается',
    weekStartDateHint:
      'По умолчанию — сегодня (или завтра, если вы начинаете новую цель в день окончания предыдущей). Можно выбрать любую дату: пересечение с предыдущей целью только предупредит, сохранение не блокирует.',
    goalWindowOverlapWarning:
      'Этот период пересекается с предыдущей целью. Сохранить всё равно можно — просто проверьте, что даты верные.',
    weekEndDateLabel: 'Заканчивается',
    weekEndDateHint:
      'По умолчанию — через 7 дней после начала недели. Измените дату, если ваша неделя должна заканчиваться в другой день.',
    dailyCalorieTargetLabel: 'Дневная цель по калориям',
    dailyCalorieTargetHint: 'Необязательно — можно оставить пустым.',
    dailyProteinTargetLabel: 'Дневная цель по белку',
    dailyProteinTargetHint: 'Необязательно — можно оставить пустым.',
    dailyFatTargetLabel: 'Дневная цель по жирам',
    dailyFatTargetHint: 'Необязательно — можно оставить пустым.',
    dailyCarbTargetLabel: 'Дневная цель по углеводам',
    dailyCarbTargetHint: 'Необязательно — можно оставить пустым.',
    dailyFiberTargetLabel: 'Дневная цель по клетчатке',
    dailyFiberTargetHint: 'Необязательно — можно оставить пустым.',
    useFiberSuggestionButton: 'Подставить рекомендуемую клетчатку',
    fiberSuggestionHint: (grams) =>
      `Обычный ориентир для взрослых — около ${grams} г/день (грубая оценка, не медицинский совет).`,
    dailySodiumTargetLabel: 'Дневная цель по натрию',
    dailySodiumTargetHint: 'Необязательно — можно оставить пустым.',
    dailyPotassiumTargetLabel: 'Дневная цель по калию',
    dailyPotassiumTargetHint: 'Необязательно — можно оставить пустым.',
    dailyMagnesiumTargetLabel: 'Дневная цель по магнию',
    dailyMagnesiumTargetHint: 'Необязательно — можно оставить пустым.',
    dailyWaterTargetLabel: 'Дневная цель по воде',
    dailyWaterTargetHint: 'Необязательно — можно оставить пустым.',
    useWaterRecommendationButton: 'Подставить среднее из рекомендации',
    waterRecommendationGoalHint: (low, high) =>
      `По последнему весу: примерно ${low}–${high} л/день (не медицинская рекомендация).`,
    suggestTargetButton: 'Предложить цель',
    suggestTargetCaveat:
      'Заполняет четыре поля ниже на основе веса, роста, возраста, пола и уровня активности — это не медицинская или диетическая рекомендация. Проверьте и при необходимости измените значения перед сохранением.',
    suggestTargetMissingProfileHint:
      'Чтобы использовать это, запишите вес и укажите рост, возраст, пол и уровень активности в настройках.',
    recalculateFromPaceButton: 'Пересчитать по темпу недели',
    recalculateFromCaloriesButton: 'Пересчитать по калориям',
    recalculateFromFieldCaveat:
      'Грубая оценка по вашему профилю — не медицинская рекомендация. Проверьте перед сохранением.',
    updateButton: 'Обновить цель на неделю',
    setButton: 'Задать цель на неделю',
    cancelButton: 'Отмена',
    confirmDiscardEditsLabel: 'Уйти без сохранения изменений цели?',
    startNewGoalButton: 'Начать новую цель',
    startNewGoalHint:
      'Начинает новое окно (по умолчанию с сегодня). Если оно пересекается с предыдущей целью, появится предупреждение — сохранить всё равно можно.',
    startNewGoalAvailableFromLabel: (weekEndDate) =>
      `Станет доступно, когда закончится цель на эту неделю, ${weekEndDate}`,
    savedConfirmation: 'Сохранено',
    currentGoalTitle: 'Текущая цель',
    notSetLabel: 'Не задано',
    editGoalLabel: 'Редактировать цель',
    deleteGoalLabel: 'Удалить цель',
    confirmDeleteGoalLabel: 'Удалить эту цель? Это действие нельзя отменить.',
    pastTargetsTitle: 'Прошлые цели',
    weekColumnLabel: 'Неделя',
    targetColumnLabel: 'Цель',
    statusColumnLabel: 'Статус',
    targetPerWeek: (target, unit) => `${target} ${unit}/неделю`,
    targetMetLabel: 'Цель достигнута',
    targetMetOnLabel: (date) => `Цель достигнута ${date}`,
    targetMissedLabel: 'Цель не достигнута',
    targetNoDataLabel: 'Недостаточно данных',
    previousToCurrentWeightLabel: (previous, current, unit) =>
      `${previous} → ${current} ${unit}`,
    activeGoalReachedNudge: (weekEndDate) =>
      `Вы достигли цели на эту неделю — держитесь до конца ${weekEndDate}, чтобы получить значок!`,
    activeGoalReachedSectionTitle: 'Цель достигнута',
    goalCompletedNudge:
      'Вы выполнили цель на эту неделю! Начните новую ниже, когда будете готовы.',
    goalCompletedSectionTitle: 'Цель выполнена',
    goalMissedNudge:
      'Цель на эту неделю не достигнута — это нормально. Начните новую ниже, когда будете готовы.',
    goalMissedSectionTitle: 'Итог недели',
    paceCheckMessage: (actual, target) =>
      `За последние недели изменение веса составило около ${actual} при целевых ${target} — возможно, стоит скорректировать недельный темп.`,
    paceCheckPerWeekLabel: (value, unit) => `${value} ${unit}/нед.`,
    paceCheckSectionTitle: 'Проверка темпа',
    deletePastTargetLabel: (weekRange) => `Удалить цель за ${weekRange}`,
    confirmDeletePastTargetLabel: 'Удалить эту цель?',
    confirmDeletePastTargetYes: 'Удалить',
    confirmDeletePastTargetNo: 'Отмена',
  },
  weeklyReview: {
    screenTitle: 'Обзор недели',
    screenDescription:
      'Спокойный взгляд на эту неделю — без баллов, без стыда, просто как обстоят дела.',
    viewWeeklyReviewButton: 'Обзор недели',
    backToGoalLabel: '← Цель',
    noActiveGoalMessage: 'Задайте недельную цель на странице «Цель», чтобы увидеть обзор здесь.',
    progressSectionLabel: 'Прогресс за эту неделю',
    progressMetLabel: (date) => `Цель достигнута ${date}.`,
    progressNotYetLabel: 'Цель этой недели ещё не достигнута — спешить некуда.',
    progressNoBaselineYetMessage:
      'Пока нет взвешивания в начале этой недели — прогресс появится, как только оно будет.',
    averagesSectionLabel: 'Среднее за неделю',
    averagesSummary: (kcal, protein) => `${kcal} ккал/день, ${protein} белка/день.`,
    noAveragesYetMessage: 'На этой неделе пока ничего не внесено.',
    insightSectionLabel: 'Что выделяется',
    adjustPaceButton: 'Скорректировать темп на следующую неделю',
  },
  pdfSummary: {
    documentTitle: 'Черепашка идёт к цели — сводка',
    rangeLabel: (start, end) => `${start} – ${end}`,
    generatedOnLabel: (date) => `Создано ${date}`,
    weightTrendSectionTitle: 'Динамика веса',
    noWeightDataMessage: 'За этот период вес не внесён.',
    weeklyAveragesSectionTitle: 'Средние по неделям',
    weekColumnHeader: 'Неделя',
    avgWeightColumnHeader: (unit) => `Средний вес (${unit})`,
    weightChangeColumnHeader: 'Изменение к прошлой неделе',
    avgCaloriesColumnHeader: 'Средние калории',
    noWeeklyDataMessage: 'За этот период нет полных недель с записями.',
    bodyMeasurementsSectionTitle: 'Замеры тела (последние)',
    waistLabel: (value, date) => `Талия: ${value} см (${date})`,
    hipLabel: (value, date) => `Бёдра: ${value} см (${date})`,
    bodyFatLabel: (value, date) => `Процент жира: ${value}% (${date})`,
    bodyCompositionSectionTitle: 'Состав тела (последние)',
    muscleMassLabel: (value, date) => `Мышечная масса: ${value} кг (${date})`,
    visceralFatLabel: (value, date) => `Висцеральный жир: ${value} (${date})`,
    bodyWaterLabel: (value, date) => `Вода в организме: ${value}% (${date})`,
    boneMassLabel: (value, date) => `Костная масса: ${value} кг (${date})`,
    averageValueLabel: (name, value, days) =>
      `${name}: в среднем ${value} (дней с записями: ${days})`,
    averageValueOnlyLabel: (value, days) =>
      `В среднем: ${value} (дней с записями: ${days})`,
    daySignalsSectionTitle: 'Дневные показатели',
    daySignalLabel: (name, trueDays, loggedDays) =>
      `${name}: ${trueDays} из ${loggedDays} дней с записями`,
    customMetricsSectionTitle: 'Свои показатели',
    disclaimer:
      'Этот документ — личная сводка, сформированная на основе самостоятельно внесённых данных в приложении «Черепашка идёт к цели». Это не медицинская рекомендация — за консультацией о состоянии здоровья обратитесь к врачу.',
  },
  export: {
    title: 'Экспорт',
    description: 'Экспорт и импорт резервной копии в формате JSON',
    exportBlurb:
      'Скачайте все цели и записи в одном JSON-файле. Это единственный способ резервного копирования, так как все данные хранятся только на этом устройстве.',
    exportButton: 'Экспортировать копию',
    exportingButton: 'Экспорт…',
    importBlurb:
      'Восстановите данные из ранее экспортированного файла. Это объединяется с текущими данными (совпадающие по дате записи обновляются, ничего не удаляется).',
    importButton: 'Импортировать копию',
    importingButton: 'Импорт…',
    summary: (goals, entries) => `${goalCount(goals)} и ${entryCount(entries)}`,
    exportedSummary: (summary) => `Экспортировано: ${summary}.`,
    lastBackupNeverLabel: 'Вы ещё не создавали резервную копию.',
    lastBackupAgoLabel: (days) =>
      days === 0
        ? 'Последняя резервная копия: сегодня.'
        : days === 1
          ? 'Последняя резервная копия: вчера.'
          : `Последняя резервная копия: ${dayCount(days)} назад.`,
    backupReminderGoToExportLabel: 'Перейти к экспорту',
    dismissBackupReminderLabel: 'Скрыть напоминание о резервной копии',
    exportedCsvSummary: (entries) => `Экспортировано: ${entryCount(entries)}.`,
    importedSummary: (summary) => `Импортировано: ${summary}.`,
    invalidBackup: 'Этот файл не похож на резервную копию Turtle Steps.',
    notValidJson: 'Этот файл не является корректным JSON.',
    exportFailed: 'Не удалось выполнить экспорт.',
    importFailed: 'Не удалось выполнить импорт.',
    fileTooLarge: 'Этот файл слишком большой для импорта (максимум 200 МБ).',
    exportPeriodLabel: 'Период экспорта',
    exportPeriodDescription:
      'Необязательно — применяется к Excel, CSV и Markdown ниже, а также к экспорту копии за период ниже, но не к полной резервной копии JSON выше. Оставьте пустым, чтобы экспортировать всё.',
    exportRangedBackupBlurb:
      'Скачайте резервную копию JSON только за период выше, а не за всю историю — удобно, чтобы поделиться или сохранить часть данных, не выгружая всё. Не заменяет полную резервную копию выше — она остаётся единственным гарантированно полным источником для восстановления.',
    exportRangedBackupButton: 'Экспортировать копию за период',
    exportingRangedBackupButton: 'Экспорт…',
    encryptedBackupBlurb:
      'Защитите сам файл резервной копии паролем — например, прежде чем он окажется в папке загрузок или синхронизируемой с облаком папке. Обычная копия выше работает точно так же, независимо от этого.',
    exportEncryptedButton: 'Зашифрованная копия',
    exportedEncryptedSummary: 'Зашифрованная резервная копия скачана.',
    exportEncryptedFailed: 'Не удалось создать зашифрованную резервную копию.',
    encryptedExportDialogTitle: 'Задайте пароль для копии',
    encryptedExportDialogDescription:
      'Этот пароль шифрует скачиваемый файл. Введите его дважды, чтобы не ошибиться.',
    encryptedBackupUnrecoverableWarning:
      'Если вы забудете этот пароль, копию нельзя будет восстановить — сброса или обходного пути нет.',
    encryptedBackupPasswordLabel: 'Пароль',
    encryptedBackupConfirmPasswordLabel: 'Подтвердите пароль',
    encryptedBackupPasswordMismatch: 'Пароли не совпадают.',
    encryptingBackupButton: 'Шифрование…',
    encryptedExportSubmitButton: 'Зашифровать и скачать',
    closeEncryptedDialogLabel: 'Закрыть',
    encryptedImportDialogTitle: 'Введите пароль резервной копии',
    encryptedImportDialogDescription:
      'Этот файл резервной копии защищён паролем. Введите пароль, которым он был зашифрован.',
    decryptingBackupButton: 'Расшифровка…',
    encryptedImportSubmitButton: 'Расшифровать и импортировать',
    wrongEncryptedBackupPassword:
      'Неверный пароль или файл повреждён.',
    exportPdfBlurb:
      'Скачайте сводку на одну страницу PDF — динамика веса, средние по неделям и замеры тела, если они внесены — чтобы поделиться за пределами приложения, например с врачом.',
    exportPdfButton: 'Экспорт PDF-сводки',
    exportingPdfButton: 'Формирование…',
    exportedPdfSummary: 'PDF-сводка скачана.',
    exportPdfFailed: 'Не удалось создать PDF-сводку.',
    exportPdfRangeLabel: 'Сводка охватывает',
    exportPdfRange30Label: 'Последние 30 дней',
    exportPdfRange90Label: 'Последние 90 дней',
    pdfSectionsDialogTitle: 'Выберите, что включить',
    pdfSectionsDialogDescription:
      'Выберите, какие разделы войдут в PDF. Отказ от медицинской ответственности включается всегда.',
    pdfSectionWeightTrendLabel: 'Динамика веса',
    pdfSectionWeeklyAveragesLabel: 'Средние по неделям',
    pdfSectionBodyMeasurementsLabel: 'Замеры тела',
    pdfSectionsGenerateButton: 'Создать PDF',
    closePdfSectionsDialogLabel: 'Закрыть',
    pdfSectionsCustomMetricsGroupLabel: 'Свои показатели',
    pdfSectionDisabledNotTrackedTooltip:
      'Сейчас не отслеживается — включите в настройках «Что отслеживать», чтобы добавить.',
    pdfSectionDisabledNoDataTooltip:
      'За выбранный период нет данных по этому показателю.',
    pdfSectionDisabledTooltipLabel: 'Почему это недоступно',
    exportExcelBlurb:
      'Скачайте свои данные в формате Excel для просмотра или анализа — это не резервная копия, импортировать её обратно нельзя.',
    exportExcelButton: 'Экспорт в Excel',
    exportingExcelButton: 'Экспорт…',
    exportExcelFailed: 'Не удалось выполнить экспорт в Excel.',
    exportCsvBlurb:
      'Скачайте свой дневник в формате CSV — компактная табличная форма, удобна для просмотра или чтобы вставить в ИИ-ассистента для анализа.',
    exportCsvButton: 'Экспорт в CSV',
    exportingCsvButton: 'Экспорт…',
    exportCsvFailed: 'Не удалось выполнить экспорт в CSV.',
    exportCsvLlmTooltip:
      'CSV — лучший формат, чтобы вставить в LLM (например, ChatGPT или Claude), если хотите получить анализ данных — он компактный и ИИ-инструменты читают его точнее всего.',
    exportCsvLlmTooltipLabel: 'Почему CSV для анализа в ИИ',
    exportMarkdownBlurb:
      'Скачайте свой дневник в формате Markdown — табличный формат, который хорошо читается в текстовых редакторах и приложениях для заметок.',
    exportMarkdownButton: 'Экспорт в Markdown',
    exportingMarkdownButton: 'Экспорт…',
    exportMarkdownFailed: 'Не удалось выполнить экспорт в Markdown.',
    exportedMarkdownSummary: (entries) =>
      `Экспортировано в Markdown: ${entryCount(entries)}.`,
    storageUsedLabel: (size) => `~${size} использовано на этом устройстве`,
    storageUsedOfQuotaLabel: (used, quota) =>
      `~${used} использовано из ~${quota}, доступных на этом устройстве`,
    dataToImportLabel: 'Данные для импорта',
    importConflictModeLabel: 'Если за день уже есть значение',
    importConflictModeDescription:
      '«Только пустые» сохраняет то, что вы уже записали или исправили. «Заменить импортом» подставляет значения из файла — когда данные с устройства должны быть главными.',
    importConflictModeFillGaps: 'Только пустые',
    importConflictModeOverwrite: 'Заменить импортом',
  },
  zeppLifeImport: {
    importBlurb:
      'Импортируйте вес, состав тела и количество шагов из файла экспорта Zepp Life.',
    howToExportLabel: 'Как получить этот файл?',
    howToExportSteps:
      'В приложении Zepp Life: Профиль → Настройки → Личная информация, безопасность и конфиденциальность → Реализация прав пользователя → экспорт данных. Придёт на почту в виде защищённого паролем zip-архива.',
    importButton: 'Импорт из Zepp Life',
    importingButton: 'Импорт…',
    importedSummary: (days, updated) =>
      `Импортированы данные за ${dayCount(days)} из Zepp Life (обновлено записей: ${updated}).`,
    importedNothingSummary:
      'В этом экспорте не оказалось данных о весе или шагах для импорта.',
    invalidFile: 'Это не похоже на файл экспорта Zepp Life.',
    importFailed: 'Не удалось выполнить импорт.',
    closeDialogLabel: 'Закрыть',
    passwordDialogTitle: 'Введите пароль от экспорта',
    passwordDialogDescription:
      'Это пароль из письма с экспортом от Zepp Life — не пароль от вашего аккаунта Zepp.',
    passwordLabel: 'Пароль',
    passwordSubmitButton: 'Разблокировать и импортировать',
    wrongPassword:
      'Пароль не подошёл — проверьте письмо с экспортом и попробуйте снова.',
    profileDialogTitle: 'Чьи измерения с весов?',
    profileDialogDescription:
      'В этом экспорте есть измерения для более чем одного роста — так бывает, когда общие весы синхронизируются в один аккаунт Zepp. Выберите, чьи данные импортировать.',
    profileOptionLabel: ({
      heightCm,
      minWeightKg,
      maxWeightKg,
      readingCount,
      nickName,
    }) => {
      const readings = `${readingCount} ${ruPluralize(readingCount, 'измерение', 'измерения', 'измерений')}`
      const base = `${heightCm} см · ${minWeightKg}–${maxWeightKg} кг · ${readings}`
      return nickName ? `${base} · ${nickName}` : base
    },
    profileSubmitButton: 'Импортировать выбранные',
  },
  appleHealthImport: {
    importBlurb:
      'Импортируйте вес, процент жира, обхват талии, воду, сон и шаги из файла экспорта Apple Health.',
    howToExportLabel: 'Как получить этот файл?',
    howToExportSteps:
      'В приложении «Здоровье»: значок профиля (вверху справа) → «Экспортировать все данные». Для большого экспорта обработка может занять некоторое время.',
    importButton: 'Импорт из Apple Health',
    importingButton: (percent) => `Импорт… ${percent}%`,
    importedSummary: (days, updated) =>
      `Импортированы данные за ${dayCount(days)} из Apple Health (обновлено записей: ${updated}).`,
    importedNothingSummary:
      'В этом экспорте не оказалось данных, которые отслеживает это приложение.',
    invalidFile: 'Это не похоже на файл экспорта Apple Health.',
    importFailed: 'Не удалось выполнить импорт.',
  },
  myFitnessPalImport: {
    importBlurb:
      'Импортируйте историю приёмов пищи и веса из выгрузки данных MyFitnessPal.',
    howToExportLabel: 'Как получить этот файл?',
    howToExportSteps:
      'Запросите выгрузку данных (Data Access Request) на myfitnesspal.com → Settings → Privacy Center → Manage My Data — эта функция доступна только с подпиской Premium. Если она недоступна на вашем аккаунте, можно написать напрямую в поддержку MyFitnessPal с просьбой предоставить ваши данные. Файл придёт на почту в формате .xlsx, часто с паролем — пароль указан в том же письме. Подготовка может занять несколько дней.',
    importButton: 'Импорт из MyFitnessPal',
    importingButton: 'Импорт…',
    importedSummary: (days, updated) =>
      `Импортированы данные за ${dayCount(days)} из MyFitnessPal (обновлено записей: ${updated}).`,
    importedNothingSummary:
      'В этом экспорте не оказалось данных о приёмах пищи или весе для импорта.',
    invalidFile: 'Это не похоже на файл экспорта MyFitnessPal.',
    importFailed: 'Не удалось выполнить импорт.',
    closeDialogLabel: 'Закрыть',
    passwordDialogTitle: 'Введите пароль экспорта',
    passwordDialogDescription:
      'Это пароль из письма с выгрузкой MyFitnessPal — не пароль от вашего аккаунта MyFitnessPal.',
    passwordLabel: 'Пароль',
    passwordSubmitButton: 'Разблокировать и импортировать',
    wrongPassword:
      'Этот пароль не подошёл — проверьте письмо с выгрузкой и попробуйте снова.',
    slotTimesDialogTitle: 'Время приёмов пищи по умолчанию',
    slotTimesDialogDescription:
      'В выгрузке MyFitnessPal нет времени на часах. Укажите, когда должны быть Завтрак, Обед, Перекус и Ужин для этого импорта — сохранится для следующих раз.',
    slotTimesImportButton: 'Импортировать',
    slotTimesContinueButton: 'Далее',
  },
  exportXlsx: {
    dailyLogSheetName: 'Дневник',
    mealsSheetName: 'Приёмы пищи',
    goalsSheetName: 'Цели',
    dateColumn: 'Дата',
    weightColumn: 'Вес (кг)',
    caloriesColumn: 'Калории (ккал)',
    proteinColumn: 'Белки (г)',
    fatColumn: 'Жиры (г)',
    carbsColumn: 'Углеводы (г)',
    sleepHoursColumn: 'Сон (ч)',
    deepSleepHoursColumn: 'Глубокий сон (ч)',
    stepsColumn: 'Шаги',
    waistColumn: 'Талия (см)',
    hipColumn: 'Бёдра (см)',
    bodyFatColumn: 'Процент жира (%)',
    moodColumn: 'Настроение',
    noteColumn: 'Заметка',
    onPeriodColumn: 'Менструация',
    hadConstipationColumn: 'Запор',
    hadAlcoholColumn: 'Алкоголь',
    nightEatingColumn: (sex) =>
      sex === 'female'
        ? 'Ела поздно вечером'
        : sex === 'male'
          ? 'Ел поздно вечером'
          : 'Ел(а) поздно вечером',
    waterColumn: 'Вода (мл)',
    mealColumn: 'Приём пищи',
    itemColumn: 'Блюдо',
    brandColumn: 'Бренд',
    gramsColumn: 'Граммы',
    timeColumn: 'Время',
    reactionColumn: 'Реакция',
    createdColumn: 'Создано',
    weeklyTargetColumn: 'Цель на неделю (кг)',
  },
  dashboard: {
    title: 'Обзор',
    description:
      'График веса, график калорий, карточки недельной сводки, корреляции',
    reorderSectionLabel: (n: number) => `Изменить порядок раздела ${n}`,
    reorderSectionsButton: 'Порядок разделов',
    resetSectionOrderButton: 'Сбросить порядок',
    weightLegend: 'вес',
    caloriesLegend: 'калории',
    rollingAverageLegend: 'среднее за 7 дней',
    trendChartEmptyDescription:
      'Выберите хотя бы один показатель для отображения.',
    notEnoughTrendDataMessage:
      'Пока недостаточно данных, чтобы показать тенденцию — добавьте ещё несколько дней и загляните позже.',
    dashboardSectionEmptyDescription:
      'Пока здесь нечего показать — продолжайте вести дневник или расширьте период, если вы его сузили.',
    trendChartPeriodLabel: 'Период',
    trendChartPeriodAllOption: 'Всё',
    trendChartPeriodWeekOption: 'Нед',
    trendChartPeriodMonthOption: 'Мес',
    trendChartPeriodYearOption: 'Год',
    trendChartPeriodCustomOption: 'Свой',
    weightTrendTitle: 'График веса',
    calorieTrendTitle: 'График калорий',
    macrosTitle: 'Белки, жиры и углеводы',
    bodyCompositionTrendTitle: 'Состав тела',
    bodyCompositionEmptyDescription:
      'Выберите хотя бы один показатель, чтобы увидеть график.',
    electrolytesTrendTitle: 'Электролиты',
    electrolytesEmptyDescription:
      'Выберите хотя бы один показатель, чтобы увидеть график.',
    hideChartLabel: (title) => `Скрыть: ${title}`,
    showChartLabel: (title) => `Показать: ${title}`,
    weeklySummaryTitle: 'Недельная сводка',
    weekRange: (start, end) => `${start} – ${end}`,
    weightChangeLabel: 'Изменение за неделю',
    averageCaloriesLabel: 'Средние калории',
    targetMetNote: 'цель достигнута',
    addWeeklyNoteLabel: 'Добавить заметку недели',
    editWeeklyNoteLabel: 'Редактировать заметку недели',
    saveWeeklyNoteLabel: 'Сохранить заметку',
    cancelWeeklyNoteLabel: 'Отмена',
    weeklyNoteLabel: 'Заметка недели',
    weeklyNotePlaceholder:
      'Заметки за эту неделю — например, советы после разбора экспорта…',
    expandWeeklyNoteLabel: 'Показать полностью',
    collapseWeeklyNoteLabel: 'Свернуть',
    monthlySummaryTitle: 'Месячная сводка',
    recentAveragesTitle: 'Средние показатели',
    last7DaysLabel: 'Последние 7 дней',
    last30DaysLabel: 'Последние 30 дней',
    compareRangesTitle: 'Сравнение периодов',
    rangeALabel: 'Период A',
    rangeBLabel: 'Период Б',
    rangeStartLabel: 'Дата начала',
    rangeEndLabel: 'Дата окончания',
    compareRangesDayCount: (n) => `Дней с записями: ${n}`,
    compareRangesWeightDelta: (delta, unit) =>
      `Средний вес в периоде Б отличается на ${delta} ${unit} от периода A.`,
    emptyTitle: 'Пока нет записей',
    emptyDescription:
      'Заполните несколько дней на экране «День», чтобы увидеть тренды здесь.',
    correlationTitle: 'Калории и вес на следующий день',
    correlationEmptyDescription:
      'Пока недостаточно данных, чтобы увидеть закономерность — записывайте калории и вес, затем загляните сюда через несколько недель.',
    correlationSummary: (thresholdKcal, direction) =>
      direction === 'lower'
        ? `Дни с калорийностью ниже ${thresholdKcal} ккал в среднем давали больший набор веса на следующее утро, чем дни выше этого значения.`
        : `Дни с калорийностью выше ${thresholdKcal} ккал в среднем давали больший набор веса на следующее утро, чем дни ниже этого значения.`,
    correlationDayCount: (n) =>
      `На основе ${n} ${ruPluralize(n, 'дня', 'дней', 'дней')} данных.`,
    correlationLagCaveat:
      'Сравнивает калории за день с весом на следующий календарный день — это не доказанная причинно-следственная связь: на вес день ко дню влияют и задержка воды, и натрий, и многое другое.',
    correlationCurrentWeekExcludedNote:
      'Эта неделя ещё не закончилась, поэтому она не учтена в подсчёте выше.',
    correlationExpandLabel: 'Показать график',
    correlationCollapseLabel: 'Скрыть график',
    correlationStrengthLabel: (strength) =>
      strength === 'strong'
        ? 'Выраженная закономерность'
        : strength === 'moderate'
          ? 'Умеренная закономерность'
          : 'Слабая закономерность',
    outlierPointsHeading: 'Необычные точки данных',
    excludeOutlierLabel: (label) => `Исключить ${label} из этой закономерности`,
    restoreOutlierLabel: (label) => `Вернуть ${label} в эту закономерность`,
    outlierReasonWeightChange: 'необычное изменение веса',
    outlierReasonWeightChangeShort: 'изменение веса',
    outlierReasonMetric: (metricLabel) => `необычн.: ${metricLabel}`,
    outlierReasonBoth: (metricLabel, otherAxisLabel) =>
      `необычн.: ${metricLabel} и ${otherAxisLabel}`,
    viewOutlierDayLabel: (label) => `Редактировать ${label}`,
    weeklyChangeLegend: 'изменение за неделю',
    chartNavigationHint: 'Нажмите на точку для подробностей',
    cyclePeriodWeightNote:
      'Вес часто колеблется в дни менструации — стоит иметь это в виду при чтении дневных колебаний здесь.',
    previousPeriodLabel: 'Предыдущий период',
    nextPeriodLabel: 'Следующий период',
    viewDayLink: 'Открыть этот день',
    correlationTooltipCloseLabel: 'Закрыть',
    lateMealTitle: 'Время последнего приёма пищи и вес на следующий день',
    lateMealEmptyDescription:
      'Пока недостаточно данных, чтобы увидеть закономерность — записывайте время приёмов пищи и продолжайте отслеживать вес, затем загляните сюда через несколько недель.',
    lateMealSummary: (thresholdTime, direction) =>
      direction === 'later'
        ? `Дни, когда вы последний раз ели после ${thresholdTime}, в среднем показывали больший набор веса на следующее утро, чем дни, когда вы ели раньше.`
        : `Дни, когда вы последний раз ели до ${thresholdTime}, в среднем показывали больший набор веса на следующее утро, чем дни, когда вы ели позже.`,
    lateMealDayCount: (n) =>
      `На основе ${n} ${ruPluralize(n, 'дня', 'дней', 'дней')} данных.`,
    lateMealLagCaveat:
      'Сравнивает время последнего приёма пищи за день с весом на следующий день — это не доказанная причинно-следственная связь: на вес изо дня в день также влияют задержка воды, соль и многие другие факторы.',
    lateMealTimeLegend: 'время последнего приёма пищи',
    nextDayChangeLegend: 'изменение на след. день',
    mealFrequencyTitle: 'Частота приёмов пищи и вес на следующий день',
    mealFrequencyEmptyDescription:
      'Пока недостаточно данных, чтобы увидеть закономерность — записывайте приёмы пищи и продолжайте отслеживать вес, затем загляните сюда через несколько недель.',
    mealFrequencySummary: (thresholdCount, direction) =>
      direction === 'more'
        ? `Дни с более чем ${thresholdCount} приёмами пищи в среднем показывали больший набор веса на следующее утро, чем дни с меньшим количеством более крупных приёмов пищи.`
        : `Дни с ${thresholdCount} или меньше приёмами пищи в среднем показывали больший набор веса на следующее утро, чем дни с большим количеством более мелких приёмов пищи.`,
    mealFrequencyDayCount: (n) =>
      `На основе ${n} ${ruPluralize(n, 'дня', 'дней', 'дней')} данных.`,
    mealFrequencyLagCaveat:
      'Сравнивает количество приёмов пищи за день с весом на следующий день — это не доказанная причинно-следственная связь: на вес изо дня в день также влияют задержка воды, соль и многие другие факторы.',
    mealCountLegend: 'приёмов пищи',
    fastingWindowTitle: 'Окно голодания и вес на следующий день',
    fastingWindowEmptyDescription:
      'Пока недостаточно данных, чтобы увидеть закономерность — отмечайте время еды в последовательные дни и продолжайте отслеживать вес, затем загляните сюда через несколько недель.',
    fastingWindowSummary: (thresholdHours, direction) =>
      direction === 'longer'
        ? `Дни, когда голодание было дольше ${thresholdHours}, в среднем показывали больший набор веса на следующее утро, чем дни с более коротким голоданием.`
        : `Дни, когда голодание было короче ${thresholdHours}, в среднем показывали больший набор веса на следующее утро, чем дни с более долгим голоданием.`,
    fastingWindowDayCount: (n) =>
      `На основе ${n} ${ruPluralize(n, 'дня', 'дней', 'дней')} данных.`,
    fastingWindowLagCaveat:
      'Сравнивает реальный промежуток между приёмами пищи (последний приём предыдущего дня — первый приём следующего) с весом на следующий день — это не доказанная причинно-следственная связь: на вес изо дня в день также влияют задержка воды, соль и многие другие факторы.',
    fastingHoursLegend: 'часов голодания',
    sleepCorrelationTitle: 'Сон и вес на следующий день',
    sleepCorrelationEmptyDescription:
      'Пока недостаточно данных, чтобы увидеть закономерность — записывайте часы сна и продолжайте отслеживать вес, затем загляните сюда через несколько недель.',
    sleepCorrelationSummary: (thresholdHours, direction) =>
      direction === 'less'
        ? `Дни, когда вы спали меньше ${thresholdHours} ч, в среднем показывали больший набор веса на следующее утро, чем дни, когда вы спали больше.`
        : `Дни, когда вы спали больше ${thresholdHours} ч, в среднем показывали больший набор веса на следующее утро, чем дни, когда вы спали меньше.`,
    sleepCorrelationDayCount: (n) =>
      `На основе ${n} ${ruPluralize(n, 'дня', 'дней', 'дней')} данных.`,
    sleepCorrelationLagCaveat:
      'Сравнивает сон за день с весом на следующий день — это не доказанная причинно-следственная связь: на вес изо дня в день также влияют задержка воды, соль и многие другие факторы.',
    sleepHoursLegend: 'часы сна',
    stepsCorrelationTitle: 'Шаги и вес на следующий день',
    stepsCorrelationEmptyDescription:
      'Пока недостаточно данных, чтобы увидеть закономерность — записывайте количество шагов и продолжайте отслеживать вес, затем загляните сюда через несколько недель.',
    stepsCorrelationSummary: (thresholdSteps, direction) =>
      direction === 'fewer'
        ? `Дни, когда вы проходили меньше ${thresholdSteps} шагов, в среднем показывали больший набор веса на следующее утро, чем дни, когда вы проходили больше.`
        : `Дни, когда вы проходили больше ${thresholdSteps} шагов, в среднем показывали больший набор веса на следующее утро, чем дни, когда вы проходили меньше.`,
    stepsCorrelationDayCount: (n) =>
      `На основе ${n} ${ruPluralize(n, 'дня', 'дней', 'дней')} данных.`,
    stepsCorrelationLagCaveat:
      'Сравнивает количество шагов за день с весом на следующий день — это не доказанная причинно-следственная связь: на вес изо дня в день также влияют задержка воды, соль и многие другие факторы.',
    stepsCountLegend: 'шаги',
    proteinCorrelationTitle: 'Белок и вес на следующий день',
    proteinCorrelationEmptyDescription:
      'Пока недостаточно данных, чтобы увидеть закономерность — записывайте белок и продолжайте отслеживать вес, затем загляните сюда через несколько недель.',
    proteinCorrelationSummary: (thresholdProteinPercent, direction) =>
      direction === 'less'
        ? `Дни, когда белок составлял меньше ${thresholdProteinPercent}% калорий, в среднем показывали больший набор веса на следующее утро, чем дни, когда доля была больше.`
        : `Дни, когда белок составлял больше ${thresholdProteinPercent}% калорий, в среднем показывали больший набор веса на следующее утро, чем дни, когда доля была меньше.`,
    proteinCorrelationDayCount: (n) =>
      `На основе ${n} ${ruPluralize(n, 'дня', 'дней', 'дней')} данных.`,
    proteinCorrelationLagCaveat:
      'Сравнивает долю белка в калориях за день с весом на следующий день — это не доказанная причинно-следственная связь: на вес изо дня в день также влияют задержка воды, соль и многие другие факторы.',
    proteinPercentOfCaloriesLabel: 'Белок (% от калорий)',
    nightEatingCorrelationTitle: 'Ночные перекусы и вес на следующий день',
    nightEatingCorrelationEmptyDescription:
      'Пока недостаточно данных, чтобы увидеть закономерность — продолжайте записывать время приёмов пищи (или переключатель ночных перекусов напрямую) и отслеживать вес, затем загляните сюда через несколько недель.',
    nightEatingCorrelationSummary: (direction) =>
      direction === 'more'
        ? 'В ночи, когда вы ели поздно, в среднем набирался больший вес на следующее утро, чем в ночи, когда вы не ели поздно.'
        : 'В ночи, когда вы ели поздно, в среднем набирался меньший вес на следующее утро, чем в ночи, когда вы не ели поздно.',
    nightEatingCorrelationDayCount: (n) =>
      `На основе ${n} ${ruPluralize(n, 'дня', 'дней', 'дней')} данных.`,
    nightEatingCorrelationLagCaveat:
      'Сравнивает статус ночных перекусов за день с весом на следующий день — это не доказанная причинно-следственная связь: на вес изо дня в день также влияют задержка воды, соль и многие другие факторы.',
    alcoholCorrelationTitle: 'Алкоголь и вес на следующий день',
    alcoholCorrelationEmptyDescription:
      'Пока недостаточно данных, чтобы увидеть закономерность — продолжайте отмечать дни с алкоголем и вес, затем загляните сюда через несколько недель.',
    alcoholCorrelationSummary: (direction) =>
      direction === 'more'
        ? 'В дни, когда вы отмечали алкоголь, на следующее утро в среднем набирался больший вес, чем в дни без него.'
        : 'В дни, когда вы отмечали алкоголь, на следующее утро в среднем набирался меньший вес, чем в дни без него.',
    alcoholCorrelationDayCount: (n) =>
      `На основе ${n} ${ruPluralize(n, 'дня', 'дней', 'дней')} данных.`,
    alcoholCorrelationLagCaveat:
      'Сравнивает отметку об алкоголе за день с весом на следующий день — это не доказанная причинно-следственная связь: на вес изо дня в день также влияют задержка воды, соль и многие другие факторы.',
    loggingConsistencyTitle: 'Регулярность записей',
    heatmapLessLabel: 'Меньше',
    heatmapMoreLabel: 'Больше',
    daysLoggedSummaryText: (daysLogged) => `Дней с записями: ${daysLogged}`,
    totalCaloriesOverLoggedDaysText: (total) => `${total} за дни с записями`,
    totalCaloriesLast7DaysText: (total) => `${total} за последние 7 дней`,
    foodReactionsTitle: 'Реакции на еду',
    mostLikedFoodsTitle: 'Больше всего нравится',
    mostDislikedFoodsTitle: 'Больше всего не нравится',
    customChartTitle: 'Сравнение данных',
    customChartWeightLabel: 'Вес',
    customChartCaloriesLabel: 'Калории',
    customChartFastingHoursLabel: 'Часы голодания',
    customChartTypeLine: 'Линия',
    customChartTypeBar: 'Столбцы',
    customChartTypeDots: 'Точки',
    customChartTypeGroupLabel: (seriesLabel) =>
      `Тип графика для «${seriesLabel}»`,
    customChartNormalizedCaveat:
      'Каждая линия масштабирована по своему диапазону, чтобы разные единицы измерения (кг, ккал, шаги) можно было показать на одном графике — форма и тренд сопоставимы, но высота линии не отражает абсолютное значение. Точное значение за день смотрите во всплывающей подсказке.',
    customChartMarkerDaysText: (n) => dayCount(n),
    customChartGroupedMarkersCaveat:
      'На длинном периоде отметки дней объединяются — одна точка может обозначать несколько отмеченных дней. Нажмите на точку, чтобы увидеть их количество, или выберите период покороче, чтобы видеть каждый день отдельно.',
    customChartZoomHint:
      'Сведите пальцы для масштаба, сдвиньте вбок для панорамы. Двойной тап — сброс.',
    customChartResetZoomButton: 'Сбросить масштаб',
    customChartEmptyDescription:
      'Выберите хотя бы один показатель для сравнения.',
    customCorrelationSummary: (aLabel, thresholdValue, direction, bLabel) =>
      `В дни, когда «${aLabel}» был выше ${thresholdValue}, «${bLabel}» в среднем был ${direction === 'higher' ? 'выше' : 'ниже'}, чем в дни с более низким «${aLabel}».`,
    customCorrelationDayCount: (n) =>
      `На основе ${n} ${ruPluralize(n, 'дня', 'дней', 'дней')} данных.`,
    customCorrelationLagCaveat:
      'Сравнивает оба показателя в один и тот же день — это не доказанная причинно-следственная связь: на каждый из них могут влиять и другие факторы.',
    customCorrelationEmptyDescription:
      'Пока недостаточно данных, чтобы увидеть закономерность — записывайте оба показателя в одни и те же дни, затем загляните сюда через несколько недель.',
    manageCustomCorrelationsLabel: 'Управление своими метриками и корреляциями',
  },
  history: {
    title: 'История',
    description: 'Таблица всех прошлых записей — редактирование и удаление',
    emptyTitle: 'Пока нет записей',
    emptyDescription:
      'Заполните несколько дней на экране «День», чтобы увидеть их здесь.',
    dateColumn: 'Дата',
    weightColumn: (unit) => `Вес (${unit})`,
    caloriesColumn: 'Калории',
    noteColumn: 'Заметка',
    actionsColumn: 'Действия',
    sortToggleLabel: 'Сортировать по дате',
    editLabel: 'Редактировать запись',
    deleteLabel: 'Удалить запись',
    doneEditingButton: 'Готово',
    confirmDeleteLabel: 'Удалить эту запись?',
    confirmDeleteYes: 'Удалить',
    confirmDeleteNo: 'Отмена',
    metTargetTitle: 'Недели, когда цель была достигнута',
    expandLabel: 'Показать подробности',
    collapseLabel: 'Скрыть подробности',
    noDetailsLabel: 'За этот день больше ничего не записано.',
    dateFromLabel: 'С',
    dateToLabel: 'По',
    searchLabel: 'Поиск по заметкам',
    searchPlaceholder: 'Поиск по заметкам дня…',
    moodFilterLabel: 'Фильтр по настроению',
    clearFilterButton: 'Сбросить фильтр',
    noFilterResultsTitle: 'Нет записей за этот период',
    noFilterResultsDescription: 'Попробуйте другой период или сбросьте фильтр.',
    viewModeLabel: 'Режим отображения',
    listViewLabel: 'Список',
    calendarViewLabel: 'Календарь',
    previousMonthLabel: 'Предыдущий месяц',
    nextMonthLabel: 'Следующий месяц',
    todayButton: 'Сегодня',
    emptyDayLabel: 'За этот день ничего не записано.',
    editThisDayLink: 'Редактировать этот день',
    previousPageButton: 'Назад',
    nextPageButton: 'Вперёд',
    pageIndicator: (current, total) => `Страница ${current} из ${total}`,
    reachedGoalWindowDayLabel: 'Вес снизился по пути к цели',
    reachedGoalDayLabel: 'В этот день вы достигли цели',
    reachedGoalLegendLabel: 'Подсветка достигнутой цели',
    calendarMarkersButton: 'Метки',
    calendarMarkersDialogLabel: 'Метки календаря',
    calendarMarkerLegendLabel: 'Метки календаря',
    calendarMarkerEntryLabel: 'Есть запись',
    calendarMarkerNightEatingLabel: 'Ночные перекусы',
  },
  settings: {
    title: 'Настройки',
    description: 'Единицы измерения (кг/фунты), язык и другие настройки',
    unitsLabel: 'Единицы измерения',
    languageLabel: 'Язык',
    english: 'Английский',
    russian: 'Русский',
    appearanceLabel: 'Оформление',
    moodLabel: 'Тема',
    moodPond: 'Пруд',
    moodDusk: 'Сумерки',
    moodSage: 'Шалфей',
    moodTortoise: 'Черепаха',
    moodLagoon: 'Лагуна',
    colorSchemeLabel: 'Светлая / тёмная / системная',
    systemColorScheme: 'Системная',
    light: 'Светлая',
    dark: 'Тёмная',
    mealItemsLabel: 'Блюда',
    mealItemsDescription:
      'Блюда, которые вы уже добавляли — подсказки при вводе. Здесь их можно переименовать, удалить или добавить новое.',
    mealItemsEmpty: 'Пока пусто — блюда появятся здесь после первой записи.',
    mealItemsCount: (total) =>
      total === 1 ? '1 блюдо' : `${total} блюд`,
    mealItemsFilteredCount: (shown, total) =>
      `Найдено ${shown} из ${total}`,
    mealItemsSortLabel: 'Сортировка',
    mealItemsSortTitleAsc: 'Название А→Я',
    mealItemsSortTitleDesc: 'Название Я→А',
    mealItemsSortAddedNewest: 'Дата добавления (сначала новые)',
    mealItemsSortAddedOldest: 'Дата добавления (сначала старые)',
    mealLibraryBackfillDescription:
      'Если вы импортировали приёмы пищи (или у вас многолетняя история), можно скопировать уникальные названия блюд в эту библиотеку — тогда их найдёт поиск. Позже можно удалить только эти скопированные позиции — история дней не затронется.',
    mealLibraryBackfillButton: 'Добавить блюда из истории',
    mealLibraryBackfillRemoveButton: (count) =>
      `Удалить добавленные из истории (${count})`,
    mealLibraryBackfillDoneMessage: (added) =>
      added === 0
        ? 'Новых блюд нет — всё, что есть в истории с названиями, уже в библиотеке.'
        : `Добавлено блюд из истории: ${added}.`,
    mealLibraryBackfillTruncatedMessage: (added, totalUniqueNamed) =>
      `Добавлено ${added} из ${totalUniqueNamed} уникальных блюд (есть лимит ради производительности). Удалите добавленные из истории и повторите позже, если нужны остальные.`,
    mealLibraryBackfillRemovedMessage: (removed) =>
      `Удалено из библиотеки блюд, добавленных из истории: ${removed}. Приёмы пищи по дням не изменились.`,
    mealLibraryBackfillErrorMessage:
      'Не удалось обновить библиотеку блюд. Попробуйте ещё раз.',
    mealLibraryPropagateConfirmPrompt: (count, name) =>
      `Обновить ${count} ${count === 1 ? 'прошлую запись' : count < 5 ? 'прошлые записи' : 'прошлых записей'} «${name}» в истории этим изменением из библиотеки? Заметки дня и другие блюда не изменятся.`,
    mealLibraryPropagateConfirmYes: 'Обновить в истории',
    mealLibraryPropagateConfirmNo: 'Только библиотека',
    mealLibraryPropagateDoneMessage: (updated) =>
      `Обновлено записей в истории: ${updated}.`,
    mealLibraryPropagateErrorMessage:
      'Не удалось обновить прошлые приёмы пищи. Попробуйте ещё раз.',
    mealItemSearchLabel: 'Поиск блюд',
    mealItemSearchPlaceholder: 'Поиск...',
    noMealItemResultsText: 'Ничего не найдено.',
    mealItemNameLabel: 'Название блюда',
    deleteMealItemLabel: (name) => `Удалить «${name}»`,
    editMealItemLabel: (name) => `Изменить «${name}»`,
    saveMealItemLabel: (name) => `Сохранить «${name}»`,
    shareMealItemLabel: (name) => `Поделиться «${name}»`,
    shareFoodDialogTitle: 'Поделиться блюдом',
    shareFoodDialogDescription: (name) =>
      `Отправьте «${name}» другому человеку через системный лист «Поделиться» или QR-код. Перед добавлением в свой список блюд можно всё проверить.`,
    shareFoodCloseLabel: 'Закрыть',
    shareFoodQrAlt: (name) => `QR-код для «${name}»`,
    shareFoodQrHint:
      'Другой человек может отсканировать этот QR-код в Настройки → Импорт общего блюда.',
    shareFoodNativeShareButton: 'Поделиться…',
    shareFoodCopyLinkButton: 'Копировать ссылку',
    shareFoodLinkCopiedLabel: 'Скопировано',
    shareFoodShareTitle: (name) => `Блюдо: ${name}`,
    shareFoodShareText: (name) =>
      `Вот «${name}» из Turtle Steps — откройте ссылку, чтобы проверить и добавить блюдо в свой список.`,
    shareFoodShareFailedMessage:
      'Не удалось открыть лист «Поделиться». Попробуйте скопировать ссылку.',
    importSharedFoodButton: 'Импорт общего блюда',
    importSharedFoodEntryTitle: 'Импорт общего блюда',
    importSharedFoodEntryDescription:
      'Отсканируйте QR-код с экрана другого человека или вставьте ссылку.',
    importSharedFoodScanQrButton: 'Сканировать QR-код',
    importSharedFoodScanQrTitle: 'Сканировать QR общего блюда',
    importSharedFoodScanQrInstructions:
      'Наведите камеру на QR-код на экране другого человека.',
    importSharedFoodPasteLabel: 'Или вставьте ссылку',
    importSharedFoodPastePlaceholder: 'Вставьте ссылку сюда',
    importSharedFoodPasteSubmitButton: 'Продолжить',
    importSharedFoodPasteInvalidMessage:
      'Это не похоже на ссылку общего блюда. Проверьте ссылку или QR и попробуйте снова.',
    importSharedFoodIsDaySnippet:
      'Этот QR — запись за день, а не общее блюдо. Откройте его с экрана День → отправить/принять.',
    importSharedFoodDialogTitle: 'Проверка общего блюда',
    importSharedFoodDialogDescription:
      'Проверьте данные и добавьте блюдо в свой список — или обновите совпадающее, если оно уже есть.',
    importSharedFoodBrandLabel: 'Бренд (необязательно)',
    importSharedFoodBrandHint:
      'Только для справки — в списке блюд хранится только название. Добавьте бренд в название, если хотите его сохранить.',
    importSharedFoodBarcodeLabel: 'Штрихкод (необязательно)',
    importSharedFoodGramsLabel: 'Граммы',
    importSharedFoodMatchMessage: (name) =>
      `У вас уже есть «${name}». Можно обновить его этими данными или пропустить.`,
    importSharedFoodAddButton: 'Добавить в мои блюда',
    importSharedFoodUpdateButton: 'Обновить существующее',
    importSharedFoodSkipButton: 'Пропустить',
    importSharedFoodCancelButton: 'Отмена',
    mealItemServingsLabel: 'Именованные порции',
    mealItemServingNameLabel: 'Название порции',
    mealItemServingNamePlaceholder: 'например, 1 кусок',
    mealItemServingGramsLabel: 'Граммы',
    addMealItemServingButton: 'Добавить порцию',
    removeMealItemServingLabel: (name) => `Удалить порцию «${name}»`,
    addMealItemButton: 'Добавить своё блюдо',
    addMealItemDialogTitle: 'Добавить своё блюдо',
    closeAddMealItemDialogLabel: 'Закрыть окно добавления продукта',
    cancelAddMealItemLabel: 'Отмена',
    mealNamePresetsLabel: 'Шаблоны названий приёма пищи',
    mealNamePresetsDescription:
      'Быстрые варианты названий при переименовании приёма пищи, например «Завтрак» или «Обед».',
    mealNamePresetsEmpty: 'Пока пусто — добавьте шаблон ниже.',
    addPresetPlaceholder: 'Добавить шаблон',
    addDefaultPresetLabel: (name) => `Добавить «${name}»`,
    deletePresetLabel: (name) => `Удалить «${name}»`,
    releaseNotesLabel: 'История изменений',
    showReleaseNotes: 'Показать историю изменений',
    hideReleaseNotes: 'Скрыть историю изменений',
    cycleTrackingLabel: 'Отслеживание цикла',
    digestionTrackingLabel: 'Отслеживание пищеварения',
    alcoholTrackingLabel: 'Отслеживание алкоголя',
    waterTrackingLabel: 'Отслеживание воды',
    plannedMealsTrackingLabel: 'Запланированные приёмы пищи',
    copyYesterdayMealsTrackingLabel: 'Копировать вчерашние приёмы пищи',
    trackingPresetLabel: 'Пресет макета',
    trackingPresetDescription:
      'Быстрая отправная точка для дня: «Просто» оставляет вес, приёмы пищи/калории и недельную цель; «Полностью» включает всё. Всё ниже по-прежнему можно настроить вручную.',
    trackingPresetSimpleButton: 'Просто',
    trackingPresetFullButton: 'Полностью',
    trackingPresetAppliedLabel: 'Применено',
    trackedFieldsLabel: 'Что отслеживать',
    trackedFieldsDescription:
      'Выберите, какие необязательные поля показывать на экране «День». Отключение поля скрывает его только для новых записей — уже сохранённые данные остаются видны в Истории, экспорте и на панели.',
    trackedFieldsMorningGroupLabel: 'Утро',
    trackedFieldsEveningGroupLabel: 'Вечер',
    trackedFieldsOtherGroupLabel: 'Прочее',
    trackedFieldsElectrolytesGroupLabel: 'Электролиты',
    profileLabel: 'Профиль',
    profileDescription:
      'Необязательно — используется только для расчёта ИМТ и примерной суточной потребности в калориях (базовый обмен) на экране «День». Входит в JSON-резервные копии вместе с остальными настройками.',
    heightLabel: 'Рост (см)',
    ageLabel: 'Возраст',
    sexLabel: 'Пол',
    sexFemaleOption: 'Женский',
    sexMaleOption: 'Мужской',
    activityLevelLabel: 'Уровень активности',
    activityLevelSedentary: 'Малоподвижный',
    activityLevelLight: 'Легкая активность',
    activityLevelModerate: 'Умеренная активность',
    activityLevelActive: 'Активный',
    activityLevelVeryActive: 'Очень активный',
    saveProfileLabel: 'Сохранить профиль',
    editProfileLabel: 'Изменить профиль',
    profileSummary: (height, age, sex, activityLevel) =>
      `Рост ${height} · Возраст ${age} · ${sex} · ${activityLevel}`,
    dailyReminderLabel: 'Ежедневное напоминание',
    dailyReminderDescription:
      'Необязательно — показывает спокойную заметку на экране «День», если вы ещё ничего не записали, а в нативном приложении также присылает ежедневное уведомление. По умолчанию выключено.',
    dailyReminderOn: 'Вкл',
    dailyReminderOff: 'Выкл',
    nutritionFactsLabel: 'Заметки о питании',
    nutritionFactsDescription:
      'Небольшие поощрительные заметки на экране «День» и при сохранении приёма пищи, когда записанное соответствует распространённой рекомендации по питанию (например, богатый белком приём пищи, сбалансированная тарелка). По умолчанию включено — можно выключить в любой момент.',
    nutritionFactsOn: 'Вкл',
    nutritionFactsOff: 'Выкл',
    entryComparisonLabel: 'Сравнение при вводе',
    entryComparisonDescription:
      'Пока вы вводите дневное значение, показывать стрелку вверх/вниз относительно предыдущего записанного дня (цвет зависит от того, хорош ли такой сдвиг для этого показателя). После сохранения значок «i» показывает то же сравнение и сравнение ровно с 30 днями назад. По умолчанию включено — можно выключить в любой момент.',
    entryComparisonOn: 'Вкл',
    entryComparisonOff: 'Выкл',
    localTransferLabel: 'Другая копия',
    localTransferDescription:
      'Отправить запись за этот день (сон, вес, еда и остальное) в другое приложение Turtle Steps на этом телефоне или на другом устройстве. Если копия одна — оставьте выключенным. Включайте в каждой копии, которая должна отправлять или принимать.',
    localTransferOn: 'Вкл',
    localTransferOff: 'Выкл',
    dailyReminderTimeLabel: 'Напоминать в',
    healthConnectSyncLabel: 'Health Connect',
    healthConnectSyncDescription:
      'Синхронизировать вес, шаги и сон из Health Connect за сегодня и несколько прошлых дней — включая данные, которые записали другие приложения. Каждая синхронизация подтягивает последние значения за день и обновляет приложение (можно нажать снова после изменения в источнике).',
    healthConnectSyncButton: 'Синхронизировать из Health Connect',
    healthConnectSyncingButton: 'Синхронизация…',
    healthConnectUnavailableMessage: 'Health Connect не установлен на этом устройстве.',
    healthConnectInstallButton: 'Установить Health Connect',
    healthConnectPermissionDeniedMessage:
      'Доступ к данным Health Connect не предоставлен.',
    healthConnectSyncSuccessMessage: (dayCount, todayWeight) =>
      todayWeight === undefined
        ? `Синхронизировано дней: ${dayCount}.`
        : `Синхронизировано дней: ${dayCount}; сегодня ${todayWeight}.`,
    healthConnectSyncNoDataMessage:
      'В Health Connect нет веса, шагов или сна за последние 7 дней.',
    healthConnectSyncErrorMessage:
      'Не удалось синхронизировать с Health Connect. Попробуйте ещё раз.',
    dashboardChartsLabel: 'Графики на панели',
    dashboardChartsDescription:
      'Все встроенные разделы панели. Выключите, чтобы скрыть на панели; включите снова здесь или значком глаза на карточке. Пользовательские корреляции — в «Свои метрики».',
    dashboardChartsOn: 'Вкл',
    dashboardChartsOff: 'Выкл',
    trendChartsLabel: 'Графики трендов на панели',
    trendChartsDescription:
      'Какие данные показывать на графиках веса и калорий — надёжное место, чтобы вернуть показатель, если он был выключен прямо на панели.',
    weightTrendLabel: 'График веса',
    calorieTrendLabel: 'График калорий',
    weekStartLabel: 'Начало недели',
    weekStartDescription:
      'День, с которого начинается неделя — используется для «Эта неделя» и недельных сводок.',
    weekStartMonday: 'Понедельник',
    weekStartFirstEntry: 'День первой записи',
    dayStartLabel: 'Начало дня',
    dayStartDescription:
      'Когда начинается ваш день — всё, что записано до этого времени, засчитывается за предыдущий день, и прогресс этой недели, графики окна голодания и позднего приёма пищи, а также другое, что зависит от понятия «сегодня», используют то же самое начало дня. Влияет только на новые записи и аналитику вперёд — уже внесённая история никогда не пересчитывается задним числом. По умолчанию — полночь, что полностью соответствует текущей дате.',
    mealSlotDefaultTimesLabel: 'Время приёмов пищи по умолчанию',
    mealSlotDefaultTimesDescription:
      'Используется при импорте приёмов пищи с меткой Завтрак/Обед/Перекус/Ужин без времени на часах (например, MyFitnessPal). Эти же значения можно задать во время импорта.',
    mealSlotApplyConfirmLabel: (count) =>
      count === 1
        ? 'Применить это время к 1 существующему приёму пищи без времени?'
        : `Применить это время к ${count} существующим приёмам пищи без времени?`,
    mealSlotApplyConfirmYes: 'Да, применить',
    mealSlotApplyConfirmNo: 'Нет, только настройки',
    mealSlotApplyDoneLabel: (count) =>
      count === 1
        ? 'Обновлён 1 приём пищи со временем по умолчанию.'
        : `Обновлено приёмов пищи со временем по умолчанию: ${count}.`,
    foodListLabel: 'Список продуктов',
    foodListDescription:
      'Скройте ненужные продукты или исправьте их калорийность/БЖУ.',
    manageFoodListButton: 'Управлять списком продуктов',
    aboutLabel: 'О проекте',
    aboutDescription:
      'Что это за приложение, кто его сделал, и заметки о выпусках.',
    viewAboutButton: 'Открыть «О проекте»',
    featuresLabel: 'Возможности',
    featuresDescription: 'Всё, что умеет приложение, со скриншотами.',
    viewFeaturesButton: 'Открыть «Возможности»',
    versionBadgeLabel: (version) => `v${version}`,
    clearAllDataLabel: 'Удалить все данные',
    clearAllDataDescription:
      'Безвозвратно удалить всё, что хранится на этом устройстве — вес, приёмы пищи, цели и собственные блюда. Это отличается от простого удаления приложения или очистки данных сайта, что не всем понятно как сделать.',
    clearAllDataButton: 'Удалить все данные',
    clearAllDataConfirmPrompt:
      'Это действие нельзя отменить. Если данные могут понадобиться позже, сначала сделайте экспорт резервной копии.',
    clearAllDataConfirmYes: 'Да, удалить всё',
    clearAllDataConfirmNo: 'Отмена',
    clearingAllDataButton: 'Удаление…',
    deleteRangeLabel: 'Удалить за период',
    deleteRangeDescription:
      'Безвозвратно удалить записи (вес, приёмы пищи, значения собственных метрик и т.д.) за выбранный период, не затрагивая данные вне его и сами определения (рецепты, собственные метрики).',
    deleteRangeButton: 'Удалить',
    deletingRangeButton: 'Удаление…',
    deleteRangeNothingToDelete: 'За этот период нет записанных данных.',
    deleteRangeConfirmPrompt: (dailyEntryCount, customMetricEntryCount) =>
      `Будет безвозвратно удалено ${dayCount(dailyEntryCount)}${customMetricEntryCount > 0 ? ` и ${customMetricEntryCount} записей собственных метрик` : ''} за этот период. Это действие нельзя отменить.`,
    deleteRangeConfirmYes: 'Да, удалить за этот период',
    deleteRangeConfirmNo: 'Отмена',
    backToSettingsLabel: '← Настройки',
    hideButtonLabel: 'Скрыть',
    showButtonLabel: 'Показать',
    restoreDefaultButtonLabel: 'Восстановить по умолчанию',
    hideFoodLabel: (name) => `Скрыть «${name}»`,
    showFoodLabel: (name) => `Показать «${name}»`,
    editFoodLabel: (name) => `Изменить «${name}»`,
    saveFoodLabel: (name) => `Сохранить «${name}»`,
    restoreDefaultLabel: (name) => `Восстановить «${name}» по умолчанию`,
    hiddenBadgeLabel: 'Скрыто',
    twoDevicesHelpLabel: 'Использование двух устройств',
    twoDevicesHelpIntro:
      'Автоматической синхронизации между устройствами нет. Если вы пользуетесь приложением на нескольких устройствах, учитывайте это:',
    twoDevicesHelpSteps: [
      'Это устройство хранит актуальные данные — само по себе оно никуда их не отправляет.',
      '«Экспорт» (ниже) создаёт файл резервной копии, который можно перенести на другое устройство.',
      '«Импорт» объединяет эту копию с тем, что уже есть на другом устройстве — прочитайте сообщение о результате, прежде чем полагаться на него, особенно после новой установки.',
    ],
  },
  nutritionFacts: {
    proteinRichMeal: 'Богатый белком приём пищи — хорошая доза для поддержки мышц.',
    excellentFiberMeal: 'Отличный источник клетчатки в этом приёме пищи.',
    balancedPlateMeal:
      'Хорошо сбалансированная тарелка — здоровое сочетание белков, жиров и углеводов.',
    highQualityCarbsMeal:
      'Хороший источник богатых клетчаткой углеводов в этом приёме пищи.',
    dailyFiberGoal: 'Вы достигли сегодняшней цели по клетчатке.',
    sodiumConsciousDay: 'Отлично держите натрий под контролем сегодня.',
    potassiumRichDay: 'Отличное потребление калия сегодня.',
    goodPotassiumSodiumRatio: 'Хороший баланс калия и натрия сегодня.',
    magnesiumRichDay: 'Отличное потребление магния сегодня.',
    wellHydrated: 'Хорошая гидратация сегодня.',
    onTargetCalories: 'Точно в цель по калориям сегодня.',
    proteinSpreadThroughDay: 'Белок хорошо распределён по приёмам пищи сегодня.',
    balancedDay: 'Хорошо сбалансированные БЖУ за день в целом.',
  },
  recipes: {
    settingsSectionLabel: 'Рецепты',
    settingsSectionDescription:
      'Блюда из нескольких ингредиентов, приготовленные партией и записываемые по порциям — кастрюля чили, партия супа.',
    manageRecipesButton: 'Управление рецептами',
    screenTitle: 'Рецепты',
    screenDescription:
      'Создайте рецепт из ингредиентов один раз, а затем записывайте порции из него в любое время.',
    emptyStateText:
      'Пока пусто — добавьте рецепт, чтобы потом записывать его порции.',
    addRecipeButton: 'Добавить рецепт',
    editRecipeLabel: (name) => `Изменить «${name}»`,
    deleteRecipeLabel: (name) => `Удалить «${name}»`,
    servingsCountLabel: (n) =>
      `${n} ${ruPluralize(n, 'порция', 'порции', 'порций')}`,
    addRecipeDialogTitle: 'Добавить рецепт',
    editRecipeDialogTitle: 'Изменить рецепт',
    closeRecipeDialogLabel: 'Закрыть редактор рецепта',
    recipeNameLabel: 'Название рецепта',
    recipeNamePlaceholder: 'Название рецепта',
    servingsFieldLabel: 'Порций',
    ingredientsSectionLabel: 'Ингредиенты',
    noIngredientsYetText: 'Пока нет ингредиентов — добавьте хотя бы один ниже.',
    removeIngredientLabel: (name) => `Удалить «${name}»`,
    copyIngredientsLabel: (name) =>
      `Скопировать список покупок для «${name}»`,
    ingredientsCopiedLabel: 'Скопировано',
    ingredientsCopiedToastMessage: 'Ингредиенты скопированы в буфер обмена',
    addIngredientButton: 'Добавить ингредиент',
    ingredientNameLabel: 'Название ингредиента',
    ingredientNamePlaceholder: 'Название ингредиента',
    perServingPreviewPrefix: 'На порцию:',
    cancelLabel: 'Отмена',
    logRecipeButton: 'Записать рецепт',
    logRecipeDialogTitle: 'Записать рецепт',
    closeLogRecipeDialogLabel: 'Закрыть окно записи рецепта',
    pickRecipeLabel: 'Какой рецепт?',
    servingsEatenLabel: 'Съедено порций',
    noRecipesYetMessage: 'У вас пока нет рецептов — добавьте их в настройках.',
    logButtonLabel: 'Записать',
  },
  customMetrics: {
    settingsSectionLabel: 'Свои метрики и корреляции',
    settingsSectionDescription:
      'Отслеживайте то, для чего в приложении нет готового поля, и смотрите, как это связано с остальными вашими записями.',
    manageCustomMetricsButton: 'Управление своими метриками',
    screenTitle: 'Свои метрики и корреляции',
    screenDescription:
      'Задайте свои показатели для отслеживания, записывайте их значения и сравнивайте любые два показателя между собой.',
    backToSettingsLabel: 'Назад к настройкам',

    metricsSectionLabel: 'Ваши метрики',
    emptyMetricsText: 'Своих метрик пока нет.',
    addMetricButton: '+ Добавить метрику',
    addMetricDialogTitle: 'Добавить метрику',
    closeMetricDialogLabel: 'Закрыть',
    metricNameLabel: 'Название',
    metricNamePlaceholder: 'например, Тренировка, Акне',
    metricInputKindLabel: 'Как записывать значение?',
    metricInputKindNumberOption: 'Число',
    metricInputKindBooleanOption: 'Да / Нет',
    metricInputKindScaleOption: 'Шкала 1-5',
    metricUnitLabel: 'Единица измерения (необязательно)',
    metricUnitPlaceholder: 'например, повторения, часы',
    deleteMetricLabel: (name) => `Удалить «${name}»`,
    cancelLabel: 'Отмена',
    saveButton: 'Сохранить',

    logValuesSectionLabel: 'Свои метрики',
    logValuesMovedText: 'Записывайте значения за сегодня на экране «День».',
    expandLogValuesLabel: 'Показать свои метрики',
    collapseLogValuesLabel: 'Скрыть свои метрики',
    logValuesCollapsedSummary: (logged, total) => `${logged} из ${total}`,
    booleanYesOption: 'Да',
    booleanNoOption: 'Нет',
    scaleValueLabel: (n) => `Оценка ${n} из 5`,
    valueSavedLabel: 'Сохранено',
    noteLabel: 'Заметка',
    notePlaceholder: 'Добавьте заметку об этом значении...',
    saveNoteLabel: 'Сохранить заметку',
    editNoteLabel: 'Изменить заметку',
    cancelEditNoteLabel: 'Отменить редактирование заметки',
    addNoteLabel: 'Добавить заметку',

    correlationsSectionLabel: 'Свои корреляции',
    emptyCorrelationsText: 'Своих корреляций пока нет.',
    addCorrelationButton: '+ Добавить корреляцию',
    addCorrelationDialogTitle: 'Добавить корреляцию',
    closeCorrelationDialogLabel: 'Закрыть',
    correlationNameLabel: 'Название (необязательно)',
    correlationNamePlaceholder: 'например, Акне и углеводы',
    metricALabel: 'Первый показатель',
    metricBLabel: 'Второй показатель',
    selectMetricPlaceholder: 'Выберите показатель',
    deleteCorrelationLabel: (name) => `Удалить «${name}»`,
    sameMetricErrorText: 'Выберите два разных показателя для сравнения.',
  },
  plannedMeals: {
    sectionLabel: 'Запланированные приёмы пищи',
    expandSectionLabel: 'Показать запланированное',
    collapseSectionLabel: 'Скрыть запланированное',
    collapsedSummary: (count) =>
      count === 0 ? 'Ничего не запланировано' : `Запланировано: ${count}`,
    sectionBlurb:
      'Запишите, что вы планируете съесть в другой день. Это не войдёт ни в один итог, пока вы не добавите запись в журнал того дня.',
    stagedListLabel: 'Запланировано на этот день',
    plannedKcalLabel: (kcal) => `${kcal} ккал`,
    addToLogButton: 'Добавить в журнал',
    discardPlannedMealLabel: (name) => `Удалить план: ${name}`,
    addPlanTriggerLabel: 'Запланировать на завтра',
    planNameLabel: 'Что вы планируете?',
    planNamePlaceholder: 'например, курица с рисом',
    planKcalLabel: 'Калории (необязательно)',
    planKcalPlaceholder: 'например, 450',
    savePlanButton: 'Сохранить план',
    cancelPlanLabel: 'Отмена',
  },
  about: {
    title: 'О приложении',
    description: 'Что это за приложение и зачем оно нужно',
    intro:
      '«Черепашка идёт к цели» — приватный локальный помощник для понимания веса, питания и повседневных факторов, которые на них влияют.',
    tracking:
      'Соберите в одном месте приёмы пищи, КБЖУ, воду, сон, активность, параметры тела и любые собственные метрики. Полный список смотрите в разделе «Возможности».',
    philosophy:
      'Вместо стремления к идеальным дням «Черепашка идёт к цели» поощряет стабильный недельный прогресс через маленькие, последовательные шаги.',
    privacyHeading: 'Приватность по умолчанию.',
    privacy:
      'Все данные хранятся только на вашем устройстве. Без аккаунтов. Без облака.',
    readPrivacyPolicyLabel: 'Читать полную политику конфиденциальности',
    viewFeaturesLabel: 'Посмотреть все возможности приложения',
    madeBy: (author) => `Автор: ${author}`,
    currentVersionLabel: (version) => `Версия ${version}`,
  },
  privacyPolicy: {
    title: 'Политика конфиденциальности',
    description: 'Как «Черепашка идёт к цели» обрабатывает ваши данные',
    lastUpdatedLabel: (date) => `Обновлено: ${date}`,
    collectionHeading: 'Что мы собираем',
    collectionBody:
      'Приложение не собирает никакие данные автоматически. Всё, что вы видите в приложении, было введено вами или явно запрошено по вашей команде: вес, калории, приёмы пищи, сон, активность, цикл, заметки и любые другие поля, которые вы заполняете, а также всё, что вы решите синхронизировать из Health Connect (см. ниже) или импортировать из файла резервной копии.',
    healthConnectPrivacyHeading: 'Health Connect (Android)',
    healthConnectPrivacyBody:
      'На Android нажатие «Синхронизировать из Health Connect» в настройках считывает недавние значения веса, суммы шагов и сеансов сна (сегодня и несколько прошлых дней) из Health Connect — хранилища данных о здоровье Android на устройстве. Ничего не считывается автоматически, и ничего никогда не записывается обратно в Health Connect. Это происходит только при нажатии этой кнопки, требует вашего явного разрешения и считывает только вес, шаги и сон. Синхронизированные значения хранятся локально, так же как и любая другая запись — см. «Где хранятся ваши данные» ниже.',
    storageHeading: 'Где хранятся ваши данные',
    storageBody:
      'Все данные хранятся только на вашем устройстве, в собственном хранилище браузера или приложения. Нет ни аккаунта, ни серверов, ни облачной синхронизации — приложение никогда не видит ваши данные.',
    sharingHeading: 'Передача третьим лицам',
    sharingBody:
      'Ваши данные никогда не продаются, не передаются и никуда не отправляются. В приложении нет ни аналитики, ни рекламы, ни какого-либо трекинга.',
    exportHeading: 'Экспорт данных',
    exportBody:
      'Единственный способ, которым ваши данные покидают устройство — если вы сами экспортируете их (в виде JSON-резервной копии, Excel, CSV или Markdown) из раздела «Настройки». Дальнейшая судьба этого файла зависит только от вас.',
    childrenHeading: 'Дети',
    childrenBody:
      'Приложение не предназначено для детей и не собирает данные ни от кого сознательно, включая детей — автоматически не собирается ничего, независимо от возраста.',
    changesHeading: 'Изменения в этой политике',
    changesBody:
      'Если эта политика когда-либо изменится, обновление будет опубликовано на этой же странице.',
    contactHeading: 'Контакты',
    contactBody:
      'Вопросы по этой политике можно направить через страницу проекта на GitHub.',
    backToAboutLabel: 'Назад к разделу «О приложении»',
  },
  featuresOverview: {
    title: 'Возможности',
    description: 'Что умеет «Черепашка идёт к цели» — всё в одном месте',
    categories: [
      {
        id: 'dailyLogging',
        heading: 'Ежедневные записи',
        items: [
          'Отслеживайте вес, калории, белки, жиры, углеводы и клетчатку каждый день',
          'Записывайте сон, шаги, воду и настроение вместе с весом',
          'Создавайте числовые, логические или пятибалльные метрики для всего остального, что важно именно вам',
          'Опциональное отслеживание менструального цикла и пищеварения — по умолчанию выключено и не показывается, пока вы сами не включите',
        ],
      },
      {
        id: 'meals',
        heading: 'Приёмы пищи и еда',
        items: [
          'Ищите в большой встроенной базе продуктов или создайте свой личный список еды',
          'Отсканируйте штрихкод, чтобы добавить упакованный продукт автоматически',
          'Создавайте рецепты из нескольких ингредиентов с автоматическим расчётом КБЖУ',
          'Отмечайте избранное и повторяйте последнее записанное количество одним нажатием',
          'Оценивайте блюдо эмодзи-реакцией и копируйте приёмы пищи целого дня на сегодня',
        ],
      },
      {
        id: 'goals',
        heading: 'Цели и прогресс',
        items: [
          'Задайте недельный темп снижения веса вместо одной большой цифры',
          'Опциональные дневные цели по калориям, белкам, жирам и углеводам',
          'Смотрите, была ли достигнута цель за неделю и на каких взвешиваниях это основано',
        ],
      },
      {
        id: 'dashboard',
        heading: 'Дашборд и тренды',
        items: [
          'Графики тренда веса, калорий и БЖУ, а также недельные и месячные сводки',
          'Отслеживайте талию, бёдра, процент жира, мышечную массу, висцеральный жир, воду и костную массу со временем',
          'Создайте свой график сравнения любых двух отслеживаемых показателей',
          'Меняйте порядок разделов Дашборда так, как удобно вам',
        ],
      },
      {
        id: 'correlations',
        heading: 'Корреляции и наблюдения',
        items: [
          'Смотрите, как белок, фаза цикла или окно голодания связаны с вашим весом',
          'Замечайте закономерности без необходимости считать самостоятельно',
        ],
      },
      {
        id: 'history',
        heading: 'История',
        items: [
          'Просматривайте прошлые дни списком или в календаре, используйте поиск и фильтры',
          'Отмечайте в календаре вес, приёмы пищи, воду, настроение, заметки, свои метрики и достигнутые цели',
          'Открывайте любой день, чтобы проверить или изменить все его записи',
        ],
      },
      {
        id: 'yourData',
        heading: 'Ваши данные — на вашем устройстве',
        items: [
          'Всё хранится локально — без аккаунта, без облака, без слежки',
          'Экспортируйте полную резервную копию или файл Excel, CSV либо Markdown в любой момент',
          'Импортируйте резервную копию, чтобы восстановить данные или перенести их на новое устройство',
          'Импортируйте вес, состав тела, шаги и приёмы пищи из выгрузок Zepp Life, Apple Health или MyFitnessPal',
        ],
      },
      {
        id: 'makeItYours',
        heading: 'Настройте под себя',
        items: [
          'Русский и английский язык',
          'Светлая и тёмная тема, несколько цветовых оформлений',
          'Килограммы или фунты, а также настраиваемый день начала недели и время начала дня',
        ],
      },
    ],
    screenshotAlt: (heading) => `Скриншот приложения — ${heading}`,
    backToAboutLabel: 'Назад к разделу «О приложении»',
  },
}
