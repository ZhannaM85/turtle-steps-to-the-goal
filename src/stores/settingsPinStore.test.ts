import { describe, expect, it } from 'vitest'
import { settingsPinOrder } from './settingsPinStore'

describe('settingsPinOrder (#820)', () => {
  it('puts pinned ids below About (order -2000) and above unpinned (0)', () => {
    expect(settingsPinOrder(['export', 'localTransfer'], 'export')).toBe(-1000)
    expect(settingsPinOrder(['export', 'localTransfer'], 'localTransfer')).toBe(
      -999,
    )
    expect(settingsPinOrder(['export'], 'units')).toBe(0)
  })
})
