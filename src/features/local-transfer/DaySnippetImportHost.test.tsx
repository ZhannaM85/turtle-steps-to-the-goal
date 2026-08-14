import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useLocalTransferStore } from '@/stores'
import { dailyEntryToDaySnippet, encodeDaySnippetPayload } from './daySnippetPayload'
import { DaySnippetImportHost } from './DaySnippetImportHost'
import { useDayTransferUiStore } from './dayTransferUiStore'

describe('DaySnippetImportHost (#721)', () => {
  beforeEach(() => {
    localStorage.clear()
    useLocalTransferStore.setState({ enabled: true })
    useDayTransferUiStore.setState({ confirmOpen: false, payload: null })
  })

  it('opens confirm from shareDay and does not treat a backup-shaped payload as a day', async () => {
    const payload = dailyEntryToDaySnippet({
      id: 'pwa',
      date: '2026-08-14',
      createdAt: '2026-08-14T08:00:00.000Z',
      updatedAt: '2026-08-14T08:00:00.000Z',
      sleepHours: 8,
    })
    const encoded = encodeDaySnippetPayload(payload)

    render(
      <MemoryRouter initialEntries={[`/?shareDay=${encoded}`]}>
        <DaySnippetImportHost />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Add this day’s log?')).toBeInTheDocument()
    await waitFor(() => {
      expect(useDayTransferUiStore.getState().payload?.sleepHours).toBe(8)
    })
  })
})
