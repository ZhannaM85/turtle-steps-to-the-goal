# Potential Improvements

Analysis pass over the current codebase (2026-07-17) — not a committed backlog, just a survey of
what could be worth doing next. Nothing here has a GitHub issue yet; treat this as a menu to pick
from, not a plan. Items are grouped by kind, roughly ordered by how confident I am they're worth
doing within each group.

Anything that risks conflicting with the app's established "no pressure, small steps" ethos
(no badges/streaks/gamification, quiet asymmetric emphasis instead of alerts — see #14/#20/#29 in
`docs/issues-priority.md`) is flagged explicitly rather than just proposed.

---

## Reliability / CI gaps

- **CI doesn't run tests or lint before deploying.** `.github/workflows/deploy-pages.yml` only
  runs `tsc -b` before building and deploying — `npm test` and `npm run lint` aren't part of the
  pipeline at all. A broken test or a lint error currently would not block a bad deploy going
  live. Worth adding both as steps before the build step.
- **No CI on pull requests**, only on push to `main` (`on: push: branches: [main]`). Fine for a
  solo-dev direct-to-main workflow, but if that ever changes, there's currently no check gating a
  PR before merge.
- **No end-to-end/visual regression testing.** Everything is unit/component-level (Vitest +
  Testing Library). A local Playwright exploration happened once this session for a one-off visual
  check (see `feedback_playwright_indexeddb_seed` in memory) but there's no ongoing E2E suite. Not
  necessarily worth the investment for an app this size, but worth a conscious decision either way
  rather than just an accident of not having set it up.

## Performance / technical debt

- **Single 1.27MB JS bundle, no code-splitting.** Every `npm run build` prints a chunk-size
  warning (`dist/assets/index-*.js` over 500kB after minification). `recharts` (Dashboard's
  charts) is likely the biggest contributor. Route-level `React.lazy()` for Dashboard/History
  (the two heaviest screens) would probably help first-load time on slower connections, at the
  cost of a bit of added complexity.
- **No pagination or virtualization for History's list/table view.** `useHistoryData.ts` and
  `useDashboardData.ts` both call `IndexedDbDailyEntryRepository.getAll()` — a full table scan,
  and every row renders into the DOM at once. Not an issue at today's data volumes, but worth
  revisiting if/when someone has multiple years of daily entries (700–1000+ rows).
- **No offline support.** `manifest.json` exists now (#103) but there's still no service worker —
  the app requires a live network fetch on every cold load. Combined with #102's still-unresolved
  ~60s-load mystery on the iOS home-screen shortcut, offline caching might be worth investigating
  as a follow-up to that issue rather than a separate one.

## Data & privacy

- **No "clear all my data" / reset feature anywhere in Settings.** For an app storing weight,
  cycle-tracking, and now digestion-tracking data, a deliberate, confirmed way to wipe everything
  locally (distinct from just uninstalling/clearing site data via the browser) seems like a
  reasonable expectation, especially given how much sensitive personal data accumulates here.
- **No goal history view.** `GoalRepository.getAll()` already exists and is used for export, but
  there's no in-app screen to look back at past weekly targets — only the currently active one.
  Could be a small addition to the Goal screen.
- **CSV export alongside the existing JSON backup.** The JSON backup is complete and the only
  real backup mechanism (correct default), but a CSV export of daily entries would let someone
  open their data in a spreadsheet without writing a converter — a common ask for this kind of
  app. Additive, wouldn't replace the JSON path.

## Accessibility

- **No full contrast re-audit since #11.** The original accessibility pass was one epic
  (#11), and individual contrast bugs have been fixed piecemeal since as they were noticed live
  (#84's `EmotionPicker` selected-state, #92's `FoodPickerDialog` selected-row). With 5 moods × 2
  color schemes (10 token combinations, `src/index.css`), it's plausible other combinations have
  similar contrast issues nobody's hit yet. Worth a systematic pass rather than waiting for the
  next one to surface via live feedback.
- **No dedicated keyboard-navigation audit** beyond what individual features happened to get
  right. Most interactive elements use semantic `Button`/`ToggleGroup`/native inputs (good
  default), but a deliberate tab-order walkthrough of the denser screens (`DailyEntryForm`'s
  add row, now with two `ToggleGroup`s and several inline buttons) hasn't been done.

## Feature ideas in the spirit of what's already here

- **Extend the correlation-chart pattern to sleep and steps.** #7/#89 (calories vs. weekly
  weight change) and #116 (last meal time vs. next-day weight) both follow the same
  median-split, plain-language, minimum-data-gated shape (`domain/stats/correlationInsight.ts`,
  `lateMealCorrelation.ts`). The same pattern could extend naturally to "sleep hours vs. next-day
  weight" or "step count vs. weight change" — genuinely new insight, low risk since the shape is
  already proven twice.
- **`MealItemsSection`'s Settings nutrition editor is still per-100g only.** #111 added a
  Per-100g/Per-portion toggle to manual meal entry (add row + item-edit rows) but explicitly left
  the Settings-side editor for custom meal items untouched, since it's a different screen. Worth
  doing for consistency if per-portion entry turns out to be a common pattern.
- **A gentle, opt-in "haven't logged today" reminder** — flagged carefully, not recommended
  outright: this app's whole design ethos has deliberately avoided anything that could read as
  pressure (no streaks, no badges, quiet muted-not-alarmed treatment of gains). A reminder
  notification is exactly the kind of feature that could undercut that if it's not designed very
  carefully (must be easy to turn off, non-judgmental wording, no "you broke your streak" framing).
  Worth a product conversation before scoping, not a straightforward addition.

## Smaller polish items

- **No "undo" affordance for destructive actions** beyond the existing two-step delete confirm
  (tap once to arm, tap again to confirm) used across meals/entries/meal-items. That pattern
  already prevents accidental deletes reasonably well; an undo toast would be a nice-to-have on
  top, not a gap.
- **History has no way to search/filter by note text or mood** — only by date range
  (`dateFromLabel`/`dateToLabel`). Someone trying to find "that day I wrote about feeling great"
  has no way to do it other than scrolling.

---

*Not covered here: the two items already tracked as open/partial in `docs/issues-priority.md`
(#102's unresolved root cause, and anything else currently in flight) — see that file for
up-to-date status rather than duplicating it here.*
