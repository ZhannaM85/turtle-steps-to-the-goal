import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { DailyEntryForm } from './DailyEntryForm'

const now = '2026-03-01T00:00:00.000Z'

function calories(
  amountKcal: number,
  id: string = crypto.randomUUID(),
): CalorieEntry {
  return { id, amountKcal, createdAt: now }
}

describe('DailyEntryForm', () => {
  it('labels the submit button "Log entry" when there is no existing entry', () => {
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Log entry' }),
    ).toBeInTheDocument()
  })

  it('requires at least a weight or a calorie total', async () => {
    const user = userEvent.setup()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Log entry' }))

    expect(
      await screen.findByText('Enter a weight or a calorie total'),
    ).toBeInTheDocument()
  })

  it('submits with just a weight (partial entry)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Weight (kg)'), '79.5')
    await user.click(screen.getByRole('button', { name: 'Log entry' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const entry = onSubmit.mock.calls[0][0]
    expect(entry.date).toBe('2026-03-01')
    expect(entry.weightKg).toBe(79.5)
    expect(entry.calorieEntries).toBeUndefined()
  })

  it('rejects an unrealistic weight', async () => {
    const user = userEvent.setup()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Weight (kg)'), '5')
    await user.click(screen.getByRole('button', { name: 'Log entry' }))

    expect(await screen.findByText(/Too small/)).toBeInTheDocument()
  })

  it('pre-fills from an existing entry and labels the button as an update', () => {
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={{
          id: 'e1',
          date: '2026-03-01',
          weightKg: 80,
          calorieEntries: [calories(2000, 'c1')],
          createdAt: now,
          updatedAt: now,
        }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('80.0 kg')).toBeInTheDocument()
    expect(screen.getByText('2,000')).toBeInTheDocument()
    expect(screen.getByText('Meal 1 — 2,000 kcal')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Update entry' }),
    ).toBeInTheDocument()
  })

  it('accepts a comma as the decimal separator', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Weight (kg)'), '79,5')
    await user.click(screen.getByRole('button', { name: 'Log entry' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].weightKg).toBe(79.5)
  })

  it('has no direct-entry calories field — only the Add control', () => {
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText('Calories')).not.toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('kcal today')).toBeInTheDocument()
  })

  it('adds to an empty calories total via the quick-add control', async () => {
    const user = userEvent.setup()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Add calories'), '200')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('Meal 1 — 200 kcal')).toBeInTheDocument()
    expect(screen.getByLabelText('Add calories')).toHaveValue('')
  })

  it('accumulates repeated quick-adds onto the existing calories total', async () => {
    const user = userEvent.setup()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={{
          id: 'e1',
          date: '2026-03-01',
          calorieEntries: [calories(400, 'c1')],
          createdAt: now,
          updatedAt: now,
        }}
        onSubmit={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Add calories'), '200')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('600')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Add calories'), '150')
    await user.keyboard('{Enter}')
    expect(screen.getByText('750')).toBeInTheDocument()
    expect(screen.getByText('Meal 3 — 150 kcal')).toBeInTheDocument()
  })

  it('ignores a quick-add of zero or an empty amount', async () => {
    const user = userEvent.setup()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('0')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Add calories'), '0')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('does not submit the form when pressing Enter in the quick-add field', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Add calories'), '200')
    await user.keyboard('{Enter}')

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  describe('itemized meal editing', () => {
    function renderWithMeals(onSubmit = vi.fn()) {
      return render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            calorieEntries: [calories(300, 'c1'), calories(200, 'c2')],
            createdAt: now,
            updatedAt: now,
          }}
          onSubmit={onSubmit}
        />,
      )
    }

    it('edits a specific meal amount in place via its pencil icon', async () => {
      const user = userEvent.setup()
      renderWithMeals()

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
      const input = screen.getByLabelText('Meal 1')
      await user.clear(input)
      await user.type(input, '350')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.getByText('Meal 1 — 350 kcal')).toBeInTheDocument()
      expect(screen.getByText('Meal 2 — 200 kcal')).toBeInTheDocument()
      expect(screen.getByText('550')).toBeInTheDocument() // total
    })

    it('deletes a specific meal with a two-step confirm, leaving others untouched', async () => {
      const user = userEvent.setup()
      renderWithMeals()

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
      await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
      expect(screen.getByText('Delete this entry?')).toBeInTheDocument()
      expect(screen.getByText('Meal 2 — 200 kcal')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(screen.queryByText(/300 kcal/)).not.toBeInTheDocument()
      expect(screen.getByText('Meal 1 — 200 kcal')).toBeInTheDocument() // renumbered
      expect(screen.getByText('200')).toBeInTheDocument() // total
    })

    it('cancels a meal delete without removing it, returning to the edit row', async () => {
      const user = userEvent.setup()
      renderWithMeals()

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
      await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      // Cancel aborts the delete but leaves meal 1 in its prior edit state.
      expect(screen.getByLabelText('Meal 1')).toHaveValue('300')
      expect(screen.getByText('Meal 2 — 200 kcal')).toBeInTheDocument()
    })

    it('does not persist meal edits until the form is submitted', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      renderWithMeals(onSubmit)

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
      const input = screen.getByLabelText('Meal 1')
      await user.clear(input)
      await user.type(input, '350')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSubmit).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: 'Update entry' }))

      expect(onSubmit).toHaveBeenCalledTimes(1)
      const entry = onSubmit.mock.calls[0][0]
      expect(
        entry.calorieEntries.map((c: CalorieEntry) => c.amountKcal),
      ).toEqual([350, 200])
    })
  })

  describe('read-only display + pencil-to-edit for Weight and Note', () => {
    it('shows weight and note as read-only text with a pencil once they have a saved value', () => {
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
          onSubmit={vi.fn()}
        />,
      )

      expect(screen.queryByLabelText('Weight (kg)')).not.toBeInTheDocument()
      expect(screen.getByText('80.0 kg')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Edit weight' }),
      ).toBeInTheDocument()

      expect(screen.getByText('felt good')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Edit note' }),
      ).toBeInTheDocument()
    })

    it('switches weight back to an editable input via its pencil', async () => {
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
          onSubmit={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit weight' }))

      expect(screen.getByLabelText('Weight (kg)')).toHaveValue('80')
    })

    it('switches note back to an editable input via its pencil', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            note: 'felt good',
            createdAt: now,
            updatedAt: now,
          }}
          onSubmit={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Edit note' }))

      expect(screen.getByLabelText('Note (optional)')).toHaveValue('felt good')
    })

    it('starts weight and note as plain editable inputs for a brand new entry', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSubmit={vi.fn()}
        />,
      )

      expect(screen.getByLabelText('Weight (kg)')).toBeInTheDocument()
      expect(screen.getByLabelText('Note (optional)')).toBeInTheDocument()
    })

    it('with alwaysEditable, renders weight and note as plain inputs even with existing values', () => {
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
          onSubmit={vi.fn()}
          alwaysEditable
        />,
      )

      expect(screen.getByLabelText('Weight (kg)')).toHaveValue('80')
      expect(screen.getByLabelText('Note (optional)')).toHaveValue('felt good')
      expect(
        screen.queryByRole('button', { name: 'Edit weight' }),
      ).not.toBeInTheDocument()
    })
  })
})
