export interface StoreVersionNote {
  /** Marketing version as written in this repo (`1.0`, `1.0.2`), not the internal release-notes counter. */
  version: string
  /** Calendar day, `YYYY-MM-DD`, formatted in the UI with `formatLocalizedDate`. */
  date: string
  en: string
  ru: string
}

/**
 * App Store versions shown on About (#1130). Most-recent-first.
 * Add one entry when a new store version's date and user-facing
 * contents are both written down in this repo. Do not invent either.
 *
 * Included:
 * - 1.0.2 — 2026-11-20. Commit 54a0d060 ("#1129: iOS 1.0.2 build 29 for
 *   App Store") added this date's build and the What's New text in
 *   docs/app-store-listing.md.
 * - 1.0 — 2026-10-19. docs/issues-priority-archive/tiers-026-050.md #315:
 *   installed and confirmed from the App Store that day. Contents are the
 *   What's New (version 1.0) text in docs/app-store-listing.md. The repo
 *   writes this version as `1.0`, not `1.0.0`.
 *
 * Left out until a What's New (or equivalent) exists:
 * - 1.0.1 — marketing bump dc6806f0 (2026-11-05); Connect build 23 noted
 *   on 2026-11-07 (#1121). No user-facing changelog in the repo.
 * - 1.0.3 — TestFlight builds 26–28 (2026-11-15 and 2026-11-20), then
 *   MARKETING_VERSION returned to 1.0.2 in 54a0d060. No What's New text.
 */
export const storeVersions: StoreVersionNote[] = [
  {
    version: '1.0.2',
    date: '2026-11-20',
    en: [
      '• Optional week, month, and year weight averages under the morning weight, with two decimal places',
      '• Link to an exemplary past day on Day, with a short tip on how that day is chosen',
      '• Daily reminder no longer fires on days you already logged',
    ].join('\n'),
    ru: [
      '• По желанию — средний вес за неделю, месяц и год под утренним весом, с двумя знаками после запятой',
      '• Ссылка на удачный прошлый день на экране «День» и короткая подсказка, как он выбирается',
      '• Ежедневное напоминание больше не приходит в дни, когда запись уже есть',
    ].join('\n'),
  },
  {
    version: '1.0',
    date: '2026-10-19',
    en: 'First App Store release. Local-first diary for meals, macros, water, weight and related habits, with backup/export and optional online food lookup.',
    ru: 'Первый выпуск в App Store. Локальный дневник питания, КБЖУ, воды, веса и связанных привычек, с резервным копированием и необязательным поиском продуктов онлайн.',
  },
]
