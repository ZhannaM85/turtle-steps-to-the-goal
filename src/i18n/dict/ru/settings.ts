import { dayCount } from './helpers'

import type { SettingsDict } from '../types/settings'

export const settings: SettingsDict = {
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
    mealItemSearchPlaceholder: 'Название или штрихкод...',
    mealItemSearchClearLabel: 'Очистить поиск',
    noMealItemResultsText: 'Ничего не найдено.',
    mealItemNameLabel: 'Название блюда',
    mealItemBarcodeLabel: 'Штрихкод',
    mealItemBarcodeTakenMessage: (name) =>
      `Этот штрихкод уже указан у «${name}».`,
    mealItemBarcodeMoveHereButton: 'Перенести штрихкод сюда',
    mealItemBarcodeMovedMessage: (name) =>
      `Штрихкод снят с «${name}». Это блюдо можно удалить, если оно больше не нужно.`,
    mealItemBarcodeOpenOtherLabel: (name) => `Открыть «${name}»`,
    deleteMealItemLabel: (name) => `Удалить «${name}»`,
    mealItemDeleteConfirmTitle: (name) =>
      `Удалить «${name}» из списка блюд?`,
    mealItemDeleteConfirmDescription:
      'Прошлые приёмы пищи с этим названием в истории не изменятся.',
    mealItemDeleteConfirmCloseLabel: 'Закрыть подтверждение удаления',
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
    editPresetLabel: (name) => `Изменить «${name}»`,
    savePresetLabel: (name) => `Сохранить «${name}»`,
    releaseNotesLabel: 'История изменений',
    showReleaseNotes: 'Показать историю изменений',
    hideReleaseNotes: 'Скрыть историю изменений',
    cycleTrackingLabel: 'Отслеживание цикла',
    digestionTrackingLabel: 'Отслеживание пищеварения',
    alcoholTrackingLabel: 'Отслеживание алкоголя',
    waterTrackingLabel: 'Отслеживание воды',
    plannedMealsTrackingLabel: 'Запланированные приёмы пищи',
    eatingReasonTrackingLabel: 'Почему я сейчас ем?',
    customEatingReasonsLabel: 'Свои причины',
    customEatingReasonsDescription:
      'Стандартные причины и те, что вы добавите. Все они появятся в списке приёма пищи.',
    customEatingReasonsPlaceholder: 'Добавить причину',
    customEatingReasonsEmpty: 'Пока пусто — добавьте причину ниже.',
    deleteCustomEatingReasonLabel: (name) => `Удалить «${name}»`,
    editCustomEatingReasonLabel: (name) => `Изменить «${name}»`,
    saveCustomEatingReasonLabel: (name) => `Сохранить «${name}»`,
    copyYesterdayMealsTrackingLabel: 'Копировать вчерашние приёмы пищи',
    mealKcalVsYesterdayTrackingLabel: 'Ккал приёма со вчера',
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
    trackedFieldsScreenshotsGroupLabel: 'Со скриншотов',
    zeppScreenshotTrackingLabel: 'Скриншот состава тела Zepp',
    autoSleepScreenshotTrackingLabel: 'Скриншот AutoSleep',
    trackedFieldHintSleep:
      'Часы сна и глубокий сон на экране «День». Можно ввести вручную, заполнить со скриншота AutoSleep или синхронизировать через Health Connect.',
    trackedFieldHintBodyMeasurements:
      'Талия, бёдра и процент жира на экране «День». Вводятся вручную.',
    trackedFieldHintBodyComposition:
      'Мышцы, висцеральный жир, вода и костная масса на экране «День». Вручную, со скриншота Zepp или из файла экспорта Zepp Life.',
    trackedFieldHintMorningNote:
      'Короткое утреннее текстовое поле на экране «День».',
    trackedFieldHintSteps:
      'Число шагов на экране «День». Вручную или через Health Connect.',
    trackedFieldHintNote: 'Вечерняя свободная заметка на экране «День».',
    trackedFieldHintMood: 'Выбор общего настроения дня.',
    trackedFieldHintDigestion: 'Да/нет по запору в вечернем блоке дня.',
    trackedFieldHintAlcohol: 'Да/нет по алкоголю в вечернем блоке дня.',
    trackedFieldHintNightEating:
      'Карточка «Ночная еда» на экране «День» — да/нет и несколько уточняющих вопросов.',
    trackedFieldHintCycle:
      'Отмечает дни цикла в Истории и на графике веса. Это не поле карточки «День».',
    trackedFieldHintWater:
      'Журнал воды на экране «День», с быстрым добавлением стакана или бутылки.',
    trackedFieldHintDayTotals:
      'Блок «Итоги дня» для калорий и БЖУ, включая значения без разбора по приёмам пищи.',
    trackedFieldHintFiber:
      'Клетчатка в приёмах пищи, итогах дня, цели и «Осталось».',
    trackedFieldHintPlannedMeals:
      'Заготовки приёмов пищи на другой день. Черновики не входят в итоги сегодня.',
    trackedFieldHintCopyYesterdayMeals:
      'Кнопка на экране «День», которая копирует вчерашние приёмы пищи в сегодня.',
    trackedFieldHintMealKcalVsYesterday:
      'На карточке приёма пищи — стрелка калорий относительно последнего предыдущего приёма с тем же названием (зелёная, если меньше, красная, если больше).',
    trackedFieldHintEatingReason:
      'Причины при добавлении или изменении приёма пищи.',
    trackedFieldHintSodium:
      'Натрий в приёмах пищи и итогах дня, плюс «Осталось», если задана цель.',
    trackedFieldHintPotassium:
      'Калий в приёмах пищи и итогах дня, плюс «Осталось», если задана цель.',
    trackedFieldHintMagnesium:
      'Магний в приёмах пищи и итогах дня, плюс «Осталось», если задана цель.',
    trackedFieldHintAutoSleepScreenshot:
      'На блоке сна — кнопка прочитать часы со скриншота AutoSleep. Ничего не сохраняется, пока вы не подтвердите.',
    trackedFieldHintZeppScreenshot:
      'На блоке состава тела — кнопка прочитать числа со скриншота Zepp. Ничего не сохраняется, пока вы не подтвердите.',
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
    sinceLastMealTimerLabel: 'Время с последнего приёма',
    sinceLastMealTimerDescription:
      'На экране «День» показывать, сколько прошло с последнего приёма пищи, и сколько прошло перед каждым приёмом — удобно для интервального голодания. По умолчанию выключено.',
    sinceLastMealTimerOn: 'Вкл',
    sinceLastMealTimerOff: 'Выкл',
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
    pinCardLabel: 'Закрепить сверху',
    unpinCardLabel: 'Открепить',
    collapseCardLabel: 'Свернуть',
    expandCardLabel: 'Развернуть',
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
    settingsGroupLogging: 'Дневник',
    settingsGroupAppearance: 'Вид',
    settingsGroupLibrary: 'Справочники',
    settingsGroupBackup: 'Резервные копии',
    settingsGroupDanger: 'Опасная зона',
    collapseSettingsGroupLabel: (section) => `Свернуть «${section}»`,
    expandSettingsGroupLabel: (section) => `Развернуть «${section}»`,
  }
