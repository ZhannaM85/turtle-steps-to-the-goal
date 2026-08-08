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
| [#335](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/335) | 📋 Not started | Epic — Android Health Connect integration (blocked on mobile app) | Same category of blocker as #334 — Health Connect is Android's on-device health data store, no cloud API, native/hybrid-app-only access. Bonus: Zepp Life can itself sync into Health Connect, making this the official, supported route to Zepp/Amazfit data — likely preferable to ever building a direct, unofficial Zepp API integration. |

---

## Tier 124 — Native-unlocked follow-ups from audit (2026-08-04)

_Same audit pass. Blocked on Tier 36 Capacitor / store shell — revisit of #261 (notifications) and #231 (widgets), which were correctly closed for PWA-only._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#605](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/605) | 📋 Not started | Native local notification for the daily logging reminder | Blocked on #305+; wires existing #171 reminder preference to OS local notifications |
| [#606](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/606) | 📋 Not started | Android home-screen glance widget | Blocked on #305+; weight + remaining kcal glance; Android-first |

---

## Tier 128 — Live feedback during native Android testing (2026-08-08)

_Same date as the #646 lint gap (already closed/archived) — appended per the one-tier-per-day rule rather than opening a new tier number._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#647](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/647) | 🔍 Pending validation | Today date-navigator row: Date input renders smaller than arrows/Today button on Android | Root cause: Chromium honors this input's inherited `h-8` base height, unlike WebKit which ignores a plain `height` class regardless of value (only ever clips when paired with `overflow-hidden`, per #420's history). First fix (`h-[2.625rem]` gated to `Capacitor.getPlatform() === 'android'`) was too narrow — desktop Chrome still broken. Second fix (applied unconditionally, reasoning WebKit would no-op it) closed as validated, then **reopened**: broke real iOS Safari/PWA — an explicit height isn't a no-op on WebKit even matching its own natural size, unlike Chromium (reported live with screenshots, input rendered taller than the buttons). Third fix engine-gates via `isWebKitEngine` (`CSS.supports('-webkit-touch-callout', 'none')` feature-detect, not UA-sniff): Chromium/Blink gets the override, WebKit stays fully unconstrained. Confirmed on native Android + desktop Chromium (42×42); pending re-confirmation on both Android and real iOS Safari |
| [#651](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/651) | 🔍 Pending validation | Android: hardware/gesture back button always closes the app, regardless of page | Root cause: `AppShell.tsx`'s 5 top-level tabs all use `replace` (#309), so `canGoBack` stays false on every tab, not just Today — reported live as "exits from every tab," expected behavior per standard bottom-nav convention (YouTube/Instagram etc.): back returns to the home tab (Today) first, only exits from there. Two false starts first: a `enableOnBackInvokedCallback` manifest flag (reverted, didn't fix it and wasn't the actual regression source — the bug reproduced even on the original #309 commit in isolation) and misreading a MIUI `LauncherFsGestureCompat` log line as a gesture-nav bypass. Real fix: `backButtonHandler.ts` now calls `router.navigate('/')` when `canGoBack` is false and not already on `/`, only calling `App.exitApp()` from Today itself. Pending on-device confirmation |
