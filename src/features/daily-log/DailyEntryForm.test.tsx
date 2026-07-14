import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { DailyEntryForm } from './DailyEntryForm'

// jsdom has no layout engine, so real pointer/keyboard drag gestures can't
// produce meaningful rects for dnd-kit's collision detection. We trust
// dnd-kit itself (independently tested) to turn real gestures into
// DragEndEvents, and only test our own onDragEnd wiring here by capturing
// and invoking it directly with a synthetic event.
let capturedOnDragEnd:
  | ((event: { active: { id: string }; over: { id: string } | null }) => void)
  | undefined

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: (props: {
      onDragEnd: typeof capturedOnDragEnd
      children: ReactNode
    }) => {
      capturedOnDragEnd = props.onDragEnd
      return props.children
    },
  }
})

const now = '2026-03-01T00:00:00.000Z'

function calories(
  amountKcal: number,
  id: string = crypto.randomUUID(),
): CalorieEntry {
  return { id, amountKcal, createdAt: now }
}

describe('DailyEntryForm', () => {
  it('has no whole-form submit button — every field saves independently', () => {
    render(
      <DailyEntryForm
        date="2026-03-01"
        existingEntry={null}
        onSave={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Log entry' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Update entry' }),
    ).not.toBeInTheDocument()
  })

  it('merges saves across multiple independent actions into the same entry', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
    )

    await user.type(screen.getByLabelText('Weight (kg)'), '80')
    await user.click(screen.getByRole('button', { name: 'Save weight' }))

    await user.type(screen.getByLabelText('Add calories'), '300')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onSave).toHaveBeenCalledTimes(2)
    const secondCallEntry = onSave.mock.calls[1][0]
    expect(secondCallEntry.weightKg).toBe(80)
    expect(secondCallEntry.calorieEntries).toHaveLength(1)
    expect(secondCallEntry.id).toBe(onSave.mock.calls[0][0].id)
  })

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
      expect(screen.getByText('79.5 kg')).toBeInTheDocument()
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

      expect(await screen.findByText(/Too small/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
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

      expect(screen.getByText('80.0 kg')).toBeInTheDocument()
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
      expect(screen.getByText('79.5 kg')).toBeInTheDocument()
    })
  })

  describe('note', () => {
    it('saves a new note independently via its own Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Note (optional)'), 'felt good')
      await user.click(screen.getByRole('button', { name: 'Save note' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].note).toBe('felt good')
      expect(screen.getByText('felt good')).toBeInTheDocument()
    })

    it('shows an existing note as read-only text with a pencil, editable via a Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
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
          onSave={onSave}
        />,
      )

      expect(screen.getByText('felt good')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Edit note' }))
      const input = screen.getByLabelText('Note (optional)')
      await user.clear(input)
      await user.type(input, 'updated note')
      await user.click(screen.getByRole('button', { name: 'Save note' }))

      expect(onSave.mock.calls[0][0].note).toBe('updated note')
      expect(screen.getByText('updated note')).toBeInTheDocument()
    })

    it('bundles the day mood into the same save as the note (#44)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Note (optional)'), 'felt good')
      await user.click(
        screen.getByRole('button', { name: 'Happy — Mood today' }),
      )
      await user.click(screen.getByRole('button', { name: 'Save note' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].note).toBe('felt good')
      expect(onSave.mock.calls[0][0].emotion).toBe('happy')
    })

    it('shows the saved day mood as an icon next to the displayed note', () => {
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
      expect(screen.getByText('Unhappy')).toBeInTheDocument() // sr-only label
      // Read-only display: no mood-picker buttons leaked into view.
      expect(
        screen.queryByRole('button', { name: /Mood today/ }),
      ).not.toBeInTheDocument()
    })

    it('pre-selects the previously saved mood when editing the note', async () => {
      const user = userEvent.setup()
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

      await user.click(screen.getByRole('button', { name: 'Edit note' }))

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
      expect(screen.getByLabelText('Note (optional)')).toHaveValue('felt good')
      expect(
        screen.getByRole('button', { name: 'Save note' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Edit weight' }),
      ).not.toBeInTheDocument()
    })
  })

  describe('calories', () => {
    it('has no direct-entry calories field — only the Add control', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      expect(screen.queryByLabelText('Calories')).not.toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('kcal today')).toBeInTheDocument()
    })

    it('adds a meal and saves it immediately', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Add calories'), '200')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(
        onSave.mock.calls[0][0].calorieEntries.map(
          (c: CalorieEntry) => c.amountKcal,
        ),
      ).toEqual([200])
      expect(screen.getByText('200')).toBeInTheDocument()
      expect(screen.getByText('Meal 1 — 200 kcal')).toBeInTheDocument()
      expect(screen.getByLabelText('Add calories')).toHaveValue('')
    })

    it('logs a note and an emotion together with the amount in one Add action', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.type(screen.getByLabelText('Add calories'), '200')
      await user.type(
        screen.getByLabelText('Meal note'),
        'Ate chocolates, they were good.',
      )
      await user.click(screen.getByRole('button', { name: 'Happy' }))
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(screen.getByText('Meal 1 — 200 kcal')).toBeInTheDocument()
      expect(
        screen.getByText('Ate chocolates, they were good.'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Meal note')).toHaveValue('')
    })

    it('accumulates repeated quick-adds onto the existing calories total', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
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
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Add calories'), '200')
      await user.click(screen.getByRole('button', { name: 'Add' }))
      expect(screen.getByText('600')).toBeInTheDocument()

      await user.type(screen.getByLabelText('Add calories'), '150')
      await user.keyboard('{Enter}')
      expect(screen.getByText('750')).toBeInTheDocument()
      expect(screen.getByText('Meal 3 — 150 kcal')).toBeInTheDocument()
      expect(onSave).toHaveBeenCalledTimes(2)
    })

    it('toggles an emotion selection off when clicked again', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      const happyButton = screen.getByRole('button', { name: 'Happy' })
      await user.click(happyButton)
      expect(happyButton).toHaveAttribute('aria-pressed', 'true')

      await user.click(happyButton)
      expect(happyButton).toHaveAttribute('aria-pressed', 'false')

      await user.type(screen.getByLabelText('Add calories'), '150')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(screen.getByText('Meal 1 — 150 kcal')).toBeInTheDocument()
      expect(screen.queryByText('Happy')).not.toBeInTheDocument()
    })

    it('ignores a quick-add of zero or an empty amount', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Add' }))
      await user.type(screen.getByLabelText('Add calories'), '0')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(onSave).not.toHaveBeenCalled()
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    describe('itemized meal editing', () => {
      function renderWithMeals(onSave = vi.fn()) {
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
            onSave={onSave}
          />,
        )
      }

      it('edits a meal amount in place and saves immediately', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        renderWithMeals(onSave)

        await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
        const input = screen.getByLabelText('Meal 1')
        await user.clear(input)
        await user.type(input, '350')
        await user.click(screen.getByRole('button', { name: 'Save' }))

        expect(screen.getByText('Meal 1 — 350 kcal')).toBeInTheDocument()
        expect(screen.getByText('Meal 2 — 200 kcal')).toBeInTheDocument()
        expect(onSave).toHaveBeenCalledTimes(1)
        expect(
          onSave.mock.calls[0][0].calorieEntries.map(
            (c: CalorieEntry) => c.amountKcal,
          ),
        ).toEqual([350, 200])
      })

      it('deletes a meal with a two-step confirm and saves immediately', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        renderWithMeals(onSave)

        await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
        await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
        expect(screen.getByText('Delete this entry?')).toBeInTheDocument()
        expect(onSave).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(screen.queryByText(/300 kcal/)).not.toBeInTheDocument()
        expect(screen.getByText('Meal 1 — 200 kcal')).toBeInTheDocument()
        expect(onSave).toHaveBeenCalledTimes(1)
        expect(
          onSave.mock.calls[0][0].calorieEntries.map(
            (c: CalorieEntry) => c.amountKcal,
          ),
        ).toEqual([200])
      })

      it('cancels a meal delete without removing it or saving, returning to the edit row', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        renderWithMeals(onSave)

        await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
        await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
        await user.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(screen.getByLabelText('Meal 1')).toHaveValue('300')
        expect(screen.getByText('Meal 2 — 200 kcal')).toBeInTheDocument()
        expect(onSave).not.toHaveBeenCalled()
      })

      it('edits a meal note and emotion and saves immediately', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        renderWithMeals(onSave)

        await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
        await user.type(
          screen.getByLabelText('Meal note — Meal 1'),
          'Ate a salad, it was good.',
        )
        await user.click(screen.getByRole('button', { name: 'Happy — Meal 1' }))
        await user.click(screen.getByRole('button', { name: 'Save' }))

        expect(
          screen.getByText('Ate a salad, it was good.'),
        ).toBeInTheDocument()
        expect(screen.getByText('Happy')).toBeInTheDocument()
        expect(onSave).toHaveBeenCalledTimes(1)
      })

      it('has a reorder handle for each meal', () => {
        renderWithMeals()

        expect(
          screen.getByRole('button', { name: 'Reorder meal 1' }),
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: 'Reorder meal 2' }),
        ).toBeInTheDocument()
      })

      it('reorders meals and saves immediately when a drag ends over a different meal', () => {
        const onSave = vi.fn()
        renderWithMeals(onSave)

        act(() => {
          capturedOnDragEnd?.({ active: { id: 'c1' }, over: { id: 'c2' } })
        })

        expect(screen.getByText('Meal 1 — 200 kcal')).toBeInTheDocument()
        expect(screen.getByText('Meal 2 — 300 kcal')).toBeInTheDocument()
        expect(onSave).toHaveBeenCalledTimes(1)
        expect(
          onSave.mock.calls[0][0].calorieEntries.map(
            (c: CalorieEntry) => c.amountKcal,
          ),
        ).toEqual([200, 300])
      })

      it('does not save when a drag ends over itself or nothing', () => {
        const onSave = vi.fn()
        renderWithMeals(onSave)

        act(() => {
          capturedOnDragEnd?.({ active: { id: 'c1' }, over: { id: 'c1' } })
          capturedOnDragEnd?.({ active: { id: 'c1' }, over: null })
        })

        expect(onSave).not.toHaveBeenCalled()
      })
    })
  })
})
