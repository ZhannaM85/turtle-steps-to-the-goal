import 'fake-indexeddb/auto'
import {
  act,
  fireEvent,
  render as rtlRender,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  useDigestionTrackingStore,
  useMealItemStore,
  useMealLabelPresetStore,
  useTrackedFieldsStore,
  useWaterTrackingStore,
} from '@/stores'
import { DailyEntryForm } from './DailyEntryForm'

// MemoryRouter (#157) — MealList (mounted by every DailyEntryForm) now
// calls useNavigate() for its meal-pencil navigation, which throws
// outside a Router context. Shadowing `render` here instead of touching
// every one of this file's many call sites individually.
function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: MemoryRouter })
}

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

// The food-picker tests below mount FoodPickerDialog, which renders the
// 300+ item curated food list (same reason FoodPickerDialog.test.tsx and
// FoodListSettingsScreen.test.tsx need this) — under full-suite parallel
// load the default 5000ms can be too tight.
vi.setConfig({ testTimeout: 15000 })

const now = '2026-03-01T00:00:00.000Z'

function calories(
  amountKcal: number,
  id: string = crypto.randomUUID(),
): CalorieEntry {
  return {
    id,
    items: [{ id: crypto.randomUUID(), amountKcal }],
    createdAt: now,
  }
}

beforeEach(async () => {
  await db.mealItems.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  useMealLabelPresetStore.setState({ presets: [] })
  useDigestionTrackingStore.setState({ enabled: false })
  useWaterTrackingStore.setState({ enabled: false })
  // #221: many tests below share date="2026-03-01" and don't always carry
  // the add-row's meal-item sheet through to a real Save — without this,
  // a leftover add-row draft (now persisted to localStorage) from one test
  // would silently pre-fill the next one's fresh render for the same date.
  localStorage.clear()
  // #201 made MealList's add row default collapsed for a past `date` —
  // freeze "now" to this file's own fixture "today" (2026-03-01) so it
  // keeps reading as today, matching the pre-#201 always-expanded
  // behavior these tests were written against.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'))
})

afterEach(async () => {
  await db.mealItems.clear()
  useDigestionTrackingStore.setState({ enabled: false })
  useWaterTrackingStore.setState({ enabled: false })
  localStorage.clear()
  vi.useRealTimers()
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

    await user.click(screen.getByRole('button', { name: '+ Add item' }))
    await user.type(screen.getByLabelText('kcal/100g'), '300')
    await user.click(screen.getByRole('button', { name: 'Save' }))

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

  describe('body measurements (#225)', () => {
    it('saves waist/hip/body fat together via one Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Waist (cm)'), '80')
      await user.type(screen.getByLabelText('Hip (cm)'), '95')
      await user.type(screen.getByLabelText('Body fat (%)'), '22')
      await user.click(
        screen.getByRole('button', { name: 'Save body measurements' }),
      )

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].waistCm).toBe(80)
      expect(onSave.mock.calls[0][0].hipCm).toBe(95)
      expect(onSave.mock.calls[0][0].bodyFatPercent).toBe(22)
      expect(
        screen.getByText('Waist 80cm · Hip 95cm · Body fat 22%'),
      ).toBeInTheDocument()
    })

    it('rejects an out-of-range waist value and does not save', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Waist (cm)'), '5')
      await user.click(
        screen.getByRole('button', { name: 'Save body measurements' }),
      )

      expect(await screen.findByText(/Too small/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('shows existing body measurements as read-only text with a pencil, editable via a Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            waistCm: 80,
            hipCm: 95,
            bodyFatPercent: 22,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(
        screen.getByText('Waist 80cm · Hip 95cm · Body fat 22%'),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Save body measurements' }),
      ).not.toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Edit body measurements' }),
      )
      const waistInput = screen.getByLabelText('Waist (cm)')
      expect(waistInput).toHaveValue('80')
      await user.clear(waistInput)
      await user.type(waistInput, '78')
      await user.click(
        screen.getByRole('button', { name: 'Save body measurements' }),
      )

      expect(onSave.mock.calls[0][0].waistCm).toBe(78)
      expect(
        screen.getByText('Waist 78cm · Hip 95cm · Body fat 22%'),
      ).toBeInTheDocument()
    })
  })

  describe('body composition (#233)', () => {
    it('saves muscle mass/visceral fat/body water/bone mass together via one Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Muscle mass (kg)'), '30')
      await user.type(screen.getByLabelText('Visceral fat'), '5')
      await user.type(screen.getByLabelText('Body water (%)'), '48')
      await user.type(screen.getByLabelText('Bone mass (kg)'), '2.3')
      await user.click(
        screen.getByRole('button', { name: 'Save body composition' }),
      )

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].muscleMassKg).toBe(30)
      expect(onSave.mock.calls[0][0].visceralFatRating).toBe(5)
      expect(onSave.mock.calls[0][0].bodyWaterPercent).toBe(48)
      expect(onSave.mock.calls[0][0].boneMassKg).toBe(2.3)
      expect(
        screen.getByText('Muscle 30kg · Visceral fat 5 · Water 48% · Bone 2.3kg'),
      ).toBeInTheDocument()
    })

    it('rejects an out-of-range visceral fat value and does not save', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.type(screen.getByLabelText('Visceral fat'), '999')
      await user.click(
        screen.getByRole('button', { name: 'Save body composition' }),
      )

      expect(await screen.findByText(/Too big/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('shows existing body composition as read-only text with a pencil, editable via a Save button', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            muscleMassKg: 30,
            visceralFatRating: 5,
            bodyWaterPercent: 48,
            boneMassKg: 2.3,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(
        screen.getByText('Muscle 30kg · Visceral fat 5 · Water 48% · Bone 2.3kg'),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Save body composition' }),
      ).not.toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Edit body composition' }),
      )
      const muscleInput = screen.getByLabelText('Muscle mass (kg)')
      expect(muscleInput).toHaveValue('30')
      await user.clear(muscleInput)
      await user.type(muscleInput, '31')
      await user.click(
        screen.getByRole('button', { name: 'Save body composition' }),
      )

      expect(onSave.mock.calls[0][0].muscleMassKg).toBe(31)
      expect(
        screen.getByText('Muscle 31kg · Visceral fat 5 · Water 48% · Bone 2.3kg'),
      ).toBeInTheDocument()
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

    it('lets the note display card grow to fit a long, wrapped note instead of clipping it (#189)', () => {
      const longNote =
        'Пытаюсь в кето-диету. Сегодня было 111 грамм белка, 43 грамма углеводов, 36 грамм жира.'
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'e1',
            date: '2026-03-01',
            note: longNote,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={vi.fn()}
        />,
      )

      // The card used to be a fixed h-12 — too short for a note that wraps
      // to multiple lines, so the mood icon/edit button (vertically
      // centered against that fixed height) overlapped the wrapped text.
      // min-h-12 keeps the same look for a short note but lets the card
      // grow for a long one.
      const card = screen.getByText(longNote).closest('div')
      expect(card).toHaveClass('min-h-12')
      expect(card).not.toHaveClass('h-12')
    })

    it('saves the note independently of mood (#44)', async () => {
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

  describe('optional field visibility (#237)', () => {
    afterEach(() => {
      // Merges onto whatever keys exist rather than a full literal
      // (#233's own lesson from the Dashboard/Today stores) — stays
      // correct as TrackedField grows.
      useTrackedFieldsStore.setState((state) => ({
        tracked: Object.fromEntries(
          Object.keys(state.tracked).map((key) => [key, true]),
        ) as typeof state.tracked,
      }))
    })

    it('shows Sleep, Steps, Body measurements, Body composition, Note, and Mood by default', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.getByText('Sleep')).toBeInTheDocument()
      expect(screen.getByText('Steps')).toBeInTheDocument()
      expect(screen.getByText('Body measurements')).toBeInTheDocument()
      expect(screen.getByText('Body composition')).toBeInTheDocument()
      expect(screen.getByText("Day's note")).toBeInTheDocument()
      expect(screen.getByText('Mood today')).toBeInTheDocument()
    })

    it('hides Body composition once its Settings toggle is turned off', () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, bodyComposition: false },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.queryByText('Body composition')).not.toBeInTheDocument()
      expect(screen.getByText('Body measurements')).toBeInTheDocument()
    })

    it('hides a field once its Settings toggle is turned off, without affecting the others', () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, sleep: false },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.queryByText('Sleep')).not.toBeInTheDocument()
      expect(screen.getByText('Steps')).toBeInTheDocument()
    })

    it('hides Mood independently of Note', () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, mood: false },
      }))
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.getByText("Day's note")).toBeInTheDocument()
      expect(screen.queryByText('Mood today')).not.toBeInTheDocument()
    })

    it('hides Note independently of Mood, which stays interactive on its own', async () => {
      useTrackedFieldsStore.setState((state) => ({
        tracked: { ...state.tracked, note: false },
      }))
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      expect(screen.queryByText("Day's note")).not.toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'Happy — Mood today' }),
      )
      expect(onSave.mock.calls[0][0].emotion).toBe('happy')
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

    describe('unusually high daily total warning (#218)', () => {
      function entriesWithTotal(totalKcal: number): CalorieEntry[] {
        return [
          {
            id: 'c1',
            items: [{ id: 'i1', amountKcal: totalKcal }],
            createdAt: now,
          },
        ]
      }

      it('warns when the day total crosses the threshold', () => {
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              calorieEntries: entriesWithTotal(6500),
              createdAt: now,
              updatedAt: now,
            }}
            onSave={vi.fn()}
          />,
        )

        expect(
          screen.getByText(/unusually high for one day/),
        ).toBeInTheDocument()
      })

      it('does not warn for an ordinary day total', () => {
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              calorieEntries: entriesWithTotal(2200),
              createdAt: now,
              updatedAt: now,
            }}
            onSave={vi.fn()}
          />,
        )

        expect(
          screen.queryByText(/unusually high for one day/),
        ).not.toBeInTheDocument()
      })
    })

    it('labels the add row with the meal number it will create (#95)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      expect(screen.getByText('Breakfast')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.getByText('Breakfast — 200 kcal')).toBeInTheDocument()
      expect(screen.getByText('Lunch')).toBeInTheDocument()
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

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(
        onSave.mock.calls[0][0].calorieEntries.map(
          (c: CalorieEntry) => c.items[0].amountKcal,
        ),
      ).toEqual([200])
      expect(screen.getByText('200')).toBeInTheDocument()
      expect(screen.getByText('Breakfast — 200 kcal')).toBeInTheDocument()
      // The sheet closes on save, so the field itself is gone — the reset
      // is verified by reopening the (now-blank) sheet instead.
      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      expect(screen.getByLabelText('kcal/100g')).toHaveValue('')
    })

    it('logs a note and an item reaction together with the amount in one Add action (#129)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.type(
        screen.getByLabelText('Meal note'),
        'Ate chocolates, they were good.',
      )
      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.click(screen.getByRole('button', { name: 'Thumbs up' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.getByText('Breakfast — 200 kcal')).toBeInTheDocument()
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

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.type(screen.getByLabelText('Carbs'), '30')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave.mock.calls[0][0].calorieEntries[0].items[0]).toMatchObject({
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
    })

    it('scales per-100g kcal and macros by the portions eaten (#96, #140)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      // A food rated 200 kcal / 20g protein / 10g fat / 4g carbs per 100g,
      // actually eaten as a 50g portion — half a 100g portion.
      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.type(screen.getByLabelText('Carbs'), '4')
      await user.clear(screen.getByLabelText('× 100g'))
      await user.type(screen.getByLabelText('× 100g'), '0.5')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave.mock.calls[0][0].calorieEntries[0].items[0]).toMatchObject({
        amountKcal: 100,
        proteinG: 10,
        fatG: 5,
        carbsG: 2,
        amountG: 50,
      })
    })

    it('shows a live preview of the computed total before Add is pressed (#98)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      expect(screen.queryByText(/^Total:/)).not.toBeInTheDocument()

      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.type(screen.getByLabelText('Carbs'), '4')
      await user.clear(screen.getByLabelText('× 100g'))
      await user.type(screen.getByLabelText('× 100g'), '0.5')

      expect(
        screen.getByText('Total: 100 kcal · P 10g · F 5g · C 2g'),
      ).toBeInTheDocument()
    })

    it('treats a blank portion count as 1 (100g), matching the total typed directly (#96, #140)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.clear(screen.getByLabelText('× 100g'))
      await user.type(screen.getByLabelText('kcal/100g'), '250')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave.mock.calls[0][0].calorieEntries[0].items[0]).toMatchObject({
        amountKcal: 250,
        amountG: 100,
      })
    })

    it('logs a portion weight in grams alongside the amount (#93, #140)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.clear(screen.getByLabelText('× 100g'))
      await user.type(screen.getByLabelText('× 100g'), '1.5')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // 200 kcal/100g scaled by 1.5 portions (#96, #140): 200 * 1.5 = 300.
      expect(onSave.mock.calls[0][0].calorieEntries[0].items[0]).toMatchObject({
        amountKcal: 300,
        amountG: 150,
      })
      // Resets to the default portion count, not blank (#96) — 1, i.e. 100g.
      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      expect(screen.getByLabelText('× 100g')).toHaveValue('1')
    })

    it('restores the portion weight in grams when a suggested name is picked (#93, #140)', async () => {
      const user = userEvent.setup()
      await useMealItemStore.getState().touch('Pizza', {
        amountKcal: 400,
        amountG: 250,
      })
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(await screen.findByLabelText('Dish name'), 'P')
      await user.click(await screen.findByRole('button', { name: 'Pizza' }))

      // 250g back-calculates to 2.5 portions of 100g.
      expect(screen.getByLabelText('× 100g')).toHaveValue('2.5')
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

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave.mock.calls[0][0].calorieEntries[0].items[0]).toMatchObject({
        amountKcal: 200,
        fatG: 10,
      })
      expect(
        onSave.mock.calls[0][0].calorieEntries[0].items[0].proteinG,
      ).toBeUndefined()
      expect(screen.getAllByText('Protein — · Fat 10g · Carbs —')).toHaveLength(
        2,
      )
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

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // The sheet's own "Protein"/"Fat"/"Carbs" field labels aren't
      // rendered at rest (sheet is closed) — only the combined "Protein X
      // · Fat Y · Carbs Z" summary sentence should be absent either way
      // when nothing was logged.
      expect(screen.queryByText(/Fat .* · Carbs/)).not.toBeInTheDocument()
    })

    it('shows a read-only per-day macro total next to the kcal total (#51)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.type(screen.getByLabelText('Protein'), '5')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // Day total: 25g protein (20+5), 10g fat (only meal 1), no carbs logged.
      expect(
        screen.getByText('Protein 25g · Fat 10g · Carbs —'),
      ).toBeInTheDocument()
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

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Dish name'), 'Pizza')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await screen.findByText('Breakfast — 200 kcal')
      expect(await db.mealItems.toArray()).toEqual([
        expect.objectContaining({ name: 'Pizza' }),
      ])
    })

    it('offers previously logged meal names as suggestions while typing (#86)', async () => {
      const user = userEvent.setup()
      await useMealItemStore.getState().touch('Pizza', { amountKcal: 400 })
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      const nameInput = await screen.findByLabelText('Dish name')
      await user.type(nameInput, 'Pi')

      expect(
        await screen.findByRole('button', { name: 'Pizza' }),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Pizza' }))
      expect(nameInput).toHaveValue('Pizza')
    })

    it('restores calories/macros when a suggested name is picked (#94)', async () => {
      const user = userEvent.setup()
      await useMealItemStore.getState().touch('Pizza', {
        amountKcal: 400,
        proteinG: 15,
        fatG: 12,
        carbsG: 50,
      })
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(await screen.findByLabelText('Dish name'), 'P')
      await user.click(await screen.findByRole('button', { name: 'Pizza' }))

      expect(screen.getByLabelText('kcal/100g')).toHaveValue('400')
      expect(screen.getByLabelText('Protein')).toHaveValue('15')
      expect(screen.getByLabelText('Fat')).toHaveValue('12')
      expect(screen.getByLabelText('Carbs')).toHaveValue('50')
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

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(screen.getByText('600')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.keyboard('{Enter}')
      expect(screen.getByText('750')).toBeInTheDocument()
      expect(screen.getByText('Dinner — 150 kcal')).toBeInTheDocument()
      expect(onSave).toHaveBeenCalledTimes(2)
    })

    it('toggles an emotion selection off when clicked again (#129)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      const thumbsUpButton = screen.getByRole('button', { name: 'Thumbs up' })
      await user.click(thumbsUpButton)
      expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'true')

      await user.click(thumbsUpButton)
      expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'false')

      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.getByText('Breakfast — 150 kcal')).toBeInTheDocument()
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

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '0')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave).not.toHaveBeenCalled()
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('disables Add until a valid kcal/100g rate is entered (#109)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      const saveButton = screen.getByRole('button', { name: 'Save' })
      expect(saveButton).toBeDisabled()

      await user.type(screen.getByLabelText('kcal/100g'), '0')
      expect(saveButton).toBeDisabled()

      await user.clear(screen.getByLabelText('kcal/100g'))
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      expect(saveButton).toBeEnabled()
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

      // #157: "shows the per-100g rate...", "shows a live preview...", and
      // "edits a meal amount in place..." moved to MealEditScreen.test.tsx
      // — editing an existing meal is no longer reachable inline here.

      describe('custom meal name (#110)', () => {
        it('shows a custom label instead of the default numbering when set', () => {
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={{
                id: 'e1',
                date: '2026-03-01',
                calorieEntries: [
                  { ...calories(300, 'c1'), label: 'Breakfast' },
                ],
                createdAt: now,
                updatedAt: now,
              }}
              onSave={vi.fn()}
            />,
          )

          expect(screen.getByText('Breakfast — 300 kcal')).toBeInTheDocument()
          expect(screen.queryByText(/^Meal 1/)).not.toBeInTheDocument()
        })

        it('defaults unlabeled meals to Breakfast/Lunch/Dinner/Snack by position (#141)', () => {
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={{
                id: 'e1',
                date: '2026-03-01',
                calorieEntries: [
                  calories(100, 'c1'),
                  calories(200, 'c2'),
                  calories(300, 'c3'),
                  calories(400, 'c4'),
                ],
                createdAt: now,
                updatedAt: now,
              }}
              onSave={vi.fn()}
            />,
          )

          expect(screen.getByText('Breakfast — 100 kcal')).toBeInTheDocument()
          expect(screen.getByText('Lunch — 200 kcal')).toBeInTheDocument()
          expect(screen.getByText('Dinner — 300 kcal')).toBeInTheDocument()
          expect(screen.getByText('Snack — 400 kcal')).toBeInTheDocument()
        })

        it('falls back to positional "Meal N" from the 5th meal onward (#141)', () => {
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={{
                id: 'e1',
                date: '2026-03-01',
                calorieEntries: [
                  calories(100, 'c1'),
                  calories(200, 'c2'),
                  calories(300, 'c3'),
                  calories(400, 'c4'),
                  calories(500, 'c5'),
                ],
                createdAt: now,
                updatedAt: now,
              }}
              onSave={vi.fn()}
            />,
          )

          expect(screen.getByText('Meal 5 — 500 kcal')).toBeInTheDocument()
        })

        // #157: "sets a custom label...", "saves a custom label on
        // Enter...", "prefills the label input...", "clearing the
        // label...", and "fills the label from a quick-pick preset" moved
        // to MealEditScreen.test.tsx.
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
        expect(screen.getByText('Breakfast — 200 kcal')).toBeInTheDocument()
        expect(onSave).toHaveBeenCalledTimes(1)
        expect(
          onSave.mock.calls[0][0].calorieEntries.map(
            (c: CalorieEntry) => c.items[0].amountKcal,
          ),
        ).toEqual([200])
      })

      it('deletes a meal directly from the view row, without opening edit mode first (#97)', async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        renderWithMeals(onSave)

        await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
        expect(screen.getByText('Delete this entry?')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Delete' }))

        expect(screen.queryByText(/300 kcal/)).not.toBeInTheDocument()
        expect(screen.getByText('Breakfast — 200 kcal')).toBeInTheDocument()
        expect(onSave).toHaveBeenCalledTimes(1)
      })

      // #157: "cancels a meal delete...", "edits a meal note and an
      // item's reaction...", "edits a meal's protein/fat/carbs...", and
      // "renders bellissimo..." moved to MealEditScreen.test.tsx.

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

        expect(screen.getByText('Breakfast — 200 kcal')).toBeInTheDocument()
        expect(screen.getByText('Lunch — 300 kcal')).toBeInTheDocument()
        expect(onSave).toHaveBeenCalledTimes(1)
        expect(
          onSave.mock.calls[0][0].calorieEntries.map(
            (c: CalorieEntry) => c.items[0].amountKcal,
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

      describe('per 100g / per portion toggle (#111)', () => {
        it('defaults to per-100g mode, unchanged from before this feature', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await user.click(screen.getByRole('button', { name: '+ Add item' }))
          expect(screen.getByLabelText('kcal/100g')).toBeInTheDocument()
          expect(screen.getByRole('radio', { name: '100g' })).toBeChecked()
        })

        it('saves the typed total directly in per-portion mode, no multiplication', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await user.click(screen.getByRole('button', { name: '+ Add item' }))
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          expect(screen.getByLabelText('kcal')).toBeInTheDocument()

          await user.type(screen.getByLabelText('kcal'), '450')
          await user.type(screen.getByLabelText('Protein'), '20')
          await user.click(screen.getByRole('button', { name: 'Save' }))

          const item = onSave.mock.calls[0][0].calorieEntries[0].items[0]
          expect(item.amountKcal).toBe(450)
          expect(item.proteinG).toBe(20)
        })

        it('shows the unscaled total in the live preview while in per-portion mode', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await user.click(screen.getByRole('button', { name: '+ Add item' }))
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          await user.type(screen.getByLabelText('kcal'), '450')

          expect(screen.getByText('Total: 450 kcal')).toBeInTheDocument()
        })

        it('converts a typed per-100g rate to an absolute total when switching to per-portion', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await user.click(screen.getByRole('button', { name: '+ Add item' }))
          await user.type(screen.getByLabelText('kcal/100g'), '300')
          await user.clear(screen.getByLabelText('× 100g'))
          await user.type(screen.getByLabelText('× 100g'), '0.5')

          await user.click(screen.getByRole('radio', { name: 'Portion' }))

          // 300 kcal/100g at 0.5 portions (50g) = 150 kcal total.
          expect(screen.getByLabelText('kcal')).toHaveValue('150')
        })

        it('converts an absolute total back to a per-100g rate when switching back', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          // The portions field is only editable in per-100g mode (#121
          // hides it in Portion mode, as a read-only memory aid) — set it
          // before switching, then switch there and back.
          await user.click(screen.getByRole('button', { name: '+ Add item' }))
          await user.clear(screen.getByLabelText('× 100g'))
          await user.type(screen.getByLabelText('× 100g'), '0.5')
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          await user.clear(screen.getByLabelText('kcal'))
          await user.type(screen.getByLabelText('kcal'), '150')

          await user.click(screen.getByRole('radio', { name: '100g' }))

          // 150 kcal eaten as a 0.5-portion (50g) back-calculates to 300
          // kcal/100g.
          expect(screen.getByLabelText('kcal/100g')).toHaveValue('300')
          expect(screen.getByLabelText('× 100g')).toHaveValue('0.5')
        })

        it('shows a Portion badge instead of the portions field while in Portion mode', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await user.click(screen.getByRole('button', { name: '+ Add item' }))
          expect(screen.getByLabelText('× 100g')).toBeInTheDocument()
          // Just the toggle option's own label before switching.
          expect(screen.getAllByText('Portion')).toHaveLength(1)

          await user.click(screen.getByRole('radio', { name: 'Portion' }))

          expect(screen.queryByLabelText('× 100g')).not.toBeInTheDocument()
          // Toggle option label + the new static badge.
          expect(screen.getAllByText('Portion')).toHaveLength(2)

          await user.click(screen.getByRole('radio', { name: '100g' }))

          expect(screen.getByLabelText('× 100g')).toBeInTheDocument()
        })

        it('resets to per-100g mode after a successful Add', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await user.click(screen.getByRole('button', { name: '+ Add item' }))
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          await user.type(screen.getByLabelText('kcal'), '450')
          await user.click(screen.getByRole('button', { name: 'Save' }))

          // The sheet closes on save — reopen it (blank, freshly reset) to
          // check the mode was reset.
          await user.click(screen.getByRole('button', { name: '+ Add item' }))
          expect(screen.getByRole('radio', { name: '100g' })).toBeChecked()
          expect(screen.getByLabelText('kcal/100g')).toBeInTheDocument()
        })
      })

      // #157: the entire "per 100g / per portion toggle on item-edit rows
      // (#111)" describe block and the entire "grouping multiple items
      // under one meal (#81)" describe block moved to
      // MealEditScreen.test.tsx — both were exclusively about editing an
      // already-logged meal's items, no longer reachable inline here.

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

          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '08:15' },
          })
          await user.click(screen.getByRole('button', { name: '+ Add item' }))
          await user.type(screen.getByLabelText('kcal/100g'), '200')
          await user.click(screen.getByRole('button', { name: 'Save' }))

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

          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '' },
          })
          await user.click(screen.getByRole('button', { name: '+ Add item' }))
          await user.type(screen.getByLabelText('kcal/100g'), '200')
          await user.click(screen.getByRole('button', { name: 'Save' }))

          expect(
            onSave.mock.calls[0][0].calorieEntries[0].timeEaten,
          ).toBeUndefined()
        })

        it('has an app-level clear button, since the native picker Reset is unreliable (#117)', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          expect(
            screen.queryByRole('button', { name: 'Clear time' }),
          ).not.toBeInTheDocument()

          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '08:15' },
          })
          expect(
            screen.getByRole('button', { name: 'Clear time' }),
          ).toBeInTheDocument()

          await user.click(screen.getByRole('button', { name: 'Clear time' }))

          expect(screen.getByLabelText('Time')).toHaveValue('')
          expect(
            screen.queryByRole('button', { name: 'Clear time' }),
          ).not.toBeInTheDocument()
        })

        // #157: "can be edited on an existing meal" and "item-edit row
        // also has an app-level clear button (#117)" moved to
        // MealEditScreen.test.tsx.

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
        it('opens the food dialog from the Find food button and adds a scaled meal', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await user.click(screen.getByRole('button', { name: 'Find food' }))
          await user.click(screen.getByText('Salmon'))
          await user.click(screen.getByRole('button', { name: 'Add selected' }))

          expect(onSave).toHaveBeenCalledTimes(1)
          const entry = onSave.mock.calls[0][0].calorieEntries[0]
          expect(entry.items[0].amountKcal).toBe(208)
          expect(entry.items[0].proteinG).toBe(20)
          expect(entry.items[0].name).toBe('Salmon')
          // The quantity used to scale the totals is stored too (#96), so
          // this item can later be edited the same per-100g + quantity way
          // a manually-entered one can, at the default 100g quantity.
          expect(entry.items[0].amountG).toBe(100)
          expect(screen.getByText('Breakfast — 208 kcal')).toBeInTheDocument()
        })

        it('stores the actual quantity picked, not just the default (#96)', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await user.click(screen.getByRole('button', { name: 'Find food' }))
          await user.click(screen.getByText('Salmon'))
          const quantityInput = screen.getByLabelText('Quantity (g)')
          await user.clear(quantityInput)
          await user.type(quantityInput, '50')
          await user.click(screen.getByRole('button', { name: 'Add selected' }))

          const entry = onSave.mock.calls[0][0].calorieEntries[0]
          expect(entry.items[0].amountKcal).toBe(104)
          expect(entry.items[0].amountG).toBe(50)
        })

        it('lets a food found via Find food be rated before adding (#134)', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await user.click(screen.getByRole('button', { name: 'Find food' }))
          await user.click(screen.getByText('Salmon'))
          await user.click(
            screen.getByRole('button', { name: 'Bellissimo — Salmon' }),
          )
          await user.click(screen.getByRole('button', { name: 'Add selected' }))

          const entry = onSave.mock.calls[0][0].calorieEntries[0]
          expect(entry.items[0].emotion).toBe('bellissimo')
        })
      })
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

      expect(screen.getByRole('radio', { name: 'No' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
      expect(screen.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
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

      await user.click(screen.getByRole('radio', { name: 'Yes' }))

      expect(onSave).toHaveBeenCalled()
      expect(onSave.mock.calls[0][0].hadConstipation).toBe(true)
      expect(screen.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
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

      expect(screen.getByRole('radio', { name: 'Yes' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
    })
  })

  describe('water tracking (#258)', () => {
    it('hides the field when water tracking is disabled', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.queryByLabelText('Water')).not.toBeInTheDocument()
    })

    it('shows the field with quick-add buttons when enabled', () => {
      useWaterTrackingStore.setState({ enabled: true })
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(screen.getByLabelText('Water')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: '+1 glass (250ml)' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: '+1 bottle (500ml)' }),
      ).toBeInTheDocument()
    })

    it('saves the typed total via the Save button', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      await user.type(screen.getByLabelText('Water'), '750')
      await user.click(screen.getByRole('button', { name: 'Save water' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].waterMl).toBe(750)
    })

    it('rejects an out-of-range total and does not save', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      await user.type(screen.getByLabelText('Water'), '99999')
      await user.click(screen.getByRole('button', { name: 'Save water' }))

      expect(await screen.findByText(/Too big/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    it('bumps the running total and saves immediately on a quick-add click, with no prior value', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      await user.click(screen.getByRole('button', { name: '+1 glass (250ml)' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].waterMl).toBe(250)
      expect(screen.getByLabelText('Water')).toHaveValue('250')
    })

    it('adds to an already-logged total rather than replacing it', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            waterMl: 500,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      await user.click(screen.getByRole('button', { name: '+1 bottle (500ml)' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].waterMl).toBe(1000)
    })
  })
})
