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
// parallel load even though each test is fast in isolation.
vi.setConfig({ testTimeout: 15000 })

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
  useFoodOverrideStore.setState({ overrides: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.foodOverrides.clear()
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

    it('hides the per-dish quantity/reaction fields once a second dish is checked', async () => {
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

    it('adds a picked meal item using its last-logged numbers, no quantity field', async () => {
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

      expect(screen.queryByLabelText('Quantity (g)')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Add selected' }))

      expect(onAdd).toHaveBeenCalledWith([
        {
          amountKcal: 320,
          proteinG: 18,
          fatG: 10,
          carbsG: 25,
          note: 'Grandma’s stew',
          amountG: undefined,
          emotion: undefined,
        },
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
})
