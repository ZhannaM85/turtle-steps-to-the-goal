export interface TodayDict {
    title: string
    description: string
    thisWeeksTarget: string
    toLose: (unit: string) => string
    /** #469 — appended to the weekly-target card's description (alongside
     * the week's date range) so the loss/gain figure isn't shown with no
     * stated reference point — it's a flat weekly-pace target, not derived
     * from any specific weight, so this surfaces the goal window's own
     * baseline (the weight logged on `weekStart` itself, not just the
     * most recently logged one — those can be different days) as context
     * for what it'd apply against. */
    weeklyTargetFromWeight: (weight: string) => string
    emptyGoalTitle: string
    emptyGoalDescription: string
    setGoalButton: string
    dateLabel: string
    /** Prev/next-day arrows flanking the Date field (#138) — quicker than
     * opening the date picker to check yesterday/tomorrow. */
    previousDayLabel: string
    nextDayLabel: string
    /** #403 — shown next to the date navigator only while viewing a
     * non-today date, a quick way back after paging/picking far away
     * instead of stepping/picking your way back manually. */
    jumpToTodayButton: string
    /** #405 — accessible name for the checkmark badge shown next to the
     * date navigator when the viewed date already has a logged entry,
     * visible before scrolling down into the form itself. */
    dayHasEntriesLabel: string
    /** #345 — shown only when the real calendar date has already turned
     * over but the configured day-start time (#298) hasn't been reached
     * yet, so `todayIso()` still resolves to the previous day. Lets that
     * one occasion cross the boundary early without touching the
     * Settings-level `dayStartTime` itself, which would apply to every
     * future day too. */
    startTodayEarlyBanner: string
    startTodayEarlyButton: string
    goalRenewalReminder: string
    reviewGoalLink: string
    /** #639: reframed from a flat claim to a mid-week-only "keep going"
     * nudge — this banner is now gated to hide once the window has
     * actually ended (the goal's own weekEnd date, passed in), when the
     * GoalScreen's own completed/missed messaging takes over instead.
     * #665: RU uses "до конца {weekEnd}" (and EN "through") so the last
     * day reads as still included — bare "до {date}" is exclusive in RU. */
    targetMetBanner: (weekEndDate: string) => string
    /** Quiet, opt-in nudge (#171) — only shown when the Settings toggle is
     * on and today has no entry yet. Same no-badges/no-streaks tone as
     * goalRenewalReminder above, no dismiss state to persist. */
    dailyReminderText: string
    /** #605 — the native OS notification's own title/body, distinct from
     * `dailyReminderText` above: that one only ever shows in-app when
     * today genuinely has no entry, but a scheduled OS notification has
     * no way to check that at delivery time, so this copy stays neutral
     * rather than presupposing "no entry yet." */
    dailyReminderNotificationTitle: string
    dailyReminderNotificationBody: string
    /** #232 — short titles for the show/hide toggle row above each of the
     * three banners, distinct from their own full-sentence body text
     * above (`goalRenewalReminder`/`targetMetBanner`/`dailyReminderText`)
     * — showing the whole sentence twice as both a title and the banner
     * itself would read as an obvious duplicate. */
    targetMetSectionTitle: string
    goalRenewalReminderSectionTitle: string
    dailyReminderSectionTitle: string
    /** #719 — confirm before applying a day snippet from another copy. */
    importDayTitle: string
    importDayDescription: (date: string) => string
    importDayDisabled: string
    importDayFillCount: (n: number) => string
    importDayConflictCount: (n: number) => string
    importDayMealCount: (add: number, skip: number) => string
    importDayWaterCount: (add: number, skip: number) => string
    importDayNothingToApply: string
    importDayAddMissing: string
    importDayAddAndReplace: string
    importDayCancel: string
    /** #720 — Day-screen send control (gated by #738). */
    sendDayLogLabel: string
    sendDayDialogTitle: string
    sendDayDialogDescription: string
    sendDayWholeDayLabel: string
    sendDayCopyButton: string
    sendDayShareButton: string
    sendDayCopied: string
    sendDayShareFailed: string
    sendDayNothingLogged: string
    sendDayShareTitle: (date: string) => string
    sendDayShareText: (date: string) => string
    /** #795 — one-day CSV from this sheet for pasting into an LLM. */
    sendDaySaveCsvButton: string
    sendDaySaveCsvFailed: string
    /** #722 — QR of the same day-log URL, or a fallback if too large. */
    sendDayQrAlt: string
    sendDayQrHint: string
    sendDayQrTooLarge: string
    /** #721 — paste a day snippet on the send sheet / deep link. */
    receiveDayPasteLabel: string
    receiveDayPastePlaceholder: string
    receiveDayPasteSubmit: string
    receiveDayPasteInvalid: string
    receiveDayScanQrButton: string
    receiveDayScanQrTitle: string
    receiveDayScanQrInstructions: string
    receiveDayScanIsFood: string
    receiveDayScanUnreadable: string
    /** #663 — section title for the nutrition-facts encouragement card,
     * same show/hide-toggle-row pattern as the three section titles
     * above. */
    nutritionFactsSectionTitle: string
    vsYesterdayLabel: string
    vsMaxWeightLabel: string
    /** #208 — only shown once the active goal has a dailyCalorieTargetKcal
     * set; the card's own value is always the absolute difference,
     * these two supply the unit text so "under budget" and "over" read as
     * different states rather than a plain (and possibly confusing
     * negative) signed number. */
    remainingCaloriesLabel: string
    kcalRemainingUnit: string
    kcalOverUnit: string
    /** #220 — same shape as the calories pair above, shown once the
     * active goal has a dailyProteinTargetG set. */
    remainingProteinLabel: string
    gRemainingUnit: string
    /** #252 — same shape as remainingProteinLabel above, reusing
     * gRemainingUnit for the unit text. #321 gave these over-target
     * framing too (see gOverUnit below) — no longer clamped at 0. */
    remainingFatLabel: string
    remainingCarbLabel: string
    /** #341 — same shape as the other remaining-nutrient cards above. */
    remainingFiberLabel: string
    /** #530 — electrolyte Remaining cards (mg). */
    remainingSodiumLabel: string
    remainingPotassiumLabel: string
    remainingMagnesiumLabel: string
    mgRemainingUnit: string
    mgOverUnit: string
    /** #343 — same on-demand drag-reorder mechanism as
     * `dashboard.reorderSectionLabel`/`reorderSectionsButton`, scoped to
     * Today's own reorderable card group instead of Dashboard sections. */
    reorderCardLabel: (n: number) => string
    reorderCardsButton: string
    /** #356 — same reset-to-default mechanism as
     * `dashboard.resetSectionOrderButton`, scoped to Today's own
     * reorderable card group. */
    resetCardOrderButton: string
    /** #418 — BMI/the two weight deltas/the reorderable card group all sit
     * inside one collapsible section (expanded by default) so the whole
     * block can be hidden in one tap instead of scrolling past each card.
     * `statsSectionLabel` is the section's own visible heading; the two
     * labels below are the toggle trigger's `aria-label` in each state. */
    statsSectionLabel: string
    expandStatsLabel: string
    collapseStatsLabel: string
    /** #511 — one control for every top-level Day section accordion.
     * Label flips: Collapse all while any active section is open, Expand
     * all once every active section is shut. */
    collapseAllSectionsLabel: string
    expandAllSectionsLabel: string
    /** #266/#328 — shown as each remaining-nutrient (and, since #328,
     * calories) card's `description`: total minus consumed, so the amount
     * actually consumed is visible without the reader doing that
     * subtraction themselves — a bare "of Xg" denominator (#266's original
     * text) still left that gap. Same shape regardless of under/over-target
     * state for calories/fat/carb/water; protein's own over-target state
     * uses `proteinOverTargetLabel` instead (same breakdown + a positive
     * message), not this one. */
    targetMinusConsumedText: (target: string, consumed: string) => string
    /** #266/#328 — protein-only: once intake exceeds the target, the card
     * switches from "0g remaining" to a signed surplus (paired with
     * `gOverUnit` below) plus this positive description — a deliberate,
     * protein-only exception, since exceeding a protein target is a good
     * outcome unlike a calorie ceiling or fat/carb/water. Those three
     * (#321) also switch to a surplus value + `gOverUnit`/`mlOverUnit`
     * once over, but keep the neutral `targetMinusConsumedText` breakdown
     * above rather than this positive one — going over isn't uniformly
     * good for them the way it is for protein. */
    proteinOverTargetLabel: (target: string, consumed: string) => string
    /** Shared "g over" unit — originally protein-only (#266), extended to
     * fat/carbs by #321 once those also stopped clamping at 0. */
    gOverUnit: string
    /** #258 — same shape again, reusing dailyEntry.mlUnit for the unit
     * text instead of gRemainingUnit (a volume, not a gram weight). */
    remainingWaterLabel: string
    mlRemainingUnit: string
    /** #321 — water's own "over" unit, mirroring gOverUnit but for ml. */
    mlOverUnit: string
    /** #233 — computed from today's logged weight plus the Settings
     * Profile card's height/age/sex, so only rendered once both exist.
     * BMI has no unit of its own (a dimensionless ratio); BMR needs one. */
    bmiLabel: string
    bmrLabel: string
    bmrUnit: string
    /** #329 — BMR moved out of its own standalone card into a tooltip on
     * the "Remaining calories" card (aria-label for the tooltip's trigger
     * button); the tooltip body composes bmrLabel + the value + bmrUnit
     * together in TodayScreen.tsx, so those three keep their existing text
     * unchanged rather than needing a new combined string here. */
    bmrTooltipLabel: string
    /** #639: this is now specifically the *mid-week* "crossed the target,
     * not final yet" modal — reframed from a flat achievement claim so it
     * doesn't imply the badge is already earned. A separate `celebrationComplete*`
     * trio below covers the real end-of-window completion moment.
     * #665: same inclusive last-day phrasing as `targetMetBanner`. */
    celebrationTitle: string
    celebrationDescription: (weekEndDate: string) => string
    celebrationCta: string
    celebrationCloseLabel: string
    /** #639 — the *end-of-window* completion modal, shown once a goal's
     * window has actually ended with its final state still meeting the
     * target (distinct from `celebration*` above, the mid-week moment).
     * This is the point a new goal can actually be started, so its CTA
     * text (unlike the mid-week one, which only reviews) reflects that. */
    celebrationCompleteTitle: string
    celebrationCompleteDescription: string
    celebrationCompleteCta: string
    /** #353 — the Sleep StatCard's description line, e.g. "2.7h deep
     * sleep" — reported live as missing even though deep sleep is already
     * logged right below this card on the same form. */
    deepSleepDescription: (hours: string) => string
  }
