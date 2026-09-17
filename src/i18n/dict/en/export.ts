import { entryCount, goalCount } from './helpers'

import type { PdfSummaryDict, ExportDict, ZeppLifeImportDict, AppleHealthImportDict, MyFitnessPalImportDict, ExportXlsxDict } from '../types/export'

export const pdfSummary: PdfSummaryDict = {
    documentTitle: 'Turtle Steps — Summary',
    rangeLabel: (start, end) => `${start} – ${end}`,
    generatedOnLabel: (date) => `Generated on ${date}`,
    weightTrendSectionTitle: 'Weight trend',
    noWeightDataMessage: 'No weight logged in this period.',
    weeklyAveragesSectionTitle: 'Weekly averages',
    weekColumnHeader: 'Week',
    avgWeightColumnHeader: (unit) => `Avg weight (${unit})`,
    weightChangeColumnHeader: 'Change vs. prior week',
    avgCaloriesColumnHeader: 'Avg calories',
    noWeeklyDataMessage: 'No complete weeks logged in this period.',
    bodyMeasurementsSectionTitle: 'Body measurements (most recent)',
    waistLabel: (value, date) => `Waist: ${value} cm (${date})`,
    hipLabel: (value, date) => `Hip: ${value} cm (${date})`,
    bodyFatLabel: (value, date) => `Body fat: ${value}% (${date})`,
    bodyCompositionSectionTitle: 'Body composition (most recent)',
    muscleMassLabel: (value, date) => `Muscle mass: ${value} kg (${date})`,
    visceralFatLabel: (value, date) => `Visceral fat rating: ${value} (${date})`,
    bodyWaterLabel: (value, date) => `Body water: ${value}% (${date})`,
    boneMassLabel: (value, date) => `Bone mass: ${value} kg (${date})`,
    averageValueLabel: (name, value, days) =>
      `${name}: avg ${value} (${days} days logged)`,
    averageValueOnlyLabel: (value, days) =>
      `Average: ${value} (${days} days logged)`,
    daySignalsSectionTitle: 'Day signals',
    daySignalLabel: (name, trueDays, loggedDays) =>
      `${name}: ${trueDays} of ${loggedDays} logged days`,
    customMetricsSectionTitle: 'Custom metrics',
    disclaimer:
      'This document is a personal summary generated from self-reported data in Turtle Steps to the Goal. It is not medical advice — consult a healthcare professional for guidance about your health.',
    dailyLogPagesTitle: 'Daily log',
    dailyLogMetricsSectionTitle: 'Metrics',
    dailyLogFoodSectionTitle: 'Food',
    dailyLogNotesSectionTitle: 'Notes',
  }

export const exportCopy: ExportDict = {
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
    lastBackupNeverLabel: "You haven't exported a backup yet.",
    lastBackupAgoLabel: (days) =>
      days === 0
        ? 'Last backup: today.'
        : days === 1
          ? 'Last backup: yesterday.'
          : `Last backup: ${days} days ago.`,
    backupReminderGoToExportLabel: 'Go to Export',
    dismissBackupReminderLabel: 'Dismiss backup reminder',
    exportedCsvSummary: (entries) => `Exported ${entryCount(entries)}.`,
    importedSummary: (summary) => `Imported ${summary}.`,
    invalidBackup: "This file doesn't look like a valid Turtle Steps backup.",
    notValidJson: "That file isn't valid JSON.",
    exportFailed: 'Export failed.',
    importFailed: 'Import failed.',
    fileTooLarge: 'This file is too large to import (maximum 200 MB).',
    exportPeriodLabel: 'Export period',
    exportFileNameLabel: 'File name',
    exportRangeWeek: 'Week',
    exportRangeMonth: 'Month',
    exportRangeYear: 'Year',
    exportRangeAll: 'All',
    exportRangeCustom: 'Custom',
    exportPeriodDescription:
      'Optional — applies to Excel, CSV, and Markdown below, and the ranged backup below that, not the full JSON backup above. Leave blank to export everything.',
    exportRangedBackupBlurb:
      'Download a JSON backup scoped to the period above instead of your full history — useful for sharing or archiving a slice without the whole thing. Not a substitute for the full backup above, which stays the one guaranteed-complete restore source.',
    exportRangedBackupButton: 'Export ranged backup',
    exportingRangedBackupButton: 'Exporting…',
    encryptedBackupBlurb:
      'Password-protect the backup file itself, e.g. before it sits in a Downloads or cloud-synced folder. The plain backup above still works exactly the same either way.',
    exportEncryptedButton: 'Encrypted backup',
    exportedEncryptedSummary: 'Encrypted backup downloaded.',
    exportEncryptedFailed: 'Could not create the encrypted backup.',
    encryptedExportDialogTitle: 'Set a backup password',
    encryptedExportDialogDescription:
      'This password encrypts the downloaded file. Type it twice to catch typos.',
    encryptedBackupUnrecoverableWarning:
      "If you forget this password, the backup cannot be recovered — there's no reset or backdoor.",
    encryptedBackupPasswordLabel: 'Password',
    encryptedBackupConfirmPasswordLabel: 'Confirm password',
    encryptedBackupPasswordMismatch: "Passwords don't match.",
    encryptingBackupButton: 'Encrypting…',
    encryptedExportSubmitButton: 'Encrypt and download',
    closeEncryptedDialogLabel: 'Close',
    encryptedImportDialogTitle: 'Enter the backup password',
    encryptedImportDialogDescription:
      'This backup file is password-protected. Enter the password it was encrypted with.',
    decryptingBackupButton: 'Decrypting…',
    encryptedImportSubmitButton: 'Decrypt and import',
    wrongEncryptedBackupPassword:
      'Wrong password, or the file is corrupted.',
    exportPdfBlurb:
      'PDF is a one-page clinician summary (weight trend, weekly averages, optional measurements) — not a full Excel dump. Daily-log table pages are optional and off unless you turn them on in the next step.',
    exportPdfButton: 'Export PDF summary',
    exportingPdfButton: 'Generating…',
    exportedPdfSummary: 'PDF summary downloaded.',
    exportPdfFailed: 'Could not create the PDF summary.',
    exportPdfRangeLabel: 'Summary covers',
    exportPdfRange30Label: 'Last 30 days',
    exportPdfRange90Label: 'Last 90 days',
    pdfLayoutPreviewTitle: 'PDF layout',
    pdfLayoutPreviewBlurb:
      'These pages are painted the same way the PDF file is. Open this on the iPhone to see what iOS will put in the file.',
    pdfLayoutPreviewButton: 'Preview layout',
    pdfLayoutPreviewLoading: 'Painting pages the same way the PDF is built…',
    pdfLayoutPreviewFailed: 'Could not build the layout preview.',
    pdfLayoutPreviewPageLabel: (page) => `Page ${page}`,
    pdfSectionsDialogTitle: 'Choose what to include',
    pdfSectionsDialogDescription:
      'Pick which sections go into the PDF. The non-medical disclaimer is always included.',
    pdfSectionWeightTrendLabel: 'Weight trend',
    pdfSectionWeeklyAveragesLabel: 'Weekly averages',
    pdfSectionBodyMeasurementsLabel: 'Body measurements',
    pdfSectionsGenerateButton: 'Generate PDF',
    closePdfSectionsDialogLabel: 'Close',
    pdfSectionsCustomMetricsGroupLabel: 'Custom metrics',
    pdfSectionDisabledNotTrackedTooltip:
      'Not currently tracked — turn this on in Settings’ "What to track" to include it.',
    pdfSectionDisabledNoDataTooltip:
      'No data logged for this in the selected date range.',
    pdfSectionDisabledTooltipLabel: 'Why this is disabled',
    pdfSectionDailyLogPagesLabel: 'Daily log pages',
    pdfSectionDailyLogPagesHint:
      'Adds extra landscape pages with the same day-by-day columns as CSV. Off by default so the PDF stays a one-page summary.',
    exportExcelBlurb:
      'Download your data as an Excel file for viewing or analysis — this is not a backup and can’t be imported back in.',
    exportExcelButton: 'Export as Excel',
    exportingExcelButton: 'Exporting…',
    exportExcelFailed: 'Excel export failed.',
    exportCsvBlurb:
      'Download your daily log as a CSV file — a compact table format, good for viewing or for pasting into an AI assistant for analysis.',
    exportCsvButton: 'Export as CSV',
    exportingCsvButton: 'Exporting…',
    exportCsvFailed: 'CSV export failed.',
    exportCsvLlmTooltip:
      'CSV is the best format to paste into an LLM (like ChatGPT or Claude) if you want it to analyze your data — it’s compact and easy for AI tools to read accurately.',
    exportCsvLlmTooltipLabel: 'Why CSV for AI analysis',
    exportMarkdownBlurb:
      'Download your daily log as a Markdown file — a table format that reads well in text editors and note-taking apps.',
    exportMarkdownButton: 'Export as Markdown',
    exportingMarkdownButton: 'Exporting…',
    exportMarkdownFailed: 'Markdown export failed.',
    exportedMarkdownSummary: (entries) =>
      `Exported ${entries} ${entries === 1 ? 'entry' : 'entries'} as Markdown.`,
    storageUsedLabel: (size) => `~${size} used on this device`,
    storageUsedOfQuotaLabel: (used, quota) =>
      `~${used} used of ~${quota} available on this device`,
    storageBreakdownTitle: 'Storage breakdown',
    storageAppDataLabel: 'App records (IndexedDB)',
    storageCacheLabel: 'Offline app cache',
    storageOtherLabel: 'Other / browser overhead',
    storagePdfLabel: 'PDF exports stored by this app',
    storageBreakdownEstimateNote:
      'Approximate site storage. Other includes browser overhead and storage that cannot be classified.',
    storagePdfNote:
      'PDFs are generated temporarily. Files saved or shared outside the app are not included in this total.',
    dataToImportLabel: 'Data to import',
    importConflictModeLabel: 'If a day already has a value',
    importConflictModeDescription:
      'Fill gaps only keeps values you already logged or corrected. Overwrite replaces them with the import — useful when the wearable should win.',
    importConflictModeFillGaps: 'Fill gaps only',
    importConflictModeOverwrite: 'Overwrite with import',
  }

export const zeppLifeImport: ZeppLifeImportDict = {
    importBlurb:
      'Import weight, body composition, and step data from a Zepp Life export file.',
    howToExportLabel: 'How do I get this file?',
    howToExportSteps:
      'In the Zepp Life app: Profile → Settings → Personal information security and privacy → Exercising user rights → export data. It arrives by email as a password-protected zip.',
    importButton: 'Import from Zepp Life',
    importingButton: 'Importing…',
    importedSummary: (days, updated) =>
      `Imported data for ${days} ${days === 1 ? 'day' : 'days'} from Zepp Life (${updated} updated an existing entry).`,
    importedNothingSummary:
      "This export didn't have any weight or step data to import.",
    invalidFile: "This doesn't look like a Zepp Life export file.",
    importFailed: 'Import failed.',
    closeDialogLabel: 'Close',
    passwordDialogTitle: 'Enter the export password',
    passwordDialogDescription:
      'This is the password from the export email Zepp Life sent you — not your Zepp account login password.',
    passwordLabel: 'Password',
    passwordSubmitButton: 'Unlock and import',
    wrongPassword:
      "That password didn't work — check the export email and try again.",
    profileDialogTitle: 'Whose scale readings?',
    profileDialogDescription:
      'This export has body readings for more than one height — common when a shared scale syncs to one Zepp account. Pick which person to import.',
    profileOptionLabel: ({
      heightCm,
      minWeightKg,
      maxWeightKg,
      readingCount,
      nickName,
    }) => {
      const base = `${heightCm} cm · ${minWeightKg}–${maxWeightKg} kg · ${readingCount} ${readingCount === 1 ? 'reading' : 'readings'}`
      return nickName ? `${base} · ${nickName}` : base
    },
    profileSubmitButton: 'Import selected',
  }

export const appleHealthImport: AppleHealthImportDict = {
    importBlurb:
      'Import weight, body fat, waist, water, sleep, and step data from an Apple Health export file.',
    howToExportLabel: 'How do I get this file?',
    howToExportSteps:
      'In the Health app: tap your profile icon (top right) → Export All Health Data. This can take a while to process for a large export.',
    importButton: 'Import from Apple Health',
    importingButton: (percent) => `Importing… ${percent}%`,
    importedSummary: (days, updated) =>
      `Imported data for ${days} ${days === 1 ? 'day' : 'days'} from Apple Health (${updated} updated an existing entry).`,
    importedNothingSummary:
      "This export didn't have any data this app tracks to import.",
    invalidFile: "This doesn't look like an Apple Health export file.",
    importFailed: 'Import failed.',
  }

export const myFitnessPalImport: MyFitnessPalImportDict = {
    importBlurb:
      'Import meal and weight history from a MyFitnessPal data export.',
    howToExportLabel: 'How do I get this file?',
    howToExportSteps:
      'Request a Data Access Request export from MyFitnessPal (myfitnesspal.com → Settings → Privacy Center → Manage My Data — this option requires a Premium subscription). If it\'s not available on your account, you can instead email MyFitnessPal support directly and ask them for your data. It arrives by email as an .xlsx file, often password-protected — the password is in the same email. This can take a few days to be ready.',
    importButton: 'Import from MyFitnessPal',
    importingButton: 'Importing…',
    importedSummary: (days, updated) =>
      `Imported data for ${days} ${days === 1 ? 'day' : 'days'} from MyFitnessPal (${updated} updated an existing entry).`,
    importedNothingSummary:
      "This export didn't have any meal or weight data to import.",
    invalidFile: "This doesn't look like a MyFitnessPal export file.",
    importFailed: 'Import failed.',
    closeDialogLabel: 'Close',
    passwordDialogTitle: 'Enter the export password',
    passwordDialogDescription:
      'This is the password from the export email MyFitnessPal sent you — not your MyFitnessPal account login password.',
    passwordLabel: 'Password',
    passwordSubmitButton: 'Unlock and import',
    wrongPassword:
      "That password didn't work — check the export email and try again.",
    slotTimesDialogTitle: 'Default meal times',
    slotTimesDialogDescription:
      "MyFitnessPal exports don't include clock times. Set when Breakfast, Lunch, Snack, and Dinner should land for this import — saved for next time.",
    slotTimesImportButton: 'Import',
    slotTimesContinueButton: 'Continue',
  }

export const exportXlsx: ExportXlsxDict = {
    dailyLogSheetName: 'Daily Log',
    mealsSheetName: 'Meals',
    waterEntriesSheetName: 'Water',
    goalsSheetName: 'Goals',
    dateColumn: 'Date',
    weightColumn: 'Weight (kg)',
    nextMorningWeightColumn: (weighInDate) =>
      weighInDate ? `Weight ${weighInDate}` : 'Next morning weight',
    caloriesColumn: 'Calories (kcal)',
    calorieTargetColumn: 'Calorie target (kcal)',
    proteinColumn: 'Protein (g)',
    proteinTargetColumn: 'Protein target (g)',
    fatColumn: 'Fat (g)',
    fatTargetColumn: 'Fat target (g)',
    carbsColumn: 'Carbs (g)',
    carbTargetColumn: 'Carb target (g)',
    sleepHoursColumn: 'Sleep (h)',
    deepSleepHoursColumn: 'Deep sleep (h)',
    stepsColumn: 'Steps',
    waistColumn: 'Waist (cm)',
    hipColumn: 'Hip (cm)',
    bodyFatColumn: 'Body fat (%)',
    moodColumn: 'Mood',
    noteColumn: 'Note',
    eveningNoteColumn: (date) =>
      date ? `Evening note ${date}` : 'Evening note',
    morningNoteColumn: (date) =>
      date ? `Morning note ${date}` : 'Morning note',
    onPeriodColumn: 'On period',
    hadConstipationColumn: 'Constipation',
    hadAlcoholColumn: 'Alcohol',
    nightEatingColumn: (_sex, overnightFrom, overnightTo) =>
      overnightFrom && overnightTo
        ? `Night food ${overnightFrom} → ${overnightTo}`
        : 'Ate late tonight',
    nightEatingRememberColumn: () => 'I remember how I ate',
    nightEatingReasonColumn: 'Night food reason',
    nightEatingNoEasyColumn: 'Was it easy?',
    nightEatingNoWhatHelpedColumn: 'What helped?',
    waterColumn: 'Water (ml)',
    waterAmountColumn: 'Amount (ml)',
    muscleMassColumn: 'Muscle (kg)',
    visceralFatColumn: 'Visceral fat',
    bodyWaterColumn: 'Body water (%)',
    boneMassColumn: 'Bone (kg)',
    fiberColumn: 'Fiber (g)',
    sodiumColumn: 'Sodium (mg)',
    potassiumColumn: 'Potassium (mg)',
    magnesiumColumn: 'Magnesium (mg)',
    mealReactionColumn: 'Meal reaction',
    eatingReasonColumn: 'Why eating',
    itemNoteColumn: 'Item note',
    customMetricNoteColumn: (name) => `${name} note`,
    mealColumn: 'Meal',
    itemColumn: 'Item',
    brandColumn: 'Brand',
    gramsColumn: 'Grams',
    timeColumn: 'Time',
    reactionColumn: 'Reaction',
    createdColumn: 'Created',
    weeklyTargetColumn: 'Weekly target (kg)',
    weekStartColumn: 'Week start',
    weekEndColumn: 'Week end',
    baselineWeightColumn: 'Baseline (kg)',
  }
