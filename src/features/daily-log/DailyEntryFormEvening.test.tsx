/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  useDigestionTrackingStore,
  useGoalStore,
} from '@/stores'
import { DailyEntryForm } from './DailyEntryForm'
import {
  now,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('steps', () => {
    it('saves step count independently via its own Save button (#60)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Steps'), '8500')
      await user.click(screen.getByRole('button', { name: 'Save steps' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].steps).toBe(8500)
      expect(screen.getByText('8,500')).toBeInTheDocument()
    })

    it('does not save empty steps as a dash (#854)', () => {
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      expect(screen.getByRole('button', { name: 'Save steps' })).toBeDisabled()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('rejects a value above the 20,000/day ceiling and does not save (#68)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Steps'), '25000')
      await user.click(screen.getByRole('button', { name: 'Save steps' }))

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('shows an existing step count as read-only text with a pencil, editable via a Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            steps: 6000,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.getByText('6,000')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Save steps' }),
      ).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Edit steps' }))
      const input = screen.getByLabelText('Steps')
      expect(input).toHaveValue('6000')
      await user.clear(input)
      await user.type(input, '7000')
      await user.click(screen.getByRole('button', { name: 'Save steps' }))

      expect(onSave.mock.calls[0][0].steps).toBe(7000)
      expect(screen.getByText('7,000')).toBeInTheDocument()
    })

    describe('leaving edit mode without saving (#424)', () => {
      it('has no Cancel button for a brand-new entry with nothing saved yet', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', { name: 'Cancel editing steps' }),
        ).not.toBeInTheDocument()
      })

      it('discards a typed change and reverts to the saved value', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              steps: 6000,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Edit steps' }))
        const input = screen.getByLabelText('Steps')
        await user.clear(input)
        await user.type(input, '99999')
        await user.click(
          screen.getByRole('button', { name: 'Cancel editing steps' }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText('6,000')).toBeInTheDocument()
      })
    })

    describe('deleting steps (#855)', () => {
      it('asks for confirmation before deleting, and does nothing on Cancel', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              steps: 6000,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Delete steps' }))
        expect(screen.getByText('Delete this entry?')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText('6,000')).toBeInTheDocument()
      })

      it('clears the saved step count on confirm', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              steps: 6000,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Delete steps' }))
        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave.mock.calls[0][0].steps).toBeUndefined()
        expect(screen.getByLabelText('Steps')).toHaveValue('')
      })
    })
  })


  describe('mood (#237: promoted to its own standalone, always-interactive field)', () => {
    it('saves immediately when a mood is picked, with no separate save step', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Happy — Mood today' }),
      )

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].emotion).toBe('happy')
    })

    it('shows the saved day mood pre-selected in its own picker', () => {
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            note: 'felt good',
            emotion: 'unhappy',
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.getByText('felt good')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Unhappy — Mood today' }),
      ).toHaveAttribute('aria-pressed', 'true')
    })
  })


  describe('alwaysEditable', () => {
    it('renders weight and note as plain inputs with Save buttons even with existing values', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 80,
            note: 'felt good',
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
          alwaysEditable
        />,
      )

      expect(screen.getByLabelText('Weight (kg)')).toHaveValue('80')
      expect(
        screen.getByRole('button', { name: 'Save weight' }),
      ).toBeInTheDocument()
      expect(screen.getByLabelText("Day's note")).toHaveValue('felt good')
      expect(
        screen.getByRole('button', { name: 'Save note' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Edit weight' }),
      ).not.toBeInTheDocument()
    })
  })


  describe('digestion tracking (constipation)', () => {
    it('hides the toggle when digestion tracking is disabled', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(
        screen.queryByRole('radiogroup', { name: 'Constipation' }),
      ).not.toBeInTheDocument()
    })

    it('shows a No/Yes toggle, defaulting to No, when enabled', () => {
      useDigestionTrackingStore.setState({ enabled: true })
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      const group = within(
        screen.getByRole('radiogroup', { name: 'Constipation' }),
      )
      expect(group.getByRole('radio', { name: 'No' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
      expect(group.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
    })

    it('saves immediately when switched to Yes, no separate save step', async () => {
      useDigestionTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      const group = within(
        screen.getByRole('radiogroup', { name: 'Constipation' }),
      )
      await user.click(group.getByRole('radio', { name: 'Yes' }))

      expect(onSave).toHaveBeenCalled()
      expect(onSave.mock.calls[0][0].hadConstipation).toBe(true)
      expect(group.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
    })

    it('reflects an already-true hadConstipation as Yes when editing', () => {
      useDigestionTrackingStore.setState({ enabled: true })
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            hadConstipation: true,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      const group = within(
        screen.getByRole('radiogroup', { name: 'Constipation' }),
      )
      expect(group.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
    })
  })


  describe('day totals (#549)', () => {
    it('saves day totals and includes them in remaining macros', async () => {
      useGoalStore.setState({
        goal: {
          id: 'g1',
          targetWeeklyLossKg: 0.5,
          dailyCalorieTargetKcal: 2000,
          dailyProteinTargetG: 150,
          createdAt: now,
          updatedAt: now,
        },
      })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      await user.type(screen.getByLabelText('Day total calories'), '500')
      await user.type(screen.getByLabelText('Day total protein'), '30')
      await user.click(screen.getByRole('button', { name: 'Save day totals' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].dayTotals).toEqual({
        amountKcal: 500,
        proteinG: 30,
      })

      const remainingSection = screen
        .getByText('Remaining')
        .closest('div') as HTMLElement
      expect(within(remainingSection).getByText('1,500')).toBeInTheDocument()
    })

    it('puts save/edit/delete on the title row, not text buttons (#860)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      const save = screen.getByRole('button', { name: 'Save day totals' })
      expect(save).toHaveAttribute('data-size', 'icon-sm')
      expect(
        screen.queryByRole('button', { name: 'Clear' }),
      ).not.toBeInTheDocument()
      expect(save).toBeDisabled()

      await user.type(screen.getByLabelText('Day total calories'), '500')
      await user.click(save)

      const edit = screen.getByRole('button', { name: 'Edit day totals' })
      const trash = screen.getByRole('button', { name: 'Delete day totals' })
      expect(edit).toHaveAttribute('data-size', 'icon-sm')
      expect(trash).toHaveAttribute('data-size', 'icon-sm')
    })

    it('asks before clearing saved day totals (#860 / #855)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            dayTotals: { amountKcal: 500, proteinG: 30 },
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Delete day totals' }),
      )
      expect(screen.getByText('Delete this entry?')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onSave).not.toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: 'Edit day totals' }),
      ).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Delete day totals' }),
      )
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].dayTotals).toBeUndefined()
    })
  })

})
