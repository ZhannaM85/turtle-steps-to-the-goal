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
| [#335](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/335) | 🔨 In progress | Epic — Android Health Connect integration | No longer blocked (mobile app shipped, #305+) — now a tracking issue only, split into three focused children under Tier 128 (2026-08-08) rather than one giant implementation, matching how #304 was split: [#656](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/656) (weight sync, foundation — SDK dependency, `minSdk` 24→26 bump, permission flow, sync trigger, privacy policy), [#657](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/657) (steps sync), [#658](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/658) (sleep sync). Bonus noted at filing time: Zepp Life can itself sync into Health Connect, making this the official, supported route to Zepp/Amazfit data — likely preferable to ever building a direct, unofficial Zepp API integration. |

---

## Tier 128 — Live feedback and native-follow-up work during Android testing (2026-08-08)

_Same date as the #646 lint gap (already closed/archived) — appended per the one-tier-per-day rule rather than opening a new tier number. Grew from live splash/About-screen bug reports into the #606 widget and #335's Health Connect epic split, all worked in the same continuous session._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#656](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/656) | 🔍 Pending validation | Android Health Connect: weight sync (foundation) | Child of #335. Implemented — `androidx.health.connect:connect-client:1.1.0` dependency, `minSdk` bump 24→26 (confirmed with the user). `HealthConnectPlugin.java` (`@CapacitorPlugin`, registered before `super.onCreate()` — Capacitor's `BridgeActivity` finalizes its plugin list synchronously inside its own `onCreate`, confirmed by reading its source rather than assuming) wraps the Kotlin-coroutine-only Health Connect API for Java via `BuildersKt.runBlocking`/`JvmClassMappingKt.getKotlinClass`; the permission request itself needs no such bridge since `PermissionController.createRequestPermissionResultContract()` is a plain static factory, registered once via `Bridge#registerForActivityResult` (generic, not just Capacitor's two built-in `@ActivityCallback`/`@PermissionCallback` contract types). Manifest gained the required `PermissionsRationaleActivity` (redirects to the real deployed `/privacy` page) + activity-alias (Android 14+) + `<queries>` package visibility entry. JS side: `src/shared/native/healthConnect.ts` (typed `registerPlugin` wrapper) + `HealthConnectSyncSection.tsx` (Settings, Android-only) — merge reuses the existing `mergeDailyEntryPatches` helper (#496's `fillGaps` mode, same policy as Zepp Life/Apple Health/MyFitnessPal imports) rather than writing new merge logic, so a manual weight entry today always wins. Privacy policy (`/privacy`) gained a dedicated Health Connect disclosure section. `assembleDebug` build verified clean (including the Kotlin interop, which compiled correctly on the first attempt after fixing an import-path mistake, thanks to inspecting the actual Health Connect AAR bytecode via `javap` before writing the plugin rather than guessing signatures). Awaiting on-device confirmation |
| [#658](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/658) | 📋 Not started | Android Health Connect: sleep sync | Child of #335, depends on #656's foundation. Separate `READ_SLEEP` permission scope; duration-based merge, closer to weight's manual-wins reasoning than steps' |

---

## Tier 131 — Live feedback (2026-08-10)

_Live bug reports from the app, filed as reported. Also #606 widget follow-ups from on-device validation the same day._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#687](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/687) | 🔍 Pending validation | Android glance widget: richer today fields (kcal, steps, food) | Follow-up to #606. Snapshot now includes always-visible remaining kcal ("—" if no target), steps, compact food (meal count · kcal), and day-note indicator (label only). `buildWidgetSnapshot` + unit tests; RemoteViews rows in `widget_turtle_glance.xml` / `TurtleWidgetProvider`. Awaiting on-device confirmation |
| [#688](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/688) | 🔍 Pending validation | Android glance widget: turtle mark and design-mood polish | Follow-up to #606. Header row with `@mipmap/ic_launcher_round` + accent title; Pond-mood surfaces (`#EDF3F4` / dark `#0F181C`) and teal stroke. Awaiting on-device confirmation |
