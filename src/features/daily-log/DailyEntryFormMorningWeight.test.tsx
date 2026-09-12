/** #863 — moved from DailyEntryForm.test.tsx; assertions unchanged. */
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/infrastructure/persistence/indexeddb'
import { DailyEntryForm } from './DailyEntryForm'
import {
  expectWeightDisplay,
  now,
  render,
} from './dailyEntryFormTestUtils'

describe('DailyEntryForm', () => {
  describe('weight', () => {
    it('saves a new weight independently via its own Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Weight (kg)'), '79.5')
      await user.click(screen.getByRole('button', { name: 'Save weight' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      const entry = onSave.mock.calls[0][0]
      expect(entry.date).toBe('2026-03-01')
      expect(entry.weightKg).toBe(79.5)
      expectWeightDisplay('79.5')
    })

    it('accepts a comma as the decimal separator', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Weight (kg)'), '79,5')
      await user.click(screen.getByRole('button', { name: 'Save weight' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].weightKg).toBe(79.5)
    })

    it('rejects an unrealistic weight and does not save', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Weight (kg)'), '5')
      await user.click(screen.getByRole('button', { name: 'Save weight' }))

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    describe('unusual (but valid) weight warning (#218)', () => {
      it('warns instead of saving immediately for a technically-valid but unusual value', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
        )

        await user.type(screen.getByLabelText('Weight (kg)'), '320')
        await user.click(screen.getByRole('button', { name: 'Save weight' }))

        expect(
          await screen.findByText(/unusual weight/),
        ).toBeInTheDocument()
        expect(onSave).not.toHaveBeenCalled()
      })

      it('saves once "Save anyway" is confirmed', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
        )

        await user.type(screen.getByLabelText('Weight (kg)'), '320')
        await user.click(screen.getByRole('button', { name: 'Save weight' }))
        await user.click(
          await screen.findByRole('button', { name: 'Save anyway' }),
        )

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave.mock.calls[0][0].weightKg).toBe(320)
      })

      it('dismisses the warning via "Fix it" without saving', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
        )

        await user.type(screen.getByLabelText('Weight (kg)'), '320')
        await user.click(screen.getByRole('button', { name: 'Save weight' }))
        await user.click(
          await screen.findByRole('button', { name: 'Fix it' }),
        )

        expect(
          screen.queryByText(/unusual weight/),
        ).not.toBeInTheDocument()
        expect(onSave).not.toHaveBeenCalled()
      })

      it('does not warn for an ordinary weight', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
        )

        await user.type(screen.getByLabelText('Weight (kg)'), '70')
        await user.click(screen.getByRole('button', { name: 'Save weight' }))

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(screen.queryByText(/unusual weight/)).not.toBeInTheDocument()
      })
    })

    describe('unusual jump vs. yesterday (#401)', () => {
      afterEach(async () => {
        await db.dailyEntries.clear()
      })

      it('warns on a big overnight weight jump, even one inside the absolute plausibility band', async () => {
        await db.dailyEntries.put({
          id: 'prev-1',
          date: '2026-02-28',
          weightKg: 60,
          createdAt: now,
          updatedAt: now,
        })
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
        )

        // 75kg on its own is nowhere near #218's 35-250kg absolute band —
        // only the 15kg jump from yesterday's 60kg makes this unusual.
        await user.type(screen.getByLabelText('Weight (kg)'), '75')
        await user.click(screen.getByRole('button', { name: 'Save weight' }))

        expect(
          await screen.findByText(/unusual weight/),
        ).toBeInTheDocument()
        expect(onSave).not.toHaveBeenCalled()

        await user.click(
          screen.getByRole('button', { name: 'Save anyway' }),
        )
        expect(onSave).toHaveBeenCalledTimes(1)
      })

      it('does not warn for an ordinary day-to-day weight change', async () => {
        await db.dailyEntries.put({
          id: 'prev-2',
          date: '2026-02-28',
          weightKg: 70,
          createdAt: now,
          updatedAt: now,
        })
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
        )

        await screen.findByLabelText('Weight (kg)')
        await user.type(screen.getByLabelText('Weight (kg)'), '70.3')
        await user.click(screen.getByRole('button', { name: 'Save weight' }))

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(screen.queryByText(/unusual weight/)).not.toBeInTheDocument()
      })
    })

    it('saves on Enter in the weight field', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Weight (kg)'), '80{Enter}')

      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('shows an existing weight as read-only text with a pencil, editable via a Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 80,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expectWeightDisplay('80')
      expect(
        screen.queryByRole('button', { name: 'Save weight' }),
      ).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Edit weight' }))
      const input = screen.getByLabelText('Weight (kg)')
      expect(input).toHaveValue('80')
      await user.clear(input)
      await user.type(input, '79.5')
      await user.click(screen.getByRole('button', { name: 'Save weight' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].weightKg).toBe(79.5)
      expectWeightDisplay('79.5')
    })

    it('puts edit and delete on the title row so they stack with Sleep (#798)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 80,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      const titleRow = screen.getByText('Weight (kg)').closest('div') as HTMLElement
      expect(
        within(titleRow).getByRole('button', { name: 'Edit weight' }),
      ).toBeInTheDocument()
      expect(
        within(titleRow).getByRole('button', { name: 'Delete weight' }),
      ).toBeInTheDocument()
      expect(within(titleRow).queryByText('80')).not.toBeInTheDocument()
      expectWeightDisplay('80')
    })

    it('puts save and cancel on the title row in edit mode (#858)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 80,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit weight' }))
      const titleRow = screen.getByText('Weight (kg)').closest(
        'div',
      ) as HTMLElement
      expect(
        within(titleRow).getByRole('button', { name: 'Save weight' }),
      ).toHaveAttribute('data-size', 'icon-sm')
      expect(
        within(titleRow).getByRole('button', { name: 'Cancel editing weight' }),
      ).toHaveAttribute('data-size', 'icon-sm')
      expect(
        titleRow.contains(screen.getByLabelText('Weight (kg)')),
      ).toBe(false)
    })

    it('blocks saving an empty weight instead of clearing it and showing NaN (#669)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            weightKg: 80,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit weight' }))
      await user.clear(screen.getByLabelText('Weight (kg)'))
      await user.click(screen.getByRole('button', { name: 'Save weight' }))

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
      expect(screen.getByLabelText('Weight (kg)')).toBeInTheDocument()
    })
  })
})
