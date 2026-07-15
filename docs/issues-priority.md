# Issues Priority List

Issues grouped by implementation tier. Work top-to-bottom within each tier; dependencies are noted where order matters within a tier. Ordering follows the sequencing in `PROJECT_BRIEF.md` §11, with one deliberate deviation: data safety (export/import) and a real deployment check are pulled up right after the first vertical slice, because IndexedDB is the only copy of the user's data and it's worth verifying the deployed build actually persists it before layering on more features — the same reasoning `life-kaleidoscope` used to pull its own backup issue forward.

---

## Tier 1 — Architecture foundation (Phase 1)
_Scaffolding, domain model, and persistence. Everything downstream depends on this. Ends with the Phase 1 architecture checkpoint._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#1](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1) | ✅ Done | Epic 0 — Project scaffolding & tooling | |
| [#2](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/2) | ✅ Done | Epic 1 — Domain model & persistence layer | Depends on #1. Pause here for the Phase 1 checkpoint per `PROJECT_BRIEF.md` §11 |

---

## Tier 2 — Design system & app shell
_Shared primitives and routing skeleton before any real feature screen._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#3](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/3) | ✅ Done | Epic 2 — Design system & shared UI | Depends on Tier 1 |

---

## Tier 3 — First vertical slice
_Set a goal → log a day against it → real data exists. Goal setup alone produces nothing to look at; the slice isn't complete until a day can actually be logged._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#4](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/4) | ✅ Done | Epic 3 — Goal setup | Depends on Tier 2 |
| [#5](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/5) | ✅ Done | Epic 4 — Daily log entry | Depends on #4; this is the app's core daily-use loop |

---

## Tier 4 — Data safety & deployment (pulled forward)
_Once real daily entries exist (Tier 3), local-only IndexedDB is the only copy of that data — backup shouldn't wait until the end of the queue. Verifying the real deployed build persists data correctly is also worth doing early rather than discovering problems at the very end._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#9](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/9) | ✅ Done | Epic 8 — Export / Import | JSON export/import — the only backup mechanism since storage is local-only |
| [#10](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/10) | ✅ Done | Epic 9 — Deployment | GitHub Pages workflow; verify persistence survives a real deploy + reload |

---

## Tier 5 — UX & product-model rework (pulled forward)
_Live feedback on the deployed build surfaced a real bug and two direction changes that touch the shell and the goal model every later screen builds on. Resolving these before more feature screens land avoids building #6/#7/#8 against a shell and domain model that are about to change. Order matters within this tier: fix the input bug and redesign the shell first (self-contained), then decide the goal model (#14) before it blocks #6, then wire i18n through last so new copy doesn't need retranslating._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#12](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/12) | ✅ Done | Bug — decimal weight values can't be entered on mobile | Self-contained; blocks basic daily use on mobile |
| [#13](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/13) | ✅ Done | Redesign app shell — mobile-first bottom tab nav | Adopts the `life-kaleidoscope` shell pattern; should land before #6/#8 |
| [#14](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/14) | ✅ Done | Rework goal model — remove "big goal" framing, weekly-only goals | Decision: long-term target removed entirely, not just demoted. `Goal` is now weekly-pace-only |
| [#15](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/15) | ✅ Done | Add localization — English and Russian | `src/i18n/` (Dictionary + en/ru + useLocaleStore), wired through every screen and nav; switcher on /settings |
| [#16](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/16) | ✅ Done | Info tooltip on Calories field — day-lag with weight | New `InfoTooltip` shared primitive (tap-triggered Popover) + `tooltip?` prop on `NumberInput` |
| [#17](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/17) | ✅ Done | Appearance settings — mood (5: Pond/Dusk/Sage/Tortoise/Lagoon) + light/dark toggle | Final token map per `docs/design/color-palette-refinement.html`; new `--chart-weight`/`--chart-calories`/`--sand-foreground` tokens ready for #6 |

---

## Tier 6 — Core features
_Any order from here, but keep each epic its own reviewable unit of work._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#6](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/6) | ✅ Done | Epic 5 — Dashboard charts | Weight trend (+ new `projectedPaceTrajectory` overlay) + calorie trend + weekly summary cards, all on `--chart-weight`/`--chart-calories`. Quiet "target met" note included, no badges |
| [#7](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/7) | ✅ Done | Epic 6 — Correlation & pattern insights | Scatter + plain-language summary (`correlationInsight`), arithmetic-only, honors the day-lag note |
| [#8](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/8) | ✅ Done | Epic 7 — History | Sortable table with inline edit (reuses `DailyEntryForm`) + two-step delete confirm. `MetTargetList` plain record included, no badges |
| [#18](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/18) | ✅ Done | Show which week — date range + week number | `currentWeekInfo()` anchors Week 1 to the first logged entry; new `shared/hooks/useCurrentWeekInfo` |
| [#19](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/19) | ✅ Done | Quick-add control next to Calories | Small "+ kcal" input + Add button next to the Calories field, no domain model change |

---

## Tier 7 — Quality pass
_Final sweep, but apply accessibility incrementally as each feature is built — don't defer it all here._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#11](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/11) | ✅ Done | Epic 10 — Accessibility & responsive QA pass | Found + fixed 3 real bugs: `--input` contrast (WCAG 1.4.11), mood-radio focus visibility (2.4.7), History mobile overflow + Dashboard chart entrance-animation bug |

---

## Tier 8 — Post-launch polish (live-feedback fixes)
_The original brief's epics are all done; this tier is for issues raised from actually using the deployed app. Small, self-contained, same pattern as #12/#16/#18/#19._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#20](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/20) | ✅ Done | Simplify Calories field — remove total input, keep only Add | Read-only StatCard-style total driven by quick-add; "Undo last add" for corrections, no negative-number entry |
| [#21](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/21) | ✅ Done | Read-only display + pencil-to-edit for Weight/Note; itemized calorie entries | `caloriesConsumed` → `calorieEntries[]` + `totalCalories()` helper; IndexedDB v1→v2 + export-bundle v2→v3 migrations; "Undo last add" removed, replaced by per-meal edit/delete |
| [#22](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/22) | ✅ Done | Replace default favicon with a turtle-steps-themed icon | Flat single-color turtle silhouette in the Pond primary teal; static, no per-mood variants |
| [#23](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/23) | ✅ Done | Add an About page — what this project is and who made it | Copy drafted by the assistant per the user's brief; dedicated Heart tab-bar entry in the slot #24 freed |
| [#24](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/24) | ✅ Done | Fold Export into the Settings screen, remove standalone Export tab | `ExportSection` renders inside Settings; `/export` redirects to `/settings`; tab bar back to 5 items, freeing the slot for #23 |
| [#25](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/25) | ✅ Done | Make the top header sticky instead of scrolling with content | `sticky top-0 z-10 bg-background`, matching the bottom tab bar's existing `fixed` treatment |
| [#28](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/28) | ✅ Done | Add per-meal notes and a happy/unhappy/neutral emotion tag to calorie entries | `CalorieEntry` gains `note?`/`emotion?`, entered directly in the Add flow; purely additive, no migration needed |
| [#29](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/29) | ✅ Done | Weekly summary: de-emphasize gain weeks instead of full bold treatment | Losses keep `text-4xl font-semibold`; gains and no-change weeks render `text-2xl font-normal text-muted-foreground` — nothing hidden |
| [#31](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/31) | ✅ Done | Remove the single Update/Log entry button — Weight, Note, and meals each save immediately | Supersedes #30. `onSubmit` renamed `onSave`, fires per action; stable entry id/createdAt reused across saves; `weightOrCaloriesRequired` validation dropped |
| [#32](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/32) | ✅ Done | Russian app name: change to «Черепашка идёт к цели» | Two occurrences updated (`nav.appName`, `about.intro`) |
| [#33](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/33) | ✅ Done | Russian nav label "О приложении" wraps to two lines — shorten to «О проекте» | `nav.about` shortened; About page's own `<h1>` title unaffected |
| [#34](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/34) | ✅ Done | Weekly summary: drop the plus sign on gain weeks, keep the minus sign on losses | Swapped `formatSignedNumber` → `formatNumber`; default Intl sign behavior does exactly this |
| [#35](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/35) | ✅ Done | About page: author credit doesn't link to GitHub | Wrapped in `<a>` to `https://github.com/ZhannaM85`, `target="_blank" rel="noopener noreferrer"` |
| [#36](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/36) | ✅ Done | Allow reordering meal entries via drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable`; grip handle per meal row, pointer + keyboard sensors, persists via existing `setCalorieEntries` path |
| [#37](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/37) | ✅ Done | Move the kg/lb unit toggle from the Goal page to Settings | Became a standalone `useUnitStore` (default kg), since `Goal` can be null; Settings gets a new "Units" section, `GoalForm`'s picker removed |
| [#38](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/38) | ✅ Done | Remind the user to set next week's goal at the end of the week | Quiet banner on Today, last day of the ISO week only, links to `/goal`; no dismiss state, no push infra needed |
| [#39](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/39) | ✅ Done | History: no read-only way to see a day's full details (meals, notes, emotions) | New collapsible read-only detail panel (chevron toggle), independent of edit/delete state; `EMOTIONS` icon map extracted to `shared/lib/emotionIcons.ts` |
| [#40](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/40) | ✅ Done | History: add search/filter by date | From/To date-range filter above the table; dedicated "No entries in this range" empty state |
| [#41](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/41) | ✅ Done | Dashboard charts: navigate to a specific day from the graph | Tap-to-navigate to `/history?date=...`; pre-fills #40's filter and auto-expands #39's detail panel for that day |
| [#42](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/42) | ✅ Done | Add a delta-vs-yesterday stat | New `usePreviousDayEntry` hook + StatCard on Today; same #29 asymmetric emphasis (bold loss, quiet gain, no plus sign) |
| [#43](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/43) | ✅ Done | Redesign the Settings screen — feels inconsistent with the rest of the app | New `ToggleGroup` primitive (radix-ui) replaces raw radios everywhere, incl. Mood (keeps swatch preview); sections wrapped in `Card`; `CardTitle` now a real `<h2>` |
| [#44](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/44) | ✅ Done | Add an overall mood-of-the-day, next to the daily note | New `DailyEntry.emotion?`, reuses existing `Emotion` type + `EmotionPicker`; bundled into the existing `saveNote()` action; added to export schema |
| [#45](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/45) | ✅ Done | Dashboard charts: tapping a point doesn't navigate on mobile | Root cause: Recharts' real click state has no `activePayload` field at all, so the resolver always returned null. Fixed to match `activeLabel` against the chart's own `data`; confirmed working via live feedback |
| [#49](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/49) | ✅ Done | Dashboard charts: tapping anywhere navigates instantly, chart unusable for just viewing | Custom `Tooltip` `content` with an in-tooltip link, container `onClick` dropped. Link initially didn't work: Recharts' tooltip wrapper is `pointer-events:none` by default — fixed via `wrapperStyle={{pointerEvents:'auto'}}`; confirmed on real device |
| [#46](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/46) | ✅ Done | Remove the weight projection/prognosis line from the dashboard chart | `goal` prop dropped from `WeightTrendChart`; `projectedPaceTrajectory` + test deleted outright, no other callers |
| [#47](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/47) | ✅ Done | History: From/To date filter inputs overlap on mobile | Third attempt: side-by-side with an explicit fixed `w-36` per input (not relative/shrink-based sizing) — confirmed on real device |
| [#48](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/48) | ✅ Done | History: add a calendar view alongside the current list view | List/Calendar `ToggleGroup` (#43); month grid with entry markers, tap a day for a read-only detail panel via new shared `DayDetail` (extracted from #39's EntryRow, reused by both); "Edit this day" reuses #40's From/To filter to jump to List pre-expanded. Also fixed a gap found in extraction: day mood (#44) wasn't shown in the read-only detail view at all |

---

## Tier 9 — Second live-feedback wave (2026-07-15)

_Same pattern as Tier 8: issues filed from continued live use. Ordered smaller-to-larger; #52/#53 depend on #51 landing first._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#56](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/56) | ✅ Done | Show the weekly target as a negative number (-0.5 kg), not unsigned | Negated the value passed to `formatNumber` in both `TodayScreen.tsx` and `GoalScreen.tsx`'s "This week's target" `StatCard`; `Goal.targetWeeklyLossKg` and the `GoalForm` input stay a positive magnitude, display-only change |
| [#57](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/57) | ✅ Done | Weight display rounds to 1 decimal instead of showing full entered precision | New `formatExactNumber()` (`minimumFractionDigits: 0, maximumFractionDigits: 2`) in `i18n/formatNumber.ts`, applied to all 4 directly-entered/subtracted weight displays: `DailyEntryForm`'s read-only weight, `TodayScreen`'s vs-yesterday delta, `EntryRow`, `DayDetail`. Computed averages (weekly summaries, chart axes) untouched, still fixed 1-decimal |
| [#58](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/58) | ✅ Done | Add a README with a couple of screenshots | `README.md` at repo root; two real screenshots (`docs/screenshots/today.png`, `dashboard.png`) captured from the running app via seeded IndexedDB + `playwright screenshot --load-storage` |
| [#50](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/50) | ✅ Done | Reusable meal items — autocomplete meal names + editable library in Settings | New `domain/mealItem` + `IndexedDbMealItemRepository` (IndexedDB v2→v3, new `mealItems: 'id, &name'` table, no upgrade needed) + `useMealItemStore`. No foreign key from `CalorieEntry.note` — a `<datalist>` on both meal-note inputs suggests library names; adding/editing a meal with a note upserts it into the library by name (`touch`). Renaming a library item in Settings only affects future suggestions, never past entries; renaming onto an existing name merges into it |
| [#54](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/54) | ✅ Done | Meal emotions: replace happy/unhappy/neutral with thumbs-up/thumbs-down/bellissimo | Split `Emotion` (day, unchanged) from new `MealEmotion` (`thumbsUp`/`thumbsDown`/`bellissimo`); `EmotionPicker` generified over both sets. `bellissimo` renders as the 🤌 emoji (no lucide equivalent), not an icon. IndexedDB v3→v4 + export-bundle v3→v4 migrations clear old-format meal emotions outright (no auto-mapping), day emotion untouched |
| [#51](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/51) | ✅ Done | Add protein/fat/carbs per meal — capture fields + Today's per-day totals | Part 1 of 3. `CalorieEntry` gains optional `proteinG`/`fatG`/`carbsG` — purely additive, no IndexedDB or export-schema version bump needed. New `totalProtein`/`totalFat`/`totalCarbs` helpers (undefined, not 0, when nothing logged). Labeled kcal/protein/fat/carbs input row in both add and edit flows; per-meal and per-day macro summary lines, omitted (not "0g") when nothing logged that macro. Found and fixed a real pre-existing test-fragility bug along the way: `<datalist>` `<option>` text content could collide with real page text once a saved note became a library suggestion (#50) |
| [#52](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/52) | ✅ Done | Show protein/fat/carbs per-day totals in History | Part 2 of 3. New shared `macroDisplay.ts` (`formatMacroGrams`/`macrosSummaryText`, extracted from #51's `DailyEntryForm.tsx` for reuse) — day total shown under Calories in `EntryRow`'s table cell, plus per-meal and standalone-header day totals in `DayDetail` (calendar view). Confirmed working on real seeded data in-browser |
| [#53](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/53) | ✅ Done | Dashboard: protein/fat/carbs trend charts + weekly summary rows | Part 3 of 3. One combined `MacroTrendChart` (3 lines) rather than 3 separate charts — same unit (grams), comparable scale, keeps Dashboard from growing 3 more full-width charts. New `--chart-protein`/`--chart-fat`/`--chart-carbs` CSS tokens (constant across all 5 moods, light+dark variants, same pattern as `--chart-calories`) — confirmed legible in both light and dark via real screenshots. `weeklySummaries()` gained `averageProteinG`/`averageFatG`/`averageCarbsG`, shown in `WeeklySummaryCards`' description line |
| [#55](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/55) | ✅ Done | Celebrate reaching the weekly weight-loss target with a modal + "set new goal" CTA | New `shared/ui/dialog.tsx` (Radix Dialog wrapper, first modal primitive in the app). `useWeeklyGoalCelebration` hook fires as soon as the running `targetMet` crosses true, mid-week; re-fetches on every Today save so it's responsive within the same visit. New `goalCelebrationStore` persists only the most-recently-celebrated week's start — once celebrated, stays celebrated for that week even if the average dips back below target later (no flip-flopping). Fires independently of #38's end-of-week banner, confirmed via real screenshot |
| [#59](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/59) | ✅ Done | Add sleep tracking — duration + deep sleep | Capture + Today only; History/Dashboard display deferred. `DailyEntry` gains optional `sleepHours`/`deepSleepHours` — purely additive, no schema version bump. New "Sleep" section (after Weight, before Calories) follows the same read-only-with-pencil-to-edit pattern as Weight, both fields independently optional with a combined "Xh slept · Yh deep" summary (`—` per field not logged) |
| [#60](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/60) | ✅ Done | Add step count tracking | Capture + Today only; History/Dashboard display deferred. `DailyEntry.steps?` — purely additive, no schema version bump. New "Steps" section (after Sleep, before Calories), same read-only-with-pencil-to-edit pattern as Weight |
| [#61](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/61) | ✅ Done | Add an opt-in menstrual cycle tracker | Settings toggle (`cycleTrackingStore`, off by default, no gender field). `DailyEntry.onPeriod?: boolean` — purely additive, no schema version bump. Single immediate-save toggle button on Today (after Steps, before Calories), only rendered when the Settings toggle is on — same immediate-save pattern as meal emotion pickers, no separate edit/save step. Logging only, no phase/prediction computation |
| [#65](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/65) | ✅ Done | Add a time-eaten field to meals, for intermittent fasting tracking | `CalorieEntry.timeEaten?: string` (`HH:MM`, purely additive, no schema bump). Native `<input type="time">` in both add and edit flows; defaults to current time only in the add flow (`currentTimeHHMM()`), re-defaults after each add. Editing an existing meal reflects its actual saved value, no forced default. Reordering meals does NOT clear time (decided against the original "reset on reorder" proposal — data-loss risk); confirmed via a dedicated drag-reorder test. Shown next to the meal ("Meal 1 — 420 kcal · 07:30") in both `DailyEntryForm` and `DayDetail`. No fasting-window calculation, capture only |
| [#64](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/64) | ✅ Done | Meal emotion icons look inconsistent — 2 monochrome lucide icons + 1 color emoji | `MEAL_EMOTIONS` (`emotionIcons.ts`) switched thumbsUp/thumbsDown from lucide `ThumbsUp`/`ThumbsDown` to 👍/👎 emoji, matching bellissimo's existing 🤌. `DAY_EMOTIONS` (happy/unhappy/neutral) untouched, still real lucide icons |
| [#63](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/63) | ✅ Done | Add a release notes section to Settings, updated per issue closure | New `src/data/releaseNotes.ts` (`{issue, date, en, ru}`, most-recent-first), backfilled for all 52 issues closed before this one; expandable `ReleaseNotesSection` in Settings (chevron toggle, same pattern as History's row expand). CLAUDE.md's issue-close rule now has a 3rd required step |
| [#62](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/62) | 🔲 Not started | Add a local food/nutrient database with quantity-based entry | **#51 dependency now done.** Large: dataset sourcing (en+ru) is the real cost, plus a new quantity-based entry flow alongside manual entry. Added design note: recommend flat `CalorieEntry`-per-food-item (reuses existing itemization, no new "meal group" data model) over introducing a grouping layer, per comment thread |
| [#66](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/66) | 🔲 Not started | Move release notes from Settings to the About page | Move `ReleaseNotesSection`, same data/behavior, no v1 scope change |
| [#67](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/67) | ✅ Done | History table: macro summary overflow pushes expand/edit/delete icons off screen | New `macrosSummaryTextCompact()` in `macroDisplay.ts` — single-initial form ("P 20g · F 10g · C —" / "Б 20г · Ж 10г · У —"), used only in `EntryRow.tsx`'s Calories cell. `DailyEntryForm.tsx`/`DayDetail.tsx` keep the full-word `macrosSummaryText()`, unaffected |
| [#68](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/68) | ✅ Done | Steps input too wide, allows unrealistic values above 20,000/day | Input narrowed from `flex-1` to a fixed `w-24` (Sleep's fields are `w-20`; Steps needs 5 digits so slightly wider). `stepsSchema` max lowered from 100,000 to 20,000 |
| [#69](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/69) | ✅ Done | Sleep entry should allow hours + minutes, not decimal hours only | Split "Hours slept"/"Deep sleep" into hours+minutes integer sub-fields each (4 inputs total, per user's explicit choice over a single-field or one-field-split option). Storage stays decimal (`sleepHours`/`deepSleepHours`, unchanged) — `splitHoursMinutes`/`combineHoursMinutes` convert only at the UI boundary. Read-only summary switched from "7.5h slept" to "7h 30m slept" to match. `deepSleepHoursLabel` renamed to `deepSleepLabel` ("Deep sleep (hours)" → "Deep sleep", now a group label for both sub-fields) |
