# Issues Priority List

Issues grouped by implementation tier. Work top-to-bottom within each tier; dependencies are noted where order matters within a tier. Ordering follows the sequencing in `PROJECT_BRIEF.md` §11, with one deliberate deviation: data safety (export/import) and a real deployment check are pulled up right after the first vertical slice, because IndexedDB is the only copy of the user's data and it's worth verifying the deployed build actually persists it before layering on more features — the same reasoning `life-kaleidoscope` used to pull its own backup issue forward.

---

## Tier 1 — Architecture foundation (Phase 1)
_Scaffolding, domain model, and persistence. Everything downstream depends on this. Ends with the Phase 1 architecture checkpoint._

| # | Issue | Notes |
|---|-------|-------|
| [#1](https://github.com/ZhannaM85/small-steps/issues/1) | Epic 0 — Project scaffolding & tooling | |
| [#2](https://github.com/ZhannaM85/small-steps/issues/2) | Epic 1 — Domain model & persistence layer | Depends on #1. Pause here for the Phase 1 checkpoint per `PROJECT_BRIEF.md` §11 |

---

## Tier 2 — Design system & app shell
_Shared primitives and routing skeleton before any real feature screen._

| # | Issue | Notes |
|---|-------|-------|
| [#3](https://github.com/ZhannaM85/small-steps/issues/3) | Epic 2 — Design system & shared UI | Depends on Tier 1 |

---

## Tier 3 — First vertical slice
_Set a goal → log a day against it → real data exists. Goal setup alone produces nothing to look at; the slice isn't complete until a day can actually be logged._

| # | Issue | Notes |
|---|-------|-------|
| [#4](https://github.com/ZhannaM85/small-steps/issues/4) | Epic 3 — Goal setup | Depends on Tier 2 |
| [#5](https://github.com/ZhannaM85/small-steps/issues/5) | Epic 4 — Daily log entry | Depends on #4; this is the app's core daily-use loop |

---

## Tier 4 — Data safety & deployment (pulled forward)
_Once real daily entries exist (Tier 3), local-only IndexedDB is the only copy of that data — backup shouldn't wait until the end of the queue. Verifying the real deployed build persists data correctly is also worth doing early rather than discovering problems at the very end._

| # | Issue | Notes |
|---|-------|-------|
| [#9](https://github.com/ZhannaM85/small-steps/issues/9) | Epic 8 — Export / Import | JSON export/import — the only backup mechanism since storage is local-only |
| [#10](https://github.com/ZhannaM85/small-steps/issues/10) | Epic 9 — Deployment | GitHub Pages workflow; verify persistence survives a real deploy + reload |

---

## Tier 5 — Core features
_Any order from here, but keep each epic its own reviewable unit of work._

| # | Issue | Notes |
|---|-------|-------|
| [#6](https://github.com/ZhannaM85/small-steps/issues/6) | Epic 5 — Dashboard charts | Weight trend + goal line, calorie trend, weekly summary cards |
| [#7](https://github.com/ZhannaM85/small-steps/issues/7) | Epic 6 — Correlation & pattern insights | Builds on #6's chart infrastructure |
| [#8](https://github.com/ZhannaM85/small-steps/issues/8) | Epic 7 — History | Table view + inline edit/delete of all entries |

---

## Tier 6 — Quality pass
_Final sweep, but apply accessibility incrementally as each feature is built — don't defer it all here._

| # | Issue | Notes |
|---|-------|-------|
| [#11](https://github.com/ZhannaM85/small-steps/issues/11) | Epic 10 — Accessibility & responsive QA pass | Keyboard nav, WCAG AA contrast audit, responsive check |
