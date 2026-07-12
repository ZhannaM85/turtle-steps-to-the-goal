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
    kg: 'кг',
    lb: 'фунт',
  },
  nav: {
    appName: 'Черепашьи шаги к цели',
    today: 'Сегодня',
    dashboard: 'Обзор',
    history: 'История',
    goal: 'Цель',
    export: 'Экспорт',
    settings: 'Настройки',
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
  },
  dailyEntry: {
    weightLabel: 'Вес (кг)',
    caloriesLabel: 'Калории',
    caloriesTooltip:
      'Сегодняшний вес отражает то, что вы съели вчера — на переваривание нужно время, поэтому не ждите, что эти два числа совпадут в один день.',
    caloriesTooltipLabel: 'О поле «Калории»',
    noteLabel: 'Заметка (необязательно)',
    updateButton: 'Обновить запись',
    logButton: 'Сохранить запись',
    weightOrCaloriesRequired: 'Введите вес или количество калорий',
  },
  goal: {
    title: 'Цель',
    description:
      'Цель на эту неделю — маленькие шаги, обновляется каждую неделю',
    thisWeeksTarget: 'Цель на эту неделю',
    unitsLegend: 'Единицы измерения',
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
  },
  history: {
    title: 'История',
    description: 'Таблица всех прошлых записей — редактирование и удаление',
  },
  settings: {
    title: 'Настройки',
    description: 'Единицы измерения (кг/фунты), язык и другие настройки',
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
  },
}
