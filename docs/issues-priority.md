# Issues Priority List

Active work queue only (open, pending validation, not started, partial). Closed history lives in [`docs/issues_priority_archived.md`](./issues-priority-archive/README.md) (archived 2026-08-04 because the combined file was too long for Preview — only through ~Tier 51 was visible).

Work top-to-bottom within each tier; dependencies are noted where order matters. When an issue is confirmed done, move its row to the archive (or mark Done and relocate on the next archive pass — prefer updating status here then moving closed rows to the archive file).

**One calendar day → one tier** (see `.cursor/rules/one-tier-per-day.mdc` / `docs/AGENT_WORKFLOW.md`): when filing more issues on a day that already has a tier, append to that tier — do not invent Tier N+1 with the same date.

---

## Tier 36 — iOS/Android native app store release (2026-07-23)

_The next big initiative, at the user's request: ship this PWA as installable native apps on the App Store and Play Store. Structured as one epic plus 14 focused child issues rather than a single giant checklist, matching how the rest of this repo's backlog works. Recommended approach (Capacitor, wrapping the existing Vite build rather than a rewrite) is documented in the epic; not yet implemented, filed for planning/sequencing only. **Reordered Android-first** (2026-07-23, at the user's request) — no developer accounts exist yet and the user is on Windows; iOS specifically requires a Mac to build/sign/submit (no way around it, Capacitor included), while Android needs only Android Studio (free, runs on Windows) and a one-time $25 fee vs. Apple's recurring $99/year. Getting-started checklist (accounts, tools, what to expect) saved outside this repo at `C:\Users\User\Projects\docs\turtle-steps-ideas\ios-android-release-checklist.md`, not duplicated here. Row order below is the new intended sequence, not issue-number order._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#304](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/304) | 🔲 Open | Epic: Ship iOS and Android native app store releases | Tracking issue only, links all 14 children below. Recommends Capacitor as the wrapping approach — reasoned default (fully local-first app, no backend/auth to re-point, Capacitor is the standard tool for exactly this "existing web app → native store presence" scenario), not yet locked in — see #305. Notes a valuable but out-of-scope follow-up: going native unlocks real push/local notifications for #171's daily reminder, previously closed as infeasible in #261 without a backend |
| [#316](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/316) | 🔲 Open | Android: Google Play Console enrollment + app signing setup | Account/business step, not code. $25 one-time fee, upload keystore, Play App Signing |
| [#317](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/317) | 🔲 Open | Android: Play Store listing content + internal/closed testing track | Depends on #305, #311, #312, #316 |
| [#318](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/318) | 🔲 Open | Android: promote to production + submit for Play Store review | Depends on #317 |
| [#313](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/313) | 🔲 Open | iOS: Apple Developer Program enrollment + App Store Connect setup | Account/business step, not code. $99/year enrollment, bundle ID/App ID, App Store Connect app record, provisioning profiles/certificates |
| [#314](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/314) | 🔲 Open | iOS: code signing + first TestFlight beta build | Depends on #305, #313 |
| [#315](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/315) | 🔲 Open | iOS: App Store listing content and submit for review | Depends on #311, #312, #314 |

---

## Tier 47 — Wearable/health-app data sources (2026-07-24)

_User asked about pulling data from Apple Health and Zepp Life. Researched via WebSearch before filing (neither has a public cloud API — both are on-device-only frameworks gated behind a native/hybrid mobile app), then confirmed scope with the user via `AskUserQuestion`: file the two integrations as correctly-scoped, blocked-until-mobile-app epics, plus a third, independently-buildable issue for importing manual data exports. A speculative fourth option (directly integrating Zepp's unofficial, undocumented API) was floated but **not** filed — the user didn't select it, and it would've needed a new backend component (this app is currently 100% client-side/IndexedDB) just to proxy credentials to an endpoint that could break at any time with no notice, for data Health Connect can already surface officially instead (see #335)._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#334](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/334) | 📋 Not started | Epic — Apple Health integration (blocked on mobile app + HealthKit bridge) | HealthKit has no public/cloud API at all — data is on-device only, readable exclusively by a native iOS app (or hybrid app with a HealthKit plugin/entitlement) the user has granted permission to. Genuinely blocked until the mobile app exists; can't be built sooner by any workaround. |

---

## Tier 154 — Live feedback (2026-09-06)

_Meal name templates in Settings; Dashboard descriptive leaderboards (most-eaten, eating reasons, meal names, time-of-day). #817 is leftover English defaults after #811._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#810](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/810) | 🔍 Pending validation | Settings: disable meal-name template Add until the field has text | Add is `disabled` until the field has non-whitespace text (`MealLabelPresetsSection`). |
| [#811](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/811) | 🔍 Pending validation | Settings: meal-name templates should be editable | Pencil + check inline rename (`renamePreset`), same pattern as custom eating reasons. Does not auto-replace leftover English defaults. |
| [#812](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/812) | 🔍 Pending validation | Dashboard: most-eaten-recently leaderboard (not a correlation) | `MostEatenFoodsView` — top 8 dishes by times logged in last 7 / 30 days (`foodFrequency.ts`), grouped by trimmed name. Hideable card after Food reactions. kcal-share toggle is #813. |
| [#813](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/813) | 🔍 Pending validation | Dashboard: Count \| kcal toggle on most-eaten-recently card | Same `MostEatenFoodsView` as #812. Count = times logged; kcal = summed amountKcal + % of named-item kcal. dayTotals ignored. |
| [#814](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/814) | 🔍 Pending validation | Dashboard: eating-reasons tally (last 7 / 30 days) | `EatingReasonsTallyView` — ranked counts; multi-pick increments each reason. Hidden when eating-reason tracking is off. |
| [#815](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/815) | 🔍 Pending validation | Dashboard: when meals happened (time-of-day buckets) | Four buckets (morning 05:00–11:59, afternoon 12:00–16:59, evening 17:00–22:59, night 23:00–04:59). Untimed meals noted, not bucketed. Distinct from #116 / #383. |
| [#816](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/816) | 🔍 Pending validation | Dashboard: meal-name frequency recently (last 7 / 30 days) | Ranked via `effectiveMealLabel` (custom label or positional Breakfast/Lunch/…). Distinct from #812 (dishes) and #338 (meal count vs weight). |
| [#817](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/817) | 🔍 Pending validation | Settings: leftover English meal-name templates should follow the UI language | `localizeLeftoverEnglishMealPresets` rewrites stored Breakfast/Lunch/Dinner/Snack to the active locale once (Settings section). Custom names kept; duplicates dropped. English locale is a no-op (#110 / #142). |

---

## Tier 155 — Live feedback (2026-09-07)

_Night food as its own Day card; Settings export/pin; Dashboard patterns; Dependabot._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#818](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/818) | 🔍 Pending validation | Day: night food as its own card, with reason, include in export | Own `DailyEntryFormNightFood` card (moon + title + hint). Remember Да/Частично/Нет + reason text/check. JSON + Excel/CSV columns. |
| [#819](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/819) | 🔍 Pending validation | Settings: export range presets like my-money (week / month / year / all / custom) | Pills above the date fields. Week uses Settings week-start (Monday if no first-entry yet). All clears dates. Typing dates selects Custom. |
| [#820](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/820) | 🔍 Pending validation | Settings: pin cards to top; About the app always stays first | Pin button on each Settings card except About. Flex `order`: About -2000, pinned -1000+, rest 0. Persisted `turtle-steps-settings-pins`. |
| [#821](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/821) | 🔍 Pending validation | Settings: rename export file before save (input, default name) | File name field under the period dates; empty → `defaultDailyLogStem`. Applies to Excel/CSV/Markdown/ranged JSON. Full backup / encrypted unchanged. |
| [#822](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/822) | 🔍 Pending validation | Settings: put export date range in the filename | `exportPeriodFileStamp`: both dates → `start-to-end`; blank-blank keeps today. Used by Excel/CSV/Markdown/ranged JSON/PDF. Full JSON backup still today-only. |
| [#823](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/823) | 📋 Not started | Dashboard: Personal eating patterns (what tends to happen after a meal) | Not another #812–#816 count card. Meal → composition → time to **next eating episode** (≠ hunger unless logged) → next reason / night? 1–3 data-backed insights, sample size, no causation. Motivating Q: why night eating. |
| [#824](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/824) | 📋 Not started | Chore: clear open Dependabot npm alerts (sharp, minimatch, uuid, elliptic) | 4 open alerts (2 high / 1 moderate / 1 low), all transitive dev deps. Bump/override; elliptic has no patched release listed. https://github.com/ZhannaM85/turtle-steps-to-the-goal/security/dependabot |

---
