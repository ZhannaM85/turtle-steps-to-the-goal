# Issues Priority — Archive tiers 123+

Closed rows from Tier 123 onward. Open / pending items stay in [`../issues-priority.md`](../issues-priority.md).

---

## Tier 123 — Product-owner audit batch (2026-08-04)

_Filed from the product-owner audit in `C:\Users\User\Projects\docs\turtle-steps-ideas\2026-08-04-product-audit\`. All other open / pending items from this tier live in the active file._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#607](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/607) | ✅ Done | Optional alcohol day signal and next-day weight correlation | `DailyEntry.hadAlcohol` + `useAlcoholTrackingStore`, mirrors `hadConstipation`/`nightEatingCorrelation` exactly. New `AlcoholCorrelationView` (only Settings-gated correlation view). Export/import covered. Confirmed working on-device 2026-08-06 |
| [#609](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/609) | ✅ Done | Local PDF summary export for sharing outside the app | New `exportPdf.ts` (jsPDF + jspdf-autotable, both new deps, dynamically imported): weight trend (hand-drawn line), weekly-averages table, optional latest body measurements, non-medical disclaimer on every page. Own 30/90-day picker. Confirmed working on-device 2026-08-06 — follow-up filed as #629 (section picker modal) |
| [#603](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/603) | ✅ Done | Named serving descriptors for personal meal items | New `MealItem.servings?` + `setServings` store action; editable in Settings' meal-item editor, selectable in `FoodPickerDialog.tsx` (same scaling as curated foods, #254). Export/import covered, no version bump. Confirmed working on-device 2026-08-06 |
| [#612](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/612) | ✅ Done | Settings help: using two devices with local-only backups | New "Using two devices" card directly above Export in `SettingsScreen.tsx` — intro + 3-step numbered list (this device = live data, Export = portable backup, Import = merge). No sync backend mentioned. en/ru. Confirmed working on-device 2026-08-06 |
| [#600](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/600) | ✅ Done | Undo toast after deleting a meal | `MealList.tsx`'s new `deleteMealById`/`undoDeleteMeal`; 9s toast, both delete entry points covered; clear-all stays hard-confirm, untouched. Confirmed working on-device 2026-08-06 |
| [#604](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/604) | ✅ Done | Simple vs Full tracking presets for Day layout | New `stores/trackingPreset.ts` (`applyTrackingPreset`); "Layout preset" card in Settings above "What to track". Cycle/digestion untouched by design. Confirmed working on-device 2026-08-06 |
| [#608](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/608) | ✅ Done | Optional password-encrypted JSON backup | New `encryptedBackup.ts` (Web Crypto: PBKDF2 → AES-GCM), `EncryptedBackupExportDialog`/`EncryptedBackupImportDialog`; plain backup unchanged, `handleImportFile` auto-detects an encrypted envelope. Forgotten password = unrecoverable, warned up front. Confirmed working on-device 2026-08-06 |
| [#613](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/613) | ✅ Done | Consistent trust/sample-size footers on correlation insight views | Audited all 9 views — the one real gap: the weekly calories-vs-weight view (#522) silently dropped an in-progress current week with no user-facing note. New `weeklyCorrelationExcludesCurrentWeek()` + footer note there only; 8 day-pair views + custom already consistent. Confirmed working on-device 2026-08-06 |
| [#611](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/611) | ✅ Done | Copy recipe ingredients as a shopping list | New Clipboard-icon button per recipe row in `RecipesSettingsScreen.tsx`; `buildRecipeShoppingListText()` (new `shared/lib/`) formats name + ingredients with grams. "Copied" confirmation, en/ru. Confirmed working on-device 2026-08-06 — follow-up filed as #636 (icon-only confirmation too easy to miss, wants a visible tooltip/toast) |
| [#601](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/601) | ✅ Done | Apply day-start time consistently across analytics | Resolved via `AskUserQuestion`: shift analytics forward, forward-only. Consolidated `adjustForDayStart` into `domain/stats/dayStart.ts` (new `todayIsoForDayStart` too); fixed a real bug in `lateMealCorrelation.ts` (never applied day-start at all) and `fastingWindowPoints`/chart series (hardcoded midnight); "is this week still in progress" now day-start-aware in Dashboard's weekly recap, calorie/weight correlation, and Goal's weekly review. Dashboard's rolling-window displays (recent averages, logging consistency, trend-chart pager) deliberately left for a follow-up (#625). Confirmed working on-device 2026-08-06 |
| [#602](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/602) | ✅ Done | Weekly review: calm end-of-week progress and insight summary | New `/goal/weekly-review` screen + `goalWindowAverages()`; reuses `goalWindowProgress`/`recentAverages`/`correlationInsight` verbatim, no new scoring. Entry button ("Обзор недели") at the top of the Goal page — initially not spotted on-device, distinct from Dashboard's pre-existing, similarly-named "Недельная сводка" (`WeeklySummaryCards`) cards; confirmed working once scrolled to. Confirmed working on-device 2026-08-06 |
| [#615](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/615) | ✅ Done | Clearer period context when cycle tracking is on | New `cyclePeriodDay.ts`'s `isLoggedPeriodDay()` — a one-line factual note in `WeightTrendChart.tsx`'s tooltip, shown only when the exact tapped date is itself logged as a period day. Reopened twice live: a whole-viewed-range check, then a 5-day proximity window, both still surfaced the note on unrelated days (period ended 15 Jul, note still showed on 20 Jul under the windowed version) — final version drops windowing entirely for a plain date-membership check. History's calendar legend already correctly gated per-type, no change needed there. Confirmed working on-device 2026-08-06 |
| [#610](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/610) | ✅ Done | Calm pace-check card when recent weekly goals miss consistently | New `domain/goal/paceCheck.ts` (`paceCheckInsight`, 3-consecutive-miss threshold); "Pace check" nudge card on GoalScreen, same hideable shape as `goalReachedNudge`. No projection (#228 still stands). Closed 2026-08-07 **without on-device confirmation** at the user's request — the 3-consecutive-miss condition takes real time to occur naturally; user will reopen if the card doesn't appear once actually triggered |
| [#614](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/614) | ✅ Done | Lightweight planned meals / tomorrow draft staging | Resolved via `AskUserQuestion`: separate drafts store (`usePlannedMealStore`, new `plannedMeals` IndexedDB table), not planned `DailyEntry` rows. New `PlannedMealsSection.tsx` on the Day screen — stage a name + optional kcal estimate for tomorrow; opening that date shows it with "Add to log"/discard. Confirmed working on-device 2026-08-07 |
| [#599](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/599) | ✅ Done | Remind when a JSON backup has not been exported recently | New `useLastBackupStore` + `lastBackupReminder.ts` (14-day threshold, 7-day snooze); dismissible banner atop Settings linking to `#export-section`, plus an always-visible "Last backup: N days ago" line by the Export button. `firstSeenAt` gap fixed: new `DailyEntryRepository.getEarliestEntryDate()` + `useLastBackupStore.backdateFirstSeenAt()` (only ever moves earlier, self-heals an already-affected device) wired in via `shared/hooks/useSeedBackupFirstSeenAt.ts`, called from `SettingsScreen` on mount. Confirmed working on-device 2026-08-07 |

---

## Tier 124 — Native-unlocked follow-ups from audit (2026-08-04)

_Same audit pass. Blocked on Tier 36 Capacitor / store shell — revisit of #261 (notifications) and #231 (widgets), which were correctly closed for PWA-only._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#606](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/606) | ✅ Done | Android home-screen glance widget | Confirmed on-device 2026-08-10: widget shows today's weight; tap opens Day. Follow-ups for richer fields + visual polish filed under Tier 131. |
| [#605](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/605) | ✅ Done | Native local notification for the daily logging reminder | New `@capacitor/local-notifications` dependency; `useDailyReminderStore` gains `reminderTime` ('HH:MM', default 20:00, `AskUserQuestion`-confirmed as a real Settings time picker rather than a fixed default). `shared/native/dailyReminderNotification.ts` schedules/cancels via a store subscription (native only — web/PWA keeps the existing in-app banner unchanged). Deliberately unconditional (fires regardless of whether today's entry exists) — a background OS notification can't check IndexedDB state at delivery time. Confirmed working on-device 2026-08-08 — verified end-to-end via `adb` (`dumpsys alarm`/`dumpsys notification` showed the scheduled alarm and posted notification with correct title/body) and a real lock-screen screenshot |

---

## Tier 127 — Live feedback (2026-08-07)

_Live discussion of a screenshot showing "Цель достигнута" badges on most recent weeks despite the actual weight barely moving. All currently open / pending items from this tier live in the active file._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#639](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/639) | ✅ Done | Goal tracking: mid-week 'achieved' shouldn't lock in a permanent badge; gate restart to week's natural end | New `finalTargetMet`/`goalWindowHasEnded` in `goalWindowProgress.ts` decouple the permanent record from the sticky mid-week `targetMet`; `currentWeightKg` no longer freezes at the met-date weight. `PastTargetsList`/`WeeklyReviewScreen`/`paceCheck.ts` switched to `finalTargetMet`. `GoalCelebrationModal` gained a phase-aware 'inProgress'/'complete' split (reframed mid-week copy + a new end-of-window completion modal), each with its own dismissal tracking. `GoalScreen` gained a third "missed" nudge (confirmed via `AskUserQuestion` — the issue's own open question) alongside reframed reached/completed ones. `GoalForm`'s restart button is now `disabled` until the window has actually ended, with a hint naming the unlock date — the actual fix for the overlapping-windows bug. Closed 2026-08-07 **without on-device confirmation** at the user's request — the mid-week vs. end-of-week split and the restart gate both need real elapsed days to observe; user will reopen if a badge still locks in mid-week or the restart button is still available before a window's natural end |
| [#640](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/640) | ✅ Done | Scanned/searched food: dish name not editable, no brand field on review screen | `AddMealDialog.tsx`'s confirm step: dish name is now an editable `Input` (was read-only `<p>`), plus a new brand `Input`, same meal-line-override shape #517 already set for kcal/macros. Prefilled from an OFF hit's brand when scanning/searching finds one (previously silently dropped by `foodItemFromOff`); falls back to the source item's own name if cleared blank. Confirmed working on-device 2026-08-07 |
| [#641](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/641) | ✅ Done | Scanned food name shows literal `&quot;` instead of a decoded quote | Root cause confirmed: `parseOffProductIdentity()` in `openFoodFactsParse.ts` (shared by `lookupBarcode.ts` #256 and `searchOpenFoodFacts.ts` #531) read OFF's `product_name`/`brands` raw, with no entity decoding. New `shared/lib/decodeHtmlEntities.ts` (DOMParser against a detached document, never attached to the page) applied to both name and brand. Confirmed working on-device 2026-08-07 |
| [#642](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/642) | ✅ Done | Write release-notes.ts entries during implementation, not at issue-closing time (#637 follow-up) | Docs-only: split CLAUDE.md's "Closing a GitHub issue" section so `releaseNotes.ts` is written in the implementation commit (new "Writing the release note" section) instead of bundled into the closing commit; closing pass is now just `issues-priority.md` row-move + `ARCHITECTURE.md`, so it stays `docs/**`-only and skips the Pages deploy. `docs/AGENT_WORKFLOW.md`'s per-issue checklist updated to match. Reopened once at the user's request after being closed without on-device validation — every issue gets the validation step regardless of whether the change reads as "code." Confirmed via the Actions tab (docs-only pushes no longer trigger a Pages deploy) 2026-08-07 |
| [#643](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/643) | ✅ Done | Add meal: barcode not shown when the matched food already exists in DB | Root cause: picking a food from search/library results goes through `AddMealDialog`'s confirm-quantity step (`activeItem`), a separate JSX block from the manual-entry `MealItemEditorSheet` that #519 already fixed — the confirm-quantity screen never displayed a barcode at all. New `activeItemBarcode` (only possible for a `source: 'mealItem'` pick — the curated `FoodItem` catalog has no barcode field) rendered the same way #519 does. Confirmed working on-device 2026-08-07 |
| [#644](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/644) | ✅ Done | Barcode field text can't be selected for copying — cursor doesn't move, selection won't expand | iOS Safari's native selection on the barcode row shows handles but they can't be dragged, so there was no working way to copy it. Fix: dedicated copy button (raw undelimited digits) next to the label in `MealItemEditorSheet.tsx`, same clipboard + auto-clearing "Copied" shape `RecipesSettingsScreen.tsx` established for #611/#636. Confirmed working on-device 2026-08-07 |
| [#645](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/645) | ✅ Done | Add-meal screens inconsistent: scan/existing-food confirm screen lacks the portion option that new-food creation has | `AskUserQuestion` at implementation time: merge into `MealItemEditorSheet` (not bolt a toggle onto the old confirm screen). `AddMealDialog.tsx`'s inline `activeItem` confirm block (own `ConfirmRates`/absolute-only fields, no per100g/portion toggle) removed entirely; search/recent/barcode picks now open the same `MealItemEditorSheet` "create a dish" already used, via `openPickedItemSheet()` — a curated/OFF food seeds per100g mode (its own rate, no conversion), a personal item seeds perPortion mode (its own last-logged total). Also ported the picker's named-serving-size toggle (#254, e.g. "1 medium" egg) into `MealItemEditorSheet` itself, since that UI had no equivalent before. Confirmed working on-device 2026-08-07 |

---

## Tier 126 — Live feedback (2026-08-06)

_Same-day live feedback while working through Tier 123/125's validation queue. All currently open / pending items from this tier live in the active file._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#629](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/629) | ✅ Done | PDF summary export: let user pick which sections to include | New `PdfSectionsDialog.tsx` (same multi-select `ToggleGroup` shape as Settings' "what to track" groups) shown when "Export PDF summary" is clicked; `buildSummaryPdf` gained a `PdfSections` param gating the weight-trend/weekly-averages/body-measurements blocks. Disclaimer stays unconditional per #609. Confirmed working on-device 2026-08-06 — follow-up filed for expanding to all tracked metrics |
| [#630](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/630) | ✅ Done | PDF summary export: offer every tracked metric as a section, not just three | `PdfSummaryData`/`PdfSections` expanded to sleep, steps, water, cycle, digestion, alcohol, night eating, body composition, plus a dynamic list of the user's own custom metrics. New `pdfSectionAvailability()`/`customMetricPdfOptions()` disable a toggle with no data in the picked range rather than hiding it. Confirmed working on-device 2026-08-06 — follow-up filed as #632 (some toggles enabled without real entries) |
| [#633](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/633) | ✅ Done | PDF section picker: enabled state doesn't match Settings' What to track | `pdfSectionAvailability()` was a pure "has any data" check with zero awareness of any Settings tracking toggle. New `gatePdfSectionAvailability()` ANDs it against `useTrackedFieldsStore` (sleep/steps/bodyMeasurements/bodyComposition/nightEating) plus the older per-field opt-in stores (cycle/digestion/alcohol/water) at the `ExportSection.tsx` call site; `weightTrend`/`weeklyAverages` have no toggle so pass through unchanged. Confirmed working on-device 2026-08-06 |
| [#636](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/636) | ✅ Done | Recipe ingredient copy: show a visible 'Copied' tooltip/toast (#611 follow-up) | `RecipesSettingsScreen.tsx` now shows a `role="status"` "Ingredients copied to clipboard" line under the row (same auto-clearing shape as `GoalForm.tsx`'s `justSaved`), alongside the existing icon swap. New `t.recipes.ingredientsCopiedToastMessage`, en/ru. Confirmed working on-device 2026-08-07 |
| [#632](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/632) | ✅ Done | PDF section picker: some toggles enabled without any real entries | Implemented together with #633 — the Settings-tracking gate explains Body measurements/Alcohol/Night eating showing enabled from stale data logged before their Settings toggle was turned off (or, for Night eating, from meal-slot-default times with no night-eating-specific intent). Confirmed working on-device 2026-08-07 |
| [#634](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/634) | ✅ Done | PDF section picker: Body measurements enabled from body-fat-% data alone (follow-up to #632/#633) | `exportPdf.ts` moved `bodyFatPercent`/`latestBodyFatPercent` out of the "Body measurements" grouping into "Body composition" (matches the Day form's own `saveBodyComposition` grouping) in both `pdfSectionAvailability()` and `buildSummaryPdf()`. Added `pdfSectionDisabledReason()` plus an `InfoTooltip` on each disabled toggle in `PdfSectionsDialog.tsx` naming which of the two reasons applies (not tracked in Settings vs. no data in range). Confirmed working on-device 2026-08-07 |
| [#635](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/635) | ✅ Done | Day screen: no way to navigate forward to reach staged planned meals (#614 follow-up) | `TodayScreen.tsx`'s next-day arrow/date-picker `max` was hard-capped at today (#138) — now capped at `max(today+1, furthest staged planned-meal date)`, so tomorrow is always reachable and a draft staged further out (staging always targets "the day after whatever date is open," so reaching it requires having already stepped through every day in between) extends the cap to match. Confirmed working on-device 2026-08-07 |
| [#631](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/631) | ✅ Done | Unusual-data-point links can land on a day with no logged data | `CorrelationView.tsx`'s `OutlierPointsList` `getDate` resolves to the earliest date within the flagged week that actually has a logged weight instead of always the week's Monday. Reopened once live — `formatLabel`/`formatNotePreview` were left reading `point.weekStart` directly, so the chip's label/note preview and its link could disagree (label showed 26 Sep, link landed on 29 Sep); fixed by routing all three through the same resolved-date helper `getDate` uses. Confirmed working on-device 2026-08-06 |
| [#637](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/637) | ✅ Done | Deploy workflow: stuck GitHub Pages deployments + wasted docs-only deploy runs | Build always succeeded; `actions/deploy-pages@v4` was intermittently sitting at `deployment_queued` for its full 10-minute internal timeout. Fixed in `9c637f9`: `paths-ignore` on docs-only pushes + `timeout-minutes` on both jobs. Confirmed 2026-08-07 that Pages deployment is no longer getting stuck — the original failures were a global GitHub outage, unrelated to this repo's workflow; the hardening stands as defense-in-depth regardless |
| [#638](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/638) | ✅ Done | Settings 'What to track' night-eating toggle ignores Profile gender | `SettingsScreen.tsx:691` now reads `useProfileStore`'s `sex` and passes it into `nightEatingLabel(sex)`, matching every other caller. `exportPdf.ts`/`PdfSectionsDialog.tsx` left unchanged — the issue itself flagged those as section/column labels, possibly intentionally neutral, not a hard requirement. Confirmed working on-device 2026-08-07 |

---

## Tier 125 — Live feedback (2026-08-05)

_Same-day live feedback (Zepp multi-user export, export status placement, Apple Health recognition). All currently open / pending items from this tier live in the active file._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#616](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/616) | ✅ Done | Zepp Life import: export may contain two users' data — detect/filter on our side | BODY `height` splits shared-scale exports; `ZeppLifeProfileDialog` + filter by chosen height. ACTIVITY unchanged (not height-keyed). Confirmed working on-device 2026-08-06 (previously closed prematurely on indirect evidence, reopened, now confirmed for real) |
| [#617](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/617) | ✅ Done | Settings Export: show import success/error under the matching source section | `ExportSection` now renders each success/error message inside its own block (JSON backup/import, ranged backup, Excel, CSV, Markdown, Zepp, Apple Health, MyFitnessPal) instead of one shared card footer. Confirmed working on-device 2026-08-06 |
| [#618](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/618) | ✅ Done | Apple Health import: valid user export not recognized as Apple Health file | Locale-agnostic detection: importer now picks the primary Apple Health XML by role (largest non-`export_cda.xml` XML entry) instead of requiring the English filename `export.xml`, so localized exports like `экспорт.xml` are accepted. Confirmed working on-device 2026-08-06 |
| [#619](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/619) | ✅ Done | Custom metric note input: add a Cancel button to close without saving | `CustomMetricLogSection.tsx`'s Cancel button was already there for editing a saved note (#437) but hidden for a brand-new one — removed that gating; canceling a fresh note now falls back to the empty read-mode view instead of having no way out. Confirmed working on-device 2026-08-06 |
| [#620](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/620) | ✅ Done | Custom metric note Cancel button leaves an empty saved-looking entry instead of clearing it | `MetricValueRow`'s non-editing render now has a real "nothing logged yet" idle state (new "+ Add note" trigger) instead of falling through to the read-mode box meant for an actual saved note. Confirmed working on-device 2026-08-06 |
| [#621](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/621) | ✅ Done | Meal list sort order: a very-late-night meal sorts first instead of last | `sortCalorieEntriesByLoggedTime` (`mealLabel.ts`) gained a day-start-adjusted comparison (new optional `dayStartTime` param, default `'00:00'` = unchanged prior behavior); `MealList.tsx` now feeds its real day-start setting in. Confirmed working on-device 2026-08-06 |
| [#622](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/622) | ✅ Done | Custom metric note input reappears after being closed | New `stores/customMetricNoteDismissalStore.ts` records a canceled/blank-saved note's `metricId:date`, since `note` alone can't tell "never touched" apart from "explicitly dismissed" across a remount (date nav, accordion collapse). `MetricValueRow`'s initial edit-mode check now also reads it. Confirmed working on-device 2026-08-06 |
| [#623](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/623) | ✅ Done | PDF summary export: Cyrillic text renders as mojibake | New `ptSansRegularFont.ts` (base64 TTF, dynamically imported) embeds PT Sans (Latin+Cyrillic) into every `exportPdf.ts` text/table call, replacing jsPDF's default Cyrillic-less standard fonts. Confirmed working on-device 2026-08-06 |
| [#624](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/624) | ✅ Done | PDF summary export: let user pick a custom date range | Replaced the fixed 30/90-day toggle with a free-form start/end date picker (own `pdfPeriodStart`/`pdfPeriodEnd` state, defaulted to last 90 days) plus two "Last 30/90 days" quick-fill buttons. Also fixed a real CI bug found along the way — `ExportSection.test.tsx`'s `URL` stub broke Vite's dynamic import of #623's local font module. Confirmed working on-device 2026-08-06 |
| [#626](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/626) | ✅ Done | Add Settings toggle to hide Planned Meals section | New `usePlannedMealsTrackingStore` (off by default), same shape as cycle/digestion/water/alcohol tracking; new "Planned meals" toggle in Settings' "What to track" Other group; `DailyEntryFormTop.tsx` only mounts `PlannedMealsSection` when enabled. Confirmed working on-device 2026-08-06 |
| [#627](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/627) | ✅ Done | Planned meals trigger button shows two plus icons | Dictionary string had a literal `+` baked in on top of the already-rendered `Plus` icon; dropped from en/ru. Confirmed working on-device 2026-08-06 |
| [#628](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/628) | ✅ Done | JSON backup restore silently drops fields the existing entry has but the import doesn't | Root cause confirmed + reproduced (not MFP/Apple Health/Zepp, which already merge safely): `importAllData`'s dailyEntries merge only spread the imported entry's own fields, discarding the existing record. Fixed by spreading `existing` first. Confirmed working on-device 2026-08-06 |
| [#625](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/625) | ✅ Done | Apply day-start time to Dashboard rolling-window displays (follow-up to #601) | `loggingConsistencyWeeks` gained a `today` param (was hardcoded `endOfWeek(new Date(), ...)`). `RecentAveragesCards.tsx`/`LoggingConsistencyHeatmap.tsx` now pass `effectiveDateFor(new Date(), dayStartTime)` through to `recentAverages`/`recentAverageWindowRange`/`loggingConsistencyWeeks`/`loggingConsistencySummary`. `useChartPeriodPager.ts` (shared by all 6 Dashboard trend charts) now reads `useDayStartStore` itself and defaults to the day-start-adjusted date when its own `today` param is omitted. `CalendarView.tsx`'s cosmetic today-cell marker also switched from `isToday(day)` to a day-start-aware comparison. Closed 2026-08-07 **without on-device confirmation** at the user's request — validation steps (needs a non-midnight day-start time, checking the midnight-to-day-start window) judged too complex to walk through right now; user will reopen if a day-start-related Dashboard issue comes up |

---

## Tier 128 — Lint/tooling gap found while implementing #307 (2026-08-08)

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#646](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/646) | ✅ Done | `eslint` scans generated `android/`/`ios/` build output, breaking `npm run lint` after a native build | `eslint.config.js` only ignored `dist`; a real local `./gradlew.bat assembleDebug` build produces `android/app/build/.../native-bridge.js` on disk, which `eslint .` then walked and choked on (a vendored eslint-disable comment referencing a rule not loaded for plain `.js` files). Fixed by adding `android`/`ios` to the `ignores` array. No user-facing change |
| [#650](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/650) | ✅ Done | History: "Edit this day" button doesn't navigate to that day | Root cause: by design since #48, the button only switched History's own List view to a filtered single day rather than leaving the page. Now navigates to the Day screen for that date via `?date=` — the same deep-link `TodayScreen` already reads (#200), not a new mechanism. `HistoryScreen.tsx`'s `editDayFromCalendar`. Confirmed working on-device 2026-08-08 |
| [#649](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/649) | ✅ Done | PWA: "update available" banner keeps reappearing even after reloading | Real root cause found after reopening (the #211-explanation was insufficient — confirmed live the user's client stayed on v604 through 3 newer deploys and several explicit reloads over 45+ minutes; confirmed via `WebFetch` that the live `version.json` correctly reports the latest commit, so the server side was never the problem). `reloadForUpdate()` previously trusted the existing service worker to gracefully self-update (`registration.update()` + bounded wait for `controllerchange`), which depends on the CDN serving fresh `sw.js` bytes on that specific request — rewritten to unconditionally unregister every SW registration and clear every cache before reloading instead. Confirmed working on-device 2026-08-08 |
| [#648](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/648) | ✅ Done | Custom `ThemeBridgePlugin` (#308) duplicates Capacitor 8's built-in `SystemBars` plugin | Removed `ThemeBridgePlugin.java` and `@capacitor/status-bar` entirely — `src/shared/native/nativeChrome.ts` now calls `@capacitor/core`'s built-in `SystemBars.setStyle()` (no separate install, cross-platform, one call themes both bars). Left `insetsHandling` at its default rather than `'disable'`: that would also remove the plugin's real inset-passthrough/keyboard-padding logic, not just the CSS-fallback injection that raced the console error — not worth the regression risk to #308's confirmed-working safe area behavior. Confirmed working on-device 2026-08-08 |
| [#652](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/652) | ✅ Done | PWA offline support broken — Safari can't open the page without a connection | **Critical, reported live**: iOS Safari offline showed "can't open the page," no cached app shell at all. Root cause: #649's `reloadForUpdate()` rewrite made it unconditionally destructive (unregister every SW + clear every cache), but `usePullToRefresh.ts` calls it on *every* pull gesture regardless of whether an update exists — a routine pull-to-refresh was wiping the entire offline precache every time. Fixed by splitting into `reloadForUpdate({ force: true })` (only `AppUpdateBanner`'s Reload button, where an update is confirmed — keeps #649's fix) vs. the default (pull-to-refresh, reverted to the original gentle `registration.update()` + bounded wait, never destroys existing SW/caches). Confirmed working on-device 2026-08-08 — screenshot showed the app fully functional offline with the offline banner visible, and the "update available" banner no longer loops (#649 stays fixed) |
| [#647](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/647) | ✅ Done | Today date-navigator row: Date input renders smaller than arrows/Today button on Android | Root cause: Chromium honors this input's inherited `h-8` base height, unlike WebKit which ignores a plain `height` class regardless of value (only ever clips when paired with `overflow-hidden`, per #420's history). First fix (`h-[2.625rem]` gated to `Capacitor.getPlatform() === 'android'`) was too narrow — desktop Chrome still broken. Second fix (applied unconditionally, reasoning WebKit would no-op it) closed as validated, then **reopened**: broke real iOS Safari/PWA — an explicit height isn't a no-op on WebKit even matching its own natural size, unlike Chromium (reported live with screenshots, input rendered taller than the buttons). Third fix engine-gates via `isWebKitEngine` (`CSS.supports('-webkit-touch-callout', 'none')` feature-detect, not UA-sniff): Chromium/Blink gets the override, WebKit stays fully unconstrained. Confirmed working on-device (Android + real iOS Safari) 2026-08-08 |
| [#651](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/651) | ✅ Done | Android: hardware/gesture back button always closes the app, regardless of page | Root cause: `AppShell.tsx`'s 5 top-level tabs all use `replace` (#309), so `canGoBack` stays false on every tab, not just Today — reported live as "exits from every tab," expected behavior per standard bottom-nav convention (YouTube/Instagram etc.): back returns to the home tab (Today) first, only exits from there. Two false starts first: an `enableOnBackInvokedCallback` manifest flag (reverted, didn't fix it and wasn't the actual regression source — the bug reproduced even on the original #309 commit in isolation) and misreading a MIUI `LauncherFsGestureCompat` log line as a gesture-nav bypass. Real fix: `backButtonHandler.ts` now calls `router.navigate('/')` when `canGoBack` is false and not already on `/`, only calling `App.exitApp()` from Today itself. Confirmed working on-device 2026-08-08 |
| [#653](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/653) | ✅ Done | Android splash screen: turtle icon looks elongated/stretched | Reported live with a screenshot after #311's own "confirmed correct" splash. Root cause: `styles.xml`'s `AppTheme.NoActionBarLaunch` set `android:background` directly to the raw `@capacitor/assets`-generated `@drawable/splash` bitmap, which defaults to `Gravity.FILL` (non-uniform stretch to exact window bounds) — since each density bucket's bitmap targets a fixed reference aspect ratio that rarely matches a real device's screen exactly, the circular badge stretched into an oval. Fixed with a new `drawable/splash_screen_bg.xml` wrapper (`android:gravity="center"`) so the bitmap draws at native size instead of stretching; survives future `capacitor-assets generate` reruns since it only touches `@drawable/splash`, not the wrapper. Confirmed working on-device 2026-08-08 |
| [#654](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/654) | ✅ Done | About screen: move Release notes section directly under the version number | Reported live with an annotated screenshot — "Version N" and the collapsible "Release notes" section sat far apart (description/privacy text between them). Release notes card moved into the leading cards group, directly under the Version card (`AboutScreen.tsx`). Confirmed working on-device 2026-08-08 |
| [#655](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/655) | ✅ Done | About screen: merge Version and Release notes into one card | Follow-up to #654. Implemented, scope grew live during the session: single `Card` combines the title as `{releaseNotes} · {currentVersion}` (`AboutScreen.tsx`), and the separate "Show release notes" text button was replaced by an icon-only `ChevronDown`/`ChevronUp` toggle in the card header (`CardAction`) next to that title — `ReleaseNotesSection.tsx` is now a dumb list, expand/collapse state lifted to `AboutScreen`. Confirmed working on-device 2026-08-09 |
| [#657](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/657) | ✅ Done | Android Health Connect: steps sync | Reopened then validated on-device 2026-08-11 — see Tier 132 archive. |
| [#656](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/656) | ✅ Done | Android Health Connect: weight sync (foundation) | Reopened then validated on-device 2026-08-11 — see Tier 132 archive. |
| [#658](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/658) | ✅ Done | Android Health Connect: sleep sync | Reopened then validated on-device 2026-08-11 — see Tier 132 archive. |

---

## Tier 129 — Editable goal window end date (2026-08-09)

_User reported live: their goal window always runs Tuesday→Monday (an artifact of #135's save-time-anchored `weekStart`), but they want Monday→Sunday. Design forked between wiring into the existing (separate) "Week starts on" setting vs. a plain editable end-date field on the goal form; resolved via `AskUserQuestion` — the user chose the editable field specifically because it touches no existing behavior (`weekStart` computation, `weekStartStore`) at all._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#659](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/659) | ✅ Done | Goal: let the user edit the weekly window's end date | Implemented — new optional `Goal.weekEnd`; every window-end read site (`goalWindowProgress`, `goalCoveringDate`, `goalWindowAverages`, GoalForm/GoalScreen/TodayScreen/PastTargetsList window labels, the restart-availability check) now prefers it over the `weekStart+6` default (`goalWeekEnd`) when set. `GoalForm.tsx` gained an "Ends on" date field (native `<input type="date">`, `min` bound to the window's own start, same pattern as `DeleteRangeSection`'s date-range pair — no separate Zod cross-field validation), prefilled via `defaultWeekEndDate` in `goalFormMapping.ts` so an untouched save round-trips to the exact same default. Confirmed working on-device 2026-08-09 |
| [#660](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/660) | ✅ Done | Body Composition inputs: unclear which label belongs to which input | Implemented — `DailyEntryFormMorning.tsx`'s Body Composition edit grid (Мышечная масса/Висцеральный жир/Вода в организме/Костная масса/Процент жира). Root cause: each label span reserves a fixed `min-h-8` (2 lines' worth) so same-row inputs stay aligned regardless of wrap (#446), but a single-line label's text sat at the *top* of that box, leaving leftover space between the label text and its own input that read as roughly the same size as the gap to the next field. Fixed with `flex items-end` on the label spans (bottom-aligns the text against its own input, no leftover only when the label doesn't wrap) plus `gap-y-3` → `gap-y-4` on the grid for a clearer next-field gap. Scope confirmed via `grep min-h-8` — this pattern is unique to Body Composition's vertically-stacked 2-col/3-row grid; Sleep and Body Measurements are single-row/side-by-side and don't have the ambiguity. Confirmed working on-device 2026-08-09 |

---

## Tier 130 — Food sharing, live bug report, and nutrient encouragement (2026-08-09)

_User request: when a food isn't in the barcode database and gets manually added, let another user who eats the same food receive it instead of re-entering it manually. User initially asked about Bluetooth; confirmed via `AskUserQuestion` that raw Web Bluetooth isn't viable (browsers can only act as BLE central, not peripheral — two instances of this PWA can't pair directly), so scoped to OS share sheet (`navigator.share`, whose Android sheet includes Nearby Share over Bluetooth/Wi-Fi Direct) plus QR code scan-to-import (reusing #307's camera/barcode-scanning code) as the two realistic mechanisms, both to be built. User's "can we support PWA?" was about the sharing feature working within the PWA itself (not native-only), not about PWA support in general (already long-standing) — clarified via a follow-up comment on #661, since both mechanisms are standard web APIs with no dependency on #304's native track. #662 filed same day from a live on-device screenshot, unrelated to food sharing._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#662](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/662) | ✅ Done | Goal-achieved and goal-renewal-reminder cards contradict each other; renew button disabled | Root cause: `showGoalRenewalReminder` (TodayScreen.tsx) used `today >= weekEnd`, one day earlier than `goalWindowHasEnded`'s `today > weekEnd`, which gates both the target-met banner and the renew button (GoalForm.tsx's `activeWindowEnded`). On the window's exact last day this made the reminder card appear while the banner was still correctly showing and the button still correctly disabled. Fixed by having the reminder card reuse `goalWindowHasEnded` directly, so all three agree the window isn't over until the day after `weekEnd`. Confirmed working on-device 2026-08-09 |
| [#663](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/663) | ✅ Done | Encouraging micro-notifications for nutrient-rich meals (protein, fiber, vitamins) | `useNutritionFactsStore` + `evaluateMealNutritionFacts` / `evaluateDayNutritionFacts` (cited thresholds; vitamins/variety/streaks deferred — no vitamin data). Day-screen card (`todayNutritionFacts` eye toggle) + inline praise on Add meal; once-per-day-per-fact via Set. Initially shipped off by default; flipped **on by default** after on-device validation (persist key bumped to `turtle-steps-nutrition-facts-v2` so earlier-persisted off also resets). Confirmed working on-device 2026-08-09 |
| [#665](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/665) | ✅ Done | RU (and possibly EN) target-met copy reads as if the deadline already passed on the window's last day | Follow-up to #662. Fixed copy only (boundary logic already correct): RU `targetMetBanner` / `celebrationDescription` / `activeGoalReachedNudge` now say "держитесь до конца {weekEndDate}"; EN parallel strings use "through" instead of "until" so the window's last day still reads as included. Confirmed working on-device 2026-08-09 |
| [#664](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/664) | ✅ Done | Compare-to-yesterday/30-day arrow indicators for daily input fields (weight, steps, sleep, body composition) | Implemented — live arrow+text under the field while editing (≈300ms debounce), color-coded per-field (steps/sleep/muscle/bone/water: green=up; weight/visceral fat/fat%: green=down); disappears on save, replaced by ⓘ next to the label with tooltip (vs prior day + vs exactly 30 days ago). When yesterday lacks that field, falls back to the most recent prior entry and names that date. Scope: listed daily metrics only (no calories/macros). Settings toggle `useEntryComparisonStore` (on by default, local-only). Confirmed working on-device 2026-08-09 |
| [#661](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/661) | ✅ Done | Share manually-added foods between users (share sheet + QR code) | Implemented — share payload (`sharedFoodPayload.ts`) encodes name + optional brand/barcode/serving + absolute macros + per-100g rates + named servings into a `?shareFood=` deep link (base64url, no server). Settings → Meal items: Share on each row opens OS `navigator.share` + QR (`QRCodeWriter`); "Import shared food" scans QR (reuses #307 scanner in `qr` mode) or pastes a link. Receiver always reviews/edits first; barcode-then-normalized-name match offers Update existing / Skip (no silent duplicate). Brand is review-only (MealItem has no brand field). Confirmed working on-device 2026-08-09 |

---

## Tier 131 — Live feedback (2026-08-10)

_Live bug reports from the app, filed as reported._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#669](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/669) | ✅ Done | Day page: saving an empty weight value displays "не число" (NaN) instead of being blocked | Root cause: `weightSchema` is `.optional()` (a day can legitimately go untracked), so `saveWeight()`'s `safeParse` treated an empty field as a *valid* clear — it persisted `weightKg: undefined` and flipped to read-only display mode, which then rendered `formatExactNumber(undefined)`; `Intl.NumberFormat` formats that as literal "NaN" (ru: "не число"). Fixed by rejecting `result.data === undefined` in `saveWeight()` specifically (`useDailyEntryFormState.ts`) — shows the existing "Invalid value" error and stays in edit mode instead of saving. Confirmed working on-device 2026-08-10 |
| [#666](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/666) | ✅ Done | Goal page: past-goal weight values rounded to 1 decimal, losing precision | Root cause: `PastTargetsList.tsx`'s baseline/current weigh-in line used `formatNumber` (defaults to 1 decimal) instead of `formatExactNumber` (entered precision, up to 2 decimals) — the target-per-week figure on the same row already used `formatExactNumber` correctly. Fixed to match. Confirmed working on-device 2026-08-10 |
| [#668](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/668) | ✅ Done | Goal setup: no way to delete the current goal, only edit it | Root cause: `GoalRepository.deleteGoal(id)` already existed but only for past-goal history (#174, via `PastTargetsList`/`usePastGoals`) — its own doc comment noted "deleting the currently active goal is not a supported use case (there's no UI path to it)". Added a `deleteGoal()` action to `goalStore.ts` (calls the same repository method with the active goal's id, then clears `goal` to `null`), a `Trash2` button in `GoalForm.tsx`'s read-only current-goal view (next to Edit), and an `onDelete` prop threaded from `GoalScreen.tsx`. Confirmation uses the same two-step inline-card pattern as `showDiscardConfirm` already in this file (and `PastTargetsList`/`MealList`/`EntryRow` elsewhere) — reuses `t.history.confirmDeleteYes/No`, new `t.goal.deleteGoalLabel`/`confirmDeleteGoalLabel` strings. Confirmed working on-device 2026-08-10 — but the resulting post-delete screen (empty create-goal form) was disliked; follow-up filed as #674. |
| [#674](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/674) | ✅ Done | Follow-up from #668: deleting the current goal drops into an empty create-goal form instead of a view-mode state | `justDeletedGoal` snapshot keeps view-mode summary when store goal is null; Delete hidden after delete; discard resets `isEditing` when no existing goal. Stack pop refined in #677. Confirmed working on-device 2026-08-10. |
| [#677](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/677) | ✅ Done | Regression from #674: delete active goal should pop stack to previous goal | Stack UX: delete pops top; previous goal shows immediately + after refresh. `deleteGoal` removes active then `getActiveGoal()` → previous; GoalForm prefers `existingGoal` over deleted snapshot (snapshot only when stack empty, #674). Confirmed working on-device 2026-08-10. |
| [#670](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/670) | ✅ Done | Day page: allow deleting a weight entry (today or any date), with confirmation modal | Implemented in `DailyEntryFormMorning.tsx`/`useDailyEntryFormState.ts` — a Trash2 button (display mode, next to Pencil; and edit mode, next to Cancel/Save) opens a two-step inline confirm, matching the existing inline confirmDelete pattern already used by `MealList.tsx`/`EntryRow.tsx`/`PastTargetsList.tsx` (muted label + destructive "Delete"/ghost "Cancel", reusing the generic `t.history.confirmDelete*` strings) rather than introducing a `Dialog`-component modal this codebase doesn't otherwise use for delete confirmations. Shared by both Today (`DailyEntryFormMorning` directly) and History (`EntryRow`'s `alwaysEditable` inline edit), satisfying "today or any date" from one component. Confirming clears `weightKg` and reopens an empty editable field — found and fixed a real react-hook-form gotcha along the way: a plain `setValue(field, undefined)` on a `register()`-bound input that's currently unmounted (display/confirm mode render no `<Input>` at all) does **not** survive the field remounting back into edit mode — the uncontrolled input silently falls back to its original `useForm({ defaultValues })` value instead of showing empty, which would have reintroduced #669's NaN bug on delete. Confirmed with an isolated repro test; fixed by using `reset({ ...getValues(), weightKg: undefined })` instead, which re-baselines `defaultValues` itself (what the remounted input's ref sync actually reads from). Confirmed working on-device 2026-08-10 |
| [#672](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/672) | ✅ Done | Follow-up from #670: delete-weight Trash icon doesn't appear until page refresh after saving a new weight | Root cause: `useDailyEntryFormState.ts`'s `canDeleteWeight`/`canCancelWeightEdit` derived straight from `initialValues.weightKg`, and `initialValues` is `useMemo`'d with an empty dep array — frozen at mount, never re-synced after a save made later in the same session. Fixed by tracking a new `hasSavedWeight` state instead, updated live by `saveWeight()` (→ true) and `confirmDeleteWeight()` (→ false) rather than re-derived from the stale prop snapshot. Same root cause as #673 — both fixed by this one change. Confirmed working on-device 2026-08-10 |
| [#673](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/673) | ✅ Done | Follow-up from #670: confirming weight deletion doesn't actually delete the entry | Same root cause as #672 (frozen `canDeleteWeight`/`canCancelWeightEdit`) — after a delete, both stayed stuck `true`, so the reopened edit-mode input kept showing a live Trash button and a Cancel that would revert straight back to the just-deleted value, reading as "delete didn't work" even though `persist()` had already written the deletion. Already fixed by #672's `hasSavedWeight` commit; this row only adds its own regression test confirming Delete/Cancel both correctly disappear post-delete, no separate production code change. Confirmed working on-device 2026-08-10 |
| [#680](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/680) | ✅ Done | CI: GoalScreen #147 test still asserts pre-#678 Past Targets behavior | Deploy failed after #678: GoalScreen #147 test still expected no Past Targets for a concluded sole goal. Updated the assertion to match #678 (`pastGoals` includes the concluded active goal). Test-only. Closed 2026-08-10 — user confirmed build is green; going forward, do not file a separate GitHub issue for deploy/CI fallout from a product change (fix as a follow-up commit under the parent issue instead). |
| [#679](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/679) | ✅ Done | Day page: weekly goal card missing starting weight ("от X кг"), shown correctly on Goal page | Day weekly-target card lacked GoalScreen's `useLatestWeight` fallback when baseline snapshot/weekStart weigh-in missing. Confirmed working on-device 2026-08-10. |
| [#667](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/667) | ✅ Done | Weekly goal reached on window's last day: celebration + new-goal unlock wrongly deferred to next day | Closed 2026-08-10 without end-of-week on-device check (user can't validate until weekEnd). Will reopen if it still reproduces then. |
| [#671](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/671) | ✅ Done | Follow-up from #667: starting a new goal on a last-day reach overlaps the old goal's window by one day | Closed 2026-08-10 without end-of-week on-device check (user can't validate until weekEnd). Will reopen if it still reproduces then. |
| [#675](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/675) | ✅ Done | Goal card: no baseline weight shown when a new goal's start day has no weigh-in yet | GoalScreen weekly-target card falls back to `useLatestWeight` when baseline is undefined. Confirmed working on-device 2026-08-10. |
| [#682](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/682) | ❌ Duplicate | Past Targets: Aug 4–9 goal marked not reached despite Aug 8 weigh-in meeting 0.2 kg target | Duplicate of #681 — closed 2026-08-10 in favor of #681. |
| [#681](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/681) | ✅ Done | Past Targets shows Aug 4–9 goal as not reached though weight on Aug 8 met the 0.2 kg target | Bad baseline («от 58,75» vs Day 4 Aug 58,85), not sticky reach. `resolveBaselineWeightKg` prefers weekStart weigh-in over frozen prior-day snapshot; keep `finalTargetMet` for Past Targets. Confirmed working on-device 2026-08-10. |
| [#678](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/678) | ✅ Done | Past Targets should include the active goal once its window has concluded, even before a new goal is set | `pastGoals()` includes the most-recent goal once `goalWindowConcluded`. Confirmed working on-device 2026-08-10. |
| [#683](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/683) | ✅ Done | Do not restrict goal start date; warn on overlap with previous goal | Starts on always editable; soft overlap warning added but not appearing on-device when start is before previous goal end — follow-up #685. Confirmed start-date freedom on-device 2026-08-10. |
| [#684](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/684) | ✅ Done | Food library: sort by title (A–Z / Z–A) and by date added | Settings → Dishes sort select (title A→Z/Z→A, date added newest↔oldest); preference in `useMealLibrarySortStore`. Confirmed working on-device 2026-08-10. |
| [#685](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/685) | ✅ Done | Follow-up from #683: goal start overlap warning missing; show in orange | Soft warning checks active+past goals; orange styling. Confirmed working on-device 2026-08-10. |
| [#686](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/686) | ✅ Done | Regression: Start a new goal stays enabled while current goal window is still in progress | Restored mid-window disable (#639/#667); regression from #683. Confirmed working on-device 2026-08-10. |
| [#676](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/676) | ✅ Done | Goal card: baseline weight shifts when the start-day weight is logged after the goal is set | Snapshot-first `resolveBaselineWeightKg` restored after #681 regression; HARD LOCK + CLAUDE.md. Confirmed working on-device 2026-08-10. |
| [#687](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/687) | ✅ Done | Android glance widget: richer today fields (kcal, steps, food) | Confirmed on-device 2026-08-10: remaining kcal, steps, food, day-note indicator. |
| [#688](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/688) | ✅ Done | Android glance widget: turtle mark and design-mood polish | Confirmed on-device 2026-08-10: turtle icon + Pond-mood colors. |

---

## Tier 132 — Regression / CI hardening + live UX (2026-08-11)

_iOS waits on a Mac; Android Play path waits on #316. Meanwhile: goal-lifecycle Vitest hard-lock pack, Playwright multi-screen goal flows, survey-doc housekeeping, live Day-screen UX. Health Connect reopen + refresh issues for this day closed as validated on-device 2026-08-11._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#689](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/689) | ✅ Done | Goal lifecycle hard-lock / regression pack | `goalLifecycleHardLock.test.tsx` + save-time baseline helper; validated 2026-08-11. |
| [#690](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/690) | ✅ Done | E2E: goal baseline + Past Targets multi-screen flows | `e2e/goal-flows.spec.ts`; validated 2026-08-11. |
| [#691](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/691) | ✅ Done | Day screen: «Add another meal» when day has no meals | Conditional empty-day vs with-meals copy; validated on-device 2026-08-11. |
| [#692](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/692) | ✅ Done | Day screen: Copy yesterday meals is oversized / rarely used | Settings opt-in default off; validated on-device 2026-08-11. |
| [#656](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/656) | ✅ Done | Android Health Connect: weight sync (foundation) | Confirmed on-device 2026-08-11 with HC-native sources (weight sync). |
| [#657](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/657) | ✅ Done | Android Health Connect: steps sync | Confirmed on-device 2026-08-11 (`syncRecentSteps`). |
| [#658](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/658) | ✅ Done | Android Health Connect: sleep sync | Confirmed on-device 2026-08-11 (`syncRecentSleep`). |
| [#693](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/693) | ✅ Done | Health Connect weight sync: allow refreshing when today's weight is already set | Confirmed on-device 2026-08-11 — Sync overwrites today's weight. |
| [#694](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/694) | ✅ Done | Health Connect weight sync: sync / refresh past days, not only today | Confirmed on-device 2026-08-11 — Sync pulls last 7 days. |
| [#695](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/695) | ✅ Done | Barcode scanner: manual input clipped at bottom when still-scanning message shows | Confirmed on Android 2026-08-11 — manual entry stays usable when still-scanning tip shows. |

---

## Tier 133 — Live feedback (2026-08-12)

_Live report: body-composition Overview chart is hard to read when all series are shown together; iOS splash turtle missing/too small on cold launch._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#696](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/696) | ✅ Done | Allow graph customization for body composition | Per-series line/bar/dots on body composition chart; confirmed on-device 2026-08-12. |
| [#697](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/697) | ✅ Done | iOS splash: turtle logo too small / looks missing; unassigned Splash assets | SplashLogo + Cap splash hold; confirmed on-device 2026-08-12 — centered turtle on white cold launch. |

---

## Tier 134 — Security + live feedback (2026-08-13)

_Logged while blocked on Apple Developer enrollment. Library CVEs via `npm audit` / Dependabot (#698–#701), then own-code hardening (#702–#704). Full tree had 27 findings; production-only had 5. Do **not** `npm audit fix --force`. Explicitly **not** filed: virus scanning of imports, DOMPurify on every text field, blocking images in meal-name inputs (plain text; no HTML-render sink today). Also live UI feedback from the same day (#707)._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#698](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/698) | ✅ Done | Upgrade react-router-dom past the RSC CSRF advisory | Confirmed on-device 2026-08-13 — navigation still works after 7.18.2. |
| [#699](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/699) | ✅ Done | Patch brace-expansion in the production lockfile | Confirmed on-device 2026-08-13 — Excel export still works after audit fix. |
| [#700](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/700) | ✅ Done | Resolve exceljs uuid advisory without downgrading exceljs | Confirmed on-device 2026-08-13 — Excel export still works with uuid override. |
| [#701](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/701) | ✅ Done | Triage Capacitor CLI and other devDependency advisories | Confirmed on-device 2026-08-13 — prod audit clean; remaining dev advisories accepted as documented. |
| [#702](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/702) | ✅ Done | Enable GitHub CodeQL for our TypeScript | Confirmed on-device 2026-08-13 — CodeQL scans appear under Security → Code scanning. |
| [#703](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/703) | ✅ Done | Cap import file size before parsing JSON, zip, and Excel | Confirmed on-device 2026-08-13 — normal imports work; oversized files rejected. |
| [#704](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/704) | ✅ Done | Add a Content-Security-Policy without breaking the theme script | Confirmed on-device 2026-08-13 — cold load, theme, import/export, PWA update OK with CSP. |
| [#706](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/706) | ✅ Done | Fix CodeQL alerts in exportMarkdown and vite.cspPlugin | Confirmed on-device 2026-08-13 — CodeQL alerts cleared. |
| [#707](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/707) | ✅ Done | Show sleep vs-yesterday delta as hours and minutes, not decimal hours | Confirmed on-device 2026-08-13 — sleep deltas use h/m, not decimals. |
| [#708](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/708) | ✅ Done | Dashboard graphs must not silently disappear when empty | Confirmed on-device 2026-08-13 — empty cards stay visible. Follow-up: [#710](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/710) (day-pair calories↔weight). |
| [#709](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/709) | ✅ Done | Settings: list all Dashboard graphs with show/hide toggles | Confirmed on-device 2026-08-13 — Settings catalog toggles match Dashboard eye hide/show. |
| [#710](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/710) | ✅ Done | Calories vs weight: use previous-day calories (day-pair), not weekly averages | Confirmed on-device 2026-08-13 — day-pair card works. Follow-ups: [#711](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/711) (tooltip width/wrap), [#712](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/712) (tap misses tooltip). |
| [#711](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/711) | ✅ Done | Correlation tooltip: max-width and wrap long day notes | Confirmed on-device 2026-08-13 — wrap/max-width OK. |
| [#712](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/712) | ✅ Done | Correlation scatter: tap sometimes fails to open tooltip | Confirmed on-device 2026-08-13 — tap opens tooltip. Follow-up: [#713](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/713) (dismiss/close). |
| [#713](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/713) | ✅ Done | Correlation tooltip: dismiss after click (close control or tap-away) | Confirmed on-device 2026-08-13 — ✕ / tap-away dismiss works. |
| [#714](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/714) | ✅ Done | Late-meal correlation: post-midnight meal loses to earlier evening time | Confirmed on-device 2026-08-13 — 01:22 wins over 19:41 with day-start. |
| [#715](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/715) | ✅ Done | Add food: portion weight change must rescale kcal/macros; keep per-100g as source of truth | Confirmed on-device 2026-08-14 — portion weight rescales from per-100g; tabs stay clear. |

---

## Tier 135 — Sync a day's log to another copy (2026-08-14)

_Closed rows only._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#738](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/738) | ✅ Done | Hide day-sync behind a Settings toggle (off by default) | Store shipped. Copy rewritten to **day log**, not a meal. Confirmed on-device 2026-08-15 |
| [#722](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/722) | ✅ Done | Show day-snippet QR on the send sheet | Same URL as copy/share. Over QR budget → copy/share + explanation. Confirmed on-device 2026-08-17 |
| [#724](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/724) | ✅ Done | iOS: open day snippet from share sheet / URL | `turtlesteps://` + `appUrlOpen` → same confirm as #721. Confirmed on-device 2026-08-17 |
| [#721](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/721) | ✅ Done | Receive day snippet (paste, deep link, not full backup) | Confirm shell; `?shareDay=` does not run Epic 8 backup import. Confirmed on-device 2026-08-17 |
| [#717](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/717) | ✅ Done | Epic: Sync a day's log to another copy (Day refresh + clipboard / share / QR) | Tracking. Children #738 + #718–#724 shipped. Confirmed on-device 2026-08-17 |
| [#718](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/718) | ✅ Done | Day-entry snippet envelope (encode/decode) | `kind: 'day'` + compact `DailyEntry` on `shareDay`. Confirmed on-device 2026-08-17 |
| [#719](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/719) | ✅ Done | Apply day snippet: confirm, fill blanks, ask before overwrite | Fill empty; confirm overwrite; append meals; never wipe the day. Confirmed on-device 2026-08-17 |
| [#720](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/720) | ✅ Done | Day screen: refresh control + what-to-send sheet | Toggle off → no icon. Whole day. Copy/share. Confirmed on-device 2026-08-17 |
| [#723](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/723) | ✅ Done | Scan day-snippet QR (reuse #661, photo fallback) | Send sheet Scan QR + photo. Food QR is not applied as a day. Confirmed on-device 2026-08-17 |

---

## Tier 136 — UI consistency (2026-08-14)

_Closed rows only._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#739](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/739) | ✅ Done | Add dish name: caret sometimes shifted from typed text (iOS) | Fullscreen dialog `transform-none`; dish field id/name not “name”; autocomplete off. Confirmed on-device 2026-08-15 |
| [#732](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/732) | ✅ Done | One size for 100g/Portion tabs | Recipe + inline add now h-10 like the dish sheet. Settings chips untouched. Confirmed on-device 2026-08-15 |
| [#737](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/737) | ✅ Done | Chart overlay readability (bar opacity, series colors, legend alignment) | Bars 40% fill. Overlay protein uses --stat-protein. Body-comp uses --stat-* / --chart-bodyfat. Confirmed on-device 2026-08-15 |
| [#725](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/725) | ✅ Done | Unify date inputs to 48px (h-12) | Dashboard/Export/delete-range/Goal week dates now h-12. Day WebKit exception (#647) kept. Confirmed on-device 2026-08-15 |
| [#726](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/726) | ✅ Done | Grow Goal and Day-totals number fields to 48px | NumberInput default is now h-12; Input default stays h-8. Confirmed on-device 2026-08-15 |
| [#727](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/727) | ✅ Done | Food picker Add must use the xl footer CTA | size xl + w-full (#474). Recipe Save+Cancel lg left alone. Confirmed on-device 2026-08-15 |
| [#728](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/728) | ✅ Done | Align Goal and Add-metric primary actions with the footer-CTA rule | Used documented lg Save + ghost Cancel (RecipeEditor). Confirmed on-device 2026-08-15 |
| [#729](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/729) | ✅ Done | Grow leftover 28px macro grids (food list, recipes, inline add) | Food-list / recipe / dishes inline macros now h-12 2-col like the dish sheet. Confirmed on-device 2026-08-15 |
| [#730](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/730) | ✅ Done | Unify Add meal name/time/note heights with the dish sheet | Name/time/note now h-12. Close stays size-9 (#513). Confirmed on-device 2026-08-15 |
| [#731](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/731) | ✅ Done | One field-label recipe (shared Label) | Visible field labels use Label (text-sm font-medium). Hints/units stay muted. Confirmed on-device 2026-08-15 |
| [#733](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/733) | ✅ Done | Match Settings food-list dividers to meal cards | divide-foreground/15 like meal dishes (#464). Confirmed on-device 2026-08-15 |
| [#734](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/734) | ✅ Done | Goal mismatch banner: named warning token, not raw amber | Same muted notice as aggressive-pace (`border-border bg-muted`). Confirmed on-device 2026-08-15 |
| [#735](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/735) | ✅ Done | Pick one section-shell chrome (Card vs border-lg) | Two named chromes: number card (Card/StatCard) vs section-shell utility. Confirmed on-device 2026-08-15 |
| [#736](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/736) | ✅ Done | Use shared Textarea, TextField, and Select instead of one-offs | Dish note → Textarea. Unused TextField removed. Native Select for meal-library sort + correlation pickers. Confirmed on-device 2026-08-15 |
| [#716](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/716) | ✅ Done | Audit UI consistency (button sizes, inputs, forms) | Investigation delivered. Tracking parent for #725–#737. Confirmed on-device 2026-08-17 |

---

## Tier 137 — Live feedback (2026-08-15)

_On-device: the Day header circular-arrows control (#720) reads as page refresh, not day-log share/send._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#740](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/740) | ✅ Done | Day screen: replace refresh icon (looks like page reload) | Share2 (same as food-share / send sheet), not RefreshCw. Confirmed on-device 2026-08-15 |

---

## Tier 138 — Live feedback (2026-08-16)

_On-device and Chrome localhost: opening the day-log send sheet blinks, then the app freezes._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#741](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/741) | ✅ Done | QR modal blinks when opened, then the app freezes | Send sheet snapshot + stable snippet `createdAt`. Confirmed on-device 2026-08-17 |

---

## Tier 139 — Live feedback (2026-08-17)

_Zepp screenshot OCR (#742), CSV/export completeness, Day delete/icon consistency, AutoSleep screenshot fill, Settings opt-out for reading from images, Body composition display layout, Sleep icon placement, and sleep export format._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#749](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/749) | ✅ Done | Separate Settings toggles for Zepp and AutoSleep screenshot fill | Confirmed on-device 2026-08-17 — per-source What-to-track toggles (default on). |
| [#747](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/747) | ✅ Done | #742 follow-up: Russian Zepp screenshot leaves muscle and bone empty | Confirmed on-device 2026-08-17 — RU goals screenshot fills muscle/bone; August not April. |
| [#742](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/742) | ✅ Done | Fill body composition from a Zepp Life screenshot | Confirmed on-device 2026-08-17 — pick screenshot → confirm five fields → save. Zip import unchanged. |
| [#745](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/745) | ✅ Done | Add trash to delete sleep and body composition, with the same confirm as weight | Confirmed on-device 2026-08-17 — Trash + inline Yes/No on Sleep, Body composition, and Body measurements. |
| [#752](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/752) | ✅ Done | Sleep display: move action icons to the title row (match Body composition) | Confirmed on-device 2026-08-19 — ImageUp / Pencil / Trash on the `Сон` header row; duration card is text only. |
| [#751](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/751) | ✅ Done | Export sleep as hours and minutes, not decimal hours | Confirmed on-device 2026-08-19 — CSV/Excel/Markdown and AutoSleep confirm use h+m; JSON backup stays numeric. |
| [#750](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/750) | ✅ Done | Body composition display: move icons to the title row so the five readings fit | Confirmed on-device 2026-08-19 — screenshot / pencil / trash on the title row; #515 grid full width below. |
| [#748](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/748) | ✅ Done | Fill sleep and deep sleep from an AutoSleep screenshot | Confirmed on-device 2026-08-19 — ImageUp on Sleep; Today 10h 33m + deep 3h 26m; wake date Monday of SUNDAY 16 → MONDAY 17. |
| [#746](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/746) | ✅ Done | Day edit/delete icons: same order, gap, and sizing on weight and meals | Confirmed on-device 2026-08-19 — Pencil then Trash, `gap-3` on both pairs; morning `icon-xl`, meals `icon-sm`. |
| [#744](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/744) | ✅ Done | CSV, Excel, and Markdown exports should include only currently tracked fields | Confirmed on-device 2026-08-19 — unused What-to-track columns omitted; JSON backup stays complete. Follow-up [#754](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/754): meal time still missing in export. |
| [#743](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/743) | ✅ Done | CSV export is missing meals, foods, times, and other logged fields | Confirmed on-device 2026-08-19 — Daily Log + Meals table in CSV/Markdown. Meal time leftover is [#754](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/754). |

---

## Tier 140 — Live feedback (2026-08-18)

_On-device: Morning entries. Empty or 0 sleep/body composition Save should show Invalid value like Weight._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#753](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/753) | ✅ Done | Reject zero sleep and body composition (Invalid value like Weight) | Confirmed on-device 2026-08-19 — empty Save and typed 0 show «Неверное значение» like Weight; partial fill still allowed. |

---

## Tier 141 — Live feedback (2026-08-19)

_On-device after #744: foods are in the export; meal time is not._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#754](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/754) | ✅ Done | Export includes foods but not meal time | Confirmed on-device 2026-08-19 — CSV/Excel/Markdown Time matches Day (`effectiveTimeEaten`). JSON backup unchanged. |

---

## Tier 142 — Live feedback (2026-08-20)

_On-device: Day screen meal list order, and fasting window with an early day-start._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#755](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/755) | ✅ Done | Day screen lists 11:00 meal above 08:27 on the same day | Confirmed on-device 2026-08-21 — 08:27 lists before 11:00. Same 06:00 wrap cap as #756. |
| [#756](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/756) | ✅ Done | Early day-start: fasting window shows 33h instead of ~10h | Confirmed on-device 2026-08-21 — 22:54 → 08:27 is ~9.6h. `adjustForDayStart` wrap capped at 06:00. |

---

## Tier 143 — Live feedback (2026-08-24)

_On-device: English Zepp Life goals screenshot could not be read; AutoSleep History screenshots are not parsed yet._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#757](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/757) | ✅ Done | #742 follow-up: English Zepp goals screenshot with Bone mass first is not read | Confirmed on-device 2026-08-24 — Bone mass first / attention header fills the five body-composition fields. |
| [#758](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/758) | ✅ Done | Fill sleep from an AutoSleep History screenshot (not only Today) | Confirmed on-device 2026-08-24 — Asleep 5:10 / Deep 1:48. Scan took ~3 min (follow-up). |
| [#760](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/760) | ✅ Done | App is blank when there is no internet | Confirmed on-device 2026-08-24 — app opens offline after a prior online visit. |
| [#761](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/761) | ✅ Done | AutoSleep History screenshot fill takes about 3 minutes | Confirmed on-device 2026-08-25 — one OCR pass; scan is much quicker. |

---

## Tier 144 — Live feedback (2026-08-27)

_AutoSleep Today screenshot fill: total sleep OK, deep sleep wrong._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#762](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/762) | ✅ Done | Incorrectly reads deep sleep from AutoSleep Today screenshot | Confirmed on-device 2026-08-27 — deep sleep fills correctly (e.g. 3h 10m). |

---

## Tier 145 — Morning notes & eating reason (2026-08-28)

_Evening already has a day's note; add a matching morning note, opt-in and off by default. Same-day ask: optional per-meal "why am I eating" behind a toggle, then user-defined extra reasons._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#763](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/763) | ✅ Done | Add morning notes (opt-in, off by default) | Confirmed on-device 2026-08-28 — Settings → What to track → Morning; Day after Body composition. |
| [#764](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/764) | ✅ Done | Mark why you are eating (opt-in, off by default) | Confirmed on-device 2026-08-28 — Settings toggle, Add meal dropdown, Day card. |
| [#765](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/765) | ✅ Done | Custom eating reasons (Settings list → dropdown) | Confirmed on-device 2026-08-28 — custom labels in Settings appear in the Add-meal dropdown. |
| [#766](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/766) | ✅ Done | Settings: show built-in eating reasons and allow editing them | Confirmed on-device 2026-08-28 — built-ins in Your reasons (pencil only); display-label override, meals still store ids. |
| [#767](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/767) | ✅ Done | Settings: no way to edit a custom eating reason | Confirmed on-device 2026-08-28 — rename in place; matching logged meals update to the new label. |
| [#768](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/768) | ✅ Done | Settings: show a save icon while editing an eating reason | Confirmed on-device 2026-08-28 — Check while editing; tap commits and returns the row to view mode. |
| [#769](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/769) | ✅ Done | Add HALT eating reasons (Hungry, Angry, Lonely, Tired) | Confirmed on-device 2026-08-28 — Hungry is existing Hunger; added Angry, Lonely, Tired. |
| [#770](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/770) | ✅ Done | Settings: put Why am I eating and Your reasons in one block | Confirmed on-device 2026-08-29 — toggle + reasons in one block; list scrolls. |

---

## Tier 146 — Live feedback (2026-08-29)

_AutoSleep Today deep sleep (z-icon vs star), Zepp goals screenshot body composition, Why-am-I-eating multi-select, and meal-edit Done button clipping._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#771](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/771) | ✅ Done | AutoSleep Today screenshot fill: deep sleep 7h 10m instead of 45 minutes (z icon) | Confirmed on-device 2026-08-29 — Today screenshot fills the short z-icon deep-sleep time, not the star/quality hours. |
| [#772](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/772) | ✅ Done | AutoSleep Sleep Rating: use z-icon duration as deep sleep, not star/quality | Confirmed on-device 2026-08-29 — Sleep Rating uses the z-icon duration as deep sleep, not the star/quality hours. |
| [#773](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/773) | ✅ Done | Zepp goals screenshot: muscle mass filled with BMI, not Мышцы (order changes by goal status) | Confirmed on-device 2026-08-29 — muscle from Мышцы (not BMI), visceral fat 14. |
| [#774](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/774) | ✅ Done | Allow multi-select for Why am I eating? | Confirmed on-device 2026-08-29 — several reasons can stay selected on one meal. |
| [#775](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/775) | ✅ Done | Meal editing Done button is clipped until you scroll | Confirmed on-device 2026-08-29 — Done stays fully visible without scrolling. |

---

## Tier 147 — Live feedback (2026-08-30)

_Day page weekly-goal completed modal; barcode scanner focus; complete-week celebration re-offer; manual barcode on saved foods._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#776](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/776) | ✅ Done | Day: weekly-goal completed modal shows on Sunday before weight is logged | Closed 2026-08-30 without end-of-week on-device check (this week's complete modal was already dismissed before Sunday's weigh-in). Will reopen if it still appears before last-day weight next Sunday. |
| [#777](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/777) | ✅ Done | Barcode scanner stays unfocused too long — improve or switch library | Confirmed on-device 2026-08-30 — sharper rear-camera scan and periodic refocus (library not swapped). |
