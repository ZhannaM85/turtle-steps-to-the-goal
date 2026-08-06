# Issues Priority — Archive tiers 123+

Closed rows from Tier 123 onward. Open / pending items stay in [`../issues-priority.md`](../issues-priority.md).

---

## Tier 123 — Product-owner audit batch (2026-08-04)

_Filed from the product-owner audit in `C:\Users\User\Projects\docs\turtle-steps-ideas\2026-08-04-product-audit\`. All other open / pending items from this tier live in the active file._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#607](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/607) | ✅ Done | Optional alcohol day signal and next-day weight correlation | `DailyEntry.hadAlcohol` + `useAlcoholTrackingStore`, mirrors `hadConstipation`/`nightEatingCorrelation` exactly. New `AlcoholCorrelationView` (only Settings-gated correlation view). Export/import covered. Confirmed working on-device 2026-08-06 |
| [#609](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/609) | ✅ Done | Local PDF summary export for sharing outside the app | New `exportPdf.ts` (jsPDF + jspdf-autotable, both new deps, dynamically imported): weight trend (hand-drawn line), weekly-averages table, optional latest body measurements, non-medical disclaimer on every page. Own 30/90-day picker. Confirmed working on-device 2026-08-06 — follow-up filed as #629 (section picker modal) |
| [#603](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/603) | ✅ Done | Named serving descriptors for personal meal items | New `MealItem.servings?` + `setServings` store action; editable in Settings' meal-item editor, selectable in `FoodPickerDialog.tsx` (same scaling as curated foods, #254). Export/import covered, no version bump. Confirmed working on-device 2026-08-06 |
| [#612](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/612) | ✅ Done | Settings help: using two devices with local-only backups | New "Using two devices" card directly above Export in `SettingsScreen.tsx` — intro + 3-step numbered list (this device = live data, Export = portable backup, Import = merge). No sync backend mentioned. en/ru. Confirmed working on-device 2026-08-06 |
| [#600](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/600) | ✅ Done | Undo toast after deleting a meal | `MealList.tsx`'s new `deleteMealById`/`undoDeleteMeal`; 9s toast, both delete entry points covered; clear-all stays hard-confirm, untouched. Confirmed working on-device 2026-08-06 |

---

## Tier 125 — Live feedback (2026-08-05)

_Same-day live feedback (Zepp multi-user export, export status placement, Apple Health recognition). All currently open / pending items from this tier live in the active file._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#616](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/616) | ✅ Done | Zepp Life import: export may contain two users' data — detect/filter on our side | BODY `height` splits shared-scale exports; `ZeppLifeProfileDialog` + filter by chosen height. ACTIVITY unchanged (not height-keyed). Confirmed working on-device 2026-08-06 (previously closed prematurely on indirect evidence, reopened, now confirmed for real) |
| [#617](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/617) | ✅ Done | Settings Export: show import success/error under the matching source section | `ExportSection` now renders each success/error message inside its own block (JSON backup/import, ranged backup, Excel, CSV, Markdown, Zepp, Apple Health, MyFitnessPal) instead of one shared card footer. Confirmed working on-device 2026-08-06 |
| [#618](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/618) | ✅ Done | Apple Health import: valid user export not recognized as Apple Health file | Locale-agnostic detection: importer now picks the primary Apple Health XML by role (largest non-`export_cda.xml` XML entry) instead of requiring the English filename `export.xml`, so localized exports like `экспорт.xml` are accepted. Confirmed working on-device 2026-08-06 |
| [#619](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/619) | ✅ Done | Custom metric note input: add a Cancel button to close without saving | `CustomMetricLogSection.tsx`'s Cancel button was already there for editing a saved note (#437) but hidden for a brand-new one — removed that gating; canceling a fresh note now falls back to the empty read-mode view instead of having no way out. Confirmed working on-device 2026-08-06 |
| [#620](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/620) | ✅ Done | Custom metric note Cancel button leaves an empty saved-looking entry instead of clearing it | `MetricValueRow`'s non-editing render now has a real "nothing logged yet" idle state (new "+ Add note" trigger) instead of falling through to the read-mode box meant for an actual saved note. Confirmed working on-device 2026-08-06 |
| [#621](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/621) | ✅ Done | Meal list sort order: a very-late-night meal sorts first instead of last | `sortCalorieEntriesByLoggedTime` (`mealLabel.ts`) gained a day-start-adjusted comparison (new optional `dayStartTime` param, default `'00:00'` = unchanged prior behavior); `MealList.tsx` now feeds its real day-start setting in. Confirmed working on-device 2026-08-06 |
| [#622](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/622) | ✅ Done | Custom metric note input reappears after being closed | New `stores/customMetricNoteDismissalStore.ts` records a canceled/blank-saved note's `metricId:date`, since `note` alone can't tell "never touched" apart from "explicitly dismissed" across a remount (date nav, accordion collapse). `MetricValueRow`'s initial edit-mode check now also reads it. Confirmed working on-device 2026-08-06 |
| [#623](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/623) | ✅ Done | PDF summary export: Cyrillic text renders as mojibake | New `ptSansRegularFont.ts` (base64 TTF, dynamically imported) embeds PT Sans (Latin+Cyrillic) into every `exportPdf.ts` text/table call, replacing jsPDF's default Cyrillic-less standard fonts. Confirmed working on-device 2026-08-06 |
| [#624](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/624) | ✅ Done | PDF summary export: let user pick a custom date range | Replaced the fixed 30/90-day toggle with a free-form start/end date picker (own `pdfPeriodStart`/`pdfPeriodEnd` state, defaulted to last 90 days) plus two "Last 30/90 days" quick-fill buttons. Also fixed a real CI bug found along the way — `ExportSection.test.tsx`'s `URL` stub broke Vite's dynamic import of #623's local font module. Confirmed working on-device 2026-08-06 |
| [#626](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/626) | ✅ Done | Add Settings toggle to hide Planned Meals section | New `usePlannedMealsTrackingStore` (off by default), same shape as cycle/digestion/water/alcohol tracking; new "Planned meals" toggle in Settings' "What to track" Other group; `DailyEntryFormTop.tsx` only mounts `PlannedMealsSection` when enabled. Confirmed working on-device 2026-08-06 |
| [#627](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/627) | ✅ Done | Planned meals trigger button shows two plus icons | Dictionary string had a literal `+` baked in on top of the already-rendered `Plus` icon; dropped from en/ru. Confirmed working on-device 2026-08-06 |
