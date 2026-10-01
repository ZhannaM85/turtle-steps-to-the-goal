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

## Tier 172 — Live feedback (2026-09-26)

_The meal-name list fits its longest option and opens over the sheet instead of pushing the page down. Meal search collapses the same dish when the name and per-100 g nutrition match, even if the saved portions differ. Zepp screenshot fill keeps visceral fat from the «Висцеральный жир» row. Day foods show a compact LDL-impact label, with the reason in Russian. Meal search includes the LDL staples from the food catalog. The parallel cholesterol list is removed; meal search uses the catalog only. Day LDL labels stay hidden until Settings turns them on. Adding or editing a food can set that food's LDL note when the setting is on. Meal search includes «Салат Коул слоу» with per-100 g macros and a helpful LDL label. AutoSleep screenshot fill keeps circled-z deep sleep when that duration is over 4 hours (5h 4m). Settings can paste a food JSON blob into that same catalog. Meal search includes the logged foods from the 58-food list, with per-100 g macros and an LDL note._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#1007](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1007) | 🔍 Pending validation | Zepp screenshot: visceral fat parsed as 6 instead of 14 | «Висцеральный жир 14» was saved as 6 — the «6 элементов не достигли цели» count. A bare 6 above that header is dropped, a leading 6 on the visceral line loses to the row value (including the next lines), and eng-tessdata `3neMeHToB` / `Bucuepa…` still map to 14. Same screen still reads жир 28,7 · вода 50,8 · кости 3,07 · мышцы 57,31. Awaiting on-device confirmation |

---

## Tier 173 — Live feedback (2026-09-27)

_A shared-food QR or link keeps each food's LDL impact and reason, including when several foods share one code. Settings search filters sections and rows so a long Settings page does not have to be scrolled to find LDL, sleep, or import. Reaching a weekly goal unlocks starting the next one right away; the badge still waits for the end of the week. Updating a catalog food's LDL note refreshes that note on meals already logged. Scrolling Settings keeps a section’s pin and collapse chevron behind the sticky title and search. On Day, a one-line calorie strip appears after the КБЖУ cards scroll away, and the sections used most can be pinned under the date. That strip must not shake the page while scrolling. On a new goal, Suggest stays off until the weekly kilograms to lose are greater than 0. On add and edit food, Save stays pinned at the bottom while the fields scroll. Sharing several selected foods adds every one of them, not only the last. Collapsed КБЖУ keeps that compact calorie line in the header, and the line sticks only while the section is collapsed. Add meal shows the same LDL label on search suggestions and foods already in the meal when the setting is on. A pinned Day section stays first in the list even when it is expanded; only a collapsed pin sticks. Meal and day-analysis exports include the LDL impact and reason for each food when LDL indicators are on. A pasted or saved packaged food with a barcode updates that catalog product, including its brand, instead of adding a duplicate. The collapsed КБЖУ stripe has padding so it sits clear of the heading, the pin, and the next section. That collapsed line shows eaten calories and macros over the daily goal, with a slash. A Settings catalog paste puts those foods at the top of add-meal Recent without logging them first. Scrolling down on Day while calories and macros are expanded collapses that block into the compact line, which stays collapsed until it is opened again._

| # | Status | Issue | Notes |
|---|--------|-------|-------|

---

## Tier 174 — Live feedback (2026-09-28)

_On Day, calories and macros that collapsed on their own while scrolling down open again once that block is back in normal flow. A collapse from the chevron stays collapsed. The КБЖУ title has space above it inside the card. Section pins and chevrons sit on the title line. The collapsed calorie line wraps instead of being cut off, and that beige line runs the full width of the section. While that line stays pinned, an opaque bar reaches the scrollport edges and covers whatever scrolls under it. The empty bands under the date and under the КБЖУ block are about half as tall; the eaten and remaining cards keep their earlier spacing. Blank local screen on Windows when AutoSleep vs-yesterday files collided by case. Collapsed КБЖУ drops the card’s top padding so the title sits closer to the date header. The beige calorie line also loses its top margin under the title. Expanding a sticky collapsed КБЖУ stripe keeps the block under the date and paints the cards over the content below, without scrolling the page. Opening КБЖУ uses the same space under the title and the same full width as that collapsed line, so the block does not jump._

| # | Status | Issue | Notes |
|---|--------|-------|-------|

---

## Tier 175 — Live feedback (2026-09-29)

_Adding a food to a meal refreshes its place in Recent, including a built-in catalog food. Pasted foods still show without a meal log and rank by import time against that meal-add time._

| # | Status | Issue | Notes |
|---|--------|-------|-------|

---

## Tier 176 — Live feedback (2026-10-01)

_About and Features list what shipped in Tiers 172–175: optional LDL tags, the sticky calories-and-macros line and section pins on Day, Recent ranked by meal-add and catalog-import time, Settings catalog paste with barcode updates, one QR or link for several foods, Settings search, starting the next weekly goal as soon as this one is reached, and LDL in meal and day exports. Privacy notes that a food QR or link — and a day log shared the same way — leaves the device. About drops the line under «О приложении». Add meal’s five quick actions are tighter, and Import JSON uses the same catalog paste as Settings so those foods rank in Recent. Focusing the empty food search opens Recent as a solid list over the homemade chip and the meal note. Typing in that field opens matches in the same list, with Search online inside it. The homemade pill under search is hidden for now; saved homemade dishes stay. A night-food note is labeled «Заметка о ночной еде» and stays behind a pencil until it has text. Those five add-meal actions sit in one menu on the same row as why-eating, each half the width. The search dropdown no longer has Show all or Collapse; a long list scrolls inside the panel._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#1052](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1052) | 🔍 Pending validation | About/Capabilities: document Tier 172–175 (LDL, sticky КБЖУ, Недавние, catalog paste, multi-share) | en+ru Capabilities now cover optional LDL tags, the sticky Day calorie line and section pins, Recent ranking, catalog JSON paste with barcode/brand updates, one QR or link for selected foods, Settings search, starting the next goal when this week’s is reached, and LDL in meal and day exports. Privacy says a food QR/link (and a day-log share) leaves the device. Release note v1028. Awaiting on-device confirmation |
| [#1053](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1053) | 🔍 Pending validation | About: remove redundant subheader under «О приложении» | en+ru About title no longer has «Что это за приложение и зачем оно нужно» / "What this app is, and why it exists". Release note v1029. Awaiting on-device confirmation |
| [#1054](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1054) | 🔍 Pending validation | Add meal: compact CTAs + catalog JSON import | Five tighter quick actions, including Import JSON. Paste uses the Settings catalog import (per 100 g, barcode or Russian-name dedupe) and stamps `updatedAt`, so Recent ranks the import without a meal log. Settings paste stays. Release note v1030. Awaiting on-device confirmation |
| [#1055](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1055) | 🔍 Pending validation | Add food: show Недавние only when search is focused | The always-on Recent section is gone. Focusing the empty search field opens the same ranked recents (and Show all, when the pool is longer) as a dropdown under the field. Blur or Escape hides it. Typing still uses the normal search results. Release note v1031. Awaiting on-device confirmation |
| [#1056](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1056) | 🔍 Pending validation | Add food: recents dropdown covers homemade and the night-food note | The empty-search recents panel is an opaque popover stacked above the homemade chip and the meal note, so those controls no longer show through the list. Focus, blur, Escape, and ranking from #1055 are unchanged. Release note v1032. Awaiting on-device confirmation |
| [#1057](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1057) | 🔍 Pending validation | Add food: typed search results as a dropdown under the field | Matches and Search online sit in the same opaque under-field panel as Recent, so they no longer render below the homemade chip. Empty-focus recents, blur, Escape, ranking, and pick-to-add stay as in #1055/#1056. Release note v1033. Awaiting on-device confirmation |
| [#1058](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1058) | 🔍 Pending validation | Add food: hide the Домашнее pill under search | The meal-search screen no longer shows the homemade filter pill. Tagged foods stay in the catalog, and the dish editor checkbox is unchanged. Search dropdowns from #1055–#1057 stay. Release note v1034. Awaiting on-device confirmation |
| [#1059](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1059) | 🔍 Pending validation | Add food: night note «Заметка о ночной еде» behind a pencil | An empty night-food note is a pencil; tapping it opens the field, and a note that already has text stays open. The label and placeholder are «Заметка о ночной еде» / "Note about night food". Other meals keep the open note field. Release note v1035. Awaiting on-device confirmation |
| [#1060](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1060) | 🔍 Pending validation | Add food: five CTAs → dropdown beside why-eating | The five quick actions are one «Добавить…» / "Add…" menu on the same row as why-eating, each half the width when that field is shown. Choosing an item still adds a dish, scans a barcode, logs a recipe, opens a shared food, or imports catalog JSON. Release note v1036. Awaiting on-device confirmation |
| [#1061](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1061) | 🔍 Pending validation | Add food: drop Показать все / Свернуть; scroll the dropdown | Recent and typed matches stay in the under-field panel. Show all and Collapse are gone. The panel has a max height and scrolls, so the full ranked list stays reachable. Focus, blur, stacking, and pick-to-add stay as in #1055–#1057. Release note v1037. Awaiting on-device confirmation |
