import type { Dictionary } from './Dictionary'
import { ruPluralize } from './ruPluralize'

function goalCount(n: number): string {
  return `${n} ${ruPluralize(n, 'цель', 'цели', 'целей')}`
}

function entryCount(n: number): string {
  return `${n} ${ruPluralize(n, 'запись', 'записи', 'записей')}`
}

export const ru: Dictionary = {
  common: {
    loading: 'Загрузка…',
    weekLabel: (weekNumber, start, end) =>
      `Неделя ${weekNumber} · ${start} – ${end}`,
    kg: 'кг',
    lb: 'фунт',
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
    description:
      'Быстрый ввод веса и калорий за сегодня, напоминание о цели на неделю',
    thisWeeksTarget: 'Цель на эту неделю',
    toLose: (unit) => `${unit} похудения`,
    emptyGoalTitle: 'Цель ещё не задана',
    emptyGoalDescription: 'Задайте цель на неделю, чтобы увидеть её здесь.',
    setGoalButton: 'Задать цель',
    dateLabel: 'Дата',
    goalRenewalReminder:
      'Эта неделя заканчивается сегодня — стоит проверить цель на следующую неделю.',
    reviewGoalLink: 'Посмотреть цель',
    vsYesterdayLabel: 'по сравнению со вчера',
    celebrationTitle: 'Вы достигли цели на эту неделю!',
    celebrationDescription:
      'Отличная работа — хотите задать цель на следующую неделю?',
    celebrationCta: 'Задать цель на следующую неделю',
    celebrationCloseLabel: 'Закрыть',
  },
  dailyEntry: {
    weightLabel: 'Вес (кг)',
    caloriesLabel: 'Калории',
    caloriesTooltip:
      'Сегодняшний вес отражает то, что вы съели вчера — на переваривание нужно время, поэтому не ждите, что эти два числа совпадут в один день.',
    caloriesTooltipLabel: 'О поле «Калории»',
    addCaloriesLabel: 'Добавить калории',
    addCaloriesPlaceholder: '+ ккал',
    addButton: 'Добавить',
    caloriesTodaySuffix: 'ккал сегодня',
    kcalUnit: 'ккал',
    noteLabel: 'Заметка (необязательно)',
    editWeightLabel: 'Изменить вес',
    editNoteLabel: 'Изменить заметку',
    saveWeightLabel: 'Сохранить вес',
    saveNoteLabel: 'Сохранить заметку',
    mealLabel: (n) => `Приём пищи ${n}`,
    editMealLabel: (n) => `Изменить приём пищи ${n}`,
    deleteMealLabel: (n) => `Удалить приём пищи ${n}`,
    reorderMealLabel: (n) => `Изменить порядок: приём пищи ${n}`,
    saveButton: 'Сохранить',
    mealNoteLabel: 'Заметка о приёме пищи',
    mealNotePlaceholder: 'Заметка (необязательно)',
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
    dayMoodLabel: 'Настроение за день',
    proteinLabel: 'Белки',
    fatLabel: 'Жиры',
    carbsLabel: 'Углеводы',
    gramsUnit: 'г',
    macrosSummary: (protein, fat, carbs) =>
      `Белки ${protein} · Жиры ${fat} · Углеводы ${carbs}`,
    sleepLabel: 'Сон',
    sleepHoursLabel: 'Часов сна',
    deepSleepHoursLabel: 'Глубокий сон (часов)',
    editSleepLabel: 'Изменить сон',
    saveSleepLabel: 'Сохранить сон',
    hoursUnit: 'ч',
    sleepSummary: (hours, deepHours) => `${hours} сна · ${deepHours} глубокого`,
    stepsLabel: 'Шаги',
    editStepsLabel: 'Изменить шаги',
    saveStepsLabel: 'Сохранить шаги',
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
    updateButton: 'Обновить цель на неделю',
    setButton: 'Задать цель на неделю',
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
    importedSummary: (summary) => `Импортировано: ${summary}.`,
    invalidBackup: 'Этот файл не похож на резервную копию Turtle Steps.',
    notValidJson: 'Этот файл не является корректным JSON.',
    exportFailed: 'Не удалось выполнить экспорт.',
    importFailed: 'Не удалось выполнить импорт.',
  },
  dashboard: {
    title: 'Обзор',
    description:
      'График веса, график калорий, карточки недельной сводки, корреляции',
    weightLegend: 'вес',
    caloriesLegend: 'калории',
    rollingAverageLegend: 'среднее за 7 дней',
    macrosTitle: 'Белки, жиры и углеводы',
    weeklySummaryTitle: 'Недельная сводка',
    weekRange: (start, end) => `${start} – ${end}`,
    weightChangeLabel: 'Изменение за неделю',
    averageCaloriesLabel: 'Средние калории',
    targetMetNote: 'цель достигнута',
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
    weeklyChangeLegend: 'изменение за неделю',
    chartNavigationHint: 'Нажмите на точку для подробностей',
    viewDayLink: 'Открыть этот день',
  },
  history: {
    title: 'История',
    description: 'Таблица всех прошлых записей — редактирование и удаление',
    emptyTitle: 'Пока нет записей',
    emptyDescription:
      'Заполните несколько дней на экране «Сегодня», чтобы увидеть их здесь.',
    dateColumn: 'Дата',
    weightColumn: 'Вес',
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
  },
  settings: {
    title: 'Настройки',
    description: 'Единицы измерения (кг/фунты), язык и другие настройки',
    unitsLabel: 'Единицы измерения',
    languageLabel: 'Язык',
    english: 'Английский',
    russian: 'Русский',
    appearanceLabel: 'Оформление',
    moodLabel: 'Настроение',
    moodPond: 'Пруд',
    moodDusk: 'Сумерки',
    moodSage: 'Шалфей',
    moodTortoise: 'Черепаха',
    moodLagoon: 'Лагуна',
    colorSchemeLabel: 'Светлая / тёмная',
    light: 'Светлая',
    dark: 'Тёмная',
    mealItemsLabel: 'Блюда',
    mealItemsDescription:
      'Блюда, которые вы уже добавляли — подсказки при вводе. Здесь их можно переименовать или удалить.',
    mealItemsEmpty: 'Пока пусто — блюда появятся здесь после первой записи.',
    mealItemNameLabel: 'Название блюда',
    deleteMealItemLabel: (name) => `Удалить «${name}»`,
    releaseNotesLabel: 'История изменений',
    showReleaseNotes: 'Показать историю изменений',
    hideReleaseNotes: 'Скрыть историю изменений',
  },
  about: {
    title: 'О приложении',
    description: 'Что это за приложение и зачем оно нужно',
    intro:
      '«Черепашка идёт к цели» — небольшое личное приложение для отслеживания веса. В основе — одна идея: перемены происходят через маленькие, уверенные шаги, а не через большие цели, которые давят.',
    philosophy:
      'Здесь нет долгосрочной цели, которую нужно преследовать, нет серий для поддержания и нет значков для сбора. Только маленький шаг на этой неделе, день за днём.',
    privacy:
      'Все данные хранятся только на вашем устройстве и никуда не передаются.',
    madeBy: (author) => `Автор: ${author}`,
  },
}
