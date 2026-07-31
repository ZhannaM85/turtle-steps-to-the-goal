import 'fake-indexeddb/auto'
import { fireEvent, render as rtlRender, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
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

// #454 replaced the always-visible inline add-row with a dedicated flyout
// (AddMealDialog) opened via "+ Add another meal", with manual entry now
// one level deeper behind the "Add food" quick-action card (#459 restyled
// this from a plain "Can't find it? Add manually" text link into a
// bordered card, same underlying action) — this opens the same
// MealItemEditorSheet these pre-#454 tests already exercise, whether the
// flyout is already open (a second add within the same test) or not. Once
// open, the trigger button itself becomes `aria-hidden` (covered by the
// fullscreen dialog), so `queryByRole` — which respects that, unlike
// `getByText` — reliably tells the two cases apart.
async function openAddItemFlow(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.queryByRole('button', { name: '+ Add another meal' })
  if (trigger) await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Add food' }))
}

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

    await openAddItemFlow(user)
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

    describe('leaving edit mode without saving (#424)', () => {
      it('has no Cancel button for a brand-new entry with nothing saved yet', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', { name: 'Cancel editing weight' }),
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
              weightKg: 80,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(screen.getByRole('button', { name: 'Edit weight' }))
        const input = screen.getByLabelText('Weight (kg)')
        await user.clear(input)
        await user.type(input, '999')
        await user.click(
          screen.getByRole('button', { name: 'Cancel editing weight' }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText('80 kg')).toBeInTheDocument()
        expect(
          screen.queryByLabelText('Weight (kg)'),
        ).not.toBeInTheDocument()
      })
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

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
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

    describe('leaving edit mode without saving (#424)', () => {
      it('has no Cancel button for a brand-new entry with nothing saved yet', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', { name: 'Cancel editing sleep' }),
        ).not.toBeInTheDocument()
      })

      it('discards typed changes to both hours and deep sleep, reverting to the saved values', async () => {
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

        await user.click(screen.getByRole('button', { name: 'Edit sleep' }))
        await user.clear(screen.getByLabelText('Hours slept — hours'))
        await user.type(screen.getByLabelText('Hours slept — hours'), '3')
        await user.click(
          screen.getByRole('button', { name: 'Cancel editing sleep' }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText('7h 0m slept · 1h 30m deep')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Edit sleep' }))
        expect(screen.getByLabelText('Hours slept — hours')).toHaveValue('7')
      })
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
  })

  describe('body measurements (#225)', () => {
    it('saves waist/hip together via one Save button', async () => {
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
      await user.click(
        screen.getByRole('button', { name: 'Save body measurements' }),
      )

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].waistCm).toBe(80)
      expect(onSave.mock.calls[0][0].hipCm).toBe(95)
      expect(screen.getByText('Waist 80cm · Hip 95cm')).toBeInTheDocument()
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

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
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
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.getByText('Waist 80cm · Hip 95cm')).toBeInTheDocument()
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
      expect(screen.getByText('Waist 78cm · Hip 95cm')).toBeInTheDocument()
    })

    describe('leaving edit mode without saving (#424)', () => {
      it('has no Cancel button for a brand-new entry with nothing saved yet', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', {
            name: 'Cancel editing body measurements',
          }),
        ).not.toBeInTheDocument()
      })

      it('discards typed changes to both waist and hip, reverting to the saved values', async () => {
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
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(
          screen.getByRole('button', { name: 'Edit body measurements' }),
        )
        const waistInput = screen.getByLabelText('Waist (cm)')
        await user.clear(waistInput)
        await user.type(waistInput, '150')
        await user.click(
          screen.getByRole('button', {
            name: 'Cancel editing body measurements',
          }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText('Waist 80cm · Hip 95cm')).toBeInTheDocument()
      })
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
      await user.type(screen.getByLabelText('Body fat (%)'), '22')
      await user.click(
        screen.getByRole('button', { name: 'Save body composition' }),
      )

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].muscleMassKg).toBe(30)
      expect(onSave.mock.calls[0][0].visceralFatRating).toBe(5)
      expect(onSave.mock.calls[0][0].bodyWaterPercent).toBe(48)
      expect(onSave.mock.calls[0][0].boneMassKg).toBe(2.3)
      expect(onSave.mock.calls[0][0].bodyFatPercent).toBe(22)
      expect(
        screen.getByText(
          'Muscle 30kg · Visceral fat 5 · Water 48% · Bone 2.3kg · Body fat 22%',
        ),
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

      expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
    })

    describe('validates on blur, not just on Save (#435)', () => {
      it('shows an error as soon as an out-of-range value is blurred, before Save is clicked', async () => {
        const user = userEvent.setup()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        await user.type(screen.getByLabelText('Muscle mass (kg)'), '27272')
        await user.tab()

        expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()
      })

      it('clears the error on blur once the value is fixed', async () => {
        const user = userEvent.setup()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        const field = screen.getByLabelText('Visceral fat')
        await user.type(field, '19119')
        await user.tab()
        expect(await screen.findByText(/Invalid value/)).toBeInTheDocument()

        await user.clear(field)
        await user.type(field, '5')
        await user.tab()

        expect(screen.queryByText(/Invalid value/)).not.toBeInTheDocument()
      })

      it('does not show an error while a value is only half-typed, before blurring', async () => {
        const user = userEvent.setup()
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        // "2" alone would be a perfectly valid visceral fat rating -- this
        // confirms validation isn't running on every keystroke.
        await user.type(screen.getByLabelText('Visceral fat'), '2')

        expect(screen.queryByText(/Invalid value/)).not.toBeInTheDocument()
      })
    })

    // #427 — jsdom has no layout engine (same reasoning #343's dnd-kit note
    // already documents), so the real fix was verified live via a Playwright
    // boundingBox() measurement, not here. This guards the specific classes
    // that placement depends on, so a future refactor back to grid auto-flow
    // (the original bug) doesn't silently regress unnoticed.
    it('pins the Save button to column 3/row 2 of the grid, not auto-flow (#427)', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      const saveButton = screen.getByRole('button', {
        name: 'Save body composition',
      })
      expect(saveButton).toHaveClass('col-start-3', 'row-start-2', 'self-end')
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
            bodyFatPercent: 22,
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(
        screen.getByText(
          'Muscle 30kg · Visceral fat 5 · Water 48% · Bone 2.3kg · Body fat 22%',
        ),
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
        screen.getByText(
          'Muscle 31kg · Visceral fat 5 · Water 48% · Bone 2.3kg · Body fat 22%',
        ),
      ).toBeInTheDocument()
    })

    describe('leaving edit mode without saving (#424)', () => {
      afterEach(async () => {
        await db.dailyEntries.clear()
      })

      it('has no Cancel button for a brand-new entry with nothing saved yet', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', {
            name: 'Cancel editing body composition',
          }),
        ).not.toBeInTheDocument()
      })

      it('discards typed changes to all 5 fields, reverting to the saved values', async () => {
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
              bodyFatPercent: 22,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(
          screen.getByRole('button', { name: 'Edit body composition' }),
        )
        const muscleInput = screen.getByLabelText('Muscle mass (kg)')
        await user.clear(muscleInput)
        await user.type(muscleInput, '90')
        await user.click(
          screen.getByRole('button', {
            name: 'Cancel editing body composition',
          }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(
          screen.getByText(
            'Muscle 30kg · Visceral fat 5 · Water 48% · Bone 2.3kg · Body fat 22%',
          ),
        ).toBeInTheDocument()
      })

      it('also dismisses any pending unusual-value warning', async () => {
        // A previous day's entry so there's a #401 delta baseline, and an
        // existing today's entry so the Cancel button actually renders
        // (nothing established for today = nothing to cancel back to).
        await db.dailyEntries.put({
          id: 'prev-1',
          date: '2026-02-28',
          muscleMassKg: 30,
          createdAt: now,
          updatedAt: now,
        })
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={{
              id: 'e1',
              date: '2026-03-01',
              muscleMassKg: 30,
              createdAt: now,
              updatedAt: now,
            }}
            onSave={onSave}
          />,
        )

        await user.click(
          screen.getByRole('button', { name: 'Edit body composition' }),
        )
        const muscleInput = screen.getByLabelText('Muscle mass (kg)')
        await user.clear(muscleInput)
        // 35kg on its own is a perfectly ordinary muscle mass -- only the
        // 5kg jump from yesterday's 30kg (#401) makes this unusual.
        await user.type(muscleInput, '35')
        await user.click(
          screen.getByRole('button', { name: 'Save body composition' }),
        )
        expect(await screen.findByText(/unusual change/)).toBeInTheDocument()

        await user.click(
          screen.getByRole('button', {
            name: 'Cancel editing body composition',
          }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.queryByText(/unusual change/)).not.toBeInTheDocument()
        expect(
          screen.getByText(/Muscle 30kg/),
        ).toBeInTheDocument()
      })
    })

    describe('unusual jump vs. yesterday (#401)', () => {
      afterEach(async () => {
        await db.dailyEntries.clear()
      })

      it('warns when a body composition field jumps unusually from yesterday, saves anyway on confirm', async () => {
        await db.dailyEntries.put({
          id: 'prev-1',
          date: '2026-02-28',
          muscleMassKg: 30,
          createdAt: now,
          updatedAt: now,
        })
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={null}
            onSave={onSave}
          />,
        )

        // 35kg on its own is a perfectly ordinary muscle mass — only the
        // 5kg jump from yesterday's 30kg makes this unusual.
        await user.type(screen.getByLabelText('Muscle mass (kg)'), '35')
        await user.click(
          screen.getByRole('button', { name: 'Save body composition' }),
        )

        expect(
          await screen.findByText(/unusual change/),
        ).toBeInTheDocument()
        expect(onSave).not.toHaveBeenCalled()

        await user.click(
          screen.getByRole('button', { name: 'Save anyway' }),
        )
        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave.mock.calls[0][0].muscleMassKg).toBe(35)
      })

      it('does not warn for an ordinary day-to-day body composition change', async () => {
        await db.dailyEntries.put({
          id: 'prev-2',
          date: '2026-02-28',
          muscleMassKg: 30,
          createdAt: now,
          updatedAt: now,
        })
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
          <DailyEntryForm
            date="2026-03-01"
            existingEntry={null}
            onSave={onSave}
          />,
        )

        await user.type(screen.getByLabelText('Muscle mass (kg)'), '30.1')
        await user.click(
          screen.getByRole('button', { name: 'Save body composition' }),
        )

        expect(onSave).toHaveBeenCalledTimes(1)
        expect(screen.queryByText(/unusual change/)).not.toBeInTheDocument()
      })
    })

    it('does not persist an invalid, never-saved draft when a different field is saved (#447)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      // Type a far-out-of-range value into Body composition, but never
      // click its own Save button (or trigger the #435 on-blur error path
      // by leaving the field, matching the reported live scenario).
      await user.type(screen.getByLabelText('Muscle mass (kg)'), '58888')

      // Save a completely different field instead.
      await user.type(screen.getByLabelText('Weight (kg)'), '60')
      await user.click(screen.getByRole('button', { name: 'Save weight' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].weightKg).toBe(60)
      // The invalid, never-validated muscle mass draft must not ride
      // along -- nothing was ever successfully saved for it, so it stays
      // unset rather than persisting the still-invalid 58888 draft.
      expect(onSave.mock.calls[0][0].muscleMassKg).toBeUndefined()
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

    it('lets Enter insert a newline in the note field instead of saving it (#417)', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={onSave}
        />,
      )

      const input = screen.getByLabelText("Day's note")
      await user.type(input, 'line one{Enter}line two')

      expect(onSave).not.toHaveBeenCalled()
      expect(input).toHaveValue('line one\nline two')
    })

    describe('leaving edit mode without saving (#437)', () => {
      it('has no Cancel button for a brand-new note with nothing saved yet', () => {
        render(
          <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
        )

        expect(
          screen.queryByRole('button', { name: 'Cancel editing note' }),
        ).not.toBeInTheDocument()
      })

      it('discards a typed change and reverts to the saved note', async () => {
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

        await user.click(screen.getByRole('button', { name: 'Edit note' }))
        const input = screen.getByLabelText("Day's note")
        await user.clear(input)
        await user.type(input, 'a change I want to discard')
        await user.click(
          screen.getByRole('button', { name: 'Cancel editing note' }),
        )

        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByText('felt good')).toBeInTheDocument()
        expect(
          screen.queryByLabelText("Day's note"),
        ).not.toBeInTheDocument()
      })
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
    it('has no direct-entry calories field', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      expect(screen.queryByLabelText('Calories')).not.toBeInTheDocument()
    })

    // #326 — the big "X kcal today" readout was removed as pure duplicate
    // information (always the same number as TodayScreen's "Remaining
    // calories" breakdown card's own "consumed" figure); this only
    // asserts it's actually gone, not what replaced it (that lives on
    // TodayScreen, not this form).
    it('no longer shows a standalone kcal-today readout (#326)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      expect(screen.queryByText('kcal today')).not.toBeInTheDocument()
    })

    // #327 — the "Calories" label + its day-lag info tooltip were left
    // behind by #326 even after the number readout they used to sit next
    // to was removed, so they no longer labeled anything. Both are gone.
    it('no longer shows the orphaned "Calories" label or its tooltip (#327)', () => {
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      expect(screen.queryByText('Calories')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'About the calories field' }),
      ).not.toBeInTheDocument()
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

    it('labels the flyout with the meal number it will create (#95)', async () => {
      const user = userEvent.setup()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={null}
          onSave={vi.fn()}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      expect(
        screen.getByRole('heading', { name: 'Breakfast' }),
      ).toBeInTheDocument()

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Done' }))

      expect(screen.getByText('Breakfast — 200 kcal')).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      expect(
        screen.getByRole('heading', { name: 'Lunch' }),
      ).toBeInTheDocument()
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

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(
        onSave.mock.calls[0][0].calorieEntries.map(
          (c: CalorieEntry) => c.items[0].amountKcal,
        ),
      ).toEqual([200])
      expect(screen.getByText('Breakfast — 200 kcal')).toBeInTheDocument()
      // The sheet closes on save, so the field itself is gone — the reset
      // is verified by reopening the (now-blank) sheet instead.
      await openAddItemFlow(user)
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

      // The note is a meal-level field in the flyout's own header (#454),
      // not part of the per-item sheet — has to be typed once the flyout
      // is open, before diving into manual entry for the item itself.
      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      await user.type(
        screen.getByLabelText('Meal note'),
        'Ate chocolates, they were good.',
      )
      await openAddItemFlow(user)
      await user.click(screen.getByRole('button', { name: 'Thumbs up' }))
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Done' }))

      expect(screen.getByText('Breakfast — 200 kcal')).toBeInTheDocument()
      expect(
        screen.getByText('Ate chocolates, they were good.'),
      ).toBeInTheDocument()
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

      await openAddItemFlow(user)
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
      // The per-day total (#462) now lives on its own StatCard (#467) —
      // kcal as the big value, macros as the description below it.
      const consumedCard = screen
        .getByText('Consumed')
        .closest('[data-slot="card"]') as HTMLElement
      expect(within(consumedCard).getByText('200')).toBeInTheDocument()
      expect(
        within(consumedCard).getByText('Protein 20g · Fat 10g · Carbs 30g'),
      ).toBeInTheDocument()
      // The meal's own summary line (#51) also still renders this text,
      // separately from the day-total card above.
      const macrosMatches = screen.getAllByText(
        'Protein 20g · Fat 10g · Carbs 30g',
      )
      expect(
        macrosMatches.some((el) => !consumedCard.contains(el)),
      ).toBe(true)
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
      await openAddItemFlow(user)
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

      await openAddItemFlow(user)
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

      await openAddItemFlow(user)
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

      await openAddItemFlow(user)
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
      await openAddItemFlow(user)
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

      await openAddItemFlow(user)
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

      await openAddItemFlow(user)
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
      const consumedCard = screen
        .getByText('Consumed')
        .closest('[data-slot="card"]') as HTMLElement
      expect(within(consumedCard).getByText('200')).toBeInTheDocument()
      expect(
        within(consumedCard).getByText('Protein — · Fat 10g · Carbs —'),
      ).toBeInTheDocument()
      const macrosMatches = screen.getAllByText('Protein — · Fat 10g · Carbs —')
      expect(
        macrosMatches.some((el) => !consumedCard.contains(el)),
      ).toBe(true)
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

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // The day-level total now always shows once *any* value — even just
      // calories — is logged (#462), with dashes for the unset macros, on
      // its own StatCard (#467).
      const consumedCard = screen
        .getByText('Consumed')
        .closest('[data-slot="card"]') as HTMLElement
      expect(within(consumedCard).getByText('200')).toBeInTheDocument()
      expect(
        within(consumedCard).getByText('Protein — · Fat — · Carbs —'),
      ).toBeInTheDocument()
      // The per-meal summary line (macro-only, unaffected by #462) stays
      // absent when no macros were logged at all — every match for this
      // text lives inside the day-total card above, none elsewhere.
      const macrosMatches = screen.getAllByText('Protein — · Fat — · Carbs —')
      expect(macrosMatches.every((el) => consumedCard.contains(el))).toBe(
        true,
      )
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

      // Two *separate* meals (closing the flyout between them via Done) —
      // #454's persistent multi-add would otherwise land both items in the
      // same in-progress meal, whose own summary line would then read
      // identically to the day total this test is actually checking.
      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '10')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Done' }))

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.type(screen.getByLabelText('Protein'), '5')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Done' }))

      // Day total: 350 kcal (200+150), 25g protein (20+5), 10g fat (only
      // meal 1), no carbs logged. Own StatCard (#467) — kcal as the big
      // value, macros as the description below it.
      const consumedCard = screen
        .getByText('Consumed')
        .closest('[data-slot="card"]') as HTMLElement
      expect(within(consumedCard).getByText('350')).toBeInTheDocument()
      expect(
        within(consumedCard).getByText('Protein 25g · Fat 10g · Carbs —'),
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

      await openAddItemFlow(user)
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

      await openAddItemFlow(user)
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

      await openAddItemFlow(user)
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

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '200')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      // The existing entry already occupies the Breakfast slot, so this
      // one becomes Lunch.
      expect(screen.getByText('Lunch — 200 kcal')).toBeInTheDocument()
      // Closing the flyout (#454) ends this meal, so the *next* add starts
      // a fresh one (Dinner) instead of appending a second item onto Lunch.
      await user.click(screen.getByRole('button', { name: 'Done' }))

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.keyboard('{Enter}')
      expect(screen.getByText('Dinner — 150 kcal')).toBeInTheDocument()
      expect(onSave).toHaveBeenCalledTimes(2)
      // #326 — this form no longer displays a running total of its own
      // (TodayScreen's breakdown card owns that now), so accumulation is
      // verified via the actual saved payload instead of a UI readout.
      const lastSavedTotal = onSave.mock.calls[1][0].calorieEntries.reduce(
        (sum: number, c: CalorieEntry) =>
          sum + c.items.reduce((s: number, i) => s + i.amountKcal, 0),
        0,
      )
      expect(lastSavedTotal).toBe(750)
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

      await openAddItemFlow(user)
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

      await openAddItemFlow(user)
      await user.type(screen.getByLabelText('kcal/100g'), '0')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave).not.toHaveBeenCalled()
      expect(screen.queryByText(/— 0 kcal/)).not.toBeInTheDocument()
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

      await openAddItemFlow(user)
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

      // #157/#461: existing-meal edit coverage moved off this form — first
      // to MealEditScreen (#157), then into MealList's in-place
      // AddMealDialog overlay (#461). See MealList.test.tsx /
      // AddMealDialog.test.tsx.

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
        // #157/#461: label-field edit coverage moved off this form — see
        // MealList.test.tsx / AddMealDialog.test.tsx.
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

      // #157/#461: meal-note / reaction / macro edit coverage moved off
      // this form — see MealList.test.tsx / AddMealDialog.test.tsx.

      // #468 — drag-to-reorder removed entirely (reported live as broken,
      // couldn't actually swap two meals) along with its 3 tests here.
      // See #471 for the planned replacement, an on-demand toggle mode
      // like TodayScreen's own Stats section reorder, not always-on drag
      // handles.

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

          await openAddItemFlow(user)
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

          await openAddItemFlow(user)
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

          await openAddItemFlow(user)
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

          await openAddItemFlow(user)
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
          await openAddItemFlow(user)
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

        // #457 — the field used to become a non-interactive "Portion"
        // badge in Portion mode (a portions-count *multiplier* there would
        // have been confusing); it's now a real, optional weight-in-grams
        // field instead, so a per-100g rate can still be back-calculated
        // later even for an item entered as a direct total.
        it('shows an optional weight field, not a portions multiplier, while in Portion mode', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await openAddItemFlow(user)
          expect(screen.getByLabelText('× 100g')).toBeInTheDocument()
          expect(screen.queryByLabelText('Weight (g)')).not.toBeInTheDocument()

          await user.click(screen.getByRole('radio', { name: 'Portion' }))

          expect(screen.queryByLabelText('× 100g')).not.toBeInTheDocument()
          expect(screen.getByLabelText('Weight (g)')).toBeInTheDocument()

          await user.click(screen.getByRole('radio', { name: '100g' }))

          expect(screen.getByLabelText('× 100g')).toBeInTheDocument()
        })

        it('records a portion-mode weight and converts it to a per-100g rate when switching back', async () => {
          const user = userEvent.setup()
          const onSave = vi.fn()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={onSave}
            />,
          )

          await openAddItemFlow(user)
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          await user.type(screen.getByLabelText('kcal'), '450')
          await user.type(screen.getByLabelText('Protein'), '30')
          await user.clear(screen.getByLabelText('Weight (g)'))
          await user.type(screen.getByLabelText('Weight (g)'), '150')
          await user.click(screen.getByRole('button', { name: 'Save' }))

          const item = onSave.mock.calls[0][0].calorieEntries[0].items[0]
          expect(item.amountKcal).toBe(450)
          expect(item.proteinG).toBe(30)
          expect(item.amountG).toBe(150)
        })

        // #457 — the weight field holds real grams in Portion mode, a
        // different unit than per-100g mode's own portions-*count* field
        // (e.g. "1.5" meaning 150g there) — switching modes has to convert
        // between the two, not reuse the raw number as-is. A regression
        // here previously ran the Portion→per-100g conversion through
        // portionsToGrams() a second time (150g → treated as "150
        // portions" → 15000g), producing a wildly wrong back-calculated
        // rate (3 kcal/100g) instead of the correct one.
        it('back-calculates the correct per-100g rate from a portion-mode weight when switching modes', async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={null}
              onSave={vi.fn()}
            />,
          )

          await openAddItemFlow(user)
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          await user.type(screen.getByLabelText('kcal'), '450')
          await user.clear(screen.getByLabelText('Weight (g)'))
          await user.type(screen.getByLabelText('Weight (g)'), '150')

          await user.click(screen.getByRole('radio', { name: '100g' }))

          // 450 kcal for a 150g portion = 300 kcal/100g.
          expect(screen.getByLabelText('kcal/100g')).toHaveValue('300')
          expect(screen.getByLabelText('× 100g')).toHaveValue('1.5')
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

          await openAddItemFlow(user)
          await user.click(screen.getByRole('radio', { name: 'Portion' }))
          await user.type(screen.getByLabelText('kcal'), '450')
          await user.click(screen.getByRole('button', { name: 'Save' }))

          // The sheet closes on save — reopen it (blank, freshly reset) to
          // check the mode was reset.
          await openAddItemFlow(user)
          expect(screen.getByRole('radio', { name: '100g' })).toBeChecked()
          expect(screen.getByLabelText('kcal/100g')).toBeInTheDocument()
        })
      })

      // #157: the entire "per 100g / per portion toggle on item-edit rows
      // #157/#461: per-100g / multi-item edit coverage moved off this
      // form — see MealList.test.tsx / AddMealDialog.test.tsx.

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

          // Time lives in the flyout's own header (#454) — open it first.
          await user.click(
            screen.getByRole('button', { name: '+ Add another meal' }),
          )
          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '08:15' },
          })
          await openAddItemFlow(user)
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

          await user.click(
            screen.getByRole('button', { name: '+ Add another meal' }),
          )
          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '' },
          })
          await openAddItemFlow(user)
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

          await user.click(
            screen.getByRole('button', { name: '+ Add another meal' }),
          )

          // #357: Time now defaults to the current time (not blank), so the
          // clear button already shows up as soon as the flyout opens.
          expect(
            screen.getByRole('button', { name: 'Clear time' }),
          ).toBeInTheDocument()

          await user.click(screen.getByRole('button', { name: 'Clear time' }))

          expect(screen.getByLabelText('Time')).toHaveValue('')
          expect(
            screen.queryByRole('button', { name: 'Clear time' }),
          ).not.toBeInTheDocument()

          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '08:15' },
          })
          expect(
            screen.getByRole('button', { name: 'Clear time' }),
          ).toBeInTheDocument()
        })

        // #157/#461: existing-meal time-eaten edit coverage moved off
        // this form — see MealList.test.tsx / AddMealDialog.test.tsx.

        // #468 — drag-to-reorder removed; see the comment where its other
        // tests used to sit, above.
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

          await user.click(
            screen.getByRole('button', { name: '+ Add another meal' }),
          )
          await user.type(screen.getByLabelText('Search foods'), 'Salmon')
          await user.click(screen.getByText('Salmon', { exact: true }))
          await user.click(screen.getByRole('button', { name: '+ Add item' }))

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

        // #296: previously always stamped the current clock time,
        // silently discarding a time the user had already set in the
        // flyout's own field before picking a food via search.
        it('uses the flyout time field instead of the current clock time when set (#296)', async () => {
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
            screen.getByRole('button', { name: '+ Add another meal' }),
          )
          fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '07:30' },
          })
          await user.type(screen.getByLabelText('Search foods'), 'Salmon')
          await user.click(screen.getByText('Salmon', { exact: true }))
          await user.click(screen.getByRole('button', { name: '+ Add item' }))

          const entry = onSave.mock.calls[0][0].calorieEntries[0]
          expect(entry.timeEaten).toBe('07:30')
        })

        it("previews today's new running total when a food is picked, before it's added (#273)", async () => {
          const user = userEvent.setup()
          render(
            <DailyEntryForm
              date="2026-03-01"
              existingEntry={{
                id: 'e1',
                date: '2026-03-01',
                calorieEntries: [
                  {
                    id: 'c1',
                    items: [{ id: 'i1', name: 'Breakfast', amountKcal: 300 }],
                    createdAt: '2026-01-01T00:00:00.000Z',
                  },
                ],
                createdAt: now,
                updatedAt: now,
              }}
              onSave={vi.fn()}
            />,
          )

          await user.click(
            screen.getByRole('button', { name: '+ Add another meal' }),
          )
          await user.type(screen.getByLabelText('Search foods'), 'Salmon')
          await user.click(screen.getByText('Salmon', { exact: true }))

          expect(
            screen.getByText(
              'Today would be: 508 kcal · P 20g · F 13g · C 0g (was 300 kcal · P 0g · F 0g · C 0g)',
            ),
          ).toBeInTheDocument()
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

          await user.click(
            screen.getByRole('button', { name: '+ Add another meal' }),
          )
          await user.type(screen.getByLabelText('Search foods'), 'Salmon')
          await user.click(screen.getByText('Salmon', { exact: true }))
          const quantityInput = screen.getByLabelText('Quantity (g)')
          await user.clear(quantityInput)
          await user.type(quantityInput, '50')
          await user.click(screen.getByRole('button', { name: '+ Add item' }))

          const entry = onSave.mock.calls[0][0].calorieEntries[0]
          expect(entry.items[0].amountKcal).toBe(104)
          expect(entry.items[0].amountG).toBe(50)
        })

        it('lets a food found via search be rated before adding (#134)', async () => {
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
            screen.getByRole('button', { name: '+ Add another meal' }),
          )
          await user.type(screen.getByLabelText('Search foods'), 'Salmon')
          await user.click(screen.getByText('Salmon', { exact: true }))
          await user.click(
            screen.getByRole('button', { name: 'Bellissimo — Salmon' }),
          )
          await user.click(screen.getByRole('button', { name: '+ Add item' }))

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

  })

  describe('water tracking (#258)', () => {
    it('hides the field when water tracking is disabled', () => {
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(
        screen.queryByRole('button', { name: '+1 glass (250ml)' }),
      ).not.toBeInTheDocument()
    })

    // #282: the manual "type any amount" input was removed after #271's
    // validation — only the two fixed-amount quick-add buttons remain.
    it('shows only the two quick-add buttons when enabled, no manual input', () => {
      useWaterTrackingStore.setState({ enabled: true })
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={vi.fn()} />,
      )

      expect(
        screen.getByRole('button', { name: '+1 glass (250ml)' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: '+1 bottle (500ml)' }),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText('Water')).not.toBeInTheDocument()
    })

    it('adds a new entry immediately on a quick-add click, with no prior entries', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm date="2026-03-01" existingEntry={null} onSave={onSave} />,
      )

      await user.click(screen.getByRole('button', { name: '+1 glass (250ml)' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].waterEntries).toEqual([
        expect.objectContaining({ amountMl: 250 }),
      ])
      expect(screen.getByText('250ml')).toBeInTheDocument()
    })

    it('adds to already-logged entries rather than replacing them', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            waterEntries: [{ id: 'w1', amountMl: 500 }],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      expect(screen.getByText('500ml')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '+1 bottle (500ml)' }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].waterEntries).toEqual([
        expect.objectContaining({ id: 'w1', amountMl: 500 }),
        expect.objectContaining({ amountMl: 500 }),
      ])
    })

    it('removes a logged entry via its own remove button', async () => {
      useWaterTrackingStore.setState({ enabled: true })
      const user = userEvent.setup()
      const onSave = vi.fn()
      render(
        <DailyEntryForm
          date="2026-03-01"
          existingEntry={{
            id: 'entry-1',
            date: '2026-03-01',
            waterEntries: [
              { id: 'w1', amountMl: 250 },
              { id: 'w2', amountMl: 500 },
            ],
            createdAt: now,
            updatedAt: now,
          }}
          onSave={onSave}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Remove 250ml entry' }),
      )

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave.mock.calls[0][0].waterEntries).toEqual([
        expect.objectContaining({ id: 'w2', amountMl: 500 }),
      ])
      expect(screen.queryByText('250ml')).not.toBeInTheDocument()
      expect(screen.getByText('500ml')).toBeInTheDocument()
    })
  })
})
