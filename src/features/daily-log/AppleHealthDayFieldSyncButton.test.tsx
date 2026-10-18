import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { AppleHealthDayFieldSyncButton } from './AppleHealthDayFieldSyncButton'
import { render } from './dailyEntryFormTestUtils'

vi.mock('@/shared/native/appleHealth', () => ({
  isAppleHealthDayFieldSyncAvailable: () => false,
  requestAppleHealthFieldPermission: vi.fn(),
  syncAppleHealthDayField: vi.fn(),
}))

describe('AppleHealthDayFieldSyncButton (#1105)', () => {
  it('does not render on web/PWA', () => {
    render(
      <AppleHealthDayFieldSyncButton
        field="weight"
        date="2026-10-18"
        empty
        onApplied={() => {}}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /Apple Health/i }),
    ).not.toBeInTheDocument()
  })
})
