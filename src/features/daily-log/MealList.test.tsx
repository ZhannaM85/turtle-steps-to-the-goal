import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { MealList } from './MealList'

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
  localStorage.clear()
  vi.useRealTimers()
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
      screen.getByText('Today would be: 500 kcal (was 300 kcal)'),
    ).toBeInTheDocument()
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
})
