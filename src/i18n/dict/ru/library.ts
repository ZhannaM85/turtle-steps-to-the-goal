import { ruPluralize } from '../../ruPluralize'

import type { NutritionFactsDict, RecipesDict, CustomMetricsDict, PlannedMealsDict } from '../types/library'

export const nutritionFacts: NutritionFactsDict = {
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
  }

export const recipes: RecipesDict = {
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
  }

export const customMetrics: CustomMetricsDict = {
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
    deleteNoteLabel: 'Удалить заметку',
    deleteValueLabel: 'Удалить значение',
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
  }

export const plannedMeals: PlannedMealsDict = {
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
  }
