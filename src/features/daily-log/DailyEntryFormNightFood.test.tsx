/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailyEntryForm } from './DailyEntryForm'
import {
  now,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('night eating tracking (#383)', () => {
    it('always shows the toggle, with no Settings opt-in gate', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(
        screen.getByRole('radiogroup', { name: 'Ate late tonight' }),
      ).toBeInTheDocument()
    })

    it('selects neither option when there is no logged meal and no override (#394)', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      const group = within(
        screen.getByRole('radiogroup', { name: 'Ate late tonight' }),
      )
      expect(group.getByRole('radio', { name: 'No' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
      expect(group.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
    })

    it('saves an explicit override immediately when switched to Yes', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      const group = within(
        screen.getByRole('radiogroup', { name: 'Ate late tonight' }),
      )
      await user.click(group.getByRole('radio', { name: 'Yes' }))

      expect(onSave).toHaveBeenCalled()
      expect(onSave.mock.calls[0][0].nightEatingOverride).toBe(true)
      expect(group.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
    })

    it('lets an explicit override win over the derived meal-time value', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            calorieEntries: [
              {
                id: 'c1',
                items: [{ id: 'i1', amountKcal: 400 }],
                timeEaten: '23:00',
                createdAt: now,
              },
            ],
            nightEatingOverride: false,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      const group = within(
        screen.getByRole('radiogroup', { name: 'Ate late tonight' }),
      )
      expect(group.getByRole('radio', { name: 'No' })).toHaveAttribute(
        'aria-checked',
        'true',
      )

      await user.click(group.getByRole('radio', { name: 'Yes' }))

      expect(onSave.mock.calls[0][0].nightEatingOverride).toBe(true)
    })

    it('clears an explicit override back to unselected when the active option is tapped again (#406)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: true,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      const group = within(
        screen.getByRole('radiogroup', { name: 'Ate late tonight' }),
      )
      expect(group.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
        'aria-checked',
        'true',
      )

      await user.click(group.getByRole('radio', { name: 'Yes' }))

      expect(onSave.mock.calls[0][0].nightEatingOverride).toBeUndefined()
      expect(group.getByRole('radio', { name: 'No' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
      expect(group.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
    })

    it('deselecting clears the visible selection, not just the saved override (#406 real root cause)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: false,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      const group = within(
        screen.getByRole('radiogroup', { name: 'Ate late tonight' }),
      )
      expect(group.getByRole('radio', { name: 'No' })).toHaveAttribute(
        'aria-checked',
        'true',
      )

      await user.click(group.getByRole('radio', { name: 'No' }))

      expect(onSave.mock.calls[0][0].nightEatingOverride).toBeUndefined()
      expect(group.getByRole('radio', { name: 'No' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
      expect(group.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
    })

    it('has no Clear button when there is no explicit override yet (#423)', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(
        screen.queryByRole('button', { name: 'Clear' }),
      ).not.toBeInTheDocument()
    })

    it('has no Clear button even once an explicit override exists (#428)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: true,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      expect(
        screen.queryByRole('button', { name: 'Clear' }),
      ).not.toBeInTheDocument()
    })

    it('has no auto-detected caption text, even with a derived value from a logged meal (#429)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            calorieEntries: [
              {
                id: 'c1',
                items: [{ id: 'i1', amountKcal: 400 }],
                timeEaten: '23:00',
                createdAt: now,
              },
            ],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      expect(
        screen.queryByText(/Auto-detected from your meals/i),
      ).not.toBeInTheDocument()
    })

    it('renders Night food as its own card, not under Evening (#818)', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.getByText('Night food')).toBeInTheDocument()
      expect(
        screen.getByText('Food after going to sleep'),
      ).toBeInTheDocument()
      const evening = screen
        .getByText('Evening entries')
        .closest('.section-shell')
      expect(evening).toBeTruthy()
      expect(
        within(evening as HTMLElement).queryByText('Night food'),
      ).not.toBeInTheDocument()
    })

    it('collapses Night food like Evening (#831)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(
        screen.getByRole('radiogroup', { name: 'Ate late tonight' }),
      ).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Hide night food' }))
      expect(
        screen.queryByRole('radiogroup', { name: 'Ate late tonight' }),
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Show night food' }),
      ).toBeInTheDocument()
    })

    it('hides remember and reason until Yes is selected (#825)', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(
        screen.queryByRole('radiogroup', { name: 'I remember how I ate' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('textbox', { name: 'Reason' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('radiogroup', { name: 'Was it easy?' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('textbox', { name: 'What helped?' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('textbox', { name: 'Any thoughts?' }),
      ).not.toBeInTheDocument()
    })

    it('hides remember and reason when No is selected (#825)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: false,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      expect(
        screen.queryByRole('radiogroup', { name: 'I remember how I ate' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('textbox', { name: 'Reason' }),
      ).not.toBeInTheDocument()
    })

    it('shows No-path follow-ups when No is selected (#835 / #842)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: false,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('radiogroup', { name: 'Was it easy?' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('textbox', { name: 'What helped?' }),
      ).toHaveAttribute('placeholder', 'What helped you stick with it')
      expect(
        screen.queryByRole('textbox', { name: 'Any thoughts?' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('radiogroup', { name: 'I remember how I ate' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('textbox', { name: 'Reason' }),
      ).not.toBeInTheDocument()
    })

    it('hides No-path follow-ups when Yes is selected (#835)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            nightEatingOverride: true,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      expect(
        screen.queryByRole('radiogroup', { name: 'Was it easy?' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('textbox', { name: 'What helped?' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('textbox', { name: 'Any thoughts?' }),
      ).not.toBeInTheDocument()
    })
  })
})
