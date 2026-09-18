import { describe, expect, it } from 'vitest'
import { STORAGE_USAGE_CHART_COLORS } from './storageUsageChartColors'

describe('storage pie colors (#968)', () => {
  it('keeps a cool app-data accent and uses softer neutrals for the rest', () => {
    expect(STORAGE_USAGE_CHART_COLORS.appData).toBe('var(--stat-water)')
    expect(STORAGE_USAGE_CHART_COLORS.offlineCache).toBe(
      'var(--stat-magnesium)',
    )
    expect(STORAGE_USAGE_CHART_COLORS.other).toBe('var(--stat-potassium)')
  })

  it('does not reuse terracotta fat or olive-brown muted text tokens', () => {
    const colors = Object.values(STORAGE_USAGE_CHART_COLORS)
    expect(colors).not.toContain('var(--stat-fat)')
    expect(colors).not.toContain('var(--muted-foreground)')
    expect(colors).not.toContain('var(--primary)')
    expect(colors).not.toContain('var(--sand-foreground)')
    expect(colors).not.toContain('var(--chart-calories)')
  })
})
