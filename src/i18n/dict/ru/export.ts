import { ruPluralize } from '../../ruPluralize'
import { dayCount, entryCount, goalCount } from './helpers'

import type { PdfSummaryDict, ExportDict, ZeppLifeImportDict, AppleHealthImportDict, MyFitnessPalImportDict, ExportXlsxDict } from '../types/export'

export const pdfSummary: PdfSummaryDict = {
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
    dailyLogPagesTitle: 'Дневник по дням',
    dailyLogMetricsSectionTitle: 'Показатели',
    dailyLogFoodSectionTitle: 'Еда',
    dailyLogNotesSectionTitle: 'Заметки',
  }

export const exportCopy: ExportDict = {
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
    exportFileNameLabel: 'Имя файла',
    exportRangeWeek: 'Неделя',
    exportRangeMonth: 'Месяц',
    exportRangeYear: 'Год',
    exportRangeAll: 'Все',
    exportRangeCustom: 'Свой',
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
      'PDF — это одностраничная сводка для врача (динамика веса, средние по неделям, выборочные замеры), а не полная выгрузка как в Excel. Таблица по дням — отдельная опция и по умолчанию выключена.',
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
    pdfSectionDailyLogPagesLabel: 'Страницы дневника',
    pdfSectionDailyLogPagesHint:
      'Добавляет альбомные страницы с теми же колонками по дням, что и CSV. По умолчанию выключено, чтобы PDF оставался одностраничной сводкой.',
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
  }

export const zeppLifeImport: ZeppLifeImportDict = {
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
  }

export const appleHealthImport: AppleHealthImportDict = {
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
  }

export const myFitnessPalImport: MyFitnessPalImportDict = {
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
  }

export const exportXlsx: ExportXlsxDict = {
    dailyLogSheetName: 'Дневник',
    mealsSheetName: 'Приёмы пищи',
    waterEntriesSheetName: 'Вода',
    goalsSheetName: 'Цели',
    dateColumn: 'Дата',
    weightColumn: 'Вес (кг)',
    nextMorningWeightColumn: 'Вес следующим утром',
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
    eveningNoteColumn: (date) =>
      date ? `Вечерняя заметка ${date}` : 'Вечерняя заметка',
    morningNoteColumn: 'Утренняя заметка',
    onPeriodColumn: 'Менструация',
    hadConstipationColumn: 'Запор',
    hadAlcoholColumn: 'Алкоголь',
    nightEatingColumn: (sex) =>
      sex === 'female'
        ? 'Ела поздно вечером'
        : sex === 'male'
          ? 'Ел поздно вечером'
          : 'Ел(а) поздно вечером',
    nightEatingRememberColumn: (sex) =>
      sex === 'female'
        ? 'Помню, как ела'
        : sex === 'male'
          ? 'Помню, как ел'
          : 'Помню, как ел(а)',
    nightEatingReasonColumn: 'Причина ночной еды',
    nightEatingNoEasyColumn: 'Было легко?',
    nightEatingNoWhatHelpedColumn: 'Что помогло?',
    waterColumn: 'Вода (мл)',
    waterAmountColumn: 'Количество (мл)',
    muscleMassColumn: 'Мышцы (кг)',
    visceralFatColumn: 'Висцеральный жир',
    bodyWaterColumn: 'Вода в организме (%)',
    boneMassColumn: 'Кости (кг)',
    fiberColumn: 'Клетчатка (г)',
    sodiumColumn: 'Натрий (мг)',
    potassiumColumn: 'Калий (мг)',
    magnesiumColumn: 'Магний (мг)',
    mealReactionColumn: 'Реакция на приём',
    eatingReasonColumn: 'Почему ем',
    itemNoteColumn: 'Заметка к блюду',
    customMetricNoteColumn: (name) => `${name} (заметка)`,
    mealColumn: 'Приём пищи',
    itemColumn: 'Блюдо',
    brandColumn: 'Бренд',
    gramsColumn: 'Граммы',
    timeColumn: 'Время',
    reactionColumn: 'Реакция',
    createdColumn: 'Создано',
    weeklyTargetColumn: 'Цель на неделю (кг)',
    weekStartColumn: 'Начало недели',
    weekEndColumn: 'Конец недели',
    baselineWeightColumn: 'Исходный вес (кг)',
  }
