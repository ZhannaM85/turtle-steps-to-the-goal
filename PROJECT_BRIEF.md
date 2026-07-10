# Turtle Steps to the Goal — Project Brief & Bootstrap Instructions for Claude Code

## How to use this document

Paste this entire file as your first message to Claude Code in an empty working
directory, or save it as `PROJECT_BRIEF.md` in a fresh folder and tell Claude
Code: "Read PROJECT_BRIEF.md and follow it." Claude Code should treat this as
its operating brief for the whole project, not just the first session.

## Configuration (edit before running)

- `REPO_NAME`: `turtle-steps-to-the-goal`
- `VISIBILITY`: `public`
- `GITHUB_OWNER`: *(leave blank to create under your authenticated `gh` account)*

---

## 0. Role & operating mode

You are acting as a Staff Software Engineer and Product Architect building a
real, maintainable, commercial-grade application — not a prototype or demo.

Work in two phases, and do not skip or compress them:

- **Phase 1 — Architecture & scaffolding.** Set up the repository, tooling,
  folder structure, domain model, persistence layer, design system shell, and
  routing skeleton. Nothing feature-specific yet. Stop after this phase and
  present a short summary before continuing.
- **Phase 2 — Implementation.** Build features incrementally, one GitHub
  issue at a time. Each issue should be its own coherent, reviewable unit of
  work — prefer several small commits over one giant one.

Never generate the entire application in a single pass. After each epic
(see §10), pause, summarize what was built, confirm `npm run dev` and
`npm test` both still pass, and only then continue.

---

## 1. Product vision

**Turtle Steps to the Goal** is a private, personal weight-tracking companion built around
small, achievable weekly goals rather than one distant number. Each week the
user sets (or keeps) a target like "lose 1kg this week." Every day they log
two numbers they already know — their current weight, and their total
calories consumed (typed in from whatever calorie-tracking app or method they
already use) — and the app turns that into trends, weekly progress, and
correlations ("did lower-calorie weeks actually track with more loss?").

**This app does not replace a calorie-tracking app.** It has no food database, no
barcode scanner, no macro breakdown. It accepts one number a day and focuses
entirely on goal-setting, trend visualization, and pattern-finding on top of
that number plus daily weight.

**Primary audience:** a single private user. There is no multi-user concept,
no accounts beyond a local profile, and nothing here is designed to be shown
to or compared against other people.

The experience should feel calm and legible: big, readable numbers for
today's weight/calories, clear charts, no gamified pressure, no guilt copy
for a missed day.

---

## 2. Hard constraints — do not violate these

- **No AI features of any kind.** No LLM calls, no "AI coach," no AI-generated
  insights or summaries. All trends/correlations/projections are computed
  with plain deterministic arithmetic and statistics, client-side, for free.
- **No social features.** No accounts for other people, no sharing, no
  leaderboards, no way for anyone else to see this user's data.
- **No food database / calorie counting engine.** Calories are a single
  manually-typed daily total. Do not build food search, barcode scanning, or
  a nutrition database — that is explicitly out of scope.
- **No live third-party sync in v1.** Popular calorie-tracking apps don't
  expose a public API for this; do not attempt scraping or unofficial API
  access against any such service. Native mobile health-data integrations
  require APIs a browser app cannot reach — do not attempt those either.
  All entry is manual. Leave the
  repository-interface pattern below open for a future `ImportRepository`
  (e.g. CSV/JSON file import) but do not build that feature now.
- **Privacy-first, local-only persistence.** IndexedDB via Dexie.js only. No
  analytics SDKs, no third-party trackers, no telemetry.
- **Weekly "small step" framing.** The UI should always foreground *this
  week's* target and progress ahead of the far-off end goal. The end goal
  exists to derive the weekly pace, not to dominate the UI.
- **Neutral, non-judgmental tone.** A missed day or a missed weekly target is
  shown factually (e.g. "0.3kg from this week's target"), never with
  shaming copy, red failure states, or streak-breaking guilt messaging.
- **No medical claims.** Any deficit/pace calculations (e.g. the ~7700
  kcal-per-kg-of-fat approximation) must be labeled as a rough estimate, not
  medical or nutritional advice.

---

## 3. Tech stack

**Frontend**
- React 19, TypeScript (`strict: true`)
- Vite
- React Router
- Zustand
- React Hook Form + Zod (validation)
- Tailwind CSS
- shadcn/ui
- Recharts — weight trend, calorie trend, and correlation scatter charts
- date-fns — week-boundary and rolling-average date math

**Testing**
- Vitest + React Testing Library, especially for the pure stats/domain logic

**Persistence**
- IndexedDB via Dexie.js, accessed only through repository interfaces defined
  in the domain layer (see §4–5). No feature or UI code should ever import
  Dexie directly.

**Deployment**
- GitHub Pages via GitHub Actions (`.github/workflows/deploy-pages.yml`),
  same pattern as the `ascend-angular-app` project: build on push to `main`,
  deploy the static build, `index.html` copied to `404.html` for SPA routing.

**Future mobile (do not build now, but do not architect against it either)**
- A later React Native (Expo) port is plausible, matching the
  `ascend-mobile-app` project's stack. Keep `domain/` free of any
  React-DOM-specific or browser-only imports so its pure logic could be
  reused from a React Native shell later.

---

## 4. Domain model

```ts
interface Goal {
  id: string;
  startDate: string;          // ISO date
  startWeightKg: number;
  targetWeightKg: number;
  targetWeeklyLossKg: number; // e.g. 1 — drives the weekly "small step"
  targetDate?: string;        // optional; if absent, derive from pace
  displayUnit: 'kg' | 'lb';   // stored canonically in kg regardless
  createdAt: string;
  updatedAt: string;
}

interface DailyEntry {
  id: string;
  date: string;                // ISO date, one entry per date
  weightKg?: number;
  caloriesConsumed?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}
```

Repository interfaces (domain layer):
- `GoalRepository`: `getActiveGoal()`, `saveGoal(goal)`
- `DailyEntryRepository`: `getByDate(date)`, `getRange(start, end)`,
  `upsert(entry)`, `delete(id)`, `getAll()`

Pure, unit-tested domain/stats functions (no storage, no React):
- `weeklySummaries(entries, goal)` — groups entries into ISO weeks; computes
  average weight, delta vs. prior week, average calories, and whether that
  week's target was met
- `rollingAverage(entries, field, windowDays)`
- `correlation(entries)` — Pearson correlation coefficient between
  calories and weight change, for the "did this pattern actually work"
  view
- `projectedTrajectory(goal)` — straight-line path from start
  weight/date to target weight/date, for overlay on the weight chart

---

## 5. Folder structure (feature-based, Clean Architecture layering)

```
src/
  app/                  # routing, app shell, providers
  domain/
    goal/
    dailyEntry/
    stats/              # correlation, rolling average, weekly summary —
                         # pure TS, zero React/Zustand/Dexie imports
  infrastructure/
    persistence/
      indexeddb/         # Dexie schema + repository IMPLEMENTATIONS.
                          # Nothing outside this folder imports Dexie.
  features/
    goal-setup/
    daily-log/
    dashboard/
    history/
    export/
  shared/
    ui/                  # shadcn-based design-system primitives
    hooks/
    lib/
  stores/                 # Zustand slices, one per feature
test/
```

---

## 6. Routing

| Path | Screen |
|---|---|
| `/` | Today — quick entry for today's weight/calories, this week's target reminder |
| `/dashboard` | Weight trend + goal line, calorie trend, weekly summary cards, correlation view |
| `/history` | Table of all past entries — edit/delete |
| `/goal` | View/edit the active goal and weekly pace |
| `/export` | Export/import a JSON backup (critical since storage is local-only) |
| `/settings` | Units (kg/lb), misc preferences |

---

## 7. State management strategy

Zustand owns UI/session state only (today's draft entry, dashboard filters,
selected date range). It never owns persisted domain data directly — stores
read/write through the repository interfaces, never through Dexie directly,
so a future sync backend would mean one new repository implementation, not a
rewrite of stores or components.

---

## 8. Design system

Tailwind + shadcn/ui. Calm, legible, numbers-first — today's weight and
calorie totals should be the largest things on the Today screen. Charts
should be clean and uncluttered (Recharts defaults, restrained color use).
No gamified visual language (no badges, no confetti, no red failure states).

Build shared primitives before any feature screen: `Button`, `Card`,
`NumberInput`, `TextField`, `StatCard`, `EmptyState`, `PageHeader`.

Accessibility applied as you build: semantic HTML, visible focus states,
ARIA labels on icon-only controls, WCAG AA contrast, full keyboard nav.

---

## 9. Repository & GitHub setup

1. `git init`, add a `.gitignore` appropriate for a Vite + TypeScript project.
2. Scaffold the Vite + React + TS project, install the dependencies listed in
   §3, and configure Tailwind, shadcn/ui, ESLint, Prettier, and Vitest.
3. Using the GitHub CLI (`gh`), create the repository:
   - name: `REPO_NAME` from the Configuration section above
   - visibility: `VISIBILITY` from the Configuration section above
   - owner: `GITHUB_OWNER` if set, otherwise the authenticated account
   - push the initial scaffold as the first commit on `main`
4. Create labels: `epic`, `feature`, `chore`, `architecture`,
   `good-first-issue`.
5. Create one GitHub issue per epic in §10, each with the checklist provided.
6. Add `.github/workflows/deploy-pages.yml` (build + deploy to GitHub Pages
   on push to `main`, matching the `ascend-angular-app` pattern), and enable
   Pages with source "GitHub Actions" in repo settings.

---

## 10. Epics — create each of these as a GitHub issue before writing feature code

**Epic 0 — Project scaffolding & tooling** (`architecture`)
- [ ] Vite + React 19 + TypeScript strict scaffold
- [ ] Tailwind CSS + shadcn/ui configured
- [ ] ESLint + Prettier configured
- [ ] Vitest + React Testing Library configured
- [ ] Base folder structure from §5 created with placeholder `index.ts` files
- [ ] `npm run dev` and `npm test` both run clean on an empty shell

**Epic 1 — Domain model & persistence layer** (`architecture`)
- [ ] `Goal` and `DailyEntry` entities and types from §4
- [ ] Repository interfaces in `domain/` (`GoalRepository`,
  `DailyEntryRepository`)
- [ ] Dexie schema + repository implementations in
  `infrastructure/persistence/indexeddb/`
- [ ] Pure stats functions (`weeklySummaries`, `rollingAverage`,
  `correlation`, `projectedTrajectory`) with unit tests covering edge cases
  (missing days, single data point, no variance)

**Epic 2 — Design system & shared UI** (`feature`)
- [ ] Theme tokens matching §8
- [ ] Shared primitives: `Button`, `Card`, `NumberInput`, `TextField`,
  `StatCard`, `EmptyState`, `PageHeader`
- [ ] App shell + routing skeleton from §6 (empty screens are fine for now)

**Epic 3 — Goal setup** (`feature`)
- [ ] Form to set starting weight, target weight, and weekly pace (or
  target date, deriving pace)
- [ ] Rough, clearly-labeled estimate of daily calorie deficit implied by the
  weekly pace (arithmetic only, with a non-medical-advice caveat)
- [ ] First end-to-end vertical slice: set a goal → it persists → appears on
  `/goal` and drives the Today screen's weekly target

**Epic 4 — Daily log entry** (`feature`)
- [ ] Today screen: log/edit today's weight and calories
- [ ] Ability to back-fill or edit a past date's entry
- [ ] Validation via React Hook Form + Zod (sane weight/calorie ranges)

**Epic 5 — Dashboard charts** (`feature`)
- [ ] Weight trend line chart with the projected goal trajectory overlay
- [ ] Calorie trend chart (daily bars + 7-day rolling average line)
- [ ] Weekly summary cards (this week's change vs. target, average calories)

**Epic 6 — Correlation & pattern insights** (`feature`)
- [ ] Scatter/summary view correlating weekly average calories with that
  week's weight change
- [ ] Plain-language, non-AI summary of the computed correlation (e.g. "weeks
  under 1800 kcal/day averaged more loss") driven entirely by the `stats`
  module — no LLM involved

**Epic 7 — History** (`feature`)
- [ ] Table of all entries, sortable by date
- [ ] Inline edit/delete

**Epic 8 — Export / Import** (`feature`)
- [ ] Export all entries + goal history to a single JSON file
- [ ] Import/restore from that JSON file (this is the only backup mechanism
  since storage is local-only — treat it as a first-class feature, not an
  afterthought)

**Epic 9 — Deployment** (`chore`)
- [ ] `deploy-pages.yml` workflow (build on push to `main`, deploy to Pages)
- [ ] Verify the deployed build persists data correctly across reloads

**Epic 10 — Accessibility & responsive QA pass** (`chore`)
- [ ] Full keyboard-navigation pass across all screens
- [ ] Color-contrast audit against WCAG AA
- [ ] Responsive layout check at mobile, tablet, and desktop widths

---

## 11. Implementation sequencing

1. Epic 0 → confirm `npm run dev` and `npm test` work on the empty shell.
2. Epic 1 → write unit tests for the domain/stats logic before any UI
   consumes it. **Pause here and summarize the architecture (folder
   structure, domain model, persistence approach) before continuing.**
3. Epic 2 → shared primitives and app shell before any real feature screen.
4. Epic 3 → the first true end-to-end vertical slice (goal setup).
5. Epic 4 → daily logging, the app's core daily-use loop.
6. Epics 5–9 → any order from here, but keep each as its own reviewable
   unit of work; don't let unrelated epics bleed into the same commit.
7. Epic 10 → a final pass, but apply accessibility incrementally as each
   feature is built, not only at the end.

After every epic, stop, summarize what changed, confirm the test suite
passes, and only then move to the next one.
