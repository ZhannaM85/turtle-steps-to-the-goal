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
| [#927](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/927) | 🔍 Pending validation | PDF diary: align meal card dividers within each card | Replaced the overlapping meal-item divider with an em dash before each item. Awaiting device PDF validation. |
| [#928](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/928) | 🔍 Pending validation | PDF export: vertically center page, section, and table headers | Capture-adjusted padding now centers date, section, and weekly-table text; metric icons share the text baseline. Awaiting on-device confirmation. |
| [#929](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/929) | 🔍 Pending validation | PDF diary: reduce Metrics and Notes body text size | Metrics and Notes use compact `9pt` text; metric labels are bold and both cards have safer inner spacing. Awaiting on-device confirmation. |
| [#930](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/930) | 🔍 Pending validation | PDF diary: show total water beside the Water title | The total stays directly beside Вода/Water, with added left and bottom content clearance. Awaiting on-device confirmation. |
| [#932](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/932) | 🔍 Pending validation | PDF diary: footer still cut off, generated date not visible | Pages and footers now have right/bottom safety clearance, and every footer shows its page number. Awaiting on-device confirmation. |
| [#933](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/933) | 🔍 Pending validation | PDF layout preview route for browser inspection | `/settings/pdf-layout` shows each PDF page as a separate sheet and now uses the photographed export preview added by #935. Awaiting browser confirmation. |
| [#935](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/935) | 🔍 Pending validation | PDF layout preview cannot predict the iOS PDF | Preview photographs pages through the same html2canvas path as export; the latest spacing and alignment fixes were tuned against that captured output. Awaiting on-device confirmation. |
| [#937](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/937) | 🔍 Pending validation | Complete the day chart: lighten the dashed grid | Dashes use muted-foreground at 35% opacity, 1px. Awaiting on-device confirmation. |
| [#938](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/938) | 🔍 Pending validation | Complete the day chart: x-axis labels are cut off | Today / 5 weeks now start- and end-anchored so they stay inside the plot. Awaiting on-device confirmation. |

## Tier 165 — PDF footer whitespace and Day chrome (2026-09-17)

_Reported from an iPhone PDF export and the Day screen._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#939](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/939) | 🔍 Pending validation | PDF diary: excessive blank band below the footer | iPhone dump: 980px `.pdf-page-fill` was rasterized **below** `.pdf-footer` (121–360px white in the bitmap). Capture now ends at the footer (no fill strut); footer slice is pinned to the A4 content canvas so jsPDF keeps ~10mm bottom margin. pdfDebug toggle #952 kept for re-check. Awaiting on-device confirmation. |
| [#940](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/940) | 🔍 Pending validation | PDF diary: increase meal item and water log fonts by 2pt | Meal item lines in Еда cards are `11pt` (was `9pt`); water log lines are `9.5pt` (was `7.5pt`). Meal titles and Metrics/Notes body are unchanged. Awaiting on-device confirmation. |
| [#941](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/941) | 🔍 Pending validation | PDF diary: match Показатели header to other section headers | Metrics title lead now uses the same `10.5pt` / `600` / inherited color as Еда, Вода, and Заметки; chips stay `7.5pt` / `400` on the same row. Awaiting on-device confirmation. |
| [#942](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/942) | 🔍 Pending validation | PDF summary: widen Неделя column so week ranges stay on one line | Weekly-averages **Неделя** cells are `46%` + `white-space: nowrap`, so ranges like `7 сент. 2026 г. – 13 сент. 2026 г.` stay on one line. Awaiting on-device confirmation. |
| [#943](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/943) | 🔍 Pending validation | Export: keep info icons tight beside buttons (CSV and other rows) | Shared `ControlWithInfo` row (`inline-flex w-fit gap-2`) so CSV and PDF-picker ⓘ sit ~8px after the control instead of stretching to the far edge. Awaiting on-device confirmation. |
| [#944](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/944) | 🔍 Pending validation | Day: lighten Завершить день to match Начать сегодняшний день сейчас | Complete-day CTA now uses `variant="outline"` (`border-border bg-background`, dark text) — same chrome as Start today's log now. Awaiting on-device confirmation. |
| [#945](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/945) | 🔍 Pending validation | Projection chart: show actual end date, not only “N недель” | Right x-axis end label now pairs the 5-week span with the calendar date (`5 weeks · Apr 5, 2026` / `5 недель · 5 апр. 2026 г.`). Footer “over 5 weeks” copy is unchanged. Awaiting on-device confirmation. |
| [#946](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/946) | 🔍 Pending validation | Complete-day projection: two-line chart like About instruction | Solid daily projected weight (`--chart-weight`, 2.5) plus dashed 7-day companion (`--muted-foreground`, 1.5, `4 3`) matching the About/Dashboard weight-trend dual series. Follow-up: #947 (oscillating daily points; date-only axis). Awaiting on-device confirmation. |
| [#947](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/947) | 🔍 Pending validation | Complete-day projection: oscillating daily weight + dashed 7-day average | Solid «вес» is seeded synthetic daily points oscillating around the projected trend (not a lone straight diagonal). Dashed «среднее за 7 дней» is the trailing average of that series. Legend uses solid vs dashed line samples. X-axis end is the calendar date only (`Apr 5, 2026` / `5 апр. 2026 г.`); footer “over 5 weeks” unchanged. Start/end markers and estimate label kept. Awaiting on-device confirmation. |
| [#948](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/948) | 🔍 Pending validation | Complete-day projection: Week/Month/Year tab bar (not fixed 5 weeks) | Segmented Неделя / Месяц / Год tabs (Export period chrome). Default Week. Horizons: Week=7, Month=30, Year=365 days. Switching a tab recalculates the path, date-only x-axis end, and footer duration. Keeps #947 oscillating daily вес, dashed 7-day average, and legend line samples. Awaiting on-device confirmation. |
| [#949](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/949) | 🔍 Pending validation | Complete-day projection: X/Y axis ticks (days and weight) | Visible axis tick marks + labels. Y: weight (kg/lb), thinned on Year. X: day numbers — Week every day, Month every 5 days, Year every 60 days. Keeps Today + date-only end, start/end markers, #947 series/legend, #948 tabs. Awaiting on-device confirmation. |
| [#950](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/950) | 🔍 Pending validation | Projection chart: balance вес oscillation equally above/below average | Daily вес is zero-mean noise around the projected path (high-pass + centered residuals). Dashed 7-day average is a centered window of that series so it cuts through the middle instead of riding above. Keeps #947 oscillation/legend/date-only end, #948 Week/Month/Year tabs, #949 axis ticks. Awaiting on-device confirmation. |
| [#952](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/952) | 🔍 Pending validation | PWA: Settings button to toggle PDF pdfDebug overlay | Settings → Export PDF has an On/Off for temporary capture debug; writes `localStorage pdfDebug` (same as `?pdfDebug=1`). Overlay from `d428f35` unchanged. Awaiting on-device confirmation. |
| [#953](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/953) | 🔍 Pending validation | Projection X-axis: date labels under grid lines only (no day numbers) | X ticks = vertical dashed grid (`completeDayWeekGridTicks`). Labels are localized short dates, including Today’s date; no `5`/`10`/`15` day counts and no extra unlabeled ticks. Y weight ticks and Week/Month/Year horizons unchanged. Awaiting on-device confirmation. |
| [#954](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/954) | 🔍 Pending validation | Projection Year view: restore full horizontal weight grid | Year horizontal dashed grid uses the same labeled Y ticks as Week/Month (full-width lines at 40, 45, …), not a 500 g comb. Keeps #953 date-only X labels. Awaiting on-device confirmation. |
| [#955](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/955) | 🔍 Pending validation | Projection modal: move estimate up so content fits without scroll | Estimate sits beside the chart legend; sheet uses compact gaps and kcal rows so Year fits one iPhone viewport. Chart stays `h-56`. Tab bar chrome unchanged (#951). Awaiting on-device confirmation. |
