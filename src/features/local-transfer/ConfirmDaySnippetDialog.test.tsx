import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useLocalTransferStore } from '@/stores'
import { ConfirmDaySnippetDialog } from './ConfirmDaySnippetDialog'
import { dailyEntryToDaySnippet } from './daySnippetPayload'

describe('ConfirmDaySnippetDialog (#719)', () => {
  beforeEach(async () => {
    localStorage.clear()
    useLocalTransferStore.setState({ enabled: true })
    await db.dailyEntries.clear()
  })

  it('fills empty sleep after confirm and asks before overwriting weight', async () => {
    const user = userEvent.setup()
    await db.dailyEntries.put({
      id: 'local-day',
      date: '2026-08-14',
      createdAt: '2026-08-14T07:00:00.000Z',
      updatedAt: '2026-08-14T07:00:00.000Z',
      weightKg: 58.65,
    })
    const payload = dailyEntryToDaySnippet({
      id: 'pwa',
      date: '2026-08-14',
      createdAt: '2026-08-14T08:00:00.000Z',
      updatedAt: '2026-08-14T08:00:00.000Z',
      sleepHours: 7.5,
      weightKg: 58.2,
    })

    render(
      <ConfirmDaySnippetDialog
        open
        onOpenChange={() => {}}
        payload={payload}
      />,
    )

    expect(await screen.findByText(/1 empty field will be filled/)).toBeInTheDocument()
    expect(screen.getByText(/1 field already has a different value/)).toBeInTheDocument()
    expect(screen.getByText('Weight (kg)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add missing' }))

    await waitFor(async () => {
      const stored = await db.dailyEntries.where('date').equals('2026-08-14').first()
      expect(stored?.sleepHours).toBe(7.5)
      expect(stored?.weightKg).toBe(58.65)
    })
  })
})
