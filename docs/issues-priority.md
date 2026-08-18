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

## Tier 139 — Live feedback (2026-08-17)

_Zepp screenshot OCR (#742), CSV/export completeness, Day delete/icon consistency, AutoSleep screenshot fill, Settings opt-out for reading from images, Body composition display layout, sleep export format, and Sleep icon placement._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#743](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/743) | 🔍 Pending validation | CSV export is missing meals, foods, times, and other logged fields | Daily Log gained body composition, fiber, electrolytes, custom-metric columns. CSV/Markdown keep the daily table and add a second Meals table (blank line between). Meals also export item fiber/electrolytes, item note, and whole-meal reaction. JSON backup unchanged. |
| [#744](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/744) | 🔍 Pending validation | CSV, Excel, and Markdown exports should include only currently tracked fields | Gate columns via `DailyLogExportExtras.tracking` (What to track + cycle/digestion/alcohol/water + electrolytes). Always keep date, weight, calorie/macro totals, meal rows, and custom-metric columns. JSON backup stays complete. Do not drop a tracked column just because some days are blank. |
| [#746](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/746) | 🔍 Pending validation | Day edit/delete icons: same order, gap, and sizing on weight and meals | Weight was Trash then Pencil (`gap-1`); meals were Pencil then Trash (`gap-3`). Canonical: Pencil then Trash, `gap-3` on both pairs (matches #127). Morning stays `icon-xl`, meals stay `icon-sm`. |
| [#748](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/748) | 🔍 Pending validation | Fill sleep and deep sleep from an AutoSleep screenshot | ImageUp on the Sleep card (gated by #749). Parse Today 10h 33m + deep 3h 26m; ignore quality and in-bed. Wake date = Monday of SUNDAY 16 → MONDAY 17. |
| [#750](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/750) | 🔍 Pending validation | Body composition display: move icons to the title row so the five readings fit | Screenshot + pencil + trash on the title row; #515 grid full width below. Weight/Sleep/measurements unchanged. |
| [#751](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/751) | 🔍 Pending validation | Export sleep as hours and minutes, not decimal hours | CSV/Excel/Markdown print `10h 33m` / `10ч 33м` via `formatSleepDuration` (not `10.55`). JSON backup stays numeric. Follow-up: AutoSleep confirm was still decimal (`5,9 ч`); now hours+minutes fields like the Day editor. PDF averages use the same h+m formatter. |
| [#752](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/752) | 🔍 Pending validation | Sleep display: move action icons to the title row (match Body composition) | ImageUp / Pencil / Trash on the `Сон` header row like #750; duration card is text only. Weight unchanged. |

---

## Tier 140 — Live feedback (2026-08-18)

_On-device: Morning entries. Sleep and body composition should save with empty values (fields are optional)._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#753](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/753) | 🔍 Pending validation | Allow saving empty sleep and body composition | Empty/`''` optional fields parse as unset (not «Invalid value»). Save persists blanks; blur on an empty body-comp field is not an error. Weight still blocks empty save (#669). |
