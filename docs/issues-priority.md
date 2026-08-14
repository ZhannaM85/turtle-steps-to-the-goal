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

## Tier 135 — Sync a day's log to another copy (2026-08-14)

_Retargeted 2026-08-14: **full day entry** (sleep, weight, meals, steps, water, …), not a meal and not #661 food-share. Same-phone PWA ↔ iOS; QR for another device. Settings toggle off by default; when on, **refresh on Day** → what to send (whole day first) → clipboard/share/QR. Apply fills blanks and asks before overwrite. Reuse #661 transport only. Full backup stays Export/Import. UI consistency is Tier 136._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#717](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/717) | 📋 Not started | Epic: Sync a day's log to another copy (Day refresh + clipboard / share / QR) | Tracking. Local-only. Meal-row v1 was wrong; children retargeted |
| [#738](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/738) | 🔍 Pending validation | Hide day-sync behind a Settings toggle (off by default) | Store shipped. Copy rewritten to **day log**, not a meal. Day refresh is #720 |
| [#718](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/718) | 🔍 Pending validation | Day-entry snippet envelope (encode/decode) | `kind: 'day'` + compact `DailyEntry` on `shareDay`. Meal-only envelope removed |
| [#719](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/719) | 🔍 Pending validation | Apply day snippet: confirm, fill blanks, ask before overwrite | Fill empty; confirm overwrite; append meals; never wipe the day |
| [#720](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/720) | 🔍 Pending validation | Day screen: refresh control + what-to-send sheet | Toggle off → no icon. Whole day. Copy/share. Paste/QR later |
| [#721](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/721) | 🔍 Pending validation | Receive day snippet (paste, deep link, not full backup) | Confirm shell; `?shareDay=` does not run Epic 8 backup import |
| [#722](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/722) | 🔍 Pending validation | Show day-snippet QR on the send sheet | Same URL as copy/share. Over QR budget → copy/share + explanation, no broken code |
| [#723](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/723) | 🔍 Pending validation | Scan day-snippet QR (reuse #661, photo fallback) | Send sheet Scan QR + photo. Food QR is not applied as a day; food import rejects day QRs |
| [#724](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/724) | 🔍 Pending validation | iOS: open day snippet from share sheet / URL | `turtlesteps://` + `appUrlOpen` → same confirm as #721. Android intents still later |

---

## Tier 136 — UI consistency (2026-08-14)

_Split from Tier 135 at the user’s request so the audit is not mixed with the snippet epic (same calendar day, two topics). #716 is the investigation; children are the agreed work list. Not a design-system rewrite. Out of scope: StatCard gain de-emphasis (#29), iOS input zoom guard, heatmap 10px, dense meal-row icons, overlay-only shadows, `--input` vs `--border` (#11), recipe Save+Cancel `lg` (#474 exception). Same-day live UI report: #739 (shifted caret)._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#716](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/716) | 📋 Not started | Audit UI consistency (button sizes, inputs, forms) | Investigation delivered. Tracking parent for #725–#737. Do not implement here |
| [#725](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/725) | 🔍 Pending validation | Unify date inputs to 48px (h-12) | Dashboard/Export/delete-range/Goal week dates now h-12. Day WebKit exception (#647) kept |
| [#726](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/726) | 🔍 Pending validation | Grow Goal and Day-totals number fields to 48px | NumberInput default is now h-12; Input default stays h-8 |
| [#727](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/727) | 🔍 Pending validation | Food picker Add must use the xl footer CTA | size xl + w-full (#474). Recipe Save+Cancel lg left alone |
| [#728](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/728) | 🔍 Pending validation | Align Goal and Add-metric primary actions with the footer-CTA rule | Used documented lg Save + ghost Cancel (RecipeEditor), not a third default-size pair |
| [#730](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/730) | 🔍 Pending validation | Unify Add meal name/time/note heights with the dish sheet | Name/time/note now h-12. Close stays size-9 (#513) |
| [#732](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/732) | 🔍 Pending validation | One size for 100g/Portion tabs | Recipe + inline add now h-10 like the dish sheet. Settings chips untouched |
| [#729](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/729) | 🔍 Pending validation | Grow leftover 28px macro grids (food list, recipes, inline add) | Food-list / recipe / dishes inline macros now h-12 2-col like the dish sheet |
| [#731](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/731) | 🔍 Pending validation | One field-label recipe (shared Label) | Visible field labels use Label (text-sm font-medium). Hints/units stay muted. Icon-only stays aria-label |
| [#735](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/735) | 🔍 Pending validation | Pick one section-shell chrome (Card vs border-lg) | Two named chromes: number card (Card/StatCard) vs section-shell utility for charts/accordions/Export. Shadows stay overlay-only |
| [#733](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/733) | 🔍 Pending validation | Match Settings food-list dividers to meal cards | divide-foreground/15 like meal dishes (#464) |
| [#734](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/734) | 🔍 Pending validation | Goal mismatch banner: named warning token, not raw amber | Same muted notice as aggressive-pace (`border-border bg-muted`). Calendar constipation dots stay amber |
| [#736](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/736) | 🔍 Pending validation | Use shared Textarea, TextField, and Select instead of one-offs | Dish note → Textarea. Unused TextField removed (#731 Label+Input). Native Select primitive for meal-library sort + correlation pickers |
| [#737](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/737) | 🔍 Pending validation | Chart overlay readability (bar opacity, series colors, legend alignment) | Bars 40% fill. Overlay protein uses --stat-protein. Body-comp uses --stat-* / --chart-bodyfat. Type controls in a column |
| [#739](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/739) | 📋 Not started | Add dish name: caret sometimes shifted from typed text (iOS) | Intermittent. Screenshot: «Салат» with caret at left padding. Suggestions + Gboard + AutoFill bar. Not investigated |

---
