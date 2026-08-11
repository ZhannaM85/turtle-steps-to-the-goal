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
| [#335](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/335) | 🔲 Open | Epic — Android Health Connect integration | **Reopened 2026-08-11.** Won't-do assumed Zepp Life must feed HC; user confirmed HC weight sync works from HC-native sources without Zepp. Children #656/#657/#658 reopened; refresh gaps #693/#694. Zepp history stays on #365 file import. |

---

## Tier 132 — Regression / CI hardening + live UX (2026-08-11)

_iOS waits on a Mac; Android Play path waits on #316. Closed rows for this day live in the archive. **Reopened Health Connect** (independent of Zepp Life) + live sync refresh reports appended same day._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#656](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/656) | 🔍 Pending validation | Android Health Connect: weight sync (foundation) | **Reopened 2026-08-11.** Code shipped earlier; user confirmed Sync imported today's weight from HC on-device. Still needs explicit close after #693/#694 land (or confirm foundation-only). `wontfix` removed. |
| [#657](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/657) | 🔍 Pending validation | Android Health Connect: steps sync | Implemented for real this pass (`syncRecentSteps` + READ_STEPS). Earlier “validated” close had no native steps code. |
| [#658](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/658) | 🔍 Pending validation | Android Health Connect: sleep sync | `READ_SLEEP` + `syncRecentSleep` (wake-up day attribution; deep stages when present). |
| [#693](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/693) | 🔍 Pending validation | Health Connect weight sync: allow refreshing when today's weight is already set | Sync uses `overwrite` via `applyHealthConnectWeight`; removed already-logged block. Copy updated EN/RU. |
| [#694](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/694) | 🔍 Pending validation | Health Connect weight sync: sync / refresh past days, not only today | `syncRecentWeights` (7 days) + overwrite batch via `applyHealthConnectWeights`. |

---
