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
| [#1008](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1008) | 🔍 Pending validation | LDL-friendly label on each Day food | Each logged dish shows a compact LDL label (helps / neutral / moderate / limit / high / unknown). Tap shows a short reason. Existing foods are matched by exact name from the 113-food seed (including овсянка, чечевица, and the other added staples as helpful); everything else stays unknown. Калории и БЖУ не меняются. Awaiting on-device confirmation |
| [#1009](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1009) | 🔍 Pending validation | LDL reasons in Russian | Day LDL tips use the Russian `cholesterolReason` from the seed (English stays in `cholesterolReasonEn`). IndexedDB v16 runs the same name match again so previously stored English reasons become Russian. Impact levels, calories, and macros stay put. Awaiting on-device confirmation |
| [#1010](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1010) | 🔍 Pending validation | LDL staples in the searchable food catalog | The 15 staples (овсянка, семена льна, and the rest) are catalog foods: Russian name, per-100 g macros, and the LDL label on the same row. Meal search finds «Семена льна» and «Овсянка». Exact names already in the catalog (брокколи, морковь, баклажаны, семена чиа) were updated in place. Those names were removed from `cholesterol-foods.json` so it stays a one-time seed for other diary foods. Logged calories and macros are not rewritten. Awaiting on-device confirmation |
| [#1011](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1011) | 🔍 Pending validation | Remove the parallel cholesterol food list | Meal search uses the food catalog only. `cholesterol-foods.json` is deleted. Day rows keep LDL stamps already stored by the #1008/#1009 IndexedDB upgrades; a name the catalog does not label stays unknown, and a later save does not clear a stored stamp. Calories and macros are unchanged. Awaiting on-device confirmation |
| [#1012](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1012) | 🔍 Pending validation | Settings toggle: hide LDL cholesterol indicators (default off) | Day food rows hide the compact LDL label and its reason tip until Settings → What to track → Show LDL impact is on. Default is off. Stored `cholesterolImpact` and `cholesterolReason` stay on the food. Awaiting on-device confirmation |
| [#1013](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1013) | 🔍 Pending validation | Add/edit food: set LDL impact and an optional reason | When Settings LDL is on, «Добавить вручную», creating a catalog food, and editing a food show a qualitative LDL picker (helps / neutral / moderate / limit / high / unknown) and an optional reason. New foods start at unknown; nothing is guessed from calories or macros. The choice is saved on that same food. The fields hide when the setting is off, and stored notes stay. Awaiting on-device confirmation |
| [#1014](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1014) | 🔍 Pending validation | Catalog food «Салат Коул слоу» | One catalog row: Russian display name, per-100 g macros (95 kcal, protein 1.4, fat 7.5, carbs 6.3), and beneficial LDL. The Russian reason says «ЛПНП». Exact name updates that row in place. The older USDA «Коулслоу (салат из капусты)» row is unchanged. Meal search finds «Салат Коул слоу». Awaiting on-device confirmation |
| [#1016](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1016) | 🔍 Pending validation | AutoSleep scan: deep sleep empty when circled-z is over 4h | Fri 25 → Sat 26 Today shot: header 8h 53m, star 8h 6m, circled-z 5h 4m. The <4h deep cap (added so a lone star row such as 5h 56m or 7h 10m is not saved as deep) also dropped a real z duration over 4h. When both star and z are present, deep is the shorter one, including 5h 4m. A lone star row still leaves Глубокий сон empty. Awaiting on-device confirmation |
| [#1015](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1015) | 🔍 Pending validation | Settings: paste JSON to import catalog foods | Settings → What to track, under the LDL toggle: paste one food object or a `foods` list (optional `nutritionBasis: "per 100 g"`). Requires a Russian name plus calories and macros per 100 g. LDL impact defaults to unknown; the Russian reason is the one meal search keeps. The same Russian name updates that catalog row and does not add a second one. Diary history is not rewritten. Import still works while the LDL toggle is off; the Day note stays hidden until the toggle is on. Awaiting on-device confirmation |
| [#1017](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1017) | 🔍 Pending validation | Logged foods in the meal-search catalog | 57 of the 58 logged foods are on the one catalog (exact Russian name, per-100 g macros, LDL). 48 added, 9 updated in place, including «Салат Коул слоу» (still one row). Пеламида атлантическая has 0 g carbs. Кекс ореховый is not added: protein and fat were missing and no catalog row had that exact name. Brands are not stored; the food row has no brand field. Awaiting on-device confirmation |

---

## Tier 173 — Live feedback (2026-09-27)

_Settings search filters sections and rows so a long Settings page does not have to be scrolled to find LDL, sleep, or import. Reaching a weekly goal unlocks starting the next one right away; the badge still waits for the end of the week. Updating a catalog food's LDL note refreshes that note on meals already logged. Scrolling Settings keeps a section’s pin and collapse chevron behind the sticky title and search._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#1018](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1018) | 🔍 Pending validation | Settings search field to find sections and rows | Sticky search at the top of Settings. Empty query shows the full page in the same order. Typing filters by section titles and visible row labels in both languages, so «LDL», «сон», and «импорт» each reveal the matching cards and, where a card has several rows, only the matching rows. Clear (×) restores everything. Awaiting on-device confirmation |
| [#1019](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1019) | 🔍 Pending validation | Start a new goal as soon as this week’s target is reached | «Начать новую цель» enables when the reached banner appears, not at week end. The celebration’s action opens that same form (`/goal?startNew=1`); Close or Cancel leaves the current goal. The “keep it up through … to earn your badge” copy is unchanged if they don’t start a new one. Awaiting on-device confirmation |
| [#1020](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1020) | 🔍 Pending validation | Catalog import/update restamps diary LDL badges | When a catalog food's LDL impact or reason changes — Settings JSON import, or add/edit food — matching diary rows (Russian name, English name, and paste aliases; the same whole-name match as other LDL lookups), including older days, take that catalog value. Calories and macros stay as logged. The import helper no longer says the diary never changes. Awaiting on-device confirmation |
| [#1021](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1021) | 🔍 Pending validation | Settings sticky header hides section pin and collapse icons | Card pin and collapse controls are `z-10` and are not trapped by the panel, so they painted over the #1018 sticky title/search band (also `z-10`) in the gap around the search field. That band is now `z-20` with the same opaque background, so those icons stay behind it. Search filtering is unchanged. Awaiting on-device confirmation |

