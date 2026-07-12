import type { Dictionary } from './Dictionary'

function goalCount(n: number): string {
  return `${n} goal${n === 1 ? '' : 's'}`
}

function entryCount(n: number): string {
  return `${n} daily ${n === 1 ? 'entry' : 'entries'}`
}

export const en: Dictionary = {
  common: {
    loading: 'Loading…',
    kg: 'kg',
    lb: 'lb',
  },
  nav: {
    appName: 'Turtle Steps to the Goal',
    today: 'Today',
    dashboard: 'Dashboard',
    history: 'History',
    goal: 'Goal',
    export: 'Export',
    settings: 'Settings',
  },
  today: {
    title: 'Today',
    description:
      "Quick entry for today's weight/calories, this week's target reminder",
    thisWeeksTarget: "This week's target",
    toLose: (unit) => `${unit} to lose`,
    emptyGoalTitle: 'No goal set yet',
    emptyGoalDescription: 'Set a weekly target to see it here.',
    setGoalButton: 'Set a goal',
    dateLabel: 'Date',
  },
  dailyEntry: {
    weightLabel: 'Weight (kg)',
    caloriesLabel: 'Calories',
    caloriesTooltip:
      "Today's weight reflects what you ate yesterday — digestion takes time, so don't expect these two numbers to match up same-day.",
    caloriesTooltipLabel: 'About the calories field',
    noteLabel: 'Note (optional)',
    updateButton: 'Update entry',
    logButton: 'Log entry',
    weightOrCaloriesRequired: 'Enter a weight or a calorie total',
  },
  goal: {
    title: 'Goal',
    description: "This week's target — small steps, renewed week to week",
    thisWeeksTarget: "This week's target",
    unitsLegend: 'Units',
    targetLabel: (unit) => `This week's target (${unit} to lose)`,
    targetRequired: "Enter this week's target, greater than 0",
    deficitEstimate: (kcal, direction) =>
      `Rough estimate: about ${kcal} kcal/day ${direction}.`,
    deficitCaveat:
      'This is a simple arithmetic estimate (~7700 kcal ≈ 1kg of fat), not medical or nutritional advice.',
    updateButton: 'Update this week’s target',
    setButton: 'Set this week’s target',
  },
  export: {
    title: 'Export',
    description: 'Export/import a JSON backup',
    exportBlurb:
      'Download every goal and daily entry as a single JSON file. This is the only backup for your data, since everything is stored locally on this device.',
    exportButton: 'Export backup',
    exportingButton: 'Exporting…',
    importBlurb:
      'Restore from a previously exported file. This merges into your existing data (matching entries are updated by date; nothing is deleted).',
    importButton: 'Import backup',
    importingButton: 'Importing…',
    summary: (goals, entries) =>
      `${goalCount(goals)} and ${entryCount(entries)}`,
    exportedSummary: (summary) => `Exported ${summary}.`,
    importedSummary: (summary) => `Imported ${summary}.`,
    invalidBackup: "This file doesn't look like a valid Turtle Steps backup.",
    notValidJson: "That file isn't valid JSON.",
    exportFailed: 'Export failed.',
    importFailed: 'Import failed.',
  },
  dashboard: {
    title: 'Dashboard',
    description:
      'Weight trend, calorie trend, weekly summary cards, correlation view',
  },
  history: {
    title: 'History',
    description: 'Table of all past entries — edit/delete',
  },
  settings: {
    title: 'Settings',
    description: 'Units (kg/lb), language, and other preferences',
    languageLabel: 'Language',
    english: 'English',
    russian: 'Russian',
    appearanceLabel: 'Appearance',
    moodLabel: 'Mood',
    moodPond: 'Pond',
    moodDusk: 'Dusk',
    moodSage: 'Sage',
    moodTortoise: 'Tortoise',
    moodLagoon: 'Lagoon',
    colorSchemeLabel: 'Light / dark',
    light: 'Light',
    dark: 'Dark',
  },
}
