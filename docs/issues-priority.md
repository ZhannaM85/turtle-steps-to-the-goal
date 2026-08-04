# Issues Priority List

Active work queue only (open, pending validation, not started, partial). Closed history lives in [`docs/issues_priority_archived.md`](./issues-priority-archive/README.md) (archived 2026-08-04 because the combined file was too long for Preview — only through ~Tier 51 was visible).

Work top-to-bottom within each tier; dependencies are noted where order matters. When an issue is confirmed done, move its row to the archive (or mark Done and relocate on the next archive pass — prefer updating status here then moving closed rows to the archive file).

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

## Tier 94 — External user feedback (2026-08-02)

_Five requests from an external review (filed in English). Ordered easier → harder; #530 likely wants richer food data from #531._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#535](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/535) | 🔍 Pending validation | Food search: USDA online fallback + small bundled RU generics (OFF alternative) | `searchOnlineFoods`: RU staples + OFF then USDA (per-100g datasets; `VITE_FDC_API_KEY`/`DEMO_KEY`). OFF 503/timeout surfaces as unavailable (not empty). Offline Search online still uses bundled staples. |

---

## Tier 97 — Live feedback & features (2026-08-03)

_Water recommendation and further filings from this session (list may grow)._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#554](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/554) | 🔍 Pending validation | iOS Battery screen shows generic Web icon instead of app icon | Investigated: Battery «Web»+grid is likely iOS PWA limitation (≠ home screen). Hardened `sizes=180x180` + manifest `purpose` any/maskable. Re-add home screen to verify turtle icon there. |
| [#553](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/553) | 🔍 Pending validation | Investigate iOS background battery use and possible memory leaks | Inventory: SW (#163) + 5‑min version poll (#115). Fix: skip poll/SW nudge while `document.hidden`, re-check on return. No clear leak found; some SW background time is expected. |

---

## Tier 98 — Live feedback & features (2026-08-04)

_Backup/settings gaps and further filings from this session (list may grow)._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#580](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/580) | 🔍 Pending validation | Set default times for Breakfast/Lunch/Dinner/Snack when imported meals have no time (e.g. MyFitnessPal) | Slot defaults 08:00/13:00/19:00/16:00 (incl. MFP Snacks + RU labels); stamped on MFP import; `effectiveTimeEaten` for Day/History display + night/late/fasting readers. Live: hardcoded times wrong for user (wants 12/15/18/21) — follow-up [#588](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/588) (done; layout follow-up [#591](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/591)). |
| [#589](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/589) | ⬜ Open | Settings Dishes: Cancel button next to Save in edit mode | Follow-up to #583/#584. Same row as Save, to its right; discard unsaved edits and exit edit mode. |
| [#590](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/590) | ⬜ Open | Goal: hide fiber daily target when Fiber is off in What to track | Follow-up to #582. Settings Fiber off still leaves «Daily fiber target» (Не задано) on Goal — gate that row like Day fiber UI. |
| [#591](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/591) | ⬜ Open | Settings: default meal-time inputs overlap — match Start of day width | Follow-up to #588. 2×2 HH:MM fields overlap; use same width as Start of day time input. |
| [#592](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/592) | ⬜ Open | Dashboard correlation scatters: Y-axis garbage ticks (esp. when zoomed) | Late-meal + fasting-window on-device: ticks like 22185 / 39432 (not kg/lb Δ). Worse/visible when zoomed (#581). |
| [#593](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/593) | ⬜ Open | Dashboard correlation charts: Y-axis only shows weight gain — weight loss missing | Regression: negative next-day Δ no longer on scatters (domain floored at 0). Related #581/#592. |
| [#594](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/594) | ⬜ Open | JSON backup: export and import all Settings page preferences | Follow-up to #578/#579. Audit full Settings (What to track, Profile, day-start, meal-slot defaults, reminders, unit, …); include in bundle. |

