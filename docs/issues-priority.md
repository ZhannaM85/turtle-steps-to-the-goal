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
| [#305](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/305) | 🔲 Open | Adopt Capacitor to wrap the app for native iOS/Android builds | Foundational — everything else in this tier depends on it. `@capacitor/core`/`cli`/`ios`/`android`, `npx cap init` pointing `webDir` at the existing Vite `dist/`, generate both platform projects, verify the built app actually runs (incl. IndexedDB persisting across an app restart) — no signing/icons/store work yet |
| [#311](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/311) | 🔲 Open | Design an app icon and generate iOS/Android icon + splash-screen assets | Depends on #305. Blocks both store-submission chains — neither store accepts a submission without a finished icon. No dedicated app-icon artwork exists yet, only in-app UI; `@capacitor/assets` can generate every required size from one source image once designed |
| [#307](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/307) | 🔲 Open | Android: camera permission for barcode scanning inside the native shell | Depends on #305. `AndroidManifest.xml` permission plus Android's separate runtime-permission-prompt requirement (unlike iOS's Info.plist-string-only model) |
| [#308](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/308) | 🔲 Open | Native status bar / safe-area / system theming pass (iOS + Android) | Depends on #305. Covers both platforms in one issue, but moved up in sequence since Android ships first — Capacitor `StatusBar` plugin tracking the app's own light/dark + 5-color theme system; Android system nav bar; real-device audit of existing `env(safe-area-inset-*)` usage (a native full-screen WebView doesn't always compute these identically to a browser tab) |
| [#309](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/309) | 🔲 Open | Android: hardware/gesture back-button navigation handling | Depends on #305. `App.addListener('backButton', ...)` mapped to the same in-app back behavior `navigate(-1)`/`MealEditScreen.tsx`'s own back button already use, not a parallel navigation concept; only exits the app from a true top-level screen with nothing to go back to |
| [#310](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/310) | 🔲 Open | Verify/adjust the "update available" banner behavior inside the native shell | Depends on #305. The existing service worker/`AppUpdateBanner.tsx` flow assumes a hosted PWA where a refresh fetches a new deploy — inside a native app, updates come from the app stores instead, so this needs checking for conflicts/confusing copy, not assumed to just work |
| [#316](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/316) | 🔲 Open | Android: Google Play Console enrollment + app signing setup | Account/business step, not code. $25 one-time fee, upload keystore, Play App Signing |
| [#317](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/317) | 🔲 Open | Android: Play Store listing content + internal/closed testing track | Depends on #305, #311, #312, #316 |
| [#318](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/318) | 🔲 Open | Android: promote to production + submit for Play Store review | Depends on #317 |
| [#306](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/306) | 🔲 Open | iOS: camera permission for barcode scanning inside the native shell | Depends on #305. `NSCameraUsageDescription` in Info.plist (Apple rejects apps missing it); verify `getUserMedia` actually triggers the native permission prompt inside Capacitor's WKWebView, or whether Capacitor's own Camera plugin is needed instead |
| [#313](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/313) | 🔲 Open | iOS: Apple Developer Program enrollment + App Store Connect setup | Account/business step, not code. $99/year enrollment, bundle ID/App ID, App Store Connect app record, provisioning profiles/certificates |
| [#314](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/314) | 🔲 Open | iOS: code signing + first TestFlight beta build | Depends on #305, #313 |
| [#315](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/315) | 🔲 Open | iOS: App Store listing content and submit for review | Depends on #311, #312, #314 |

---

## Tier 47 — Wearable/health-app data sources (2026-07-24)

_User asked about pulling data from Apple Health and Zepp Life. Researched via WebSearch before filing (neither has a public cloud API — both are on-device-only frameworks gated behind a native/hybrid mobile app), then confirmed scope with the user via `AskUserQuestion`: file the two integrations as correctly-scoped, blocked-until-mobile-app epics, plus a third, independently-buildable issue for importing manual data exports. A speculative fourth option (directly integrating Zepp's unofficial, undocumented API) was floated but **not** filed — the user didn't select it, and it would've needed a new backend component (this app is currently 100% client-side/IndexedDB) just to proxy credentials to an endpoint that could break at any time with no notice, for data Health Connect can already surface officially instead (see #335)._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#334](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/334) | 📋 Not started | Epic — Apple Health integration (blocked on mobile app + HealthKit bridge) | HealthKit has no public/cloud API at all — data is on-device only, readable exclusively by a native iOS app (or hybrid app with a HealthKit plugin/entitlement) the user has granted permission to. Genuinely blocked until the mobile app exists; can't be built sooner by any workaround. |
| [#335](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/335) | 📋 Not started | Epic — Android Health Connect integration (blocked on mobile app) | Same category of blocker as #334 — Health Connect is Android's on-device health data store, no cloud API, native/hybrid-app-only access. Bonus: Zepp Life can itself sync into Health Connect, making this the official, supported route to Zepp/Amazfit data — likely preferable to ever building a direct, unofficial Zepp API integration. |

---

## Tier 123 — Product-owner audit batch (2026-08-04)

_Filed from the product-owner audit in `C:\Users\User\Projects\docs\turtle-steps-ideas\2026-08-04-product-audit\` (outside this repo). Log-only — not implementing in the filing session. Row order is easiest → harder within the batch; items that need an `AskUserQuestion` fork before coding are called out. Skipped from filing (parked in the audit’s “discuss / P3” notes): lightweight exercise log, meal photos, extra languages._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#599](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/599) | 🟡 Partial | Remind when a JSON backup has not been exported recently | New `useLastBackupStore` + `lastBackupReminder.ts` (14-day threshold, 7-day snooze); dismissible banner atop Settings linking to `#export-section`, plus an always-visible "Last backup: N days ago" line by the Export button. Reported live 2026-08-06 as still wrong: `firstSeenAt` stamps "now" the first time the localStorage key is created (i.e. first run of this build), not derived from real usage history — an existing user with ~1 month of never-backed-up data sees no banner because the 14-day clock silently restarts at zero on update instead of reflecting the real gap. Needs seeding from an actual usage signal (earliest `DailyEntry` date or similar) |
| [#610](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/610) | 🔍 Pending validation | Calm pace-check card when recent weekly goals miss consistently | New `domain/goal/paceCheck.ts` (`paceCheckInsight`, 3-consecutive-miss threshold); "Pace check" nudge card on GoalScreen, same hideable shape as `goalReachedNudge`. No projection (#228 still stands). Awaiting on-device confirmation |
| [#614](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/614) | 🔍 Pending validation | Lightweight planned meals / tomorrow draft staging | Resolved via `AskUserQuestion`: separate drafts store (`usePlannedMealStore`, new `plannedMeals` IndexedDB table), not planned `DailyEntry` rows. New `PlannedMealsSection.tsx` on the Day screen — stage a name + optional kcal estimate for tomorrow; opening that date shows it with "Add to log"/discard. Awaiting on-device confirmation |

---

## Tier 124 — Native-unlocked follow-ups from audit (2026-08-04)

_Same audit pass. Blocked on Tier 36 Capacitor / store shell — revisit of #261 (notifications) and #231 (widgets), which were correctly closed for PWA-only._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#605](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/605) | 📋 Not started | Native local notification for the daily logging reminder | Blocked on #305+; wires existing #171 reminder preference to OS local notifications |
| [#606](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/606) | 📋 Not started | Android home-screen glance widget | Blocked on #305+; weight + remaining kcal glance; Android-first |

---

## Tier 125 — Live feedback (2026-08-05)

_Same-day live feedback after Zepp / export work. **Do not** split further same-day filings into Tier 126+ — append to this tier._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#625](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/625) | 🔍 Pending validation | Apply day-start time to Dashboard rolling-window displays (follow-up to #601) | `loggingConsistencyWeeks` gained a `today` param (was hardcoded `endOfWeek(new Date(), ...)`). `RecentAveragesCards.tsx`/`LoggingConsistencyHeatmap.tsx` now pass `effectiveDateFor(new Date(), dayStartTime)` through to `recentAverages`/`recentAverageWindowRange`/`loggingConsistencyWeeks`/`loggingConsistencySummary`. `useChartPeriodPager.ts` (shared by all 6 Dashboard trend charts) now reads `useDayStartStore` itself and defaults to the day-start-adjusted date when its own `today` param is omitted — no changes needed in the individual chart components. `CalendarView.tsx`'s cosmetic today-cell marker also switched from `isToday(day)` to a day-start-aware comparison, per the issue's own "listed for completeness" note. Awaiting on-device confirmation |

---

## Tier 126 — Live feedback (2026-08-06)

_Same-day live feedback while working through Tier 123/125's validation queue._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#632](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/632) | 🔍 Pending validation | PDF section picker: some toggles enabled without any real entries | Implemented together with #633 — see that row; the Settings-tracking gate explains Body measurements/Alcohol/Night eating showing enabled from stale data logged before their Settings toggle was turned off (or, for Night eating, from meal-slot-default times with no night-eating-specific intent) |
| [#635](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/635) | 🔍 Pending validation | Day screen: no way to navigate forward to reach staged planned meals (#614 follow-up) | `TodayScreen.tsx`'s next-day arrow/date-picker `max` was hard-capped at today (#138) — now capped at `max(today+1, furthest staged planned-meal date)`, so tomorrow is always reachable and a draft staged further out (staging always targets "the day after whatever date is open," so reaching it requires having already stepped through every day in between) extends the cap to match. Awaiting on-device confirmation |
| [#636](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/636) | 🔍 Pending validation | Recipe ingredient copy: show a visible 'Copied' tooltip/toast (#611 follow-up) | `RecipesSettingsScreen.tsx` now shows a `role="status"` "Ingredients copied to clipboard" line under the row (same auto-clearing shape as `GoalForm.tsx`'s `justSaved`), alongside the existing icon swap. New `t.recipes.ingredientsCopiedToastMessage`, en/ru. Awaiting on-device confirmation |
| [#634](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/634) | 🔍 Pending validation | PDF section picker: Body measurements enabled from body-fat-% data alone (follow-up to #632/#633) | `exportPdf.ts` moved `bodyFatPercent`/`latestBodyFatPercent` out of the "Body measurements" grouping into "Body composition" (matches the Day form's own `saveBodyComposition` grouping) in both `pdfSectionAvailability()` and `buildSummaryPdf()`. Added `pdfSectionDisabledReason()` plus an `InfoTooltip` on each disabled toggle in `PdfSectionsDialog.tsx` naming which of the two reasons applies (not tracked in Settings vs. no data in range). Confirmed working in a local browser check 2026-08-06 — still needs on-device confirmation before closing |
| [#637](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/637) | 🔍 Pending validation | Deploy workflow: stuck GitHub Pages deployments + wasted docs-only deploy runs | Reported live 2026-08-06 — build always succeeds; `actions/deploy-pages@v4` intermittently sits at `deployment_queued` for its full 10-minute internal timeout (GitHub Pages backend not picking up the deployment, not our config). Compounded by `concurrency: group: pages` queueing every push serially, and nearly every push today being docs-only (`docs/issues-priority.md` etc.) yet still triggering a full build+deploy for no site-content change. Fixed in `9c637f9`: `paths-ignore` on docs-only pushes + `timeout-minutes` on both jobs. No "on-device" equivalent here — "validation" means watching that a docs-only commit stops triggering a deploy and the next real push deploys cleanly, not an in-app check |
| [#638](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/638) | 🔍 Pending validation | Settings 'What to track' night-eating toggle ignores Profile gender | `SettingsScreen.tsx:691` now reads `useProfileStore`'s `sex` and passes it into `nightEatingLabel(sex)`, matching every other caller. `exportPdf.ts`/`PdfSectionsDialog.tsx` left unchanged — the issue itself flagged those as section/column labels, possibly intentionally neutral, not a hard requirement. Awaiting on-device confirmation |

---

## Tier 127 — Live feedback (2026-08-07)

_Live discussion of a screenshot showing "Цель достигнута" badges on most recent weeks despite the actual weight barely moving. Log-only — design discussed and agreed live with the user via several rejected alternatives, not yet implemented._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#639](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/639) | 📋 Not started | Goal tracking: mid-week 'achieved' shouldn't lock in a permanent badge; gate restart to week's natural end | Root cause: `goalWindowProgress.ts`'s sticky `targetMet` (locks in from one noisy day) feeds both the mid-week celebration (#55) and the permanent history badge (`pastGoals()`/`PastTargetsList.tsx`), and `GoalForm.tsx`'s `startNewGoalButton` has no gate on `weekEnd`, so restarting right after a mid-week dip produces short, overlapping windows. Agreed direction: reframe the mid-week modal copy (not yet achieved, keep going), only evaluate/award the badge using the window's final state at natural `weekEnd`, and gate the restart button to only appear once the window has actually ended. No hard restrictions on the user (no cross-period baseline comparison). See issue for rejected alternatives and open questions |
| [#640](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/640) | 📋 Not started | Scanned/searched food: dish name not editable, no brand field on review screen | Reported live via screenshot. `AddMealDialog.tsx:1420` — the post-scan/search review panel renders the dish name as a read-only `<p>` (`textFor(activeItem)`); #517 already made kcal/macros editable in this exact view but left the name alone, and there's no brand input here at all (brand only exists in the separate `MealItemEditorSheet.tsx`, #248/#344). Root cause / implementation approach not yet investigated |
| [#641](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/641) | 📋 Not started | Scanned food name shows literal `&quot;` instead of a decoded quote | Reported live, same screenshot as #640 — `Исландский скир &quot;Печеное яблоко&quot;` renders with the entity undecoded. Shown via `AddMealDialog.tsx`'s `textFor(activeItem)` → `item.food[locale]`; likely introduced upstream in `lookupBarcode.ts`/`openFoodFactsParse.ts` or the food-search path, not yet traced |

