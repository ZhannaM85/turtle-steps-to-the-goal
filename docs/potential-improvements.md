# Potential Improvements

Analysis pass over the codebase (2026-07-17), converted to GitHub issues on 2026-07-19. Originally
"not a committed backlog, just a survey of what could be worth doing next" — now that each item has
an issue, treat `docs/issues-priority.md` as the actual work queue/order; this table just tracks
where each survey item landed and links back to its issue.

Anything that risks conflicting with the app's established "no pressure, small steps" ethos
(no badges/streaks/gamification, quiet asymmetric emphasis instead of alerts — see #14/#20/#29 in
`docs/issues-priority.md`) is flagged explicitly rather than just proposed.

---

## Reliability / CI gaps

| Item | Status | Notes |
|---|---|---|
| CI doesn't run tests or lint before deploying | [#159](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/159) Open | Confirmed still true at filing time — `deploy-pages.yml` only runs `tsc -b` |
| No CI on pull requests | [#160](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/160) Open | Low urgency given the current solo-dev direct-to-main workflow |
| No end-to-end/visual regression testing | [#161](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/161) Open | Framed as a decision to make (worth the investment or not), not a straightforward build |

## Performance / technical debt

| Item | Status | Notes |
|---|---|---|
| Single 1.27MB JS bundle, no code-splitting | ✅ Already covered | Done by [#102](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/102) (route-based code splitting, `src/app/lazyRoutes.ts`) before this survey item could be filed as new — confirmed live in the codebase, 2026-07-19 |
| No pagination/virtualization for History's list/table view | [#162](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/162) Open | Low priority — no known user near this data volume yet |
| No offline support (no service worker) | [#163](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/163) Open | Possibly related to #102's home-screen-shortcut load-time work — worth checking overlap before scoping |

## Data & privacy

| Item | Status | Notes |
|---|---|---|
| No "clear all my data" / reset feature in Settings | [#164](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/164) Open | Confirmed still missing at filing time |
| No goal history view | ✅ Already covered | Done by [#147](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/147) (`PastTargetsList` on the Goal screen) before this survey item could be filed as new |
| CSV export alongside the existing JSON backup | ✅ Already covered | Done by [#125](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/125) before this survey item could be filed as new |

## Accessibility

| Item | Status | Notes |
|---|---|---|
| No full contrast re-audit since #11 | [#165](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/165) Open | 5 moods × 2 color schemes = 10 token combinations to check |
| No dedicated keyboard-navigation audit | [#166](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/166) Open | |

## Feature ideas in the spirit of what's already here

| Item | Status | Notes |
|---|---|---|
| Extend the correlation-chart pattern to sleep and steps | [#167](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/167) Open | Low implementation risk — same shape as #89/#116, proven twice already |
| `MealItemsSection`'s Settings nutrition editor is still per-100g only | [#170](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/170) Open | Gap widened, not closed, by #149 (2026-07-19), which reused the same per-100g-only pattern for its new "Add custom food" form |
| A gentle, opt-in "haven't logged today" reminder | [#171](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/171) Open | Flagged carefully — filed with the ethos caveat preserved in the issue body; needs a product conversation on tone before implementation |

## Smaller polish items

| Item | Status | Notes |
|---|---|---|
| No "undo" affordance for destructive actions | ➖ Not filed | The original analysis argued against itself: "an undo toast would be a nice-to-have on top, not a gap" — the existing two-step delete confirm already covers this reasonably. Recorded here rather than filed as a low-value issue |
| History has no way to search/filter by note text or mood | [#172](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/172) Open | Only date-range filtering exists today |

---

*Two more issues surfaced live while testing #156's fix (2026-07-19), unrelated to this original
survey — see [#168](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/168) (Macros field
sizing) and [#169](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/169) (no cancel out
of meal edit mode).*
