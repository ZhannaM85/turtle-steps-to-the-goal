/**
 * #968 — Settings storage pie colors, independent of remaining-nutrient
 * `--stat-fat` and of the Export primary button (`--primary`).
 *
 * App data keeps the cool water accent. Cache and other use softer
 * neutrals (slate / sage) so the chart is not all-brown on the cream UI.
 */
export const STORAGE_USAGE_CHART_COLORS = {
  appData: 'var(--stat-water)',
  offlineCache: 'var(--stat-magnesium)',
  other: 'var(--stat-potassium)',
} as const
