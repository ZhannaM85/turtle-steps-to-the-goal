import 'fake-indexeddb/auto'
import { useState } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useCopyYesterdayMealsStore, useDayStartStore, useMealItemStore, useRecipeStore } from '@/stores'
import { MealList } from './MealList'

// #301 — a plain `onChange={vi.fn()}` never feeds a save back into
// MealList's own `calorieEntries` prop, which most tests don't need since
// they only assert against the mock's own call args. A test that both adds
// *and then* interacts with the resulting view-mode row (e.g. deleting it)
// needs the prop to actually reflect that save, so it wires a real
// controlled loop instead.
function ControlledMealList(props: {
  calorieEntries: CalorieEntry[]
  date: string
}) {
  const [entries, setEntries] = useState(props.calorieEntries)
  return (
    <MealList
      calorieEntries={entries}
      date={props.date}
      onChange={setEntries}
    />
  )
}

// #287 — Find-food toast tests interact with a heavier dialog plus an
// async IndexedDB round-trip; under full-suite CPU contention that can
// exceed vitest's 5000ms default.
vi.setConfig({ testTimeout: 15000 })

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
  // dates keep reading as today/future.
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
})

/**
 * MealList (#145) was extracted from DailyEntryForm.tsx so it can be
 * mounted standalone (DayDetail.tsx now does exactly that). Exhaustive
 * add / per-item-editor / barcode coverage lives in
 * AddMealDialog.test.tsx and MealItemEditorSheet's own suite. This file
 * covers MealList's own concerns: the add trigger, read-only meal cards,
 * the #461 in-place edit overlay wiring, copy-yesterday, and the fasting
 * toast.
 */
describe('MealList', () => {
  it('shows the add-meal trigger even with no meals yet', () => {
    render(
      <MealList calorieEntries={[]} date="2026-03-01" onChange={vi.fn()} />,
      { wrapper: MemoryRouter },
    )

    expect(
      screen.getByRole('button', { name: '+ Add a meal' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '+ Add another meal' }),
    ).not.toBeInTheDocument()
  })

  it('says Add another meal once the day already has a meal (#691)', () => {
    render(
      <MealList
        calorieEntries={[
          {
            id: 'm1',
            items: [{ id: 'i1', amountKcal: 200 }],
            createdAt: '2026-03-01T08:00:00.000Z',
          },
        ]}
        date="2026-03-01"
        onChange={vi.fn()}
      />,
      { wrapper: MemoryRouter },
    )

    expect(
      screen.getByRole('button', { name: '+ Add another meal' }),
    ).toBeInTheDocument()
  })

  it('asks before discarding an in-progress new meal on X (#494)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledMealList calorieEntries={[]} date="2026-03-01" />,
      { wrapper: MemoryRouter },
    )

    await user.click(
      screen.getByRole('button', { name: '+ Add a meal' }),
    )
    await user.click(screen.getByRole('button', { name: 'Add food' }))
    await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
    await user.type(screen.getByLabelText('kcal/100g'), '300')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getAllByText('Oatmeal').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Leave without saving? Foods added here will be discarded.',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Oatmeal').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.queryByText(
        'Leave without saving? Foods added here will be discarded.',
      ),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'Yes' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Oatmeal')).not.toBeInTheDocument()
    expect(screen.queryByText('Breakfast')).not.toBeInTheDocument()
  })

  it('keeps an in-progress new meal when Done is clicked (#491)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledMealList calorieEntries={[]} date="2026-03-01" />,
      { wrapper: MemoryRouter },
    )

    await user.click(
      screen.getByRole('button', { name: '+ Add a meal' }),
    )
    await user.click(screen.getByRole('button', { name: 'Add food' }))
    await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
    await user.type(screen.getByLabelText('kcal/100g'), '300')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByText('Oatmeal')).toBeInTheDocument()
  })

  it('renames Breakfast→Lunch in the add flyout and keeps it on the card (#563)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledMealList calorieEntries={[]} date="2026-03-01" />,
      { wrapper: MemoryRouter },
    )

    await user.click(
      screen.getByRole('button', { name: '+ Add a meal' }),
    )
    expect(screen.getByLabelText('Meal name')).toHaveValue('Breakfast')
    await user.click(screen.getByRole('button', { name: 'Lunch' }))
    expect(screen.getByLabelText('Meal name')).toHaveValue('Lunch')

    await user.click(screen.getByRole('button', { name: 'Add food' }))
    await user.type(screen.getByLabelText('Dish name'), 'Salad')
    await user.type(screen.getByLabelText('kcal/100g'), '150')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByText('Lunch')).toBeInTheDocument()
    expect(screen.queryByText('Breakfast')).not.toBeInTheDocument()
    expect(screen.getByText('Salad')).toBeInTheDocument()
  })

  it('allows clearing the meal name without the default reseeding (#568)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledMealList calorieEntries={[]} date="2026-03-01" />,
      { wrapper: MemoryRouter },
    )

    await user.click(
      screen.getByRole('button', { name: '+ Add a meal' }),
    )
    const nameField = screen.getByLabelText('Meal name')
    expect(nameField).toHaveValue('Breakfast')
    await user.clear(nameField)
    expect(nameField).toHaveValue('')
    await user.type(nameField, 'Brunch')
    expect(nameField).toHaveValue('Brunch')
  })

  it('keeps a typed space in the meal title mid-keystroke (#576)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledMealList calorieEntries={[]} date="2026-03-01" />,
      { wrapper: MemoryRouter },
    )

    await user.click(
      screen.getByRole('button', { name: '+ Add a meal' }),
    )
    const nameField = screen.getByLabelText('Meal name')
    expect(nameField).toHaveValue('Breakfast')
    await user.type(nameField, ' 1')
    expect(nameField).toHaveValue('Breakfast 1')
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
      <MealList
        calorieEntries={calorieEntries}
        date="2026-03-01"
        onChange={vi.fn()}
      />,
      { wrapper: MemoryRouter },
    )

    expect(screen.getByText('Bio-Skyr')).toBeInTheDocument()
    // #473 split kcal and grams onto a bold span + muted sibling, so they
    // no longer form one exact text node.
    expect(screen.getByText('175 kcal')).toBeInTheDocument()
    expect(screen.getByText('· 100g')).toBeInTheDocument()
    expect(screen.getByText('Chicken thigh')).toBeInTheDocument()
    expect(screen.getByText('314 kcal')).toBeInTheDocument()
  })

  it('keeps only the meal name in the header, time right before the icons, kcal on the macros line (#473)', () => {
    const calorieEntries: CalorieEntry[] = [
      {
        id: 'c1',
        label: 'Late-night snack platter',
        timeEaten: '20:25',
        items: [{ id: 'i1', name: 'Skyr', amountKcal: 175, proteinG: 20 }],
        createdAt: '2026-01-01T00:00:00.000Z',
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

    const title = screen.getByText('Late-night snack platter')
    expect(title.textContent).not.toMatch(/kcal|20:25/)

    // Time sits between the title and the icon cluster, so it can never be
    // pushed onto the icons' line by a long meal name.
    const headerRow = title.parentElement
    expect(headerRow?.className).toMatch(/items-start/)
    const time = screen.getByText('20:25')
    expect(time.previousElementSibling).toBe(title)

    const iconCluster = time.nextElementSibling
    expect(
      within(iconCluster as HTMLElement).getByRole('button', {
        name: 'Edit meal 1',
      }),
    ).toBeInTheDocument()
    expect(
      within(iconCluster as HTMLElement).getByRole('button', {
        name: 'Delete meal 1',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByText('175 kcal · P 20g · F — · C —'),
    ).toBeInTheDocument()
  })

  it('lists meals earliest logged time first (#597)', () => {
    const calorieEntries: CalorieEntry[] = [
      {
        id: 'dinner',
        label: 'Dinner',
        timeEaten: '21:00',
        items: [{ id: 'i1', name: 'Prunes', amountKcal: 121 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'lunch',
        label: 'Lunch',
        timeEaten: '15:00',
        items: [{ id: 'i2', name: 'Chicken', amountKcal: 170 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'breakfast',
        label: 'Breakfast',
        timeEaten: '12:00',
        items: [{ id: 'i3', name: 'Oats', amountKcal: 94 }],
        createdAt: '2026-01-01T00:00:00.000Z',
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

    const names = screen
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '')
    const breakfastIdx = names.findIndex((text) => text.includes('Breakfast'))
    const lunchIdx = names.findIndex((text) => text.includes('Lunch'))
    const dinnerIdx = names.findIndex((text) => text.includes('Dinner'))
    expect(breakfastIdx).toBeGreaterThanOrEqual(0)
    expect(lunchIdx).toBeGreaterThan(breakfastIdx)
    expect(dinnerIdx).toBeGreaterThan(lunchIdx)
  })

  it('shows a meal without logged macros as a bare kcal figure, not a row of dashes (#473)', () => {
    const calorieEntries: CalorieEntry[] = [
      {
        id: 'c1',
        items: [{ id: 'i1', name: 'Skyr', amountKcal: 175 }],
        createdAt: '2026-01-01T00:00:00.000Z',
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

    expect(screen.queryByText(/P —/)).not.toBeInTheDocument()
    expect(screen.getAllByText('175 kcal').length).toBeGreaterThan(0)
  })

  describe('optional brand name (#248)', () => {
    it('shows the brand next to the dish name in the read-only view, with no stray "()" when unset', () => {
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [
            {
              id: 'i1',
              name: 'Chicken breast',
              brand: 'Perdue',
              amountKcal: 165,
            },
            { id: 'i2', name: 'Apple', amountKcal: 52 },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
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

      expect(screen.getByText('Chicken breast (Perdue)')).toBeInTheDocument()
      expect(screen.getByText('165 kcal')).toBeInTheDocument()
      expect(screen.getByText('Apple')).toBeInTheDocument()
      expect(screen.getByText('52 kcal')).toBeInTheDocument()
    })

    it('wraps long dish names inside the card without overflowing (#545/#555/#559)', () => {
      const longName =
        'Каша овсяная с чиа и фруктовым джемом (Level Kitchen)'
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', name: longName, amountKcal: 121 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      const { container } = render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      const name = screen.getByText(longName)
      // #555/#559: break-words mid-splits Cyrillic on WebKit. Safari also
      // clipped under flex+overflow-hidden; grid minmax(0,1fr) gives a
      // definite line box so break-normal wraps at spaces only.
      expect(name).toHaveClass('min-w-0')
      expect(name).toHaveClass('max-w-full')
      expect(name).toHaveClass('break-normal')
      expect(name).toHaveClass('hyphens-none')
      expect(name).not.toHaveClass('break-words')
      expect(name).not.toHaveClass('w-0')
      // #559: dish list must not indent past the meal title/totals.
      const itemList = container.querySelector('ul.divide-y')
      expect(itemList).not.toHaveClass('pl-4')
      expect(itemList).toHaveClass('grid')
      expect(itemList).toHaveClass('grid-cols-1')
      const card = container.querySelector('li.rounded-xl')
      expect(card).toHaveClass('max-w-full')
      expect(card).toHaveClass('grid')
      expect(card).not.toHaveClass('overflow-hidden')
    })

    it('renders NBSP in a dish name as normal spaces so the line can wrap (#559)', () => {
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [
            {
              id: 'i1',
              name: 'Каша\u00A0овсяная\u00A0с\u00A0джемом',
              brand: 'Level\u00A0Kitchen',
              amountKcal: 121,
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
        />,
        { wrapper: MemoryRouter },
      )

      expect(
        screen.getByText('Каша овсяная с джемом (Level Kitchen)'),
      ).toBeInTheDocument()
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
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      expect(screen.getByText('extra spicy today')).toBeInTheDocument()
    })
  })

  describe('edit overlay (#461)', () => {
    it("opens AddMealDialog in place when a meal's pencil is clicked", async () => {
      const user = userEvent.setup()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', name: 'Oatmeal', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
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

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))

      const dialog = screen.getByRole('dialog', { name: 'Breakfast' })
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByText('This meal so far')).toBeInTheDocument()
      expect(within(dialog).getByText('Oatmeal')).toBeInTheDocument()
    })

    it('renames the meal label in the edit overlay and keeps it after Done (#563)', async () => {
      const user = userEvent.setup()
      render(
        <ControlledMealList
          calorieEntries={[
            {
              id: 'c1',
              items: [{ id: 'i1', name: 'Oatmeal', amountKcal: 300 }],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ]}
          date="2026-03-01"
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
      const dialog = screen.getByRole('dialog', { name: 'Breakfast' })
      await user.click(within(dialog).getByRole('button', { name: 'Dinner' }))
      expect(within(dialog).getByLabelText('Meal name')).toHaveValue('Dinner')
      await user.click(within(dialog).getByRole('button', { name: 'Done' }))

      expect(screen.getByText('Dinner')).toBeInTheDocument()
      expect(screen.queryByText('Breakfast')).not.toBeInTheDocument()
    })

    it('closes the overlay when Done is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ControlledMealList
          calorieEntries={[
            {
              id: 'c1',
              items: [{ id: 'i1', name: 'Oatmeal', amountKcal: 300 }],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ]}
          date="2026-03-01"
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
      const dialog = screen.getByRole('dialog', { name: 'Breakfast' })
      await user.click(within(dialog).getByRole('button', { name: 'Done' }))

      expect(
        screen.queryByRole('dialog', { name: 'Breakfast' }),
      ).not.toBeInTheDocument()
    })

    it('updates an existing item via the overlay and persists on Done (#509)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const calorieEntries: CalorieEntry[] = [
        {
          id: 'c1',
          items: [{ id: 'i1', name: 'Oatmeal', amountKcal: 300 }],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      render(
        <MealList
          calorieEntries={calorieEntries}
          date="2026-03-01"
          onChange={onChange}
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
      const dialog = screen.getByRole('dialog', { name: 'Breakfast' })
      await user.click(
        within(dialog).getByRole('button', { name: 'Edit item' }),
      )
      const itemSheet = screen.getByRole('dialog', { name: 'Edit item' })
      const kcalField = within(itemSheet).getByLabelText('kcal', {
        exact: true,
      })
      await user.clear(kcalField)
      await user.type(kcalField, '450')
      await user.click(
        within(itemSheet).getByRole('button', { name: 'Save' }),
      )

      expect(onChange).not.toHaveBeenCalled()

      await user.click(within(dialog).getByRole('button', { name: 'Done' }))

      expect(onChange).toHaveBeenCalled()
      const next = onChange.mock.calls.at(-1)?.[0] as CalorieEntry[]
      expect(next[0].items[0]).toMatchObject({
        name: 'Oatmeal',
        amountKcal: 450,
      })
    })

    it('asks before removing a food, and only deletes the meal from the day on Done (#509)', async () => {
      const user = userEvent.setup()
      render(
        <ControlledMealList
          calorieEntries={[
            {
              id: 'c1',
              items: [{ id: 'i1', name: 'Oatmeal', amountKcal: 300 }],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ]}
          date="2026-03-01"
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
      const dialog = screen.getByRole('dialog', { name: 'Breakfast' })
      await user.click(
        within(dialog).getByRole('button', { name: 'Delete item' }),
      )
      const confirm = screen.getByRole('alertdialog')
      expect(confirm).toHaveTextContent('Remove this food?')
      await user.click(within(confirm).getByRole('button', { name: 'Remove' }))

      expect(
        screen.getByRole('dialog', { name: 'Breakfast' }),
      ).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Done' })).toBeInTheDocument()

      await user.click(within(dialog).getByRole('button', { name: 'Done' }))

      expect(
        screen.queryByRole('dialog', { name: 'Breakfast' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Edit meal 1' }),
      ).not.toBeInTheDocument()
      expect(screen.queryByText('Oatmeal')).not.toBeInTheDocument()
    })

    it('discards edit-session deletes when Close is confirmed (#509)', async () => {
      const user = userEvent.setup()
      render(
        <ControlledMealList
          calorieEntries={[
            {
              id: 'c1',
              items: [
                { id: 'i1', name: 'Oatmeal', amountKcal: 300 },
                { id: 'i2', name: 'Banana', amountKcal: 90 },
              ],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ]}
          date="2026-03-01"
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
      const dialog = screen.getByRole('dialog', { name: 'Breakfast' })
      await user.click(
        within(dialog).getAllByRole('button', { name: 'Delete item' })[0]!,
      )
      const confirm = screen.getByRole('alertdialog')
      expect(confirm).toHaveTextContent('Remove this food?')
      await user.click(within(confirm).getByRole('button', { name: 'Remove' }))
      expect(within(dialog).queryByText('Oatmeal')).not.toBeInTheDocument()

      await user.click(within(dialog).getByRole('button', { name: 'Close' }))
      expect(
        within(dialog).getByText(
          'Leave without saving? Changes to this meal will be discarded.',
        ),
      ).toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: 'Yes' }))

      expect(
        screen.queryByRole('dialog', { name: 'Breakfast' }),
      ).not.toBeInTheDocument()
      expect(screen.getByText('Oatmeal')).toBeInTheDocument()
      expect(screen.getByText('Banana')).toBeInTheDocument()
    })

    it('deletes the whole meal from the overlay trash and closes', async () => {
      const user = userEvent.setup()
      render(
        <ControlledMealList
          calorieEntries={[
            {
              id: 'c1',
              items: [{ id: 'i1', name: 'Oatmeal', amountKcal: 300 }],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ]}
          date="2026-03-01"
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
      const dialog = screen.getByRole('dialog', { name: 'Breakfast' })
      await user.click(
        within(dialog).getByRole('button', { name: 'Delete meal 1' }),
      )
      await user.click(
        within(dialog).getByRole('button', { name: 'Delete' }),
      )

      expect(
        screen.queryByRole('dialog', { name: 'Breakfast' }),
      ).not.toBeInTheDocument()
      expect(screen.queryByText(/Breakfast/)).not.toBeInTheDocument()
    })

    it('keeps a typed meal-note space while editing (does not trim mid-keystroke)', async () => {
      const user = userEvent.setup()
      render(
        <ControlledMealList
          calorieEntries={[
            {
              id: 'c1',
              items: [{ id: 'i1', name: 'Oatmeal', amountKcal: 300 }],
              note: 'extra',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ]}
          date="2026-03-01"
        />,
        { wrapper: MemoryRouter },
      )

      await user.click(screen.getByRole('button', { name: 'Edit meal 1' }))
      const note = screen.getByLabelText('Meal note')
      await user.type(note, ' spicy')

      expect(note).toHaveValue('extra spicy')
    })
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
      <MealList
        calorieEntries={calorieEntries}
        date="2026-03-01"
        onChange={onChange}
      />,
      { wrapper: MemoryRouter },
    )

    await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onChange).toHaveBeenCalledWith([])
  })

  it('restores a deleted meal via the undo toast (#600)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledMealList
        calorieEntries={[
          {
            id: 'c1',
            items: [{ id: 'i1', name: 'Oatmeal', amountKcal: 300 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'c2',
            items: [{ id: 'i2', name: 'Yogurt', amountKcal: 150 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ]}
        date="2026-03-01"
      />,
      { wrapper: MemoryRouter },
    )

    await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.queryByText('Oatmeal')).not.toBeInTheDocument()
    expect(screen.getByText('Meal deleted.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByText('Oatmeal')).toBeInTheDocument()
    expect(screen.queryByText('Meal deleted.')).not.toBeInTheDocument()
  })

  it('auto-clears the undo toast after its window expires (#600)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup()
    render(
      <ControlledMealList
        calorieEntries={[
          {
            id: 'c1',
            items: [{ id: 'i1', name: 'Oatmeal', amountKcal: 300 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ]}
        date="2026-03-01"
      />,
      { wrapper: MemoryRouter },
    )

    await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Meal deleted.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(9000)
    })

    expect(screen.queryByText('Meal deleted.')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  describe("copy yesterday's meals (#253)", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-03-02T12:00:00.000Z'))
      // #692 — feature is Settings opt-in (default off); enable for these tests.
      useCopyYesterdayMealsStore.setState({ enabled: true })
    })

    it('hides the control when Settings opt-in is off (#692)', async () => {
      useCopyYesterdayMealsStore.setState({ enabled: false })
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-03-01',
          calorieEntries: [
            {
              id: 'y1',
              items: [{ id: 'yi1', name: 'Eggs', amountKcal: 150 }],
              createdAt: '2026-03-01T08:00:00.000Z',
            },
          ],
        }),
      )
      render(
        <MealList calorieEntries={[]} date="2026-03-02" onChange={vi.fn()} />,
        { wrapper: MemoryRouter },
      )

      await screen.findByRole('button', { name: '+ Add a meal' })
      expect(
        screen.queryByRole('button', { name: "Copy yesterday's meals" }),
      ).not.toBeInTheDocument()
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

      await screen.findByRole('button', { name: '+ Add a meal' })
      expect(
        screen.queryByRole('button', { name: "Copy yesterday's meals" }),
      ).not.toBeInTheDocument()
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
      // #456 — purely derived from the `calorieEntries` prop now, so this
      // needs the real controlled loop (ControlledMealList).
      render(<ControlledMealList calorieEntries={[]} date="2026-03-01" />, {
        wrapper: MemoryRouter,
      })

      await user.click(
        screen.getByRole('button', { name: '+ Add a meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(screen.getByRole('button', { name: 'Add food' }))
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(
        await screen.findByText('Your fasting window was 12.0h.'),
      ).toBeInTheDocument()
    })

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
      render(<ControlledMealList calorieEntries={[]} date="2026-03-01" />, {
        wrapper: MemoryRouter,
      })

      await user.click(
        screen.getByRole('button', { name: '+ Add a meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.type(screen.getByLabelText('Search foods'), 'Salmon')
      await user.click(await screen.findByText('Salmon'))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(
        await screen.findByText('Your fasting window was 12.0h.'),
      ).toBeInTheDocument()
    })

    it('does not show the toast when yesterday has no timed meal', async () => {
      const user = userEvent.setup()
      render(<ControlledMealList calorieEntries={[]} date="2026-03-01" />, {
        wrapper: MemoryRouter,
      })

      await user.click(
        screen.getByRole('button', { name: '+ Add a meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(screen.getByRole('button', { name: 'Add food' }))
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(
        screen.queryByText(/Your fasting window was/),
      ).not.toBeInTheDocument()
    })

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
        screen.getByRole('button', { name: '+ Add a meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(screen.getByRole('button', { name: 'Add food' }))
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Your fasting window was 12.0h.')
      await user.click(screen.getByRole('button', { name: 'Done' }))

      expect(
        screen.queryByRole('button', { name: 'Dismiss' }),
      ).not.toBeInTheDocument()
    })

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

      await user.click(
        screen.getByRole('button', { name: '+ Add a meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '08:00')
      await user.click(screen.getByRole('button', { name: 'Add food' }))
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText('Your fasting window was 12.0h.')
      await user.click(screen.getByRole('button', { name: 'Done' }))

      await user.click(screen.getByRole('button', { name: 'Delete meal 1' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(
        screen.queryByText(/Your fasting window was/),
      ).not.toBeInTheDocument()
    })

    it("reflects the previous day's actual latest meal, not a stale cached value", async () => {
      await db.dailyEntries.put(
        makeDailyEntry({
          date: '2026-02-28',
          calorieEntries: [
            {
              id: 'y1',
              items: [{ id: 'yi1', amountKcal: 400 }],
              timeEaten: '23:00',
              createdAt: '2026-02-28T23:00:00.000Z',
            },
          ],
        }),
      )
      render(
        <MealList
          calorieEntries={[
            {
              id: 't1',
              items: [{ id: 'ti1', amountKcal: 300 }],
              timeEaten: '08:00',
              createdAt: '2026-03-01T08:00:00.000Z',
            },
          ]}
          date="2026-03-01"
          onChange={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      expect(
        await screen.findByText('Your fasting window was 9.0h.'),
      ).toBeInTheDocument()
    })

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
              timeEaten: '01:22',
              createdAt: '2026-02-28T01:22:00.000Z',
            },
          ],
        }),
      )
      const user = userEvent.setup()
      render(<ControlledMealList calorieEntries={[]} date="2026-03-01" />, {
        wrapper: MemoryRouter,
      })

      await user.click(
        screen.getByRole('button', { name: '+ Add a meal' }),
      )
      await user.clear(screen.getByLabelText('Time'))
      await user.type(screen.getByLabelText('Time'), '13:36')
      await user.click(screen.getByRole('button', { name: 'Add food' }))
      await user.type(screen.getByLabelText('Dish name'), 'Oatmeal')
      await user.type(screen.getByLabelText('kcal/100g'), '300')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(
        await screen.findByText('Your fasting window was 12.2h.'),
      ).toBeInTheDocument()

      useDayStartStore.setState({ dayStartTime: '00:00' })
    })

    it("sorts a past-midnight meal after the same day's evening meals, once a custom day-start time is set (#621)", async () => {
      useDayStartStore.setState({ dayStartTime: '04:00' })
      render(
        <MealList
          calorieEntries={[
            {
              id: 'night',
              label: 'Night snack',
              items: [{ id: 'ni', amountKcal: 242 }],
              timeEaten: '01:00',
              createdAt: '2026-08-05T01:00:00.000Z',
            },
            {
              id: 'lunch',
              label: 'Lunch',
              items: [{ id: 'li', amountKcal: 175 }],
              timeEaten: '14:09',
              createdAt: '2026-08-04T14:09:00.000Z',
            },
          ]}
          date="2026-08-04"
          onChange={vi.fn()}
        />,
        { wrapper: MemoryRouter },
      )

      const labels = (await screen.findAllByText(/Night snack|Lunch/)).map(
        (el) => el.textContent,
      )
      expect(labels).toEqual(['Lunch', 'Night snack'])

      useDayStartStore.setState({ dayStartTime: '00:00' })
    })
  })
})
