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

_Day КБЖУ / export labels & gating; Day date-nav checkmark; PDF HTML+CSS stack migration (#905)._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#895](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/895) | ⬜ Open | Daily Log export: include calorie and macro targets next to actual intake | CSV / Excel Daily Log / Markdown. JSON backup already has Goal targets. Resolve the Goal that applied that date. |
| [#896](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/896) | ⬜ Open | Daily and Settings exports: show calorie and macro goal vs actual intake | Day-share CSV + Settings CSV/Excel/Markdown — not PDF. Pairs with #895. |
| [#897](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/897) | ⬜ Open | Day КБЖУ card and monthly summaries: show calorie/macro goal vs actual intake | Follow-up to #521 (calorie remaining line). Macros remaining-only today. Weekly nutrition comparison if same work; do not invent a monthly weight target. |
| [#898](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/898) | ⬜ Open | Exports still include fields the user is not tracking | Follow-up to #744. Day-share CSV: empty waist/hips, body fat %, Na/K/Mg, **«Алкоголь» while not tracking**. Audit Settings CSV/Excel/Markdown and PDF day pages too. JSON backup stays complete. |
| [#899](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/899) | ⬜ Open | Export: label next-morning weight with the actual date, not «next morning» | «Вес следующим утром» confuses LLMs as today’s weight. Use the next calendar date in the header (follow-up to #832 wording). |
| [#900](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/900) | 🔍 Pending validation | Export: include the date on the Morning note column | One-day exports: «Morning note YYYY-MM-DD» / «Утренняя заметка …». Multi-day keeps undated label. |
| [#901](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/901) | 🔍 Pending validation | Export: rename Note to Evening note and include the date | Daily Log uses «Evening note» / «Вечерняя заметка»; one-day exports append the ISO date. Meal «Note» unchanged. |
| [#902](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/902) | 🔍 Pending validation | Export: constipation column should be true/false from user selection | Unset → `false` (matches Day «Нет»); Yes → `true`. |
| [#903](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/903) | ⬜ Open | Export: label night food as spanning the overnight dates (e.g. 14→15) | «Ночная еда» is overnight; header/value should say с 14 на 15 (same LLM date clarity as #899–#901). |
| [#904](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/904) | 🔍 Pending validation | Day date nav: checkmark cramped between next arrow and Today | Check grouped with the date pill (before ›), not between next and Today. |
| [#905](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/905) | ⬜ Open | PDF export: migrate off jsPDF to HTML+CSS pipeline for real styling | User decision 2026-09-15 — need CSS in PDFs. Local-first library TBD. Covers summary + #891 day pages. |

---

## Tier 162 — Live feedback (2026-09-14)

_Found while validating Settings groups / Day accordion / DateInput / PDF export on device._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#892](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/892) | ⬜ Open | PDF footer date/disclaimer overlaps page content | **Not validated 2026-09-15** — footer still overlaps first-page summary (Шаги / Вода). Prior reserve-band fix insufficient; needs rework. |
| [#894](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/894) | 🔍 Pending validation | Day share sheet: save this day as PDF | Implemented 2026-09-15. Next to Save as CSV (#795); one viewed day, #891 readable block (not Settings range summary). |
