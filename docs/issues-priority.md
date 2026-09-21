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

---

## Tier 165 — Live iPhone feedback (2026-09-19)

_Intermittent layout issue observed after returning to the installed app._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#970](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/970) | 🔍 Pending validation | Keep bottom navigation anchored after resuming from background | Still reproduced after #974. Root cause: `position: fixed; bottom: 0` on the tab bar — iOS PWA resume can leave `visualViewport` shortened, so WebKit anchors the bar mid-page over Day content. Matched my-money: flex-column shell, `html/body/#root` overflow hidden, inner `#main-content` scrollport, in-flow `shrink-0` footer (no fixed/translate compensate). Awaiting on-device confirmation |

---

## Tier 166 — Live iPhone feedback (2026-09-20)

_Exact 0.1 kg weekly loss counted as missed; past-goal reached date vs week end; bottom nav hiding while scrolling._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#971](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/971) | 🔍 Pending validation | Goal: exact 0.1 kg loss marked not reached (59.8 → 59.7) | IEEE-754 made `59.8 - 59.7` slightly under 0.1 (`0.0999…`), so the compare failed at the exact displayed boundary. Weights, loss, and target are rounded to 1 decimal kg. Regression uses the 2026-09-14…20 export week (baseline 59.8, last day 59.7, target 0.1). Awaiting on-device confirmation |
| [#972](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/972) | 🔍 Pending validation | Past goals: don’t show mid-week achieved date | Reached rows now use `weekEnd` for «Цель достигнута {date}», not `metOnDate`. Weight delta unchanged; not-reached rows unchanged. Example: week 14–20 сент. met on 19 сент. → status date 20 сент. Awaiting on-device confirmation |
| [#973](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/973) | 🔍 Pending validation | Bottom footer/nav disappears while scrolling, reappears on scroll release | App bottom tab bar, not the PDF diary footer. `visualViewport` `scroll` during a finger pan was treated as a keyboard shrink (#188/#970), so the bar unmounted for the gesture and returned on touch end. Hide only while a soft keyboard is open or animating closed; no-keyboard shrinks stay visible. Awaiting on-device confirmation |
| [#974](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/974) | 🔍 Pending validation | Bottom nav: match my-money — always visible, no visualViewport hide | Locked to my-money: tab bar always mounted. Removed `useVisualViewportShrunk` / `visualViewportTabBar` / `useIsTextInputFocused` hide-and-unmount (including #970 stale-gap translate and #973 keyboard-only hide). Soft-keyboard overlap is an accepted tradeoff; dialogs keep `dvh` + overflow scroll. Awaiting on-device confirmation |

---

## Tier 167 — Live iPhone feedback (2026-09-21)

_Overview graphs excluding today._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#975](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/975) | 🔍 Pending validation | Обзор graphs: week/month range ends yesterday, excludes today | Through-now Week/Month/Year windows used day-start “today,” so a morning weigh-in before that cutoff (or after starting the day early) sat on calendar today while the graph ended yesterday. Range end is the local calendar day after 06:00; overnight still follows day-start. Awaiting on-device confirmation |


