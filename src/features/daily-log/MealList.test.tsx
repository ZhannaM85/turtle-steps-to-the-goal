import 'fake-indexeddb/auto'
import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  useDayStartStore,
  useFastingWindowToastStore,
  useMealItemStore,
  useRecipeStore,
} from '@/stores'
import { MealList } from './MealList'

// #301 — a plain `onChange={vi.fn()}` never feeds a save back into
// MealList's own `calorieEntries` prop, which most tests don't need since
// they only assert against the mock's own call args. A test that both adds
// *and then* interacts with the resulting view-mode row (e.g. deleting it)
// needs the prop to actually reflect that save, so it wires a real
// controlled loop instead.
function ControlledMealList(props: { calorieEntries: CalorieEntry[]; date: string }) {
  const [entries, setEntries] = useState(props.calorieEntries)
  return <MealList calorieEntries={entries} date={props.date} onChange={setEntries} />
}

// #287 — the new "Find food" toast test below interacts with a heavier
// dialog (FoodPickerDialog's search list) than this file's other tests,
// plus an async IndexedDB round-trip (announceFastingWindowIfFirstMeal);
// under full-suite CPU contention that combination can exceed vitest's
// 5000ms default, same reasoning DailyEntryForm.test.tsx's own Find-food
// tests already needed a longer budget for.
vi.setConfig({ testTimeout: 15000 })

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
  useFastingWindowToastStore.setState({ hours: null, date: null })
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
  // #454 — the whole "add a meal" flow (search/barcode/manual entry/Repeat/
  // recipe/persistent multi-add/reaction) moved into its own
  // AddMealDialog.test.tsx; this file keeps only what's still genuinely
  // MealList's own concern (the trigger existing, existing-meal viewing/
  // editing, the fasting toast, "Copy yesterday's meals").
  it('shows the add-meal trigger even with no meals yet', () => {
    render(<MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />, {
      wrapper: MemoryRouter,
    })

    expect(
      screen.getByRole('button', { name: '+ Add another meal' }),
    ).toBeInTheDocument()
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

    expect(screen.getByText('Bio-Skyr')).toBeInTheDocument()
    expect(screen.getByText('175 kcal · 100g')).toBeInTheDocument()
    expect(screen.getByText('Chicken thigh')).toBeInTheDocument()
    expect(screen.getByText('314 kcal')).toBeInTheDocument()
  })

  describe('optional brand name (#248)', () => {
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

      expect(screen.getByText('Chicken breast (Perdue)')).toBeInTheDocument()
      expect(screen.getByText('165 kcal')).toBeInTheDocument()
      expect(screen.getByText('Apple')).toBeInTheDocument()
      expect(screen.getByText('52 kcal')).toBeInTheDocument()
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

    // #344 — per-dish note, same "pre-fills on reopen" coverage as brand
    // above.
    it("pre-fills an existing item's note when reopening its editor", async () => {
      const user = userEvent.setup()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [
            {
              id: 'i1',
              name: 'Soup',
              amountKcal: 100,
              noteText: 'extra spicy today',
            },
          ],
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

      expect(screen.getByLabelText('Note (optional)')).toHaveValue(
        'extra spicy today',
      )
    })

    it('shows a saved note underneath the dish in the read-only view', () => {
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [
            {
              id: 'i1',
              name: 'Soup',
              amountKcal: 100,
              noteText: 'extra spicy today',
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList calorieEntries={calorieEntries} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      expect(screen.getByText('extra spicy today')).toBeInTheDocument()
    })
  })

  describe('favoriting a manually-typed dish (#279)', () => {
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
        screen.queryByRole('button', { name: '+ Add another meal' }),
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

      await screen.findByRole('button', { name: '+ Add another meal' })
      expect(
        screen.queryByRole('button', { name: "Copy yesterday's meals" }),
      ).not.toBeInTheDocument()
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

    // #300: scanBarcodeIntoEditItems used to unconditionally stage the
    // scanned draft into editItems the instant the lookup resolved —
    // closing the item's own sheet via its X (rather than clicking Save)
    // still left that draft sitting there, so the overall meal Save ended
    // up committing it anyway even though X was meant to cancel it.
    it('does not add the scanned item if its sheet is closed via X instead of Save', async () => {
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
      await user.click(
        within(dialog).getByRole('button', { name: 'Close item editor' }),
      )
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onChange).toHaveBeenCalled()
      const savedEntries = onChange.mock.calls.at(-1)?.[0] as CalorieEntry[]
      expect(savedEntries[0].items).toEqual([
        expect.objectContaining({ name: 'Existing dish' }),
      ])
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

      // #454 — the add-row is now a single trigger opening AddMealDialog;
      // Time now defaults to the current time (#357), not blank — clear it
      // first so typing produces exactly this value, not a mix of both.
      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(
        screen.getByRole('button', { name: "Can't find it? Add manually" }),
      )
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
    // day's first meal going through search silently never showed it.
    // Every other test in this describe block only exercises manual entry,
    // which is why this gap wasn't caught earlier.
    it("shows the toast when the day's first timed meal is added via search", async () => {
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

      // Time now defaults to the current time (#357), not blank — clear it
      // first so typing produces exactly this value, not a mix of both.
      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.type(screen.getByLabelText('Search foods'), 'Salmon')
      await user.click(await screen.findByText('Salmon'))
      await user.click(screen.getByRole('button', { name: '+ Add item' }))

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

      // Time now defaults to the current time (#357), not blank — clear it
      // first so typing produces exactly this value, not a mix of both.
      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(
        screen.getByRole('button', { name: "Can't find it? Add manually" }),
      )
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.queryByText(/Your fasting window was/)).not.toBeInTheDocument()
    })

    // #456 — deliberately persistent: no manual close control at all, even
    // once the toast is showing.
    it('has no dismiss button once the toast is showing', async () => {
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
      render(<ControlledMealList calorieEntries={[]} date="2026-03-01" />, {
        wrapper: MemoryRouter,
      })

      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(
        screen.getByRole('button', { name: "Can't find it? Add manually" }),
      )
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Your fasting window was 12.0h.')
      await user.click(screen.getByRole('button', { name: 'Done' }))

      expect(
        screen.queryByRole('button', { name: 'Dismiss' }),
      ).not.toBeInTheDocument()
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

      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '13:00')
      await user.click(
        screen.getByRole('button', { name: "Can't find it? Add manually" }),
      )
      await user.type(screen.getByLabelText('Dish name'), 'Lunch item')
      await user.type(screen.getByLabelText('kcal/100g'), '500')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.queryByText(/Your fasting window was/)).not.toBeInTheDocument()
    })

    // #301: fastingWindowToastHours was only ever set, never reset —
    // deleting the meal that triggered it (the day's only timed meal)
    // left the toast showing a now-stale value with nothing left to
    // back it up.
    it('clears the toast when the meal that triggered it is deleted', async () => {
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
      render(<ControlledMealList calorieEntries={[]} date="2026-03-01" />, {
        wrapper: MemoryRouter,
      })

      // Time now defaults to the current time (#357), not blank — clear it
      // first so typing produces exactly this value, not a mix of both.
      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(
        screen.getByRole('button', { name: "Can't find it? Add manually" }),
      )
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Your fasting window was 12.0h.')
      // The toast lives in MealList's own tree, behind the still-open
      // fullscreen flyout (Radix hides everything outside an open dialog
      // from the accessibility tree) — closing it first, same as a real
      // user finishing the flyout before seeing the toast underneath.
      await user.click(screen.getByRole('button', { name: 'Done' }))

      await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(screen.queryByText(/Your fasting window was/)).not.toBeInTheDocument()
    })

    // #450 — reported live: the toast only ever recomputes from *this*
    // day's own first-timed-meal save, so once shown it never updates
    // again, even if the *previous* day's own last-meal time changes
    // afterward (e.g. navigating back and logging one more, later meal
    // there) — exactly the input the toast's own number is computed from.
    it("recalculates an already-shown toast when the previous day's last meal time changes retroactively", async () => {
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
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-03-01',
          calorieEntries: [
            {
              id: 't1',
              items: [{ id: 'ti1', amountKcal: 300 }],
              timeEaten: '08:00',
              createdAt: '2026-03-01T08:00:00.000Z',
            },
          ],
        }),
      )
      // Simulates the toast already being shown for today, from an earlier
      // save this same session — same starting state #301's "clears the
      // toast" test above sets up via the UI instead.
      useFastingWindowToastStore.setState({ hours: 12, date: '2026-03-01' })

      const user = userEvent.setup()
      const { unmount } = render(
        <MealList
          calorieEntries={[
            {
              id: 'y1',
              items: [{ id: 'yi1', amountKcal: 400 }],
              timeEaten: '20:00',
              createdAt: '2026-02-28T20:00:00.000Z',
            },
          ]}
          date="2026-02-28"
          onChange={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      // Logs a later meal on the *previous* day (2026-02-28) — its new real
      // last-meal time, 23:00, is 3 hours later than the original 20:00.
      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '23:00')
      await user.click(
        screen.getByRole('button', { name: "Can't find it? Add manually" }),
      )
      await user.type(screen.getByLabelText('Dish name'), 'Late snack')
      await user.type(screen.getByLabelText('kcal/100g'), '100')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        const state = useFastingWindowToastStore.getState()
        expect({ hours: state.hours, date: state.date }).toEqual({
          hours: 9,
          date: '2026-03-01',
        })
      })

      // Matches the real flow: leaving the previous day and landing back on
      // today re-mounts *that* day's own MealList, which is the one that
      // actually renders the toast (scoped to its own date).
      unmount()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      expect(
        await screen.findByText('Your fasting window was 9.0h.'),
      ).toBeInTheDocument()
    })

    // #387 — reported live: with a custom day-start time (#298), a
    // past-midnight meal gets filed under the *previous* day's own record
    // alongside its normal evening meal. Without accounting for that, the
    // toast picked the evening meal as "the last one" (a much earlier raw
    // clock time than the real, later past-midnight meal), computing a
    // wildly wrong multi-hour gap instead of the true one.
    it("uses the previous day's actual latest meal, not its earliest-by-clock-time one, once a custom day-start time is set", async () => {
      useDayStartStore.setState({ dayStartTime: '02:00' })
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-02-28',
          calorieEntries: [
            {
              id: 'y1',
              items: [{ id: 'yi1', amountKcal: 400 }],
              timeEaten: '19:41',
              createdAt: '2026-02-28T19:41:00.000Z',
            },
            {
              id: 'y2',
              items: [{ id: 'yi2', amountKcal: 650 }],
              // A real past-midnight snack, filed under Feb 28 by
              // effectiveDateFor() since 01:22 is before the 02:00 cutoff.
              timeEaten: '01:22',
              createdAt: '2026-02-28T01:22:00.000Z',
            },
          ],
        }),
      )
      const user = userEvent.setup()
      render(
        <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await user.click(
        screen.getByRole('button', { name: '+ Add another meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '13:36')
      await user.click(
        screen.getByRole('button', { name: "Can't find it? Add manually" }),
      )
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(
        await screen.findByText('Your fasting window was 12.2h.'),
      ).toBeInTheDocument()

      useDayStartStore.setState({ dayStartTime: '00:00' })
    })
  })

})
