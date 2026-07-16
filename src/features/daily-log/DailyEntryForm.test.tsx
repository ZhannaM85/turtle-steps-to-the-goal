import 'fake-indexeddb/auto'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore } from '@/stores'
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

beforeEach(async () => {
  await db.mealItems.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.mealItems.clear()
})

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

      expect(screen.getByText('80 kg')).toBeInTheDocument()
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

  describe('sleep', () => {
    it('saves sleep hours and deep sleep independently via its own Save button, entered as hours+minutes (#59/#69)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Hours slept — hours'), '7')
      await user.type(screen.getByLabelText('Hours slept — minutes'), '30')
      await user.type(screen.getByLabelText('Deep sleep — hours'), '2')
      await user.type(screen.getByLabelText('Deep sleep — minutes'), '0')
      await user.click(screen.getByRole('button', { name: 'Save sleep' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].sleepHours).toBe(7.5)
      expect(onSave.mock.calls[0][0].deepSleepHours).toBe(2)
      expect(screen.getByText('7h 30m slept · 2h 0m deep')).toBeInTheDocument()
    })

    it('can be saved with just one of the two fields, the other showing a dash', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Hours slept — hours'), '8')
      await user.click(screen.getByRole('button', { name: 'Save sleep' }))

      expect(onSave.mock.calls[0][0].sleepHours).toBe(8)
      expect(onSave.mock.calls[0][0].deepSleepHours).toBeUndefined()
      expect(screen.getByText('8h 0m slept · — deep')).toBeInTheDocument()
    })

    it('rejects an out-of-range value and does not save', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Hours slept — hours'), '30')
      await user.click(screen.getByRole('button', { name: 'Save sleep' }))

      expect(await screen.findByText(/Too big/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('shows existing sleep as read-only text with a pencil, editable via a Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            sleepHours: 7,
            deepSleepHours: 1.5,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.getByText('7h 0m slept · 1h 30m deep')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Save sleep' }),
      ).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Edit sleep' }))
      expect(screen.getByLabelText('Hours slept — hours')).toHaveValue('7')
      expect(screen.getByLabelText('Hours slept — minutes')).toHaveValue('0')
      expect(screen.getByLabelText('Deep sleep — hours')).toHaveValue('1')
      expect(screen.getByLabelText('Deep sleep — minutes')).toHaveValue('30')
    })
  })

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

      expect(await screen.findByText(/Too big/)).toBeInTheDocument()
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

      await user.type(screen.getByLabelText("Day's note"), 'felt good')
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
      const input = screen.getByLabelText("Day's note")
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

      await user.type(screen.getByLabelText("Day's note"), 'felt good')
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
      expect(screen.getByLabelText("Day's note")).toHaveValue('felt good')
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
      await user.click(screen.getByRole('button', { name: 'Thumbs up' }))
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(screen.getByText('Meal 1 — 200 kcal')).toBeInTheDocument()
      expect(
        screen.getByText('Ate chocolates, they were good.'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Meal note')).toHaveValue('')
    })

    it('logs protein/fat/carbs alongside the amount (#51)', async () => {
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
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.type(screen.getByLabelText('Carbs'), '30')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(onSave.mock.calls[0][0].calorieEntries[0]).toMatchObject({
        amountKcal: 200,
        proteinG: 20,
        fatG: 10,
        carbsG: 30,
      })
      // Appears twice with a single meal logged: the meal's own summary
      // line and the per-day total (#51) show the same numbers.
      expect(
        screen.getAllByText('Protein 20g · Fat 10g · Carbs 30g'),
      ).toHaveLength(2)
      expect(screen.getByLabelText('Protein')).toHaveValue('')
    })

    it('macros are independently optional — a meal can log only some of them', async () => {
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
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(onSave.mock.calls[0][0].calorieEntries[0]).toMatchObject({
        amountKcal: 200,
        fatG: 10,
      })
      expect(onSave.mock.calls[0][0].calorieEntries[0].proteinG).toBeUndefined()
      expect(
        screen.getAllByText('Protein — · Fat 10g · Carbs —'),
      ).toHaveLength(2)
    })

    it('shows no macro summary line for a meal that logged none (#51)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.type(screen.getByLabelText('Add calories'), '200')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      // The quick-add row's own "Protein"/"Fat"/"Carbs" field labels are
      // always visible — only the combined "Protein X · Fat Y · Carbs Z"
      // summary sentence should be absent when nothing was logged.
      expect(screen.queryByText(/Fat .* · Carbs/)).not.toBeInTheDocument()
    })

    it("shows a read-only per-day macro total next to the kcal total (#51)", async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.type(screen.getByLabelText('Add calories'), '200')
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      await user.type(screen.getByLabelText('Add calories'), '150')
      await user.type(screen.getByLabelText('Protein'), '5')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      // Day total: 25g protein (20+5), 10g fat (only meal 1), no carbs logged.
      expect(screen.getByText('Protein 25g · Fat 10g · Carbs —')).toBeInTheDocument()
    })

    it('adds a meal note to the reusable meal-items library (#50)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.type(screen.getByLabelText('Add calories'), '200')
      await user.type(screen.getByLabelText('Meal note'), 'Pizza')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      await screen.findByText('Meal 1 — 200 kcal')
      expect(await db.mealItems.toArray()).toEqual([
        expect.objectContaining({ name: 'Pizza' }),
      ])
    })

    it('offers previously logged meal names as suggestions while typing', async () => {
      await useMealItemStore.getState().touch('Pizza')
      const { container } = render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      const noteInput = await screen.findByLabelText('Meal note')
      expect(noteInput).toHaveAttribute('list', 'meal-items-datalist')
      // Queried by `value`, not text content — an <option>'s value (not any
      // text child) is what a real browser matches for autocomplete.
      expect(
        container.querySelector('datalist#meal-items-datalist option[value="Pizza"]'),
      ).not.toBeNull()
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

      const thumbsUpButton = screen.getByRole('button', { name: 'Thumbs up' })
      await user.click(thumbsUpButton)
      expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'true')

      await user.click(thumbsUpButton)
      expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'false')

      await user.type(screen.getByLabelText('Add calories'), '150')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(screen.getByText('Meal 1 — 150 kcal')).toBeInTheDocument()
      expect(screen.queryByText('Thumbs up')).not.toBeInTheDocument()
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
        await user.click(
          screen.getByRole('button', { name: 'Thumbs up — Meal 1' }),
        )
        await user.click(screen.getByRole('button', { name: 'Save' }))

        expect(
          screen.getByText('Ate a salad, it was good.'),
        ).toBeInTheDocument()
        expect(screen.getByText('Thumbs up')).toBeInTheDocument()
        expect(onSave).toHaveBeenCalledTimes(1)
      })

      it('edits a meal\'s protein/fat/carbs and saves immediately (#51)', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        renderWithMeals(onSave)

        await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
        await user.type(screen.getByLabelText('Protein — Meal 1'), '20')
        await user.type(screen.getByLabelText('Fat — Meal 1'), '10')
        await user.type(screen.getByLabelText('Carbs — Meal 1'), '30')
        await user.click(screen.getByRole('button', { name: 'Save' }))

        expect(onSave.mock.calls[0][0].calorieEntries[0]).toMatchObject({
          proteinG: 20,
          fatG: 10,
          carbsG: 30,
        })
        // Appears twice: the meal's own summary line, and the per-day total
        // (#51) — the second meal has no macros, so the day total matches
        // this meal's numbers exactly.
        expect(
          screen.getAllByText('Protein 20g · Fat 10g · Carbs 30g'),
        ).toHaveLength(2)
      })

      it('renders bellissimo as the 🤌 emoji, not a lucide icon (#54)', async () => {
        const user = userEvent.setup()
        renderWithMeals(vi.fn())

        await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
        await user.click(
          screen.getByRole('button', { name: 'Bellissimo — Meal 1' }),
        )
        await user.click(screen.getByRole('button', { name: 'Save' }))

        // Appears twice: the now-selected picker button, and the saved
        // meal's own display — both render the emoji, not a lucide icon.
        expect(screen.getAllByText('🤌').length).toBeGreaterThan(0)
        expect(screen.getByText('Bellissimo')).toBeInTheDocument()
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

      describe('time eaten (#65)', () => {
        it('saves the time set in the Add flow, shown next to the meal', async () => {
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
          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '08:15' },
          })
          await user.click(screen.getByRole('button', { name: 'Add' }))

          expect(onSave.mock.calls[0][0].calorieEntries[0].timeEaten).toBe(
            '08:15',
          )
          expect(screen.getByText('· 08:15')).toBeInTheDocument()
        })

        it('can be left blank', async () => {
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
          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '' },
          })
          await user.click(screen.getByRole('button', { name: 'Add' }))

          expect(
            onSave.mock.calls[0][0].calorieEntries[0].timeEaten,
          ).toBeUndefined()
        })

        it('can be edited on an existing meal', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={{
                id: 'e1',
                date: '2026-03-01',
                calorieEntries: [
                  { ...calories(300, 'c1'), timeEaten: '08:00' },
                ],
                createdAt: now,
                updatedAt: now,
              }}
              onSave={onSave}
            />,
          )

          expect(screen.getByText('· 08:00')).toBeInTheDocument()

          await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
          expect(
            screen.getByLabelText('Time — Meal 1'),
          ).toHaveValue('08:00')
          fireEvent.change(screen.getByLabelText('Time — Meal 1'), {
            target: { value: '12:30' },
          })
          await user.click(screen.getByRole('button', { name: 'Save' }))

          expect(onSave.mock.calls[0][0].calorieEntries[0].timeEaten).toBe(
            '12:30',
          )
          expect(screen.getByText('· 12:30')).toBeInTheDocument()
        })

        it('is not cleared or changed when meals are reordered', () => {
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={{
                id: 'e1',
                date: '2026-03-01',
                calorieEntries: [
                  { ...calories(300, 'c1'), timeEaten: '08:00' },
                  { ...calories(200, 'c2'), timeEaten: '13:00' },
                ],
                createdAt: now,
                updatedAt: now,
              }}
              onSave={onSave}
            />,
          )

          act(() => {
            capturedOnDragEnd?.({ active: { id: 'c1' }, over: { id: 'c2' } })
          })

          const savedTimes = onSave.mock.calls[0][0].calorieEntries.map(
            (c: CalorieEntry) => c.timeEaten,
          )
          expect(savedTimes).toEqual(['13:00', '08:00'])
        })
      })

      describe('food picker (#62)', () => {
        it('opens the food dialog from the + Food button and adds a scaled meal', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await user.click(screen.getByRole('button', { name: '+ Food' }))
          await user.click(screen.getByText('Salmon'))
          await user.click(screen.getByRole('button', { name: 'Add food' }))

          expect(onSave).toHaveBeenCalledTimes(1)
          const entry = onSave.mock.calls[0][0].calorieEntries[0]
          expect(entry.amountKcal).toBe(208)
          expect(entry.proteinG).toBe(20)
          expect(entry.note).toBe('Salmon')
          expect(screen.getByText('Meal 1 — 208 kcal')).toBeInTheDocument()
        })
      })
    })
  })
})
