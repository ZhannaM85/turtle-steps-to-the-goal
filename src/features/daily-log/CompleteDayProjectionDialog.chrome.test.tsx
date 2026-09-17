import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useProfileStore } from '@/stores'
import {
  COMPLETE_DAY_PROJECTION_DIALOG_CLASS,
  CompleteDayProjectionDialog,
} from './CompleteDayProjectionDialog'
import { DailyEntryFormStateProvider } from './DailyEntryFormStateContext'
import { calories, now } from './dailyEntryFormTestUtils'

describe('CompleteDayProjectionDialog chrome (#951)', () => {
  beforeEach(() => {
    useProfileStore.setState({
      heightCm: 165,
      age: 41,
      sex: 'female',
      activityLevel: 'sedentary',
    })
  })

  afterEach(async () => {
    await db.dailyEntries.clear()
    useProfileStore.setState({
      heightCm: undefined,
      age: undefined,
      sex: undefined,
      activityLevel: undefined,
    })
  })

  it('reuses Export period track, pill, and page fill', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DailyEntryFormStateProvider
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 60.2,
            calorieEntries: [calories(1200, 'm1')],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        >
          <CompleteDayProjectionDialog />
        </DailyEntryFormStateProvider>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Complete the day' }))

    const dialog = document.querySelector('[data-slot="dialog-content"]')
    expect(COMPLETE_DAY_PROJECTION_DIALOG_CLASS).toBe('bg-background')
    expect(dialog).toHaveClass('bg-background')
    expect(dialog).not.toHaveClass('bg-card')

    const tabs = screen.getByLabelText('Projection period')
    expect(tabs).toHaveClass('flex', 'flex-wrap', 'justify-start')
    expect(tabs).toHaveClass('rounded-lg', 'bg-muted', 'p-1')
    const week = within(tabs).getByRole('radio', { name: 'Week' })
    expect(week).toHaveClass('h-12', 'rounded-md', 'text-sm', 'font-medium')
    expect(week.className).toContain('data-[state=on]:bg-card')
    expect(week.className).toContain('data-[state=on]:shadow-sm')
  })
})
