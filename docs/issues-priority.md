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
| [#1011](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1011) | 🔍 Pending validation | Remove the parallel cholesterol food list | Meal search uses the food catalog only. `cholesterol-foods.json` is deleted. Day rows keep LDL stamps already stored by the #1008/#1009 IndexedDB upgrades; a name the catalog does not label stays unknown, and a later save does not clear a stored stamp. Calories and macros are unchanged. Awaiting on-device confirmation |

---

## Tier 173 — Live feedback (2026-09-27)

_A shared-food QR or link keeps each food's LDL impact and reason, including when several foods share one code. Settings search filters sections and rows so a long Settings page does not have to be scrolled to find LDL, sleep, or import. Reaching a weekly goal unlocks starting the next one right away; the badge still waits for the end of the week. Updating a catalog food's LDL note refreshes that note on meals already logged. Scrolling Settings keeps a section’s pin and collapse chevron behind the sticky title and search. On Day, a one-line calorie strip appears after the КБЖУ cards scroll away, and the sections used most can be pinned under the date. That strip must not shake the page while scrolling. On a new goal, Suggest stays off until the weekly kilograms to lose are greater than 0. On add and edit food, Save stays pinned at the bottom while the fields scroll. Sharing several selected foods adds every one of them, not only the last. Collapsed КБЖУ keeps that compact calorie line in the header, and the line sticks only while the section is collapsed. Add meal shows the same LDL label on search suggestions and foods already in the meal when the setting is on. A pinned Day section stays first in the list even when it is expanded; only a collapsed pin sticks. Meal and day-analysis exports include the LDL impact and reason for each food when LDL indicators are on. A pasted or saved packaged food with a barcode updates that catalog product, including its brand, instead of adding a duplicate. The collapsed КБЖУ stripe has padding so it sits clear of the heading, the pin, and the next section. That collapsed line shows eaten calories and macros over the daily goal, with a slash. A Settings catalog paste puts those foods at the top of add-meal Recent without logging them first. Scrolling down on Day while calories and macros are expanded collapses that block into the compact line, which stays collapsed until it is opened again._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#1019](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1019) | 🔍 Pending validation | Start a new goal as soon as this week’s target is reached | «Начать новую цель» enables when the reached banner appears, not at week end. The celebration’s action opens that same form (`/goal?startNew=1`); Close or Cancel leaves the current goal. The “keep it up through … to earn your badge” copy is unchanged if they don’t start a new one. Awaiting on-device confirmation |
| [#1020](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1020) | 🔍 Pending validation | Catalog import/update restamps diary LDL badges | When a catalog food's LDL impact or reason changes — Settings JSON import, or add/edit food — matching diary rows (Russian name, English name, and paste aliases; the same whole-name match as other LDL lookups), including older days, take that catalog value. Calories and macros stay as logged. The import helper no longer says the diary never changes. Awaiting on-device confirmation |
| [#1023](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1023) | 🔍 Pending validation | Goal form: Suggest stays off until weekly kg pace is greater than 0 | «Предложить цель» is disabled while the weekly kg field is empty or 0, with a hint to enter a weekly target first. It no longer fills maintenance calories without a pace. At 0.1 kg or more it still fills calories, macros, and fiber from that pace’s deficit. Save still requires a weekly target greater than 0. Awaiting on-device confirmation |
| [#1028](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1028) | 🔍 Pending validation | Share selected: receiver only gets the last food | A two-food link was already a `v: 2` batch and confirm already wrote both library rows. The open-meal listener ran once per dish and each call replaced the meal snapshot from when import opened, so only the last dish stayed (new meal and edit draft). Confirm now appends the whole batch in one call. Awaiting on-device confirmation |
| [#1026](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1026) | 🔍 Pending validation | Exports: include ЛПНП (cholesterolImpact) on meal + day analysis exports | Meals rows in CSV, Excel, Markdown, and the PDF diary line include the same LDL label as Day (helps / neutral / … / unknown) plus the reason. Both columns use the Settings LDL indicators toggle (`ldlImpact` on `AnalysisExportTrackingGate`); off omits them, and a missing tracking object still includes them. Send day and Settings interval exports share `mealLogExport`. No numeric LDL and no day-level rollup. Shared-food QR/link LDL is #1037. Awaiting on-device confirmation |
| [#1027](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1027) | 🔍 Pending validation | Catalog/import: accept barcode (+ brand) and dedupe by barcode | Paste accepts optional `barcode` and `brand` and stores them on the catalog row. If a barcode is present, that code matches an existing catalog row (and a personal-library food that already has it) before the Russian name; otherwise the name match is unchanged. Saving or scanning a barcode that is already on a catalog food updates that row instead of adding a second one. Homemade foods with no barcode stay name-based. Awaiting on-device confirmation |
| [#1035](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1035) | 🔍 Pending validation | Meal «Недавние»: Settings-imported foods on top | A successful Settings catalog paste lists those foods at the top of add-meal «Недавние» without a diary log. In one paste the last food is the newest. A later log of the same name takes that spot. Search, barcode dedupe, and LDL import are unchanged. Awaiting on-device confirmation |
| [#1037](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1037) | 🔍 Pending validation | Shared food QR/link: preserve ЛПНП on export and import | Food records in a share link are `v: 3` and carry `cholesterolImpact` plus `cholesterolReason`. A `v: 2` multi-food pack keeps that pair on every item, and import writes it onto the library row and the open meal. A `v: 1` link with no LDL fields still imports macros; impact stays unknown unless the name is already classified. Awaiting on-device confirmation |

---

## Tier 174 — Live feedback (2026-09-28)

_On Day, calories and macros that collapsed on their own while scrolling down open again once that block is back in normal flow. A collapse from the chevron stays collapsed. The КБЖУ title has space above it inside the card. Section pins and chevrons sit on the title line. The collapsed calorie line wraps instead of being cut off, and that beige line runs the full width of the section. While that line stays pinned, an opaque bar reaches the scrollport edges and covers whatever scrolls under it. The empty bands under the date and under the КБЖУ block are about half as tall; the eaten and remaining cards keep their earlier spacing. Blank local screen on Windows when AutoSleep vs-yesterday files collided by case. Collapsed КБЖУ drops the card’s top padding so the title sits closer to the date header. The beige calorie line also loses its top margin under the title. Expanding a sticky collapsed КБЖУ stripe keeps the block under the date and paints the cards over the content below, without scrolling the page. Opening КБЖУ uses the same space under the title and the same full width as that collapsed line, so the block does not jump._

| # | Status | Issue | Notes |
|---|--------|-------|-------|


