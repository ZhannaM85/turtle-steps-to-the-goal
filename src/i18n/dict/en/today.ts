import type { TodayDict } from '../types/today'

export const today: TodayDict = {
  title: 'Day',
  description: "Entry for the day's data, this week's target reminder",
  thisWeeksTarget: "This week's target",
  // #527 — positive magnitude + "to lose" (signed −X from #56 read as a
  // gain, especially in RU with "похудения"). GoalForm targetLabel matches.
  toLose: (unit) => `${unit} to lose`,
  weeklyTargetFromWeight: (weight) => `from ${weight}`,
  emptyGoalTitle: 'No goal set yet',
  emptyGoalDescription: 'Set a weekly target to see it here.',
  setGoalButton: 'Set a goal',
  dateLabel: 'Date',
  previousDayLabel: 'Previous day',
  nextDayLabel: 'Next day',
  jumpToTodayButton: 'Today',
  dayHasEntriesLabel: 'This day has logged entries',
  startTodayEarlyBanner: "It's already a new day.",
  startTodayEarlyButton: "Start today's log now",
  goalRenewalReminder:
    "This week's target is ready to renew — worth checking in on it.",
  reviewGoalLink: 'Review goal',
  targetMetBanner: (weekEndDate) =>
    `You reached this week's target — keep it up through ${weekEndDate} to earn your badge!`,
  dailyReminderText: 'No entry yet today — whenever you’re ready.',
  dailyReminderNotificationTitle: 'Turtle Steps',
  dailyReminderNotificationBody:
    'A quiet reminder to log today, whenever you’re ready.',
  targetMetSectionTitle: 'Target met',
  goalRenewalReminderSectionTitle: 'Goal renewal reminder',
  dailyReminderSectionTitle: 'Daily reminder',
  importDayTitle: 'Add this day’s log?',
  importDayDescription: (date) =>
    `This will fill empty fields on ${date}. Existing values stay unless you choose to replace them.`,
  importDayDisabled:
    'Turn on “Another copy” in Settings before receiving a day’s log.',
  importDayFillCount: (n) =>
    n === 1
      ? '1 empty field will be filled.'
      : `${n} empty fields will be filled.`,
  importDayConflictCount: (n) =>
    n === 1
      ? '1 field already has a different value:'
      : `${n} fields already have a different value:`,
  importDayMealCount: (add, skip) =>
    `${add} meal${add === 1 ? '' : 's'} to add${skip ? `, ${skip} already here skipped` : ''}.`,
  importDayWaterCount: (add, skip) =>
    `${add} water log${add === 1 ? '' : 's'} to add${skip ? `, ${skip} already here skipped` : ''}.`,
  importDayNothingToApply:
    'This copy already has everything from that snippet.',
  importDayAddMissing: 'Add missing',
  importDayAddAndReplace: 'Add missing and replace listed',
  importDayCancel: 'Cancel',
  sendDayLogLabel: 'Send or receive this day’s log',
  sendDayDialogTitle: 'This day’s log',
  sendDayDialogDescription:
    'Send the whole day to another Turtle Steps copy, or paste one you received.',
  sendDayWholeDayLabel: 'Whole day',
  sendDayCopyButton: 'Copy link',
  sendDayShareButton: 'Share',
  sendDayCopied: 'Copied',
  sendDayShareFailed: 'Couldn’t share. Copy the link instead.',
  sendDayNothingLogged: 'Nothing is logged on this day yet.',
  sendDayShareTitle: (date) => `Turtle Steps — ${date}`,
  sendDayShareText: (date) => `Day log for ${date}`,
  sendDaySaveCsvButton: 'Save as CSV',
  sendDaySaveCsvFailed: 'Couldn’t save the CSV.',
  sendDaySavePdfButton: 'Save as PDF',
  sendDaySavePdfFailed: 'Couldn’t save the PDF.',
  sendDayQrAlt: 'QR code for this day’s log',
  sendDayQrHint: 'Scan with another phone to preview this day.',
  sendDayQrTooLarge:
    'This day’s log is too large for a reliable QR code. Copy or share the link instead.',
  receiveDayPasteLabel: 'Paste a link',
  receiveDayPastePlaceholder: 'Paste a Turtle Steps day link',
  receiveDayPasteSubmit: 'Preview',
  receiveDayPasteInvalid:
    'That doesn’t look like a day’s log from Turtle Steps.',
  receiveDayScanQrButton: 'Scan QR code',
  receiveDayScanQrTitle: 'Scan a day’s log',
  receiveDayScanQrInstructions:
    'Point the camera at the QR on the other phone, or pick a photo of it.',
  receiveDayScanIsFood:
    'That QR is a shared food, not a day’s log. Import it from Settings → Meal items.',
  receiveDayScanUnreadable:
    'Couldn’t read that as a day’s log. Try again, or paste the link.',
  nutritionFactsSectionTitle: 'Nutrition highlights',
  vsYesterdayLabel: 'vs. yesterday',
  vsMaxWeightLabel: 'vs. highest weight',
  remainingCaloriesLabel: 'Remaining calories',
  kcalRemainingUnit: 'kcal remaining',
  kcalOverUnit: 'kcal over',
  remainingProteinLabel: 'Remaining protein',
  gRemainingUnit: 'g remaining',
  remainingFatLabel: 'Remaining fat',
  remainingCarbLabel: 'Remaining carbs',
  remainingFiberLabel: 'Remaining fiber',
  remainingSodiumLabel: 'Remaining sodium',
  remainingPotassiumLabel: 'Remaining potassium',
  remainingMagnesiumLabel: 'Remaining magnesium',
  mgRemainingUnit: 'mg remaining',
  mgOverUnit: 'mg over',
  reorderCardLabel: (n) => `Reorder card ${n}`,
  reorderCardsButton: 'Reorder',
  resetCardOrderButton: 'Reset order',
  statsSectionLabel: 'Stats',
  expandStatsLabel: 'Show stats',
  collapseStatsLabel: 'Hide stats',
  collapseAllSectionsLabel: 'Collapse all',
  expandAllSectionsLabel: 'Expand all',
  targetMinusConsumedText: (target, consumed) => `${target} − ${consumed}`,
  proteinOverTargetLabel: (target, consumed) =>
    `${target} − ${consumed} — great job!`,
  gOverUnit: 'g over',
  remainingWaterLabel: 'Remaining water',
  mlRemainingUnit: 'ml remaining',
  mlOverUnit: 'ml over',
  bmiLabel: 'BMI',
  bmrLabel: 'Estimated daily calories (BMR)',
  bmrUnit: 'kcal/day',
  bmrTooltipLabel: 'About estimated daily calories',
  celebrationTitle: "You reached this week's target!",
  celebrationDescription: (weekEndDate) =>
    `Keep it up through ${weekEndDate} to earn your badge.`,
  celebrationCta: 'Review goal',
  celebrationCloseLabel: 'Close',
  celebrationCompleteTitle: 'You completed your weekly goal!',
  celebrationCompleteDescription:
    'Congratulations! Ready to set the next tiny step?',
  celebrationCompleteCta: "Set next week's goal",
  deepSleepDescription: (hours) => `${hours} deep sleep`,
}
