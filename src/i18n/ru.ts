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
    today: 'Сегодня',
    dashboard: 'Обзор',
    history: 'История',
    goal: 'Цель',
    settings: 'Настройки',
    about: 'О проекте',
  },
  today: {
    title: 'Сегодня',
    description: 'Ввод данных за сегодня, напоминание о цели на неделю',
    thisWeeksTarget: 'Цель на эту неделю',
    toLose: (unit) => `${unit} похудения`,
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
    targetMetBanner: 'Вы достигли цели на эту неделю!',
    dailyReminderText: 'Сегодня пока нет записи — когда будете готовы.',
    targetMetSectionTitle: 'Цель достигнута',
    goalRenewalReminderSectionTitle: 'Напоминание об обновлении цели',
    dailyReminderSectionTitle: 'Ежедневное напоминание',
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
    reorderCardLabel: (n) => `Изменить порядок карточки ${n}`,
    reorderCardsButton: 'Порядок карточек',
    resetCardOrderButton: 'Сбросить порядок',
    statsSectionLabel: 'Показатели',
    expandStatsLabel: 'Показать показатели',
    collapseStatsLabel: 'Скрыть показатели',
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
    celebrationDescription:
      'Отличная работа — хотите задать цель на следующую неделю?',
    celebrationCta: 'Задать цель на следующую неделю',
    celebrationCloseLabel: 'Закрыть',
    deepSleepDescription: (hours) => `${hours} глубокого сна`,
  },
  dailyEntry: {
    morningEntriesTitle: 'Утренние записи',
    morningEntriesSubtitle: 'Заполните утром после пробуждения',
    eveningEntriesTitle: 'Вечерние записи',
    eveningEntriesSubtitle: 'Заполните перед сном',
    weightLabel: 'Вес (кг)',
    addCaloriesLabel: 'ккал/100г',
    addCaloriesPortionLabel: 'ккал',
    addCaloriesPlaceholder: 'ккал',
    macroModeLabel: 'Режим ввода',
    macroModePer100gOption: '100 г',
    macroModePerPortionOption: 'Порция',
    addButton: 'Добавить',
    macrosLabel: 'БЖУ',
    kcalUnit: 'ккал',
    noteLabel: 'Заметка дня',
    noteFieldPlaceholder: 'Как прошёл день?',
    editWeightLabel: 'Изменить вес',
    editNoteLabel: 'Изменить заметку',
    saveWeightLabel: 'Сохранить вес',
    saveNoteLabel: 'Сохранить заметку',
    cancelEditWeightLabel: 'Отменить редактирование веса',
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
    reorderMealLabel: (n) => `Изменить порядок: приём пищи ${n}`,
    editMealScreenTitle: 'Редактировать приём пищи',
    backLabel: 'Назад',
    mealNotFoundText: 'Этот приём пищи не найден.',
    mealLabelFieldLabel: 'Название приёма пищи',
    defaultMealNamePresets: ['Завтрак', 'Обед', 'Ужин', 'Перекус'],
    saveButton: 'Сохранить',
    saveAndAddAnotherButton: 'Сохранить и добавить ещё',
    mealNoteLabel: 'Заметка о приёме пищи',
    mealNotePlaceholder: 'Было вкусно?',
    itemNameLabel: 'Название блюда',
    itemNamePlaceholder: 'Создать блюдо?',
    itemBrandLabel: 'Бренд (необязательно)',
    itemBrandPlaceholder: 'например, Perdue',
    itemQuantitySectionLabel: 'Количество',
    itemNutritionSectionLabel: (isPer100g) =>
      isPer100g ? 'Пищевая ценность (на 100 г)' : 'Пищевая ценность',
    itemNoteLabel: 'Заметка (необязательно)',
    itemNotePlaceholder: 'Добавьте заметку...',
    deleteItemLabel: 'Удалить блюдо',
    addItemButton: '+ Добавить блюдо',
    emotionLabel: (emotion) =>
      emotion === 'happy'
        ? 'Радостно'
        : emotion === 'unhappy'
          ? 'Грустно'
          : 'Нейтрально',
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
    fiberLabel: 'Клетчатка',
    itemPortionsLabel: '× 100 г',
    gramsUnit: 'г',
    macrosSummary: (protein, fat, carbs) =>
      `Белки ${protein} · Жиры ${fat} · Углеводы ${carbs}`,
    macrosSummaryCompact: (protein, fat, carbs) =>
      `Б ${protein} · Ж ${fat} · У ${carbs}`,
    timeEatenLabel: 'Время',
    clearTimeLabel: 'Очистить время',
    clearItemDraftLabel: 'Очистить',
    collapseAddMealLabel: 'Свернуть',
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
    scanBarcodeInstructions: 'Наведите камеру на штрихкод.',
    scanBarcodeCameraErrorMessage: (detail) =>
      `Не удалось получить доступ к камере — проверьте разрешения и попробуйте снова.${detail ? ` (${detail})` : ''}`,
    scanBarcodeSearchingMessage: 'Ищем этот продукт…',
    scanBarcodeStillScanningTip:
      'Всё ещё сканируем — убедитесь, что штрихкод хорошо освещён, в фокусе и полностью помещается в кадр выше.',
    scanBarcodeManualLabel: 'Или введите номер штрихкода',
    scanBarcodeManualPlaceholder: 'Номер штрихкода',
    scanBarcodeManualSubmitLabel: 'Найти',
    noFoodFoundForBarcodeMessage:
      'Еда с таким штрихкодом не найдена — вы можете добавить её вручную ниже.',
    fastingWindowToastMessage: (hours) =>
      `Ваше окно голодания составило ${hours}.`,
    dismissFastingWindowToastLabel: 'Скрыть',
    foodSearchLabel: 'Поиск продуктов',
    foodSearchPlaceholder: 'Поиск…',
    foodQuantityLabel: 'Количество (г)',
    servingModeLabel: 'Порция',
    gramsModeOption: 'Граммы',
    servingCountLabel: 'Сколько',
    favoriteFoodLabel: (name) => `Добавить «${name}» в избранное`,
    unfavoriteFoodLabel: (name) => `Убрать «${name}» из избранного`,
    noFoodResultsText: 'Ничего не найдено.',
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
    bodyCompositionSummary: (
      muscleMass,
      visceralFat,
      bodyWater,
      boneMass,
      bodyFat,
    ) =>
      `Мышцы ${muscleMass} · Висц. жир ${visceralFat} · Вода ${bodyWater} · Кости ${boneMass} · Жир ${bodyFat}`,
    onPeriodLabel: 'Менструация',
    hadConstipationLabel: 'Запор',
    hadConstipationNoOption: 'Нет',
    hadConstipationYesOption: 'Да',
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
    dailyWaterTargetLabel: 'Дневная цель по воде',
    dailyWaterTargetHint: 'Необязательно — можно оставить пустым.',
    suggestTargetButton: 'Предложить цель',
    suggestTargetCaveat:
      'Заполняет четыре поля ниже на основе веса, роста, возраста, пола и уровня активности — это не медицинская или диетическая рекомендация. Проверьте и при необходимости измените значения перед сохранением.',
    suggestTargetMissingProfileHint:
      'Чтобы использовать это, запишите вес и укажите рост, возраст, пол и уровень активности в настройках.',
    updateButton: 'Обновить цель на неделю',
    setButton: 'Задать цель на неделю',
    startNewGoalButton: 'Начать новую цель',
    startNewGoalHint:
      'Начинает новый 7-дневный период с сегодняшнего дня, а текущий переходит в «Прошлые цели».',
    savedConfirmation: 'Сохранено',
    currentGoalTitle: 'Текущая цель',
    notSetLabel: 'Не задано',
    editGoalLabel: 'Редактировать цель',
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
    activeGoalReachedNudge:
      'Вы досрочно достигли цели на эту неделю — задайте новую, когда будете готовы.',
    activeGoalReachedSectionTitle: 'Цель достигнута',
    deletePastTargetLabel: (weekRange) => `Удалить цель за ${weekRange}`,
    confirmDeletePastTargetLabel: 'Удалить эту цель?',
    confirmDeletePastTargetYes: 'Удалить',
    confirmDeletePastTargetNo: 'Отмена',
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
    exportedCsvSummary: (entries) => `Экспортировано: ${entryCount(entries)}.`,
    importedSummary: (summary) => `Импортировано: ${summary}.`,
    invalidBackup: 'Этот файл не похож на резервную копию Turtle Steps.',
    notValidJson: 'Этот файл не является корректным JSON.',
    exportFailed: 'Не удалось выполнить экспорт.',
    importFailed: 'Не удалось выполнить импорт.',
    exportPeriodLabel: 'Период экспорта',
    exportPeriodDescription:
      'Необязательно — применяется к Excel, CSV и Markdown ниже, а также к экспорту копии за период ниже, но не к полной резервной копии JSON выше. Оставьте пустым, чтобы экспортировать всё.',
    exportRangedBackupBlurb:
      'Скачайте резервную копию JSON только за период выше, а не за всю историю — удобно, чтобы поделиться или сохранить часть данных, не выгружая всё. Не заменяет полную резервную копию выше — она остаётся единственным гарантированно полным источником для восстановления.',
    exportRangedBackupButton: 'Экспортировать копию за период',
    exportingRangedBackupButton: 'Экспорт…',
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
      'Запросите выгрузку данных (Data Access Request) на myfitnesspal.com → Settings → Privacy Center → Manage My Data. Файл придёт на почту в формате .xlsx — подготовка может занять несколько дней.',
    importButton: 'Импорт из MyFitnessPal',
    importingButton: 'Импорт…',
    importedSummary: (days, updated) =>
      `Импортированы данные за ${dayCount(days)} из MyFitnessPal (обновлено записей: ${updated}).`,
    importedNothingSummary:
      'В этом экспорте не оказалось данных о приёмах пищи или весе для импорта.',
    invalidFile: 'Это не похоже на файл экспорта MyFitnessPal.',
    importFailed: 'Не удалось выполнить импорт.',
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
    trendChartPeriodLabel: 'Период графиков',
    trendChartPeriodAllOption: 'Всё время',
    trendChartPeriodWeekOption: 'Неделя',
    trendChartPeriodMonthOption: 'Месяц',
    trendChartPeriodYearOption: 'Год',
    trendChartPeriodCustomOption: 'Свой период',
    weightTrendTitle: 'График веса',
    calorieTrendTitle: 'График калорий',
    macrosTitle: 'Белки, жиры и углеводы',
    bodyCompositionTrendTitle: 'Состав тела',
    bodyCompositionEmptyDescription:
      'Выберите хотя бы один показатель, чтобы увидеть график.',
    hideChartLabel: (title) => `Скрыть: ${title}`,
    showChartLabel: (title) => `Показать: ${title}`,
    weeklySummaryTitle: 'Недельная сводка',
    weekRange: (start, end) => `${start} – ${end}`,
    weightChangeLabel: 'Изменение за неделю',
    averageCaloriesLabel: 'Средние калории',
    targetMetNote: 'цель достигнута',
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
      'Заполните несколько дней на экране «Сегодня», чтобы увидеть тренды здесь.',
    correlationTitle: 'Калории и изменение веса',
    correlationEmptyDescription:
      'Пока недостаточно данных, чтобы увидеть закономерность — продолжайте вести записи и загляните сюда через несколько недель.',
    correlationSummary: (thresholdKcal, direction) =>
      direction === 'lower'
        ? `Недели с калорийностью ниже ${thresholdKcal} ккал/день в среднем показывали большую потерю веса, чем недели выше этого значения.`
        : `Недели с калорийностью выше ${thresholdKcal} ккал/день в среднем показывали большую потерю веса, чем недели ниже этого значения.`,
    correlationWeekCount: (n) =>
      `На основе ${n} ${ruPluralize(n, 'недели', 'недель', 'недель')} данных.`,
    correlationLagCaveat:
      'Сравнивает средние калории за неделю с изменением веса за ту же неделю, а не показатели одного дня — на переваривание пищи нужно время, поэтому сегодняшний вес отражает то, что вы ели в предыдущие дни.',
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
    viewOutlierDayLabel: (label) => `Редактировать ${label}`,
    weeklyChangeLegend: 'изменение за неделю',
    chartNavigationHint: 'Нажмите на точку для подробностей',
    viewDayLink: 'Открыть этот день',
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
    customChartTypeLine: 'Линия',
    customChartTypeBar: 'Столбцы',
    customChartTypeDots: 'Точки',
    customChartTypeGroupLabel: (seriesLabel) =>
      `Тип графика для «${seriesLabel}»`,
    customChartNormalizedCaveat:
      'Каждая линия масштабирована по своему диапазону, чтобы разные единицы измерения (кг, ккал, шаги) можно было показать на одном графике — форма и тренд сопоставимы, но высота линии не отражает абсолютное значение. Точное значение за день смотрите во всплывающей подсказке.',
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
      'Заполните несколько дней на экране «Сегодня», чтобы увидеть их здесь.',
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
    reachedGoalWindowDayLabel: 'Часть недели, когда вы достигли цели',
    reachedGoalDayLabel: 'В этот день вы достигли цели',
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
    mealItemSearchLabel: 'Поиск блюд',
    mealItemSearchPlaceholder: 'Поиск...',
    noMealItemResultsText: 'Ничего не найдено.',
    mealItemNameLabel: 'Название блюда',
    deleteMealItemLabel: (name) => `Удалить «${name}»`,
    editMealItemLabel: (name) => `Изменить «${name}»`,
    saveMealItemLabel: (name) => `Сохранить «${name}»`,
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
    waterTrackingLabel: 'Отслеживание воды',
    trackedFieldsLabel: 'Что отслеживать',
    trackedFieldsDescription:
      'Выберите, какие необязательные поля показывать на экране «Сегодня». Отключение поля скрывает его только для новых записей — уже сохранённые данные остаются видны в Истории, экспорте и на панели.',
    profileLabel: 'Профиль',
    profileDescription:
      'Необязательно — используется только для расчёта ИМТ и примерной суточной потребности в калориях (базовый обмен) на экране «Сегодня». Хранится только на этом устройстве, не входит в резервные копии.',
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
      'Необязательно — показывает спокойную заметку на экране «Сегодня», если вы ещё ничего не записали. По умолчанию выключено.',
    dailyReminderOn: 'Вкл',
    dailyReminderOff: 'Выкл',
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
      'Когда начинается ваш день на экране «Сегодня» — всё, что записано до этого времени, засчитывается за предыдущий день. Влияет только на новые записи и пока только на экран «Сегодня» (серии, сводки и корреляции всё ещё используют реальную календарную дату). По умолчанию — полночь, что полностью соответствует текущей дате.',
    foodListLabel: 'Список продуктов',
    foodListDescription:
      'Скройте ненужные продукты или исправьте их калорийность/БЖУ.',
    manageFoodListButton: 'Управлять списком продуктов',
    aboutLabel: 'О проекте',
    aboutDescription:
      'Что это за приложение, кто его сделал, и заметки о выпусках.',
    viewAboutButton: 'Открыть «О проекте»',
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

    logValuesSectionLabel: 'Записать значение',
    logValuesMovedText: 'Записывайте значения за сегодня на главном экране.',
    booleanYesOption: 'Да',
    booleanNoOption: 'Нет',
    scaleValueLabel: (n) => `Оценка ${n} из 5`,
    valueSavedLabel: 'Сохранено',
    noteLabel: 'Заметка',
    notePlaceholder: 'Добавьте заметку об этом значении...',
    saveNoteLabel: 'Сохранить заметку',
    editNoteLabel: 'Изменить заметку',

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
  about: {
    title: 'О приложении',
    description: 'Что это за приложение и зачем оно нужно',
    intro:
      'Изменения веса зависят от многих факторов — не только от калорий. «Черепашка идёт к цели» помогает собрать их вместе, в одном месте.',
    tracking:
      'Отслеживайте вес вместе с калориями, белками, углеводами, жирами, сном, активностью, менструальным циклом, приёмами пищи и личными заметками. Со временем приложение помогает увидеть закономерности и понять, как ваши повседневные привычки связаны с прогрессом.',
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
      'Приложение не собирает никакие данные автоматически. Всё, что вы видите в приложении, было введено вами: вес, калории, приёмы пищи, сон, активность, цикл, заметки и любые другие поля, которые вы заполняете.',
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
        heading: 'Ежедневные записи',
        items: [
          'Отслеживайте вес, калории, белки, жиры и углеводы каждый день',
          'Записывайте сон, шаги, воду и настроение вместе с весом',
          'Опциональное отслеживание менструального цикла и пищеварения — по умолчанию выключено и не показывается, пока вы сами не включите',
        ],
      },
      {
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
        heading: 'Цели и прогресс',
        items: [
          'Задайте недельный темп снижения веса вместо одной большой цифры',
          'Опциональные дневные цели по калориям, белкам, жирам и углеводам',
          'Смотрите, была ли достигнута цель за неделю и на каких взвешиваниях это основано',
        ],
      },
      {
        heading: 'Дашборд и тренды',
        items: [
          'Графики тренда веса, калорий и БЖУ, а также недельные и месячные сводки',
          'Отслеживайте объём талии, бёдер и процент жира в организме со временем',
          'Создайте свой график сравнения любых двух отслеживаемых показателей',
          'Меняйте порядок разделов Дашборда так, как удобно вам',
        ],
      },
      {
        heading: 'Корреляции и наблюдения',
        items: [
          'Смотрите, как белок, фаза цикла или окно голодания связаны с вашим весом',
          'Замечайте закономерности без необходимости считать самостоятельно',
        ],
      },
      {
        heading: 'История',
        items: [
          'Просматривайте каждый прошедший день в календаре',
          'Смотрите, какие именно дни достигли недельной цели',
        ],
      },
      {
        heading: 'Ваши данные — на вашем устройстве',
        items: [
          'Всё хранится локально — без аккаунта, без облака, без слежки',
          'Экспортируйте полную резервную копию или файл Excel, CSV либо Markdown в любой момент',
          'Импортируйте резервную копию, чтобы восстановить данные или перенести их на новое устройство',
        ],
      },
      {
        heading: 'Настройте под себя',
        items: [
          'Русский и английский язык',
          'Светлая и тёмная тема, несколько цветовых оформлений',
          'Килограммы или фунты, а также настраиваемый день начала недели и время начала дня',
        ],
      },
    ],
    backToAboutLabel: 'Назад к разделу «О приложении»',
  },
}
