import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore, useRecipeStore } from '@/stores'
import { MealList } from './MealList'

// #256 — a real class (not vi.fn().mockImplementation(() => ({...})),
// which vitest warns doesn't reliably support `new`), since MealList's
// scan flow calls `new BrowserMultiFormatReader()` under the hood via
// BarcodeScannerDialog. Each test configures decodeFromVideoDevice's own
// behavior to simulate a specific scanned barcode.
const decodeFromVideoDevice = vi.fn()
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    decodeFromVideoDevice = decodeFromVideoDevice
  },
}))

function mockScanning(barcode: string) {
  decodeFromVideoDevice.mockImplementation(
    async (_deviceId: unknown, _videoElement: unknown, callback: (result: unknown) => void) => {
      callback({ getText: () => barcode })
      return { stop: vi.fn() }
    },
  )
}

function makeDailyEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: '2026-03-01',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  await db.recipes.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  useRecipeStore.setState({ recipes: [], status: 'idle', error: null })
  localStorage.clear()
  // #201 made the add row's default collapsed state depend on whether
  // `date` is in the past relative to the real clock — freeze "now" to
  // this file's own fixture "today" (2026-03-01) so the existing fixture
  // dates keep reading as today/future, matching the pre-#201 always-
  // expanded behavior these tests were written against.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'))
})

afterEach(async () => {
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  await db.recipes.clear()
  localStorage.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  decodeFromVideoDevice.mockReset()
})

/**
 * MealList (#145) was extracted from DailyEntryForm.tsx so it can be
 * mounted standalone (DayDetail.tsx now does exactly that). The exhaustive
 * add/per-100g/drag-reorder behavior coverage already lives in
 * DailyEntryForm.test.tsx (unchanged after the extraction) — this file just
 * proves the component works on its own, independent of any parent form.
 * **#157**: existing-meal editing moved to a dedicated route
 * (`MealEditScreen.tsx`), reached by navigating away from here rather than
 * expanding inline — that exhaustive coverage now lives in
 * `MealEditScreen.test.tsx` instead. This file only proves the pencil
 * navigates to the right place and that `focusMealId` opens edit mode
 * directly (the mechanism `MealEditScreen` depends on).
 */
describe('MealList', () => {
  it('shows the add-row even with no meals yet', () => {
    render(<MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />, {
      wrapper: MemoryRouter,
    })

    expect(
      screen.getByRole('button', { name: '+ Add item' }),
    ).toBeInTheDocument()
  })

  it('collapses the add row behind a small link, and re-expands it on tap (#199)', async () => {
    const user = userEvent.setup()
    render(<MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />, {
      wrapper: MemoryRouter,
    })

    await user.click(
      screen.getByRole('button', { name: 'Collapse' }),
    )

    expect(
      screen.queryByRole('button', { name: '+ Add item' }),
    ).not.toBeInTheDocument()
    const expandButton = screen.getByRole('button', {
      name: '+ Add another meal',
    })
    expect(expandButton).toBeInTheDocument()

    await user.click(expandButton)

    expect(
      screen.getByRole('button', { name: '+ Add item' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '+ Add another meal' }),
    ).not.toBeInTheDocument()
  })

  it('adds a meal and calls onChange with the new list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MealList calorieEntries={[]} date="2026-03-01" onChange={onChange} />, {
      wrapper: MemoryRouter,
    })

    await user.click(screen.getByRole('button', { name: '+ Add item' }))
    await user.type(screen.getByLabelText('kcal/100g'), '200')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as CalorieEntry[]
    expect(next).toHaveLength(1)
    expect(next[0].items[0].amountKcal).toBe(200)
  })

  // #260: the draft's own preview ("Total: 200 kcal", #98) already existed —
  // this is the new addition, showing what today's overall total would
  // become, not just this one item's own total.
  it('previews today\'s new running total while a new-meal draft has a valid amount', async () => {
    const user = userEvent.setup()
    const calorieEntries: CalorieEntry[] = [
      {
        id: 'c1',
        items: [{ id: 'i1', name: 'Breakfast', amountKcal: 300 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    render(
      <MealList calorieEntries={calorieEntries} date="2026-03-01" onChange={vi.fn()} />,
      { wrapper: MemoryRouter },
    )

    expect(
      screen.queryByText(/Today would be/),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Add item' }))
    await user.type(screen.getByLabelText('kcal/100g'), '200')

    expect(
      screen.getByText(
        'Today would be: 500 kcal · P 0g · F 0g · C 0g (was 300 kcal · P 0g · F 0g · C 0g)',
      ),
    ).toBeInTheDocument()
  })

  describe('macro mismatch sanity check (#255)', () => {
    it('shows a quiet note when kcal is far off from the entered macros', async () => {
      const user = userEvent.setup()
      render(<MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />, {
        wrapper: MemoryRouter,
      })

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '500')
      await user.type(screen.getByLabelText('Protein'), '10')
      await user.type(screen.getByLabelText('Fat'), '0')
      await user.type(screen.getByLabelText('Carbs'), '0')

      expect(
        screen.getByText(
          "The calories don't quite match the protein/fat/carbs entered — worth a second look.",
        ),
      ).toBeInTheDocument()
    })

    it('says nothing when only some macros are entered', async () => {
      const user = userEvent.setup()
      render(<MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />, {
        wrapper: MemoryRouter,
      })

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '500')
      await user.type(screen.getByLabelText('Protein'), '10')

      expect(
        screen.queryByText(/don't quite match/),
      ).not.toBeInTheDocument()
    })

    it('says nothing when kcal and macros roughly agree', async () => {
      const user = userEvent.setup()
      render(<MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />, {
        wrapper: MemoryRouter,
      })

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '245')
      await user.type(screen.getByLabelText('Protein'), '20')
      await user.type(screen.getByLabelText('Fat'), '5')
      await user.type(screen.getByLabelText('Carbs'), '30')

      expect(
        screen.queryByText(/don't quite match/),
      ).not.toBeInTheDocument()
    })
  })

  describe('add-row draft recovery (#221)', () => {
    it('restores an in-progress add-row item after remounting on the same date', async () => {
      const user = userEvent.setup()
      const { unmount } = render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('Dish name'), 'Chicken soup')
      await user.type(screen.getByLabelText('kcal/100g'), '500')
      // Never taps Save — simulates a reload/navigation-away mid-typing.
      unmount()

      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )
      await user.click(screen.getByRole('button', { name: /Chicken soup/ }))

      expect(screen.getByLabelText('Dish name')).toHaveValue('Chicken soup')
      expect(screen.getByLabelText('kcal/100g')).toHaveValue('500')
    })

    it('does not leak a draft across different dates', async () => {
      const user = userEvent.setup()
      const { unmount } = render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '500')
      unmount()

      render(
        <MealList calorieEntries={[]} date="2026-03-02" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      expect(
        screen.getByRole('button', { name: '+ Add item' }),
      ).toBeInTheDocument()
    })

    it('clears the draft once the meal is actually saved', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const { unmount } = render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={onChange} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('kcal/100g'), '500')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(onChange).toHaveBeenCalledTimes(1)
      unmount()

      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      expect(
        screen.getByRole('button', { name: '+ Add item' }),
      ).toBeInTheDocument()
    })
  })

  it("shows an item's own quantity in grams when recorded, omits it when not (#206)", () => {
    const calorieEntries: CalorieEntry[] = [
      {
        id: 'c1',
        items: [
          { id: 'i1', name: 'Bio-Skyr', amountKcal: 175, amountG: 100 },
          { id: 'i2', name: 'Chicken thigh', amountKcal: 314 },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    render(
      <MealList calorieEntries={calorieEntries} date="2026-03-01" onChange={vi.fn()} />,
      { wrapper: MemoryRouter },
    )

    expect(screen.getByText('Bio-Skyr — 175 kcal · 100g')).toBeInTheDocument()
    expect(screen.getByText('Chicken thigh — 314 kcal')).toBeInTheDocument()
  })

  describe('optional brand name (#248)', () => {
    it('saves a brand entered alongside the dish name', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={onChange} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('Dish name'), 'Chicken breast')
      await user.type(screen.getByLabelText('Brand (optional)'), 'Perdue')
      await user.type(screen.getByLabelText('kcal/100g'), '165')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      const next = onChange.mock.calls[0][0] as CalorieEntry[]
      expect(next[0].items[0].name).toBe('Chicken breast')
      expect(next[0].items[0].brand).toBe('Perdue')
    })

    it('leaves brand undefined when left blank', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={onChange} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('Dish name'), 'Apple')
      await user.type(screen.getByLabelText('kcal/100g'), '52')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      const next = onChange.mock.calls[0][0] as CalorieEntry[]
      expect(next[0].items[0].brand).toBeUndefined()
    })

    it('shows the brand next to the dish name in the read-only view, with no stray "()" when unset', () => {
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [
            { id: 'i1', name: 'Chicken breast', brand: 'Perdue', amountKcal: 165 },
            { id: 'i2', name: 'Apple', amountKcal: 52 },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList calorieEntries={calorieEntries} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      expect(
        screen.getByText('Chicken breast (Perdue) — 165 kcal'),
      ).toBeInTheDocument()
      expect(screen.getByText('Apple — 52 kcal')).toBeInTheDocument()
    })

    it("pre-fills an existing item's brand when reopening its editor", async () => {
      const user = userEvent.setup()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [
            {
              id: 'i1',
              name: 'Yogurt',
              brand: 'Chobani',
              amountKcal: 100,
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      // #157: a meal's edit mode only opens inline via `focusMealId` (as
      // `MealEditScreen` does) — the pencil in a normal render navigates
      // to a dedicated route instead, so that's not exercised here.
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
          focusMealPosition={1}
          onFocusedMealDone={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Edit item' }))

      expect(screen.getByLabelText('Brand (optional)')).toHaveValue('Chobani')
    })
  })

  describe('favoriting a manually-typed dish (#279)', () => {
    it('favorites the dish when the star is checked before saving', async () => {
      const user = userEvent.setup()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('Dish name'), 'Granola')
      await user.type(screen.getByLabelText('kcal/100g'), '450')
      await user.click(
        screen.getByRole('button', { name: 'Add Granola to favorites' }),
      )
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(useMealItemStore.getState().items).toContainEqual(
          expect.objectContaining({ name: 'Granola', favorite: true }),
        ),
      )
    })

    it('leaves an already-favorited dish favorited when its edit is saved without touching the star', async () => {
      await useMealItemStore.getState().touch('Granola', { amountKcal: 450 }, true)
      const user = userEvent.setup()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', name: 'Granola', amountKcal: 450 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
          focusMealPosition={1}
          onFocusedMealDone={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Edit item' }))
      const dialog = screen.getByRole('dialog')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(useMealItemStore.getState().items).toContainEqual(
          expect.objectContaining({ name: 'Granola', favorite: true }),
        ),
      )
    })
  })

  it("navigates to the dedicated edit route when a meal's pencil is clicked (#157)", async () => {
    const user = userEvent.setup()
    const calorieEntries: CalorieEntry[] = [
      {
        id: 'c1',
        items: [{ id: 'i1', amountKcal: 300 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    render(
      <MemoryRouter initialEntries={['/']}>
        <MealList calorieEntries={calorieEntries} date="2026-03-01" onChange={vi.fn()} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))

    // No inline edit UI opens — the pencil navigates instead (there's no
    // matching <Routes> in this bare render, so the location itself isn't
    // directly assertable here; the absence of inline fields is the
    // observable proof editing didn't happen in place).
    expect(
      screen.queryByLabelText('Meal name — Meal 1'),
    ).not.toBeInTheDocument()
  })

  it('deletes a meal via the two-step confirm and calls onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const calorieEntries: CalorieEntry[] = [
      {
        id: 'c1',
        items: [{ id: 'i1', amountKcal: 300 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    render(
      <MealList calorieEntries={calorieEntries} date="2026-03-01" onChange={onChange} />,
      { wrapper: MemoryRouter },
    )

    await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onChange).toHaveBeenCalledWith([])
  })

  describe('focusMealId (#157) — the dedicated single-meal edit route mechanism', () => {
    it('opens the matching meal in edit mode automatically on mount', async () => {
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
        />,
        { wrapper: MemoryRouter },
      )

      expect(
        await screen.findByLabelText('Meal name — Meal 1'),
      ).toBeInTheDocument()
    })

    it('hides the "add a new meal" row while focused', () => {
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
        />,
        { wrapper: MemoryRouter },
      )

      expect(
        screen.queryByRole('button', { name: '+ Add item' }),
      ).not.toBeInTheDocument()
    })

    it('calls onFocusedMealDone after saving', async () => {
      const user = userEvent.setup()
      const onFocusedMealDone = vi.fn()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
          onFocusedMealDone={onFocusedMealDone}
        />,
        { wrapper: MemoryRouter },
      )

      await screen.findByLabelText('Meal name — Meal 1')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onFocusedMealDone).toHaveBeenCalledTimes(1)
    })

    it('calls onFocusedMealDone after cancelling', async () => {
      const user = userEvent.setup()
      const onFocusedMealDone = vi.fn()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
          onFocusedMealDone={onFocusedMealDone}
        />,
        { wrapper: MemoryRouter },
      )

      await screen.findByLabelText('Meal name — Meal 1')
      await user.click(
        screen.getByRole('button', { name: 'Cancel editing meal 1' }),
      )

      expect(onFocusedMealDone).toHaveBeenCalledTimes(1)
    })
  })

  describe('multi-add (#183)', () => {
    it('"Save and add one more" on the add row stages a dish and keeps the sheet open for the next one', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={onChange} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('Dish name'), 'Soup')
      await user.type(screen.getByLabelText('kcal/100g'), '100')
      await user.click(
        screen.getByRole('button', { name: 'Save and add one more' }),
      )

      // Sheet stays open, fields reset, no onChange yet -- nothing has
      // actually been saved as a meal until the final Save.
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByLabelText('Dish name')).toHaveValue('')

      await user.type(screen.getByLabelText('Dish name'), 'Bread')
      await user.type(screen.getByLabelText('kcal/100g'), '250')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onChange).toHaveBeenCalledTimes(1)
      const next = onChange.mock.calls[0][0] as CalorieEntry[]
      expect(next).toHaveLength(1)
      expect(next[0].items).toHaveLength(2)
      expect(next[0].items[0].name).toBe('Soup')
      expect(next[0].items[1].name).toBe('Bread')
    })

    it('"Save and add one more" is available for a freshly-added item in an existing meal\'s edit mode', async () => {
      const user = userEvent.setup()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', name: 'Soup', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
        />,
        { wrapper: MemoryRouter },
      )

      await screen.findByLabelText('Meal name — Meal 1')
      await user.click(
        screen.getByRole('button', { name: '+ Add item — Meal 1' }),
      )

      expect(
        screen.getByRole('button', { name: 'Save and add one more' }),
      ).toBeInTheDocument()
    })

    it('does not offer "Save and add one more" while editing an already-existing dish', async () => {
      const user = userEvent.setup()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', name: 'Soup', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
        />,
        { wrapper: MemoryRouter },
      )

      await screen.findByLabelText('Meal name — Meal 1')
      await user.click(screen.getByRole('button', { name: 'Edit item' }))

      expect(
        screen.queryByRole('button', { name: 'Save and add one more' }),
      ).not.toBeInTheDocument()
    })
  })

  describe("repeat yesterday's meal (#190)", () => {
    // These tests use 2026-03-02 as "today" (with 2026-03-01 as the day
    // before it), unlike the rest of this file's 2026-03-01 — override the
    // outer beforeEach's frozen clock so 2026-03-02 still reads as
    // today/not-past for the #201 collapse-default check above.
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-03-02T12:00:00.000Z'))
    })

    it("offers to repeat yesterday's meal at the matching position, cloning only the food data", async () => {
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-03-01',
          calorieEntries: [
            {
              id: 'y1',
              items: [
                {
                  id: 'yi1',
                  name: 'Eggs',
                  amountKcal: 150,
                  proteinG: 12,
                  emotion: 'thumbsUp',
                },
              ],
              timeEaten: '08:00',
              note: 'ate fast',
              createdAt: '2026-03-01T08:00:00.000Z',
            },
          ],
        }),
      )
      const onChange = vi.fn()
      render(
        <MealList calorieEntries={[]} date="2026-03-02" onChange={onChange} />,
        { wrapper: MemoryRouter },
      )

      const user = userEvent.setup()
      const repeatButton = await screen.findByRole('button', {
        name: "Repeat yesterday's Breakfast",
      })
      await user.click(repeatButton)
      // #202: the button now opens a preview dialog instead of committing
      // immediately — confirm with everything left checked (the default).
      await user.click(screen.getByRole('button', { name: 'Add selected' }))

      expect(onChange).toHaveBeenCalledTimes(1)
      const next = onChange.mock.calls[0][0] as CalorieEntry[]
      expect(next).toHaveLength(1)
      expect(next[0].id).not.toBe('y1')
      expect(next[0].items).toHaveLength(1)
      expect(next[0].items[0]).toMatchObject({
        name: 'Eggs',
        amountKcal: 150,
        proteinG: 12,
      })
      expect(next[0].items[0].id).not.toBe('yi1')
      // Only the food data is cloned — day-specific journal details aren't.
      expect(next[0].items[0].emotion).toBeUndefined()
      expect(next[0].timeEaten).toBeUndefined()
      expect(next[0].note).toBeUndefined()
    })

    it('lets a specific dish be unchecked before confirming (#202)', async () => {
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-03-01',
          calorieEntries: [
            {
              id: 'y1',
              items: [
                {
                  id: 'yi1',
                  name: 'Eggs',
                  amountKcal: 150,
                  proteinG: 12,
                },
                {
                  id: 'yi2',
                  name: 'Toast',
                  amountKcal: 120,
                },
              ],
              createdAt: '2026-03-01T08:00:00.000Z',
            },
          ],
        }),
      )
      const onChange = vi.fn()
      render(
        <MealList calorieEntries={[]} date="2026-03-02" onChange={onChange} />,
        { wrapper: MemoryRouter },
      )

      const user = userEvent.setup()
      await user.click(
        await screen.findByRole('button', {
          name: "Repeat yesterday's Breakfast",
        }),
      )
      await user.click(screen.getByRole('checkbox', { name: /Toast/ }))
      await user.click(
        screen.getByRole('button', { name: 'Add selected' }),
      )

      expect(onChange).toHaveBeenCalledTimes(1)
      const next = onChange.mock.calls[0][0] as CalorieEntry[]
      expect(next[0].items).toHaveLength(1)
      expect(next[0].items[0]).toMatchObject({ name: 'Eggs' })
    })

    it('does not offer to repeat when there is no meal at that position yesterday', async () => {
      await db.dailyEntries.put(
        makeDailyEntry({ date: '2026-03-01', calorieEntries: [] }),
      )
      render(
        <MealList calorieEntries={[]} date="2026-03-02" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      // Wait for the (empty-result) fetch to settle before asserting
      // absence, via a control that's always present once mounted.
      await screen.findByRole('button', { name: '+ Add item' })
      expect(
        screen.queryByRole('button', { name: /Repeat yesterday's/ }),
      ).not.toBeInTheDocument()
    })

    it('does not offer to repeat when nothing was logged yesterday at all', async () => {
      render(
        <MealList calorieEntries={[]} date="2026-03-02" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await screen.findByRole('button', { name: '+ Add item' })
      expect(
        screen.queryByRole('button', { name: /Repeat yesterday's/ }),
      ).not.toBeInTheDocument()
    })
  })

  describe("copy yesterday's meals (#253)", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-03-02T12:00:00.000Z'))
    })

    it('copies every meal from the source day, cloning only the food data', async () => {
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-03-01',
          calorieEntries: [
            {
              id: 'y1',
              items: [
                {
                  id: 'yi1',
                  name: 'Eggs',
                  amountKcal: 150,
                  proteinG: 12,
                  emotion: 'thumbsUp',
                },
              ],
              timeEaten: '08:00',
              note: 'ate fast',
              createdAt: '2026-03-01T08:00:00.000Z',
            },
            {
              id: 'y2',
              items: [{ id: 'yi2', name: 'Salad', amountKcal: 300 }],
              createdAt: '2026-03-01T13:00:00.000Z',
            },
          ],
        }),
      )
      const onChange = vi.fn()
      render(
        <MealList calorieEntries={[]} date="2026-03-02" onChange={onChange} />,
        { wrapper: MemoryRouter },
      )

      const user = userEvent.setup()
      await user.click(
        await screen.findByRole('button', {
          name: "Copy yesterday's meals",
        }),
      )

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Breakfast')).toBeInTheDocument()
      expect(within(dialog).getByText('Lunch')).toBeInTheDocument()
      await user.click(
        within(dialog).getByRole('button', { name: 'Add selected (2)' }),
      )

      expect(onChange).toHaveBeenCalledTimes(1)
      const next = onChange.mock.calls[0][0] as CalorieEntry[]
      expect(next).toHaveLength(2)
      expect(next[0].id).not.toBe('y1')
      expect(next[0].items[0]).toMatchObject({ name: 'Eggs', amountKcal: 150 })
      expect(next[0].items[0].id).not.toBe('yi1')
      // Only the food data is cloned — day-specific journal details aren't.
      expect(next[0].items[0].emotion).toBeUndefined()
      expect(next[0].timeEaten).toBeUndefined()
      expect(next[0].note).toBeUndefined()
      expect(next[1].items[0]).toMatchObject({ name: 'Salad', amountKcal: 300 })
    })

    it('drops a whole meal when every dish in it gets unchecked', async () => {
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-03-01',
          calorieEntries: [
            {
              id: 'y1',
              items: [{ id: 'yi1', name: 'Eggs', amountKcal: 150 }],
              createdAt: '2026-03-01T08:00:00.000Z',
            },
            {
              id: 'y2',
              items: [{ id: 'yi2', name: 'Salad', amountKcal: 300 }],
              createdAt: '2026-03-01T13:00:00.000Z',
            },
          ],
        }),
      )
      const onChange = vi.fn()
      render(
        <MealList calorieEntries={[]} date="2026-03-02" onChange={onChange} />,
        { wrapper: MemoryRouter },
      )

      const user = userEvent.setup()
      await user.click(
        await screen.findByRole('button', { name: "Copy yesterday's meals" }),
      )
      await user.click(screen.getByRole('checkbox', { name: /Eggs/ }))
      // addSelectedFoodsButton only appends a count once n > 1 — one item
      // left selected still reads as the plain "Add selected".
      await user.click(screen.getByRole('button', { name: 'Add selected' }))

      expect(onChange).toHaveBeenCalledTimes(1)
      const next = onChange.mock.calls[0][0] as CalorieEntry[]
      expect(next).toHaveLength(1)
      expect(next[0].items[0]).toMatchObject({ name: 'Salad' })
    })

    it('does not offer to copy when nothing was logged yesterday at all', async () => {
      render(
        <MealList calorieEntries={[]} date="2026-03-02" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await screen.findByRole('button', { name: '+ Add item' })
      expect(
        screen.queryByRole('button', { name: "Copy yesterday's meals" }),
      ).not.toBeInTheDocument()
    })
  })

  describe('barcode scanning (#256)', () => {
    it('opens the scanner dialog when "Scan barcode" is clicked', async () => {
      const user = userEvent.setup()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      expect(
        screen.getByText('Point your camera at the barcode.'),
      ).toBeInTheDocument()
    })

    it('prefills from an existing local item on a repeat scan, without any network fetch', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      await useMealItemStore
        .getState()
        .touch(
          'Protein Bar',
          { amountKcal: 200, proteinG: 20 },
          undefined,
          '0123456789012',
        )
      mockScanning('0123456789012')
      const user = userEvent.setup()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      expect(await screen.findByDisplayValue('Protein Bar')).toBeInTheDocument()
      expect(screen.getByLabelText('kcal/100g')).toHaveValue('200')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('prefills from Open Food Facts on a first scan with no local match', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 1,
            product: {
              product_name: 'Chocolate Bar',
              brands: 'Acme',
              nutriments: {
                'energy-kcal_100g': 520,
                proteins_100g: 6,
                fat_100g: 30,
                carbohydrates_100g: 55,
              },
            },
          }),
        }),
      )
      mockScanning('9999999999999')
      const user = userEvent.setup()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      expect(
        await screen.findByDisplayValue('Chocolate Bar'),
      ).toBeInTheDocument()
      expect(screen.getByDisplayValue('Acme')).toBeInTheDocument()
      expect(screen.getByLabelText('kcal/100g')).toHaveValue('520')
    })

    it('shows a quiet message and a blank form when nothing matches anywhere', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      mockScanning('0000000000000')
      const user = userEvent.setup()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      expect(
        await screen.findByText(
          'No food found for this barcode — you can still add it by hand below.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Dish name')).toHaveValue('')
    })

    it('records the barcode on the new MealItem once saved', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 1,
            product: {
              product_name: 'Chocolate Bar',
              nutriments: { 'energy-kcal_100g': 520 },
            },
          }),
        }),
      )
      mockScanning('9999999999999')
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={onChange} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
      await screen.findByDisplayValue('Chocolate Bar')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onChange).toHaveBeenCalledTimes(1)
      await waitFor(() =>
        expect(useMealItemStore.getState().items).toContainEqual(
          expect.objectContaining({
            name: 'Chocolate Bar',
            barcode: '9999999999999',
          }),
        ),
      )
    })
  })

  describe('barcode scanning within an existing meal (#288)', () => {
    function seededMeal(): CalorieEntry[] {
      return [
        {
          id: 'c1',
          items: [{ id: 'i1', name: 'Existing dish', amountKcal: 100 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
    }

    it('opens the scanner dialog when "Scan barcode — Meal 1" is clicked', async () => {
      const user = userEvent.setup()
      render(
        <MealList
          calorieEntries={seededMeal()}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
          focusMealPosition={1}
          onFocusedMealDone={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(
        screen.getByRole('button', { name: 'Scan barcode — Meal 1' }),
      )

      expect(
        screen.getByText('Point your camera at the barcode.'),
      ).toBeInTheDocument()
    })

    it('adds a new item prefilled from a local match, without any network fetch', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      await useMealItemStore
        .getState()
        .touch(
          'Protein Bar',
          { amountKcal: 200, proteinG: 20 },
          undefined,
          '0123456789012',
        )
      mockScanning('0123456789012')
      const user = userEvent.setup()
      render(
        <MealList
          calorieEntries={seededMeal()}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
          focusMealPosition={1}
          onFocusedMealDone={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(
        screen.getByRole('button', { name: 'Scan barcode — Meal 1' }),
      )

      expect(await screen.findByDisplayValue('Protein Bar')).toBeInTheDocument()
      expect(screen.getByLabelText('kcal/100g')).toHaveValue('200')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('adds a new item prefilled from Open Food Facts on a first scan', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 1,
            product: {
              product_name: 'Chocolate Bar',
              nutriments: { 'energy-kcal_100g': 520 },
            },
          }),
        }),
      )
      mockScanning('9999999999999')
      const user = userEvent.setup()
      render(
        <MealList
          calorieEntries={seededMeal()}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
          focusMealPosition={1}
          onFocusedMealDone={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(
        screen.getByRole('button', { name: 'Scan barcode — Meal 1' }),
      )

      expect(
        await screen.findByDisplayValue('Chocolate Bar'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('kcal/100g')).toHaveValue('520')
    })

    it('shows a quiet message when nothing matches anywhere', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      mockScanning('0000000000000')
      const user = userEvent.setup()
      render(
        <MealList
          calorieEntries={seededMeal()}
          date="2026-03-01"
          onChange={vi.fn()}
          focusMealId="c1"
          focusMealPosition={1}
          onFocusedMealDone={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(
        screen.getByRole('button', { name: 'Scan barcode — Meal 1' }),
      )

      expect(
        await screen.findByText(
          'No food found for this barcode — you can still add it by hand below.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Dish name')).toHaveValue('')
    })

    it('records the barcode on the meal once saved, alongside the original item', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 1,
            product: {
              product_name: 'Chocolate Bar',
              nutriments: { 'energy-kcal_100g': 520 },
            },
          }),
        }),
      )
      mockScanning('9999999999999')
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <MealList
          calorieEntries={seededMeal()}
          date="2026-03-01"
          onChange={onChange}
          focusMealId="c1"
          focusMealPosition={1}
          onFocusedMealDone={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(
        screen.getByRole('button', { name: 'Scan barcode — Meal 1' }),
      )
      await screen.findByDisplayValue('Chocolate Bar')
      const dialog = screen.getByRole('dialog')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onChange).toHaveBeenCalled()
      const savedEntries = onChange.mock.calls.at(-1)?.[0] as CalorieEntry[]
      expect(savedEntries[0].items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Existing dish' }),
          expect.objectContaining({ name: 'Chocolate Bar' }),
        ]),
      )
      await waitFor(() =>
        expect(useMealItemStore.getState().items).toContainEqual(
          expect.objectContaining({
            name: 'Chocolate Bar',
            barcode: '9999999999999',
          }),
        ),
      )
    })
  })

  describe('fasting-window toast (#287)', () => {
    it("shows the toast after saving the day's first timed meal, when yesterday also had one", async () => {
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-02-28',
          calorieEntries: [
            {
              id: 'y1',
              items: [{ id: 'yi1', amountKcal: 400 }],
              timeEaten: '20:00',
              createdAt: '2026-02-28T20:00:00.000Z',
            },
          ],
        }),
      )
      const user = userEvent.setup()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      // The add-row's Time field sits outside the item editor sheet, so it
      // has to be set before opening that sheet — addMeal() (triggered by
      // the sheet's own Save) reads whatever addTime already holds.
      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(
        await screen.findByText('Your fasting window was 12.0h.'),
      ).toBeInTheDocument()
    })

    // #287 (reopened): addFoodEntry() (the "Find food" quick-commit path)
    // set its own timeEaten but never called announceFastingWindowIfFirst
    // Meal — the toast only ever fired via addMeal()/saveEditMeal(), so the
    // day's first meal going through "Find food" (the add row's primary,
    // most prominent button) silently never showed it. Every other test in
    // this describe block only exercises "+ Add item", which is why this
    // gap wasn't caught earlier.
    it("shows the toast when the day's first timed meal is added via Find food", async () => {
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-02-28',
          calorieEntries: [
            {
              id: 'y1',
              items: [{ id: 'yi1', amountKcal: 400 }],
              timeEaten: '20:00',
              createdAt: '2026-02-28T20:00:00.000Z',
            },
          ],
        }),
      )
      const user = userEvent.setup()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(screen.getByRole('button', { name: 'Find food' }))
      await user.click(screen.getByText('Salmon'))
      await user.click(screen.getByRole('button', { name: 'Add selected' }))

      expect(
        await screen.findByText('Your fasting window was 12.0h.'),
      ).toBeInTheDocument()
    })

    it('does not show the toast when yesterday has no timed meal', async () => {
      const user = userEvent.setup()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.queryByText(/Your fasting window was/)).not.toBeInTheDocument()
    })

    it("does not re-show the toast for a second meal logged the same day", async () => {
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-02-28',
          calorieEntries: [
            {
              id: 'y1',
              items: [{ id: 'yi1', amountKcal: 400 }],
              timeEaten: '20:00',
              createdAt: '2026-02-28T20:00:00.000Z',
            },
          ],
        }),
      )
      const user = userEvent.setup()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', amountKcal: 300 }],
          timeEaten: '08:00',
          createdAt: '2026-03-01T08:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      await user.type(screen.getByLabelText('Time'), '13:00')
      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('Dish name'), 'Lunch item')
      await user.type(screen.getByLabelText('kcal/100g'), '500')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.queryByText(/Your fasting window was/)).not.toBeInTheDocument()
    })

    it('dismisses the toast when the close button is clicked', async () => {
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-02-28',
          calorieEntries: [
            {
              id: 'y1',
              items: [{ id: 'yi1', amountKcal: 400 }],
              timeEaten: '20:00',
              createdAt: '2026-02-28T20:00:00.000Z',
            },
          ],
        }),
      )
      const user = userEvent.setup()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(screen.getByRole('button', { name: '+ Add item' }))
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Your fasting window was 12.0h.')

      await user.click(screen.getByRole('button', { name: 'Dismiss' }))

      expect(screen.queryByText(/Your fasting window was/)).not.toBeInTheDocument()
    })
  })

  describe('logging a recipe (#251)', () => {
    it('opens the log-recipe dialog when "Log recipe" is clicked', async () => {
      const user = userEvent.setup()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Log recipe' }))

      expect(
        screen.getByRole('heading', { name: 'Log recipe' }),
      ).toBeInTheDocument()
    })

    it('adds a new meal from the logged recipe, scaled by servings eaten', async () => {
      await db.recipes.put({
        id: 'recipe-1',
        name: 'Chili',
        servings: 4,
        ingredients: [
          { id: 'ing-1', name: 'Ground beef', amountKcal: 800, proteinG: 60 },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={onChange} />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Log recipe' }))
      await user.click(await screen.findByRole('button', { name: 'Chili' }))
      const servingsInput = screen.getByLabelText('Servings eaten')
      await user.clear(servingsInput)
      await user.type(servingsInput, '2')
      await user.click(screen.getByRole('button', { name: 'Log' }))

      expect(onChange).toHaveBeenCalledTimes(1)
      const next = onChange.mock.calls[0][0] as CalorieEntry[]
      expect(next).toHaveLength(1)
      expect(next[0].items[0]).toMatchObject({
        name: 'Chili',
        amountKcal: 400,
        proteinG: 30,
      })
    })
  })
})
