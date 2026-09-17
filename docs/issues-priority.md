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

## Tier 163 — Live feedback (2026-09-15)

_Day КБЖУ / export labels & gating; Day date-nav checkmark; PDF HTML+CSS stack (#905) + diary follow-ups; sticky page tops._

| # | Status | Issue | Notes |
|---|--------|-------|-------|

---

## Tier 164 — PDF diary export and browser feedback (2026-09-16)

_Reported from iPhone PDF previews and local Chrome._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#929](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/929) | ⬜ Open | PDF diary: reduce Metrics and Notes body text size | Failed on-device validation 2026-09-17: the requested result is not fully addressed. Needs correction before another device check. |
| [#932](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/932) | ⬜ Open | PDF diary: footer still cut off, generated date not visible | Failed on-device validation 2026-09-17: the requested result is not fully addressed. Needs correction before another device check. |

## Tier 165 — PDF footer whitespace and Day chrome (2026-09-17)

_Reported from an iPhone PDF export and the Day screen._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#939](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/939) | ⬜ Open | PDF diary: excessive blank band below the footer | Failed on-device validation again 2026-09-17 after `c7629f41a`: a large white patch splits Water rows and pushes Notes down. Reproduces in Макет PDF, proving the captured app layout—not Safari or the PDF viewer—contains the gap. Screenshots and generated PDF supplied. |
| [#940](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/940) | ⬜ Open | PDF diary: increase meal item and water log fonts by 2pt | Failed on-device validation 2026-09-17: meal details and water-entry text remain too small to read comfortably. Screenshot supplied; implementation needs correction. |
| [#941](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/941) | ⬜ Open | PDF diary: match Показатели header to other section headers | Failed on-device validation 2026-09-17: Показатели is still visibly smaller than Еда, Вода, and Заметки. Screenshot supplied; implementation needs correction. |
| [#958](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/958) | ⬜ Open | PDF diary: footer gone, water gap, notes detached (regression after #939 fill removal) | Failed on-device validation 2026-09-17: the requested result is not fully addressed. Needs correction before another device check. |
| [#960](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/960) | 🔍 Pending validation | PDF: stop stretching short pages to full A4; Заметки white-gap still broken | Pages remain packed top-down with no flex stretch or `.pdf-page-fill`; Water/Notes pixels stay at natural scale. #939 follow-up now adds blank PDF paper **between** the body and footer through 1:1 canvas copies, instead of leaving it below the footer. Awaiting on-device confirmation. |
| [#961](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/961) | ⬜ Open | PDF export: restore preview before Save or Share | Follow-up to validated #956. Export currently jumps directly to Files/share; restore the preview-first flow, then let the user save or share the actual PDF file from there. |
