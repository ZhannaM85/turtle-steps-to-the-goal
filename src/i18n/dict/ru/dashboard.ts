import { ruPluralize } from '../../ruPluralize'
import { dayCount } from './helpers'

import type { DashboardDict } from '../types/dashboard'

export const dashboard: DashboardDict = {
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
    mostEatenTitle: 'Чаще всего недавно',
    mostEatenDescription:
      'Блюда, которые вы записывали чаще всего за последние 7 и 30 дней — не корреляция с весом.',
    mostEatenModeGroupLabel: 'Сортировка',
    mostEatenCountModeLabel: 'Раз',
    mostEatenKcalModeLabel: 'ккал',
    mostEatenKcalValue: (kcal, percent) => `${kcal} ккал (${percent}%)`,
    eatingReasonsTallyTitle: 'Почему недавно были приёмы пищи',
    eatingReasonsTallyDescription:
      'Как часто выбиралась каждая причина за последние 7 и 30 дней — не корреляция с весом.',
    mealTimeBucketsTitle: 'Когда были приёмы пищи',
    mealTimeBucketsDescription:
      'Приёмы пищи по времени суток за последние 7 и 30 дней — не корреляция с весом.',
    mealTimeBucketMorning: 'Утро',
    mealTimeBucketAfternoon: 'День',
    mealTimeBucketEvening: 'Вечер',
    mealTimeBucketNight: 'Ночь',
    mealTimeBucketsMissingTime: (n) =>
      `У ${n} ${ruPluralize(n, 'приёма', 'приёмов', 'приёмов')} пищи не указано время.`,
    mealNameFrequencyTitle: 'Названия приёмов пищи недавно',
    mealNameFrequencyDescription:
      'Как часто встречалось каждое название приёма пищи за последние 7 и 30 дней — не рейтинг блюд.',
    eatingPatternsTitle: 'Закономерности',
    eatingPatternsDescription:
      'Что обычно бывает после приёма пищи в ваших данных — время до следующего эпизода еды, а не рейтинг блюд.',
    eatingPatternsLearningDescription:
      'Мы ещё изучаем ваши закономерности… Продолжайте записывать приёмы пищи со временем. Подсказки появятся, когда выборка станет достаточной.',
    eatingPatternsCaveat:
      'Данные подсказывают связь, а не причину. Корреляция — не причинность, и это не медицинский совет.',
    eatingPatternsDetailsLabel: 'Как это посчитано',
    eatingPatternsDetailsBody:
      'Каждый интервал — от одного приёма пищи со временем до следующего (включая переход через полночь). Это время до следующего эпизода еды. Время до голода учитывается, только если вы указали голод причиной следующего приёма — из паузы оно не выводится. Более/менее углеводные приёмы делятся по медиане доли калорий из углеводов. Вечер — 17:00–22:59, ночь — 23:00–04:59.',
    eatingPatternsSampleSize: (n) =>
      `На основе ${n} ${ruPluralize(n, 'интервала', 'интервалов', 'интервалов')} между приёмами пищи.`,
    eatingPatternsCarbGap: (higher, lower) =>
      `В ваших недавних данных после более углеводных приёмов пищи следующий эпизод еды наступал в среднем через ${higher}, а после менее углеводных — через ${lower}.`,
    eatingPatternsCarbGapCraving: (k, n) =>
      `Следующий эпизод был отмечен как «захотелось конкретного» в ${k} из ${n} случаев после более углеводных приёмов.`,
    eatingPatternsEveningNight: (nightCount, eveningCount, average) =>
      `По вашим данным ночная еда часто следует за вечерним приёмом (${nightCount} из ${eveningCount}). Среднее время до этого эпизода: ${average}.`,
    eatingPatternsEveningNightReason: (reason, k) =>
      `Самая частая причина того следующего эпизода: ${reason} (${k}).`,
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
  }
