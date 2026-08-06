# Issues Priority — Archive tiers 123+

Closed rows from Tier 123 onward. Open / pending items stay in [`../issues-priority.md`](../issues-priority.md).

---

## Tier 123 — Product-owner audit batch (2026-08-04)

_Filed from the product-owner audit in `C:\Users\User\Projects\docs\turtle-steps-ideas\2026-08-04-product-audit\`. All other open / pending items from this tier live in the active file._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
| [#607](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/607) | ✅ Done | Optional alcohol day signal and next-day weight correlation | `DailyEntry.hadAlcohol` + `useAlcoholTrackingStore`, mirrors `hadConstipation`/`nightEatingCorrelation` exactly. New `AlcoholCorrelationView` (only Settings-gated correlation view). Export/import covered. Confirmed working on-device 2026-08-06 |
| [#609](https://github.com/ZhannaM85/turtle-steps-to-the-goal/issues/609) | ✅ Done | Local PDF summary export for sharing outside the app | New `exportPdf.ts` (jsPDF + jspdf-autotable, both new deps, dynamically imported): weight trend (hand-drawn line), weekly-averages table, optional latest body measurements, non-medical disclaimer on every page. Own 30/90-day picker. Confirmed working on-device 2026-08-06 — follow-up filed as #629 (section picker modal) |

---

## Tier 125 — Live feedback (2026-08-05)

_Same-day live feedback (Zepp multi-user export, export status placement, Apple Health recognition). All currently open / pending items from this tier live in the active file._

| # | Status | Issue | Notes |
|---|--------|-------|-------|
