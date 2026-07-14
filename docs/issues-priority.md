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
| [#40](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/40) | ⬜ Open | History: add search/filter by date | Only sort exists today (`HistoryScreen.tsx`); decide single date vs. range vs. quick-filter during implementation |
| [#41](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/41) | ⬜ Open | Dashboard charts: navigate to a specific day from the graph | Recommend tap-point-to-navigate over a tooltip link (more reliable on touch); consider sequencing after #39/#40 for a deep-linkable target |
| [#42](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/42) | ⬜ Open | Add a delta-vs-yesterday stat | New day-over-day calculation, distinct from the weekly average-vs-average delta (confirmed that one stays as-is, not a bug) |
