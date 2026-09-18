import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StorageUsageBreakdown } from './StorageUsageBreakdown'
import { STORAGE_USAGE_CHART_COLORS } from './storageUsageChartColors'
import type { StorageBreakdown } from './storageBreakdown'

const sample: StorageBreakdown = {
  usage: 1000,
  quota: 5000,
  appData: 500,
  offlineCache: 300,
  other: 200,
  source: 'browser',
}

describe('StorageUsageBreakdown (#968)', () => {
  it('paints pie slices and legend swatches with the softened chart colors', () => {
    render(<StorageUsageBreakdown data={sample} />)

    const chart = screen.getByLabelText('Storage breakdown')
    const pie = chart.querySelector('.rounded-full')
    expect(pie).toHaveStyle({
      background: `conic-gradient(${STORAGE_USAGE_CHART_COLORS.appData} 0% 50%, ${STORAGE_USAGE_CHART_COLORS.offlineCache} 50% 80%, ${STORAGE_USAGE_CHART_COLORS.other} 80% 100%)`,
    })

    const items = within(chart).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0]?.querySelector('span')).toHaveStyle({
      backgroundColor: STORAGE_USAGE_CHART_COLORS.appData,
    })
    expect(items[1]?.querySelector('span')).toHaveStyle({
      backgroundColor: STORAGE_USAGE_CHART_COLORS.offlineCache,
    })
    expect(items[2]?.querySelector('span')).toHaveStyle({
      backgroundColor: STORAGE_USAGE_CHART_COLORS.other,
    })
    expect(items[3]).toHaveTextContent('PDF exports stored by this app: 0 B')
    expect(items[3]?.querySelector('span')).toBeNull()
  })
})
