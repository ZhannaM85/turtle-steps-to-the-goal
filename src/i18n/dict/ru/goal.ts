import type { GoalDict, WeeklyReviewDict } from '../types/goal'

export const goal: GoalDict = {
    title: 'Цель',
    description:
      'Маленькие шаги к цели — в вашем темпе и в выбранные сроки.',
    thisWeeksTarget: 'Цель на выбранный период',
    weightLossPaceLabel: 'Темп снижения веса',
    targetLabel: (unit) => `Темп снижения веса (${unit}/неделю)`,
    targetRequired: 'Укажите темп снижения веса больше 0',
    deficitEstimate: (kcal, direction) =>
      `Примерная оценка: около ${kcal} ккал/день ${direction === 'deficit' ? 'дефицита' : 'профицита'}.`,
    deficitCaveat:
      'Это простая арифметическая оценка (~7700 ккал ≈ 1 кг жира), не медицинская и не диетологическая рекомендация.',
    paceCaloriesMismatchHint:
      'Дневные калории и темп снижения веса не совпадают (одно похоже на похудение, другое — на поддержание или набор). Используйте «Пересчитать по калориям» или «по темпу снижения веса» — поля сами не меняются.',
    decreaseWeeklyTargetLabel: 'Уменьшить темп снижения веса',
    increaseWeeklyTargetLabel: 'Увеличить темп снижения веса',
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
      'Выберите дату окончания цели. Период может быть короче или длиннее недели.',
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
    suggestTargetNeedsPaceHint:
      'Сначала укажите темп снижения веса больше 0. «Предложить цель» заполнит дневные калории и БЖУ по этому темпу.',
    recalculateFromPaceButton: 'Пересчитать по темпу снижения веса',
    recalculateFromCaloriesButton: 'Пересчитать по калориям',
    recalculateFromFieldCaveat:
      'Грубая оценка по вашему профилю — не медицинская рекомендация. Проверьте перед сохранением.',
    updateButton: 'Обновить цель',
    setButton: 'Задать цель',
    cancelButton: 'Отмена',
    confirmDiscardEditsLabel: 'Уйти без сохранения изменений цели?',
    startNewGoalButton: 'Начать новую цель',
    startNewGoalHint:
      'Начинает новое окно (по умолчанию с сегодня). Если оно пересекается с предыдущей целью, появится предупреждение — сохранить всё равно можно.',
    startNewGoalAvailableFromLabel: (weekEndDate) =>
      `Новую цель можно начать после завершения текущей — ${weekEndDate}.`,
    savedConfirmation: 'Сохранено',
    currentGoalTitle: 'Текущая цель',
    notSetLabel: 'Не задано',
    editGoalLabel: 'Редактировать цель',
    deleteGoalLabel: 'Удалить цель',
    confirmDeleteGoalLabel: 'Удалить эту цель? Это действие нельзя отменить.',
    pastTargetsTitle: 'Прошлые цели',
    weekColumnLabel: 'Период',
    targetColumnLabel: 'Цель',
    statusColumnLabel: 'Статус',
    targetPerWeek: (target, unit) => `${target} ${unit}/неделю`,
    targetMetLabel: 'Цель достигнута',
    targetMetOnLabel: (date) => `Цель достигнута ${date}`,
    targetMissedLabel: 'Цель не достигнута',
    targetNoDataLabel: 'Недостаточно данных',
    previousToCurrentWeightLabel: (previous, current, unit) =>
      `${previous} → ${current} ${unit}`,
    activeGoalReachedNudge: () =>
    "Вы достигли цели! Можно начать новую цель, когда будете готовы.",
    activeGoalReachedSectionTitle: 'Цель достигнута',
    goalCompletedNudge:
      'Вы выполнили цель! Начните новую ниже, когда будете готовы.',
    goalCompletedSectionTitle: 'Цель выполнена',
    goalMissedNudge:
      'Цель не достигнута — это нормально. Начните новую ниже, когда будете готовы.',
    goalMissedSectionTitle: 'Итог периода',
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
    screenTitle: 'Обзор цели',
    screenDescription:
      'Спокойный взгляд на период цели — без баллов, без стыда, просто как обстоят дела.',
    viewWeeklyReviewButton: 'Обзор цели',
    backToGoalLabel: '← Цель',
    noActiveGoalMessage: 'Задайте цель на странице «Цель», чтобы увидеть обзор здесь.',
    progressSectionLabel: 'Прогресс за период',
    progressMetLabel: (date) => `Цель достигнута ${date}.`,
    progressNotYetLabel: 'Цель ещё не достигнута — спешить некуда.',
    progressNoBaselineYetMessage:
      'Пока нет начального веса для этой цели — прогресс появится, как только он будет.',
    averagesSectionLabel: 'Среднее за период',
    averagesSummary: (kcal, protein) => `${kcal} ккал/день, ${protein} белка/день.`,
    noAveragesYetMessage: 'За этот период цели пока ничего не внесено.',
    insightSectionLabel: 'Что выделяется',
    adjustPaceButton: 'Скорректировать темп',
  }
