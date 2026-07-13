export interface Dictionary {
  common: {
    loading: string
    kg: string
    lb: string
    weekLabel: (weekNumber: number, start: string, end: string) => string
  }
  nav: {
    appName: string
    today: string
    dashboard: string
    history: string
    goal: string
    settings: string
    about: string
  }
  today: {
    title: string
    description: string
    thisWeeksTarget: string
    toLose: (unit: string) => string
    emptyGoalTitle: string
    emptyGoalDescription: string
    setGoalButton: string
    dateLabel: string
  }
  dailyEntry: {
    weightLabel: string
    caloriesLabel: string
    caloriesTooltip: string
    caloriesTooltipLabel: string
    addCaloriesLabel: string
    addCaloriesPlaceholder: string
    addButton: string
    caloriesTodaySuffix: string
    kcalUnit: string
    noteLabel: string
    updateButton: string
    logButton: string
    weightOrCaloriesRequired: string
    editWeightLabel: string
    editNoteLabel: string
    mealLabel: (n: number) => string
    editMealLabel: (n: number) => string
    deleteMealLabel: (n: number) => string
    saveButton: string
    mealNoteLabel: string
    mealNotePlaceholder: string
    emotionLabel: (emotion: 'happy' | 'unhappy' | 'neutral') => string
  }
  goal: {
    title: string
    description: string
    thisWeeksTarget: string
    unitsLegend: string
    targetLabel: (unit: string) => string
    targetRequired: string
    deficitEstimate: (kcal: number, direction: 'deficit' | 'surplus') => string
    deficitCaveat: string
    updateButton: string
    setButton: string
  }
  export: {
    title: string
    description: string
    exportBlurb: string
    exportButton: string
    exportingButton: string
    importBlurb: string
    importButton: string
    importingButton: string
    summary: (goals: number, entries: number) => string
    exportedSummary: (summary: string) => string
    importedSummary: (summary: string) => string
    invalidBackup: string
    notValidJson: string
    exportFailed: string
    importFailed: string
  }
  dashboard: {
    title: string
    description: string
    weightLegend: string
    projectionLegend: string
    caloriesLegend: string
    rollingAverageLegend: string
    weeklySummaryTitle: string
    weekRange: (start: string, end: string) => string
    weightChangeLabel: string
    averageCaloriesLabel: string
    targetMetNote: string
    emptyTitle: string
    emptyDescription: string
    correlationTitle: string
    correlationEmptyDescription: string
    correlationSummary: (
      thresholdKcal: number,
      direction: 'lower' | 'higher',
    ) => string
    correlationWeekCount: (n: number) => string
    correlationLagCaveat: string
    weeklyChangeLegend: string
  }
  history: {
    title: string
    description: string
    emptyTitle: string
    emptyDescription: string
    dateColumn: string
    weightColumn: string
    caloriesColumn: string
    noteColumn: string
    actionsColumn: string
    sortToggleLabel: string
    editLabel: string
    deleteLabel: string
    cancelButton: string
    confirmDeleteLabel: string
    confirmDeleteYes: string
    confirmDeleteNo: string
    metTargetTitle: string
  }
  settings: {
    title: string
    description: string
    languageLabel: string
    english: string
    russian: string
    appearanceLabel: string
    moodLabel: string
    moodPond: string
    moodDusk: string
    moodSage: string
    moodTortoise: string
    moodLagoon: string
    colorSchemeLabel: string
    light: string
    dark: string
  }
  about: {
    title: string
    description: string
    intro: string
    philosophy: string
    privacy: string
    madeBy: (author: string) => string
  }
}
