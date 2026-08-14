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

## Tier 135 — Send snippet to another copy (2026-08-14)

_Same-phone PWA ↔ iOS is the main case (clipboard / share sheet); QR stays so an Android (or laptop) copy can join later. Not a full backup — one logged meal, append, confirm before apply. Reuse #661 transport. **Full inventory (later kinds, Android intents, overwrite-on-edit, …) lives on the epic body** so those rows are not lost; they are not separate GitHub issues until we pull one off._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#717](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/717) | 📋 Not started | Epic: Send a logged snippet to another copy (clipboard / share / QR) | Tracking + complete later-backlog checklist. Local-only; no cloud/live sync. Full Export/Import remains the empty-app clone path |
| [#718](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/718) | 📋 Not started | Snippet envelope + meal schema (encode/decode) | v1 `kind: meal` only; size budget for QR |
| [#719](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/719) | 📋 Not started | Apply meal snippet: confirm, append, skip duplicates | New ids; ISO date not “today”; never replace the day. Depends on #718 |
| [#720](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/720) | 📋 Not started | Send meal to another copy (clipboard + share sheet) | Meal-row entry; reuse #661 share helpers. Depends on #718 |
| [#721](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/721) | 📋 Not started | Receive meal snippet (paste, deep link, not full backup) | Day + Settings paste; must not run Epic 8 backup import. Depends on #719 |
| [#722](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/722) | 📋 Not started | Show meal-snippet QR on the send sheet | Other-device path; oversized → copy/share, not a broken QR. Depends on #718, #720 |
| [#723](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/723) | 📋 Not started | Scan meal-snippet QR (reuse #661, photo fallback) | Distinguish food-share vs meal snippet. Depends on #722, #719 |
| [#724](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/724) | 📋 Not started | iOS: open meal snippet from share sheet / URL | Android handlers stay on #717 later list until #304. Depends on #721 |

---

## Tier 134 — Security + live feedback (2026-08-13)

_Logged while blocked on Apple Developer enrollment. Library CVEs via `npm audit` / Dependabot (#698–#701), then own-code hardening (#702–#704). Full tree had 27 findings; production-only had 5. Do **not** `npm audit fix --force`. Explicitly **not** filed: virus scanning of imports, DOMPurify on every text field, blocking images in meal-name inputs (plain text; no HTML-render sink today). Also live UI feedback from the same day (#707, #715)._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#715](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/715) | 🔍 Pending validation | Add food: portion weight change must rescale kcal/macros; keep per-100g as source of truth | Fixed: personal items with known `lastAmountG` open in per-100g via `ratesFromAbsolute`; Portion-mode weight edits rescale from a density baseline (`scaleTotalsByWeightChange`); 100g/Portion tabs get a stronger active ring. Validate: reuse 280 kcal/50g → change to 20g → totals drop (~112); switch to 100g still ~560/100g; tabs visually clear |

---
