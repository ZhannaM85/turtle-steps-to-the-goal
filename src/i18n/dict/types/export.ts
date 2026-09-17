import type { Sex } from '@/domain/stats/bodyComposition'

export interface PdfSummaryDict {
    documentTitle: string
    /** Takes the already-formatted start/end display dates. */
    rangeLabel: (start: string, end: string) => string
    generatedOnLabel: (date: string) => string
    weightTrendSectionTitle: string
    noWeightDataMessage: string
    weeklyAveragesSectionTitle: string
    weekColumnHeader: string
    avgWeightColumnHeader: (unit: string) => string
    weightChangeColumnHeader: string
    avgCaloriesColumnHeader: string
    noWeeklyDataMessage: string
    bodyMeasurementsSectionTitle: string
    waistLabel: (value: string, date: string) => string
    hipLabel: (value: string, date: string) => string
    bodyFatLabel: (value: string, date: string) => string
    /** #630 — smart-scale fields, same "most recent value" shape as the
     * bodyMeasurements group above, just a distinct section since they
     * come from a different source (bioimpedance scale vs. tape/caliper). */
    bodyCompositionSectionTitle: string
    muscleMassLabel: (value: string, date: string) => string
    visceralFatLabel: (value: string, date: string) => string
    bodyWaterLabel: (value: string, date: string) => string
    boneMassLabel: (value: string, date: string) => string
    /** #630 — generic templates reused across sleep/steps/water/custom
     * metrics instead of one dedicated string per field, since they're all
     * "name: avg value (N days logged)" underneath. `averageValueLabel`
     * names the field (used when a section groups more than one line, e.g.
     * Sleep's hours + deep sleep); `averageValueOnlyLabel` omits the name
     * when the section title already names the one line below it. */
    averageValueLabel: (name: string, value: string, days: number) => string
    averageValueOnlyLabel: (value: string, days: number) => string
    /** #630 — cycle/digestion/alcohol/night eating share one section and
     * one generic "name: N of M logged days" template, since a day's value
     * for each is the same true/false-over-a-range shape. */
    daySignalsSectionTitle: string
    daySignalLabel: (
      name: string,
      trueDays: number,
      loggedDays: number,
    ) => string
    customMetricsSectionTitle: string
    /** #609 acceptance criterion — must render visibly on the document. */
    disclaimer: string
    /** #865 — title on optional extra pages after the one-page summary. */
    dailyLogPagesTitle: string
    /** #891 — section headings inside a day’s readable PDF block. */
    dailyLogMetricsSectionTitle: string
    dailyLogFoodSectionTitle: string
    dailyLogNotesSectionTitle: string
  }

export interface ExportDict {
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
    /** #599 — factual "when did I last back up" status, shown next to the
     * Export button and reused by the dismissible reminder banner on
     * `SettingsScreen.tsx`. Only the complete JSON backup (this section's
     * `handleExport`, not the ranged/Excel/CSV/Markdown exports below it)
     * ever updates this. */
    lastBackupNeverLabel: string
    lastBackupAgoLabel: (days: number) => string
    backupReminderGoToExportLabel: string
    dismissBackupReminderLabel: string
    /** CSV export (#125) has no goals data, so it gets its own entries-only
     * summary rather than reusing `summary`/`exportedSummary` above. */
    exportedCsvSummary: (entries: number) => string
    importedSummary: (summary: string) => string
    invalidBackup: string
    notValidJson: string
    exportFailed: string
    importFailed: string
    /** #703 — shown when a JSON/zip/xlsx import is larger than
     * `MAX_IMPORT_FILE_BYTES` (200 MB). Same copy for every import picker. */
    fileTooLarge: string
    /** Excel export (#123) — a separate, human-readable view of the same
     * data, distinct from the JSON backup above: not re-importable, so its
     * own blurb/button/error copy rather than reusing the JSON ones. */
    exportPeriodLabel: string
    exportPeriodDescription: string
    exportFileNameLabel: string
    exportRangeWeek: string
    exportRangeMonth: string
    exportRangeYear: string
    exportRangeAll: string
    exportRangeCustom: string
    /** #370 — reverses #240's original "JSON backup always stays complete"
     * decision: a second, clearly separate button below the period picker,
     * not the same button becoming range-aware. */
    exportRangedBackupBlurb: string
    exportRangedBackupButton: string
    exportingRangedBackupButton: string
    /** #608 — optional password-encrypted JSON backup via the browser's
     * own Web Crypto (AES-GCM + PBKDF2), no third-party crypto library.
     * A third, separate button below the ranged backup — the plain
     * "Export backup" button above stays completely unchanged. Password
     * only ever lives in `EncryptedBackupExportDialog`'s own local
     * state; this app cannot recover a forgotten one (no backdoor, by
     * design). */
    encryptedBackupBlurb: string
    exportEncryptedButton: string
    exportedEncryptedSummary: string
    exportEncryptedFailed: string
    encryptedExportDialogTitle: string
    encryptedExportDialogDescription: string
    encryptedBackupUnrecoverableWarning: string
    encryptedBackupPasswordLabel: string
    encryptedBackupConfirmPasswordLabel: string
    encryptedBackupPasswordMismatch: string
    encryptingBackupButton: string
    encryptedExportSubmitButton: string
    closeEncryptedDialogLabel: string
    /** Import side — `handleImportFile` detects an `EncryptedBackupEnvelope`
     * (via `isEncryptedBackupEnvelope`) before ever trying to parse the
     * file as a plain export bundle, and opens this dialog instead of
     * immediately failing with `invalidBackup`. */
    encryptedImportDialogTitle: string
    encryptedImportDialogDescription: string
    decryptingBackupButton: string
    encryptedImportSubmitButton: string
    /** Shown inline in the still-open dialog on a wrong password —
     * `crypto.subtle.decrypt` itself throws before anything reaches
     * `importAllData`, so a wrong attempt never touches IndexedDB. */
    wrongEncryptedBackupPassword: string
    /** #609 / #865 — Settings copy for the PDF export. Still a one-page
     * clinician summary by default; optional daily-log pages are gated. */
    exportPdfBlurb: string
    exportPdfButton: string
    exportingPdfButton: string
    exportedPdfSummary: string
    exportPdfFailed: string
    exportPdfRangeLabel: string
    exportPdfRange30Label: string
    exportPdfRange90Label: string
    /** #952 — Settings toggle for the temporary #939 PDF capture overlay. */
    pdfDebugToggleLabel: string
    pdfDebugToggleHelp: string
    pdfDebugToggleOn: string
    pdfDebugToggleOff: string
    /** #933 / #935 — html2canvas layout preview of the PDF document. */
    pdfLayoutPreviewTitle: string
    pdfLayoutPreviewBlurb: string
    pdfLayoutPreviewButton: string
    pdfLayoutPreviewLoading: string
    pdfLayoutPreviewFailed: string
    pdfLayoutPreviewPageLabel: (page: number) => string
    /** #629 — lets the user pick which optional sections (below) go into
     * the PDF before it's generated. The disclaimer stays unconditional,
     * so it has no corresponding toggle here. */
    pdfSectionsDialogTitle: string
    pdfSectionsDialogDescription: string
    pdfSectionWeightTrendLabel: string
    pdfSectionWeeklyAveragesLabel: string
    pdfSectionBodyMeasurementsLabel: string
    pdfSectionsGenerateButton: string
    closePdfSectionsDialogLabel: string
    /** #630 — every other tracked metric reuses its own existing label
     * (`dailyEntry.sleepLabel`, `settings.cycleTrackingLabel`, etc.) as its
     * toggle text rather than duplicating a near-identical string here;
     * this is the one genuinely new label, heading the dynamic list of the
     * user's own custom metrics (name varies per metric, no fixed string). */
    pdfSectionsCustomMetricsGroupLabel: string
    /** #634 — tooltip on a disabled section toggle naming which of the two
     * reasons applies: off in Settings' "What to track", or on but no data
     * logged for it in the picked range. */
    pdfSectionDisabledNotTrackedTooltip: string
    pdfSectionDisabledNoDataTooltip: string
    pdfSectionDisabledTooltipLabel: string
    /** #865 — off-by-default extra pages; not part of the summary toggles. */
    pdfSectionDailyLogPagesLabel: string
    pdfSectionDailyLogPagesHint: string
    exportExcelBlurb: string
    exportExcelButton: string
    exportingExcelButton: string
    exportExcelFailed: string
    /** CSV export (#125) — a single flat Daily Log table, same shape as the
     * Excel export's first sheet. Distinct copy from both the JSON and
     * Excel export sections, same reasoning as exportExcelBlurb above. */
    exportCsvBlurb: string
    exportCsvButton: string
    exportingCsvButton: string
    exportCsvFailed: string
    /** Popover remark next to the CSV button noting it's the best format
     * for pasting into an LLM conversation — text + trigger aria-label,
     * same InfoTooltip shape as dailyEntry.caloriesTooltip. */
    exportCsvLlmTooltip: string
    exportCsvLlmTooltipLabel: string
    /** Markdown export (#219) — same flat Daily Log table as the CSV export,
     * rendered as a Markdown table instead. Distinct copy, same reasoning as
     * exportCsvBlurb above. */
    exportMarkdownBlurb: string
    exportMarkdownButton: string
    exportingMarkdownButton: string
    exportMarkdownFailed: string
    exportedMarkdownSummary: (entries: number) => string
    /** Local storage usage (#176) — fallback copy for when
     * `navigator.storage.estimate()`'s `quota` isn't available (some
     * browsers only return `usage`); `storageUsedOfQuotaLabel` below is
     * used whenever both numbers are known. */
    storageUsedLabel: (size: string) => string
    /** #191: usage + quota together — originally quota was left out
     * (reasoning: it's usually a large browser-computed ceiling, not a
     * small meaningful number, so "X of Y" would read as noise), but users
     * asked directly how much space is left and whether there's even a
     * limit, so the real number is shown and left for them to judge. */
    storageUsedOfQuotaLabel: (used: string, quota: string) => string
    /** #369 — shared field picker above the Zepp Life/Apple Health import
     * buttons, letting a user opt out of specific data types (e.g. only
     * import steps) instead of each import always being all-or-nothing. */
    dataToImportLabel: string
    /** #496 — conflict mode for wearable/MFP re-imports (not JSON backup). */
    importConflictModeLabel: string
    importConflictModeDescription: string
    importConflictModeFillGaps: string
    importConflictModeOverwrite: string
  }

export interface ZeppLifeImportDict {
    importBlurb: string
    /** #381 — collapsible "How do I get this file?" disclosure above the
     * import button, since #365/#366 never explained how to actually
     * obtain the source file from the third-party app in the first place. */
    howToExportLabel: string
    howToExportSteps: string
    importButton: string
    importingButton: string
    /** `days`/`updated` are already-formatted numbers, matching how
     * `export.summary` passes pre-formatted pieces rather than raw counts. */
    importedSummary: (days: number, updated: number) => string
    /** Shown instead of `importedSummary` when the export had no BODY or
     * ACTIVITY rows for this app to import (e.g. a scale/band was never
     * synced) — distinct from an error, since the file itself was valid. */
    importedNothingSummary: string
    invalidFile: string
    importFailed: string
    closeDialogLabel: string
    passwordDialogTitle: string
    passwordDialogDescription: string
    passwordLabel: string
    passwordSubmitButton: string
    wrongPassword: string
    /** #616 — shared-scale exports with more than one BODY height. */
    profileDialogTitle: string
    profileDialogDescription: string
    profileOptionLabel: (info: {
      heightCm: number
      minWeightKg: number
      maxWeightKg: number
      readingCount: number
      nickName?: string
    }) => string
    profileSubmitButton: string
  }

export interface AppleHealthImportDict {
    importBlurb: string
    /** #381 — same disclosure as `zeppLifeImport.howToExportLabel` above. */
    howToExportLabel: string
    howToExportSteps: string
    importButton: string
    /** `percent` is an already-rounded 0-100 integer. */
    importingButton: (percent: number) => string
    importedSummary: (days: number, updated: number) => string
    /** Shown instead of `importedSummary` when the export had none of the
     * record types this app tracks — distinct from an error, since the
     * file itself was valid. */
    importedNothingSummary: string
    invalidFile: string
    importFailed: string
  }

export interface MyFitnessPalImportDict {
    importBlurb: string
    howToExportLabel: string
    howToExportSteps: string
    importButton: string
    importingButton: string
    importedSummary: (days: number, updated: number) => string
    importedNothingSummary: string
    invalidFile: string
    importFailed: string
    closeDialogLabel: string
    passwordDialogTitle: string
    passwordDialogDescription: string
    passwordLabel: string
    passwordSubmitButton: string
    wrongPassword: string
    /** #588 — slot default times before stamping imported meals. */
    slotTimesDialogTitle: string
    slotTimesDialogDescription: string
    slotTimesImportButton: string
    slotTimesContinueButton: string
  }

export interface ExportXlsxDict {
    dailyLogSheetName: string
    mealsSheetName: string
    /** #849 — per-entry water table (date, amount, time). */
    waterEntriesSheetName: string
    goalsSheetName: string
    dateColumn: string
    weightColumn: string
    /** #829 / #832 / #899 — one-day CSV only; optional next-morning ISO date. */
    nextMorningWeightColumn: (weighInDate?: string) => string
    caloriesColumn: string
    /** #895 / #896 — daily target beside the matching actual intake column. */
    calorieTargetColumn: string
    proteinColumn: string
    proteinTargetColumn: string
    fatColumn: string
    fatTargetColumn: string
    carbsColumn: string
    carbTargetColumn: string
    sleepHoursColumn: string
    deepSleepHoursColumn: string
    stepsColumn: string
    /** Body measurements (#225) — same fields as DailyEntryForm's bundled
     * "Body measurements" section. */
    waistColumn: string
    hipColumn: string
    bodyFatColumn: string
    moodColumn: string
    noteColumn: string
    /**
     * #901 — day-level evening note on Daily Log (meal-group notes still use
     * noteColumn). Optional ISO date for one-day exports.
     */
    eveningNoteColumn: (date?: string) => string
    /** #763 / #900 — morning free-text; optional ISO date on one-day exports. */
    morningNoteColumn: (date?: string) => string
    onPeriodColumn: string
    hadConstipationColumn: string
    /** #607 — same purely-additive column as hadConstipationColumn above. */
    hadAlcoholColumn: string
    /** #383 — the *effective* value (`hadNightEating()`, override or else
     * derived from that day's own logged meal times), not the raw
     * `nightEatingOverride` field — unlike onPeriod/hadConstipation above,
     * night eating has no untracked/opt-in state to leave blank. #414 —
     * widened to a function like `dailyEntry.nightEatingLabel` (#398/#407),
     * so this column header is gender-correct too. */
    nightEatingColumn: (
      sex?: Sex,
      overnightFrom?: string,
      overnightTo?: string,
    ) => string
    nightEatingRememberColumn: (sex?: Sex) => string
    nightEatingReasonColumn: string
    /** #835 / #842 — Night food No-path columns, same nightEating gate as remember/reason. */
    nightEatingNoEasyColumn: string
    nightEatingNoWhatHelpedColumn: string
    waterColumn: string
    /** #849 — amount column on the per-entry Water table, distinct from
     * the Daily Log day's total waterColumn. */
    waterAmountColumn: string
    /** #743 — body composition + day fiber/electrolytes on the Daily Log table. */
    muscleMassColumn: string
    visceralFatColumn: string
    bodyWaterColumn: string
    boneMassColumn: string
    fiberColumn: string
    sodiumColumn: string
    potassiumColumn: string
    magnesiumColumn: string
    /** #743 — whole-meal `CalorieEntry.reaction` (#454), distinct from per-item Reaction. */
    mealReactionColumn: string
    /** #764 — why this meal happened. */
    eatingReasonColumn: string
    /** #743 — per-item `CalorieItem.noteText`, distinct from the meal note. */
    itemNoteColumn: string
    /** #853 — per-day `CustomMetricEntry.note`, one column after each custom metric value. */
    customMetricNoteColumn: (name: string) => string
    mealColumn: string
    itemColumn: string
    brandColumn: string
    gramsColumn: string
    timeColumn: string
    reactionColumn: string
    createdColumn: string
    weeklyTargetColumn: string
    /** #866 — Excel Goals sheet window + baseline (beyond created + weekly target). */
    weekStartColumn: string
    weekEndColumn: string
    baselineWeightColumn: string
  }
