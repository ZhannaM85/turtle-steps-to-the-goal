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

---

## Tier 125 — Live feedback (2026-08-05)

_Same-day live feedback (Zepp multi-user export, export status placement, Apple Health recognition). All currently open / pending items from this tier live in the active file._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#616](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/616) | ✅ Done | Zepp Life import: export may contain two users' data — detect/filter on our side | BODY `height` splits shared-scale exports; `ZeppLifeProfileDialog` + filter by chosen height. ACTIVITY unchanged (not height-keyed). Confirmed working on-device 2026-08-06 (previously closed prematurely on indirect evidence, reopened, now confirmed for real) |
| [#617](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/617) | ✅ Done | Settings Export: show import success/error under the matching source section | `ExportSection` now renders each success/error message inside its own block (JSON backup/import, ranged backup, Excel, CSV, Markdown, Zepp, Apple Health, MyFitnessPal) instead of one shared card footer. Confirmed working on-device 2026-08-06 |
| [#618](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/618) | ✅ Done | Apple Health import: valid user export not recognized as Apple Health file | Locale-agnostic detection: importer now picks the primary Apple Health XML by role (largest non-`export_cda.xml` XML entry) instead of requiring the English filename `export.xml`, so localized exports like `экспорт.xml` are accepted. Confirmed working on-device 2026-08-06 |
