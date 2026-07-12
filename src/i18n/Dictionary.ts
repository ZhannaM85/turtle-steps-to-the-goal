export interface Dictionary {
  common: {
    loading: string
    kg: string
    lb: string
  }
  nav: {
    appName: string
    today: string
    dashboard: string
    history: string
    goal: string
    export: string
    settings: string
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
    noteLabel: string
    updateButton: string
    logButton: string
    weightOrCaloriesRequired: string
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
  }
  history: {
    title: string
    description: string
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
}
