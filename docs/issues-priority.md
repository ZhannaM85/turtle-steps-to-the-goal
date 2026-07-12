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
| [#6](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/6) | ⬜ Open | Epic 5 — Dashboard charts | Weight trend + calorie trend + weekly summary cards, consuming `--chart-weight`/`--chart-calories` from #17. The brief's "goal line overlay" no longer applies as designed — #14 removed the long-term target it depended on (`projectedTrajectory` was deleted); needs a fresh, pace-based design. Also: a factual "target met" note in the weekly summary card (quiet celebration, no badges — see issue comment) |
| [#7](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/7) | ⬜ Open | Epic 6 — Correlation & pattern insights | Builds on #6's chart infrastructure |
| [#8](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/8) | ⬜ Open | Epic 7 — History | Table view + inline edit/delete of all entries. Also: a "Met target" filter/section — a plain record of weeks the target was hit, no badges (see issue comment) |

---

## Tier 7 — Quality pass
_Final sweep, but apply accessibility incrementally as each feature is built — don't defer it all here._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#11](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/11) | ⬜ Open | Epic 10 — Accessibility & responsive QA pass | Keyboard nav, WCAG AA contrast audit, responsive check |
