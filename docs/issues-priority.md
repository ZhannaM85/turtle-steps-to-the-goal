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

---

## Tier 168 — Live iPhone feedback (2026-09-22)

_AutoSleep screenshot confirm: compare scanned sleep with yesterday. Meal cards: compare calories with the last day that had that meal. Add-meal search sits directly above the dish list. Status-bar tap scrolls the active screen to the top._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#976](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/976) | 🔍 Pending validation | AutoSleep scan modal: delta vs yesterday for sleep and deep sleep | Confirm modal («Из скриншота AutoSleep») shows the same ↑/↓ hours-and-minutes “compared to yesterday” line as entry comparisons, under Часов сна and Глубокий сон. Baseline is the calendar day before the open Day (`sleepHours` / `deepSleepHours`); a missing metric is omitted, not treated as zero, and an older day is not used. Nothing is written until «Сохранить эти числа». Awaiting on-device confirmation |
| [#977](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/977) | 🔍 Pending validation | Meal delta: compare to last day with that meal, not only yesterday | Day meal cards compare kcal with the latest earlier day that has the same meal name. Yesterday still says “compared to yesterday”; an older day is named with the app date. No prior meal of that name omits the line (not treated as zero). Awaiting on-device confirmation |
| [#978](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/978) | 🔍 Pending validation | Meal screen: food search directly above the dish list | Add-meal browse order is now the 2×2 actions (add / barcode / recipe / QR), then Поиск…, then Недавние or search results. The action grid no longer sits between the field and the list it filters; the barcode icon on the field stays. Awaiting on-device confirmation |
| [#979](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/979) | 🔍 Pending validation | iOS: tap status bar scrolls the active screen to the top | After #970 the document does not scroll, so iOS status-bar tap no longer reaches the top. The app header, including the safe-area strip, calls `scrollAppToTop` (window, `#main-content`, and nested overflow scrollers), matching my-money. In-flow tab bar is unchanged. Awaiting on-device confirmation |

---

## Tier 169 — Live feedback (2026-09-23)

_Edit meal quantity tab; share a meal composition as one QR or link; create a recipe from selected meal foods._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#981](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/981) | 🔍 Pending validation | Edit meal / QR share: default Количество tab should be 100 г, not Порция | `draftFromCalorieItem` (edit, and a QR-imported line opened the same way) always set Порция and showed the stored portion totals (136 kcal / 50 g). It now opens on 100 г via `ratesFromAbsolute` (272 kcal / 0.5 × 100 г). Switching to Порция still converts weight and kcal. Awaiting on-device confirmation |
| [#982](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/982) | 🔍 Pending validation | Share multiple foods at once via one QR code or link | Section share beside «Состав приёма пищи» encodes every named dish as one `?shareFood=` link. Two or more foods use `v: 2` `{ items: [v: 1, …] }`; one dish stays `v: 1`. The recipient reviews the list and adds all of them (existing barcode/name matches update). Per-row share is unchanged. Awaiting on-device confirmation |
| [#983](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/983) | 🔍 Pending validation | Create recipe from selected meal foods (long-press multi-select) | Long-press a row in «Состав приёма пищи» to select dishes. «Поделиться выбранным» (2+ foods) sends that subset as one `?shareFood=` link. «Создать рецепт» saves one recipe with one serving; ingredients are the selected dishes, calories and macros are summed, and per 100 g is scaled from the total weight. Section share and per-row share stay. Awaiting on-device confirmation |

---

## Tier 170 — Live feedback (2026-09-24)

_Day boundary is the calendar date. Late-night logs stay on the open day page. Day water chips follow clock order._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#984](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/984) | 🔍 Pending validation | Remove day-start setting and Start today now; late-night logs stay on the open day page | Removed Settings «Начало дня» and the Day banner «Начать сегодняшний день сейчас». «Сегодня» and Overview through-now ranges use the calendar date, including after midnight. A new meal is saved on the day page that is open. Clocks before 06:00 on that same entry still sort after the evening meals (fasting / last meal). Already-logged history is not rewritten. Awaiting on-device confirmation |
| [#985](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/985) | 🔍 Pending validation | Day: sort water chips by time | Water chips followed save order, so the two-column grid could show 11:33 before 10:33. The Day list sorts a copy by clock time, earliest first (untimed chips stay after timed ones). Totals, storage, and add/delete are unchanged. Awaiting on-device confirmation |

---

## Tier 171 — Live feedback (2026-09-25)

_Create recipe from a meal: warn when a selected food, the same ingredient set, or the typed title is already a recipe, and offer to add the new recipe in place of those foods. Meal search finds saved recipes by name, collapses identical name-and-macro rows, and can delete an unused copy with a long-press. Add dish: protein, fat, and carbs on one row, and the optional brand starts collapsed. Empty food search shows manual add as a button and prefills the dish name from the query. Dishes can be marked homemade and filtered in meal search. The empty add-food sheet scrolls before any dish is added. Repeat yesterday's meal keeps a meal-type name when the meal title is cleared, and that action is now an icon in the name/time row. The meal search field no longer has its own barcode icon. The add-food title and close stay fixed while the sheet scrolls. Meal type is a dropdown instead of wrapping name chips._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#986](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/986) | 🔍 Pending validation | Create recipe: warn when selected ingredients already exist as recipes + copy name | «Создать рецепт» lists selected dishes whose names match a saved recipe (same normalized name as the food library; recipes stay keyed by id). «Скопировать название» fills «Название рецепта» with the stored name and also copies it. Save stays available for any non-empty title. Awaiting on-device confirmation |
| [#987](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/987) | 🔍 Pending validation | Create recipe: after save, offer to add recipe and replace selected ingredients | After «Создать рецепт» saves, the meal asks whether to add that recipe. «Добавить» inserts one serving and removes the foods that were selected; «Не добавлять» leaves the meal unchanged. The recipe stays in the library either way. Awaiting on-device confirmation |
| [#988](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/988) | 🔍 Pending validation | Create recipe: warn when the same foods, or the typed title, already exist as a recipe | «Создать рецепт» still lists selected dishes whose names match a saved recipe (#986). It also warns when another recipe has the same set of foods (normalized name, order ignored, grams ignored) and names that recipe, and when «Название рецепта» matches a saved name the same way. «Скопировать название» fills the title. Save stays available for any non-empty title. Awaiting on-device confirmation |
| [#989](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/989) | 🔍 Pending validation | Meal search: saved recipes not found (e.g. «Бутер» → empty) | Meal Поиск… only searched recent library foods and the built-in list, so a saved recipe never matched. Search now includes recipe names with the same trim and case-insensitive substring as other dishes. «Бутер» finds «Бутерброд с форелью». Recent foods are unchanged. Awaiting on-device confirmation |
| [#995](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/995) | 🔍 Pending validation | Meal search: one row for the same name and macros, long-press delete | «Бутер» listed two «Бутерброд с форелью» rows with the same kcal and БЖУ. Hits that share a display name and the same rounded kcal/protein/fat/carbs now show once; a recipe wins over a dish. Long-press or right-click opens a confirm dialog. An extra catalog copy is removed and the row stays. Deleting the last dish or recipe is blocked when a saved meal still uses that name, so history lines stay put. Awaiting on-device confirmation |
| [#996](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/996) | 🔍 Pending validation | Add food: not scrollable until first food / Готово appears | The sheet’s only flex child (`flex-1` / `overflow-y-auto`) sized to its content on WebKit until the Готово footer mounted, so `overflow-hidden` clipped the empty meal and nothing scrolled. The scroll frame is now height 0 + flex-grow with an absolute inset scrollport, independent of that footer. Awaiting on-device confirmation |

---

## Tier 172 — Live feedback (2026-09-26)

_The meal-name list fits its longest option and opens over the sheet instead of pushing the page down._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#1005](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/1005) | 🔍 Pending validation | Meal name dropdown: fit content width + overlay | The open «Название приёма пищи» list is at least as wide as the closed control and grows to the longest option, so «Ночная еда» stays on one line. It is `absolute` (z-30, opaque) over the sheet, so opening it does not grow the header or push «Почему я сейчас ем?» down. Closed name, time, repeat, and info stay on the same row. Awaiting on-device confirmation |

