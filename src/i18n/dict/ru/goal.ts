import type { GoalDict, WeeklyReviewDict } from '../types/goal'

export const goal: GoalDict = {
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
    paceCheckLostMessage: (actual, target) =>
      `За последние недели вес снизился примерно на ${actual} при цели ${target} — возможно, стоит скорректировать недельный темп.`,
    paceCheckGainedMessage: (actual, target) =>
      `За последние недели вес вырос примерно на ${actual} при цели похудеть на ${target} — возможно, стоит скорректировать недельный темп.`,
    paceCheckUnchangedMessage: (target) =>
      `За последние недели вес почти не изменился при цели ${target} — возможно, стоит скорректировать недельный темп.`,
    paceCheckPerWeekLabel: (value, unit) => `${value} ${unit}/нед.`,
    paceCheckSectionTitle: 'Проверка темпа',
    deletePastTargetLabel: (weekRange) => `Удалить цель за ${weekRange}`,
    confirmDeletePastTargetLabel: 'Удалить эту цель?',
    confirmDeletePastTargetYes: 'Удалить',
    confirmDeletePastTargetNo: 'Отмена',
  }

export const weeklyReview: WeeklyReviewDict = {
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
  }
