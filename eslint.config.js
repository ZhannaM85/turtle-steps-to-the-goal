import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

/**
 * #864 — hard ceiling. New / already-clean files must stay ≤500 physical
 * lines. Known offenders are allowlisted below (temporary; chip away, do
 * not grow). Dictionaries and the release-note dump stay on the list until
 * the next time those files are touched — split then, do not ignore forever.
 * Generated trees (`dist` / native projects) are ignored in the first
 * config block, not here.
 */
const maxLinesAllowlist = [
  'src/data/releaseNotes.ts',
  'src/features/daily-log/AddMealDialog.test.tsx',
  'src/features/daily-log/AddMealDialog.tsx',
  'src/features/daily-log/DailyEntryFormMorning.tsx',
  'src/features/daily-log/FoodPickerDialog.test.tsx',
  'src/features/daily-log/FoodPickerDialog.tsx',
  'src/features/daily-log/MealItemEditorSheet.tsx',
  'src/features/daily-log/MealList.test.tsx',
  'src/features/daily-log/MealList.tsx',
  'src/features/daily-log/TodayScreen.test.tsx',
  'src/features/daily-log/TodayScreen.tsx',
  'src/features/daily-log/useDailyEntryFormState.ts',
  'src/features/dashboard/BodyCompositionTrendChart.tsx',
  'src/features/dashboard/CustomChartView.test.tsx',
  'src/features/dashboard/CustomChartView.tsx',
  'src/features/dashboard/WeightTrendChart.tsx',
  'src/features/export/ExportSection.test.tsx',
  'src/features/export/ExportSection.tsx',
  'src/features/export/appleHealth/appleHealthParser.test.ts',
  'src/features/export/appleHealth/appleHealthParser.ts',
  'src/features/export/dailyLogExport.ts',
  'src/features/export/exportActions.test.ts',
  'src/features/export/exportBundleSchema.ts',
  'src/features/export/exportCsv.test.ts',
  'src/features/export/exportPdf.test.ts',
  'src/features/export/exportPdf.ts',
  'src/features/goal-setup/GoalForm.test.tsx',
  'src/features/goal-setup/GoalForm.tsx',
  'src/features/goal-setup/GoalScreen.test.tsx',
  'src/features/settings/MealItemsSection.test.tsx',
  'src/features/settings/MealItemsSection.tsx',
  'src/features/settings/SettingsScreen.test.tsx',
  'src/features/settings/SettingsScreen.tsx',
  'src/i18n/Dictionary.ts',
  'src/i18n/en.ts',
  'src/i18n/ru.ts',
]

export default tseslint.config(
  { ignores: ['dist', 'android', 'ios'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      'max-lines': [
        'error',
        { max: 500, skipBlankLines: false, skipComments: false },
      ],
    },
  },
  {
    files: maxLinesAllowlist,
    rules: {
      'max-lines': 'off',
    },
  },
  {
    // shadcn/ui primitives intentionally co-export cva() variant helpers
    // alongside the component; that's not a react-refresh violation here.
    files: ['src/shared/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  eslintConfigPrettier,
)
