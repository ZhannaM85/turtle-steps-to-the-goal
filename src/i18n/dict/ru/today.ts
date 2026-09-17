import type { TodayDict } from '../types/today'

export const today: TodayDict = {
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
  sendDaySaveCsvButton: 'Сохранить как CSV',
  sendDaySaveCsvFailed: 'Не удалось сохранить CSV.',
  sendDaySavePdfButton: 'Сохранить как PDF',
  sendDaySavePdfFailed: 'Не удалось сохранить PDF.',
  sendDayQrAlt: 'QR-код записи за этот день',
  sendDayQrHint:
    'Наведите камеру другого телефона, чтобы посмотреть этот день.',
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
  completeDayButton: 'Завершить день',
  completeDayTitle: 'Если дни как сегодня станут обычными…',
  completeDayTodayLabel: 'Сегодня',
  completeDayEstimatedLabel: 'Оценка',
  completeDayWeekNow: 'Сегодня',
  completeDayWeekEnd: '5 недель',
  completeDayHorizonLabel: 'Период прогноза',
  completeDayIntakeLabel: 'Сегодня съедено',
  completeDayMaintenanceLabel: 'Оценка поддержания',
  completeDayDeficitLabel: 'Оценка дневного дефицита',
  completeDayChangeLower: (amount, horizon) =>
    `Примерно на ${amount} ниже за ${{ week: '1 неделю', month: '1 месяц', year: '1 год' }[horizon]}`,
  completeDayChangeHigher: (amount, horizon) =>
    `Примерно на ${amount} выше за ${{ week: '1 неделю', month: '1 месяц', year: '1 год' }[horizon]}`,
  completeDayChangeSame: (horizon) =>
    `Примерно так же через ${{ week: '1 неделю', month: '1 месяц', year: '1 год' }[horizon]}`,
  completeDayMissingWeight: 'Сначала запишите сегодняшний вес.',
  completeDayMissingCalories: 'Сначала запишите приём пищи (или итог за день).',
  completeDayMissingProfile:
    'Укажите рост, возраст, пол и активность в Настройках, чтобы оценить поддерживающую норму калорий.',
  completeDayProfileLink: 'Открыть Настройки',
  completeDayUnusualLow:
    'Сегодня не лучший день для прогноза. Калорий необычно мало, поэтому повторять такой день для прогноза не имеет смысла.',
  completeDayUnusualHigh:
    'Сегодня не лучший день для прогноза. Калорий необычно много, поэтому повторять такой день для прогноза не имеет смысла.',
  completeDayDisclaimer:
    'Это оценка по сегодняшним калориям и примерной норме. Вес на весах каждый день будет колебаться.',
}
