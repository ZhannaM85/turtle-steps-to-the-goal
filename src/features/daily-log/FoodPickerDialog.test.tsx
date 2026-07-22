import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MealItem } from '@/domain/mealItem'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useFoodOverrideStore } from '@/stores'
import { FoodPickerDialog } from './FoodPickerDialog'

// The food list grew to 300+ items (#78) — every test here renders the
// dialog open, so the default 5s timeout is too tight under full-suite
// parallel load even though each test is fast in isolation. Bumped again
// for #278: three more tests in this file pushed it further past the
// 15s mark under full-suite parallel load (still ~3s each in isolation).
vi.setConfig({ testTimeout: 25000 })

function mealItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: crypto.randomUUID(),
    name: 'Homemade soup',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastAmountKcal: 320,
    lastProteinG: 18,
    lastFatG: 10,
    lastCarbsG: 25,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.foodOverrides.clear()
  await db.mealItems.clear()
  useFoodOverrideStore.setState({ overrides: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.foodOverrides.clear()
  await db.mealItems.clear()
})

describe('FoodPickerDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <FoodPickerDialog
        open={false}
        onOpenChange={vi.fn()}
        onAdd={vi.fn()}
        mealItems={[]}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('filters the food list as the user types', async () => {
    const user = userEvent.setup()
    render(
      <FoodPickerDialog
        open
        onOpenChange={vi.fn()}
        onAdd={vi.fn()}
        mealItems={[]}
      />,
    )

    expect(screen.getByText('Salmon')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search foods'), 'chicken')

    expect(screen.getByText('Chicken breast')).toBeInTheDocument()
    expect(screen.getByText('Chicken thigh')).toBeInTheDocument()
    expect(screen.queryByText('Salmon')).not.toBeInTheDocument()
  })

  it('shows per-100g kcal and macros next to each food name (#75)', () => {
    render(
      <FoodPickerDialog
        open
        onOpenChange={vi.fn()}
        onAdd={vi.fn()}
        mealItems={[]}
      />,
    )

    expect(
      screen.getByText('208 kcal per 100g · P 20g · F 13g · C 0g'),
    ).toBeInTheDocument()
  })

  it('shows a no-results message when nothing matches', async () => {
    const user = userEvent.setup()
    render(
      <FoodPickerDialog
        open
        onOpenChange={vi.fn()}
        onAdd={vi.fn()}
        mealItems={[]}
      />,
    )

    await user.type(screen.getByLabelText('Search foods'), 'zzzznotfood')

    expect(screen.getByText('No foods found.')).toBeInTheDocument()
  })

  it('the confirm button stays disabled until a food is checked', async () => {
    const user = userEvent.setup()
    render(
      <FoodPickerDialog
        open
        onOpenChange={vi.fn()}
        onAdd={vi.fn()}
        mealItems={[]}
      />,
    )

    expect(screen.getByRole('button', { name: 'Add selected' })).toBeDisabled()

    await user.click(screen.getByText('Chicken breast'))

    expect(screen.getByRole('button', { name: 'Add selected' })).toBeEnabled()
  })

  it('scales the checked food by quantity and hands back computed macros', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <FoodPickerDialog
        open
        onOpenChange={onOpenChange}
        onAdd={onAdd}
        mealItems={[]}
      />,
    )

    await user.click(screen.getByText('Chicken breast'))
    const quantityInput = screen.getByLabelText('Quantity (g)')
    await user.clear(quantityInput)
    await user.type(quantityInput, '150')
    await user.click(screen.getByRole('button', { name: 'Add selected' }))

    expect(onAdd).toHaveBeenCalledWith([
      {
        amountKcal: 248, // 165 kcal/100g * 1.5
        proteinG: 46.5, // 31g/100g * 1.5
        fatG: 5.4, // 3.6g/100g * 1.5
        carbsG: 0,
        note: 'Chicken breast',
        amountG: 150,
        emotion: undefined,
      },
    ])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('defaults quantity to 100g', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(
      <FoodPickerDialog
        open
        onOpenChange={vi.fn()}
        onAdd={onAdd}
        mealItems={[]}
      />,
    )

    await user.click(screen.getByText('Salmon'))
    expect(screen.getByLabelText('Quantity (g)')).toHaveValue('100')

    await user.click(screen.getByRole('button', { name: 'Add selected' }))

    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        amountKcal: 208,
        proteinG: 20,
        fatG: 13,
        carbsG: 0,
        note: 'Salmon',
        amountG: 100,
      }),
    ])
  })

  it('lets a checked food be rated before adding (#134)', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(
      <FoodPickerDialog
        open
        onOpenChange={vi.fn()}
        onAdd={onAdd}
        mealItems={[]}
      />,
    )

    await user.click(screen.getByText('Salmon'))
    await user.click(screen.getByRole('button', { name: 'Bellissimo — Salmon' }))
    await user.click(screen.getByRole('button', { name: 'Add selected' }))

    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({ emotion: 'bellissimo' }),
    ])
  })

  it('adds without a reaction when none is picked', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(
      <FoodPickerDialog
        open
        onOpenChange={vi.fn()}
        onAdd={onAdd}
        mealItems={[]}
      />,
    )

    await user.click(screen.getByText('Salmon'))
    await user.click(screen.getByRole('button', { name: 'Add selected' }))

    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({ emotion: undefined }),
    ])
  })

  describe('multi-select (#183)', () => {
    it('checks off several dishes and adds them all in one onAdd call', async () => {
      const user = userEvent.setup()
      const onAdd = vi.fn()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={onAdd}
          mealItems={[]}
        />,
      )

      await user.click(screen.getByText('Salmon'))
      await user.click(screen.getByText('Tuna'))
      expect(
        screen.getByRole('button', { name: 'Add selected (2)' }),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Add selected (2)' }))

      expect(onAdd).toHaveBeenCalledTimes(1)
      expect(onAdd).toHaveBeenCalledWith([
        expect.objectContaining({ note: 'Salmon', amountG: 100 }),
        expect.objectContaining({ note: 'Tuna', amountG: 100 }),
      ])
    })

    it('unchecks a dish by clicking it again', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[]}
        />,
      )

      const salmonRow = screen.getByRole('checkbox', { name: /Salmon/ })
      await user.click(salmonRow)
      expect(salmonRow).toHaveAttribute('aria-checked', 'true')

      await user.click(salmonRow)
      expect(salmonRow).toHaveAttribute('aria-checked', 'false')
      expect(screen.getByRole('button', { name: 'Add selected' })).toBeDisabled()
    })

    it('keeps checked dishes selected across a search-text change', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[]}
        />,
      )

      await user.click(screen.getByText('Salmon'))
      await user.type(screen.getByLabelText('Search foods'), 'chicken')

      expect(
        screen.getByRole('button', { name: 'Add selected' }),
      ).toBeEnabled()

      await user.clear(screen.getByLabelText('Search foods'))
      expect(
        screen.getByRole('checkbox', { name: /Salmon/ }),
      ).toHaveAttribute('aria-checked', 'true')
    })

    it('hides the reaction field, and replaces the shared quantity field with one per row, once a second dish is checked (#264)', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[]}
        />,
      )

      await user.click(screen.getByText('Salmon'))
      expect(screen.getByLabelText('Quantity (g)')).toBeInTheDocument()

      await user.click(screen.getByText('Tuna'))
      expect(screen.queryByLabelText('Quantity (g)')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Bellissimo/ })).not.toBeInTheDocument()
      expect(screen.getByLabelText('Quantity (g) — Salmon')).toBeInTheDocument()
      expect(screen.getByLabelText('Quantity (g) — Tuna')).toBeInTheDocument()
    })

    it('scales each checked dish independently via its own per-row quantity (#264)', async () => {
      const user = userEvent.setup()
      const onAdd = vi.fn()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={onAdd}
          mealItems={[]}
        />,
      )

      await user.click(screen.getByText('Salmon'))
      await user.click(screen.getByText('Tuna'))
      const salmonQuantity = screen.getByLabelText('Quantity (g) — Salmon')
      await user.clear(salmonQuantity)
      await user.type(salmonQuantity, '200')
      await user.click(screen.getByRole('button', { name: 'Add selected (2)' }))

      expect(onAdd).toHaveBeenCalledWith([
        expect.objectContaining({ note: 'Salmon', amountKcal: 416, amountG: 200 }), // 208 * 2
        expect.objectContaining({ note: 'Tuna', amountG: 100 }), // untouched, stays at the 100g default
      ])
    })
  })

  describe('personal meal items (#86)', () => {
    it('includes saved meal items in the search, alongside the curated foods', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[mealItem({ name: 'Grandma’s stew' })]}
        />,
      )

      await user.type(screen.getByLabelText('Search foods'), 'stew')

      expect(screen.getByText('Grandma’s stew')).toBeInTheDocument()
      expect(
        screen.getByText('320 kcal last logged · P 18g · F 10g · C 25g'),
      ).toBeInTheDocument()
    })

    it('excludes meal items with no recorded nutrition yet', () => {
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[
            mealItem({
              name: 'Untouched item',
              lastAmountKcal: undefined,
              lastProteinG: undefined,
              lastFatG: undefined,
              lastCarbsG: undefined,
            }),
          ]}
        />,
      )

      expect(screen.queryByText('Untouched item')).not.toBeInTheDocument()
    })

    it('shows a quantity field for a picked meal item too, defaulting to 100g when no quantity was previously recorded (#264)', async () => {
      const user = userEvent.setup()
      const onAdd = vi.fn()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={onAdd}
          mealItems={[mealItem({ name: 'Grandma’s stew' })]}
        />,
      )

      await user.click(screen.getByText('Grandma’s stew'))
      // No lastAmountG recorded on this fixture — defaults to 100g, same
      // reference amount a curated food's own quantity field defaults to.
      expect(screen.getByLabelText('Quantity (g)')).toHaveValue('100')

      await user.click(screen.getByRole('button', { name: 'Add selected' }))

      expect(onAdd).toHaveBeenCalledWith([
        {
          amountKcal: 320,
          proteinG: 18,
          fatG: 10,
          carbsG: 25,
          note: 'Grandma’s stew',
          amountG: 100,
          emotion: undefined,
        },
      ])
    })

    it('scales a picked meal item by an adjusted quantity (#264)', async () => {
      const user = userEvent.setup()
      const onAdd = vi.fn()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={onAdd}
          mealItems={[mealItem({ name: 'Grandma’s stew' })]}
        />,
      )

      await user.click(screen.getByText('Grandma’s stew'))
      const quantityInput = screen.getByLabelText('Quantity (g)')
      await user.clear(quantityInput)
      await user.type(quantityInput, '200')
      await user.click(screen.getByRole('button', { name: 'Add selected' }))

      expect(onAdd).toHaveBeenCalledWith([
        expect.objectContaining({
          amountKcal: 640,
          proteinG: 36,
          fatG: 20,
          carbsG: 50,
          amountG: 200,
        }),
      ])
    })

    it('passes through a picked meal item’s recorded quantity too (#96)', async () => {
      const user = userEvent.setup()
      const onAdd = vi.fn()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={onAdd}
          mealItems={[mealItem({ name: 'Grandma’s stew', lastAmountG: 400 })]}
        />,
      )

      await user.click(screen.getByText('Grandma’s stew'))
      await user.click(screen.getByRole('button', { name: 'Add selected' }))

      expect(onAdd).toHaveBeenCalledWith([
        expect.objectContaining({ amountG: 400 }),
      ])
    })
  })

  describe('removing a personal item (#209)', () => {
    it('shows a remove button on personal items but not on curated foods', () => {
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[mealItem({ name: 'Grandma’s stew' })]}
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Delete "Grandma’s stew"' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Delete "Salmon"' }),
      ).not.toBeInTheDocument()
    })

    it('deletes the item from the store when clicked', async () => {
      const user = userEvent.setup()
      const item = mealItem({ name: 'Grandma’s stew' })
      await db.mealItems.put(item)
      expect(await db.mealItems.get(item.id)).toEqual(item)
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[item]}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: 'Delete "Grandma’s stew"' }),
      )

      expect(await db.mealItems.get(item.id)).toBeUndefined()
    })

    it('drops a deleted item from the selection so it no longer counts toward the confirm button', async () => {
      const user = userEvent.setup()
      const item = mealItem({ name: 'Grandma’s stew' })
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[item]}
        />,
      )

      await user.click(screen.getByText('Grandma’s stew'))
      expect(
        screen.getByRole('button', { name: 'Add selected' }),
      ).toBeEnabled()

      await user.click(
        screen.getByRole('button', { name: 'Delete "Grandma’s stew"' }),
      )

      expect(
        screen.getByRole('button', { name: 'Add selected' }),
      ).toBeDisabled()
    })
  })

  describe('serving descriptors (#254)', () => {
    it('offers a serving-size toggle for a food with known servings, defaulting to grams', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog open onOpenChange={vi.fn()} onAdd={vi.fn()} mealItems={[]} />,
      )

      await user.click(screen.getByText('Egg'))

      expect(screen.getByRole('radio', { name: 'Grams' })).toBeChecked()
      expect(screen.getByRole('radio', { name: '1 small' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: '1 medium' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: '1 large' })).toBeInTheDocument()
      expect(screen.getByLabelText('Quantity (g)')).toBeInTheDocument()
    })

    it('does not offer a serving-size toggle for a food with none seeded', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog open onOpenChange={vi.fn()} onAdd={vi.fn()} mealItems={[]} />,
      )

      await user.click(screen.getByText('Salmon'))

      expect(screen.queryByRole('radio', { name: 'Grams' })).not.toBeInTheDocument()
    })

    it('switches to a "how many" count once a serving size is picked, and scales by it', async () => {
      const user = userEvent.setup()
      const onAdd = vi.fn()
      render(
        <FoodPickerDialog open onOpenChange={vi.fn()} onAdd={onAdd} mealItems={[]} />,
      )

      await user.click(screen.getByText('Egg'))
      await user.click(screen.getByRole('radio', { name: '1 medium' }))

      expect(screen.queryByLabelText('Quantity (g)')).not.toBeInTheDocument()
      expect(screen.getByLabelText('How many')).toHaveValue('1')

      await user.click(screen.getByRole('button', { name: 'Add selected' }))

      // Egg: 155 kcal/100g, 13g protein/100g. 1 medium = 50g -> scale 0.5.
      expect(onAdd).toHaveBeenCalledWith([
        expect.objectContaining({ amountKcal: 78, proteinG: 6.5, amountG: 50 }),
      ])
    })

    it('multiplies the serving weight by the "how many" count', async () => {
      const user = userEvent.setup()
      const onAdd = vi.fn()
      render(
        <FoodPickerDialog open onOpenChange={vi.fn()} onAdd={onAdd} mealItems={[]} />,
      )

      await user.click(screen.getByText('Egg'))
      await user.click(screen.getByRole('radio', { name: '1 large' }))
      const countInput = screen.getByLabelText('How many')
      await user.clear(countInput)
      await user.type(countInput, '2')
      await user.click(screen.getByRole('button', { name: 'Add selected' }))

      // 1 large = 56g, x2 = 112g -> scale 1.12
      expect(onAdd).toHaveBeenCalledWith([
        expect.objectContaining({ amountKcal: 174, amountG: 112 }),
      ])
    })

    it('reverts to the quantity field when switched back to grams', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog open onOpenChange={vi.fn()} onAdd={vi.fn()} mealItems={[]} />,
      )

      await user.click(screen.getByText('Egg'))
      await user.click(screen.getByRole('radio', { name: '1 medium' }))
      await user.click(screen.getByRole('radio', { name: 'Grams' }))

      expect(screen.getByLabelText('Quantity (g)')).toBeInTheDocument()
      expect(screen.queryByLabelText('How many')).not.toBeInTheDocument()
    })

    it('hides the serving toggle once a second dish is checked', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog open onOpenChange={vi.fn()} onAdd={vi.fn()} mealItems={[]} />,
      )

      await user.click(screen.getByText('Egg'))
      await user.click(screen.getByText('Salmon'))

      expect(screen.queryByRole('radio', { name: 'Grams' })).not.toBeInTheDocument()
    })
  })

  describe("today's running total preview (#273/#278)", () => {
    const todayTotals = { kcal: 300, proteinG: 20, fatG: 5, carbsG: 10 }

    it('shows nothing when todayTotals is not passed', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog open onOpenChange={vi.fn()} onAdd={vi.fn()} mealItems={[]} />,
      )

      await user.click(screen.getByText('Chicken breast'))

      expect(screen.queryByText(/Today would be/)).not.toBeInTheDocument()
    })

    it('shows nothing until a dish is checked, even with todayTotals passed', () => {
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[]}
          todayTotals={todayTotals}
        />,
      )

      expect(screen.queryByText(/Today would be/)).not.toBeInTheDocument()
    })

    it('previews the new kcal and macro totals for a single checked dish', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[]}
          todayTotals={todayTotals}
        />,
      )

      // Salmon: 208 kcal/100g · P 20g · F 13g · C 0g
      await user.click(screen.getByText('Salmon'))

      expect(
        screen.getByText(
          'Today would be: 508 kcal · P 40g · F 18g · C 10g (was 300 kcal · P 20g · F 5g · C 10g)',
        ),
      ).toBeInTheDocument()

      const quantityInput = screen.getByLabelText('Quantity (g)')
      await user.clear(quantityInput)
      await user.type(quantityInput, '200')

      expect(
        screen.getByText(
          'Today would be: 716 kcal · P 60g · F 31g · C 10g (was 300 kcal · P 20g · F 5g · C 10g)',
        ),
      ).toBeInTheDocument()
    })

    it('sums every checked dish for a multi-select preview', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[]}
          todayTotals={todayTotals}
        />,
      )

      await user.click(screen.getByText('Salmon')) // 208 kcal/100g · P 20g · F 13g · C 0g
      await user.click(screen.getByText('Tuna')) // 132 kcal/100g · P 28g · F 1g · C 0g

      expect(
        screen.getByText(
          'Today would be: 640 kcal · P 68g · F 19g · C 10g (was 300 kcal · P 20g · F 5g · C 10g)',
        ),
      ).toBeInTheDocument()
    })
  })

  describe('food overrides (#90)', () => {
    it('excludes a curated food hidden via Settings', async () => {
      await useFoodOverrideStore.getState().setHidden('salmon', true)
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[]}
        />,
      )

      expect(await screen.findByText('Chicken breast')).toBeInTheDocument()
      expect(screen.queryByText('Salmon')).not.toBeInTheDocument()
    })

    it('uses corrected macros for a food overridden via Settings', async () => {
      await useFoodOverrideStore
        .getState()
        .setNutrition('salmon', {
          kcal100: 300,
          protein100: 25,
          fat100: 20,
          carbs100: 1,
        })
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[]}
        />,
      )

      expect(
        await screen.findByText('300 kcal per 100g · P 25g · F 20g · C 1g'),
      ).toBeInTheDocument()
    })
  })

  describe('favorites (#276)', () => {
    it('sorts a favorited curated food to the top of the unfiltered list', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog open onOpenChange={vi.fn()} onAdd={vi.fn()} mealItems={[]} />,
      )

      // Tuna isn't first alphabetically/by source order — confirm that
      // before favoriting it, so the reorder assertion below is meaningful.
      const allNames = screen.getAllByRole('checkbox').map((el) => el.textContent)
      expect(allNames[0]).not.toContain('Tuna')

      await user.click(
        screen.getByRole('button', { name: 'Add Tuna to favorites' }),
      )

      const reordered = screen.getAllByRole('checkbox')
      expect(reordered[0].textContent).toContain('Tuna')
    })

    it('keeps a favorited item first among filtered search results too', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog open onOpenChange={vi.fn()} onAdd={vi.fn()} mealItems={[]} />,
      )

      await user.type(screen.getByLabelText('Search foods'), 'chicken')
      // Neither is favorited yet — matches keep rankBySearchMatch's own
      // order (both "Chicken ___", tie broken by original list order).
      const before = screen.getAllByRole('checkbox')
      expect(before[0].textContent).toContain('Chicken breast')

      await user.click(
        screen.getByRole('button', { name: 'Add Chicken thigh to favorites' }),
      )

      const after = screen.getAllByRole('checkbox')
      expect(after[0].textContent).toContain('Chicken thigh')
    })

    it('un-favoriting moves the item back out of the top spot', async () => {
      const user = userEvent.setup()
      await useFoodOverrideStore.getState().setFavorite('tuna', true)
      render(
        <FoodPickerDialog open onOpenChange={vi.fn()} onAdd={vi.fn()} mealItems={[]} />,
      )

      expect(
        screen.getAllByRole('checkbox')[0].textContent,
      ).toContain('Tuna')

      await user.click(
        screen.getByRole('button', { name: 'Remove Tuna from favorites' }),
      )

      expect(
        screen.getAllByRole('checkbox')[0].textContent,
      ).not.toContain('Tuna')
    })

    it('lets a personal meal item be favorited too, sorting it above curated foods', async () => {
      const user = userEvent.setup()
      render(
        <FoodPickerDialog
          open
          onOpenChange={vi.fn()}
          onAdd={vi.fn()}
          mealItems={[mealItem({ name: 'Grandma’s stew' })]}
        />,
      )

      // Personal items already list before curated foods (allMealItems is
      // concatenated first) — favoriting a curated food should still not
      // outrank it, and favoriting the personal item keeps it on top.
      await user.click(
        screen.getByRole('button', {
          name: 'Add Grandma’s stew to favorites',
        }),
      )

      expect(
        screen.getAllByRole('checkbox')[0].textContent,
      ).toContain('Grandma’s stew')
    })
  })
})
