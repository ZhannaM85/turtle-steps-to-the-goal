export interface HistoryDict {
    title: string
    description: string
    emptyTitle: string
    emptyDescription: string
    dateColumn: string
    /** Takes the current unit label ('kg'/'lb') — the unit lives in the
     * header instead of every row's cell so the Actions column's icons
     * don't get pushed off screen on narrow phones (#246). */
    weightColumn: (unit: string) => string
    caloriesColumn: string
    noteColumn: string
    actionsColumn: string
    sortToggleLabel: string
    editLabel: string
    deleteLabel: string
    doneEditingButton: string
    confirmDeleteLabel: string
    confirmDeleteYes: string
    confirmDeleteNo: string
    metTargetTitle: string
    expandLabel: string
    collapseLabel: string
    noDetailsLabel: string
    dateFromLabel: string
    dateToLabel: string
    /** Filters by day-note text content (#172) — case-insensitive substring
     * match, alongside the existing date-range filter. */
    searchLabel: string
    searchPlaceholder: string
    /** Filters by the day's overall mood (#172) — reuses EmotionPicker's
     * existing click-again-to-clear toggle semantics. */
    moodFilterLabel: string
    clearFilterButton: string
    noFilterResultsTitle: string
    noFilterResultsDescription: string
    viewModeLabel: string
    listViewLabel: string
    calendarViewLabel: string
    previousMonthLabel: string
    nextMonthLabel: string
    todayButton: string
    emptyDayLabel: string
    editThisDayLink: string
    /** List-view pagination (#162) — 20 rows/page, so a growing history
     * never renders every entry into the DOM at once. */
    previousPageButton: string
    nextPageButton: string
    pageIndicator: (current: number, total: number) => string
    /** #155 / #479: sr-only + legend label for a pre-met day whose weight
     * dropped day-over-day on the way to a reached target (light tint). */
    reachedGoalWindowDayLabel: string
    /** #155: sr-only text for the exact day a goal's target was first
     * met — distinct from reachedGoalWindowDayLabel above. Also used as
     * the strong-swatch label in #479's visible legend. */
    reachedGoalDayLabel: string
    /** #479: accessible name for the shared List/Calendar tint legend. */
    reachedGoalLegendLabel: string
    /** #482: calendar marker-dot legend + visibility control. */
    calendarMarkersButton: string
    calendarMarkersDialogLabel: string
    calendarMarkerLegendLabel: string
    calendarMarkerEntryLabel: string
    calendarMarkerNightEatingLabel: string
  }
