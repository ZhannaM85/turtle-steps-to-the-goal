import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore } from '@/stores'
import { MealItemsSection } from './MealItemsSection'

beforeEach(async () => {
  await db.mealItems.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.mealItems.clear()
})

describe('MealItemsSection', () => {
  it('shows an empty state with no items logged yet', async () => {
    render(<MealItemsSection />)

    expect(
      await screen.findByText(
        "Nothing yet — items appear here once you've logged a meal.",
      ),
    ).toBeInTheDocument()
  })

  it('lists items previously logged elsewhere in the app', async () => {
    await useMealItemStore.getState().touch('Pizza')
    await useMealItemStore.getState().touch('Salad')

    render(<MealItemsSection />)

    expect(await screen.findByDisplayValue('Pizza')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Salad')).toBeInTheDocument()
  })

  it('renames an item on blur', async () => {
    await useMealItemStore.getState().touch('Pizza')
    const user = userEvent.setup()
    render(<MealItemsSection />)

    const input = await screen.findByDisplayValue('Pizza')
    await user.clear(input)
    await user.type(input, 'Margherita pizza')
    await user.tab()

    expect(
      await screen.findByDisplayValue('Margherita pizza'),
    ).toBeInTheDocument()
    // The input's own local state updates optimistically on typing, ahead
    // of the store's async upsert — wait for the store itself to settle
    // rather than trusting DOM timing as a proxy for persistence.
    await waitFor(() =>
      expect(useMealItemStore.getState().items[0].name).toBe(
        'Margherita pizza',
      ),
    )
    await waitFor(async () =>
      expect((await db.mealItems.toArray())[0].name).toBe('Margherita pizza'),
    )
  })

  it('deletes an item', async () => {
    await useMealItemStore.getState().touch('Pizza')
    const user = userEvent.setup()
    render(<MealItemsSection />)

    await screen.findByDisplayValue('Pizza')
    await user.click(screen.getByRole('button', { name: 'Delete "Pizza"' }))

    await waitFor(() =>
      expect(screen.queryByDisplayValue('Pizza')).not.toBeInTheDocument(),
    )
    expect(useMealItemStore.getState().items).toEqual([])
  })

  describe('editing nutrition (#99)', () => {
    it('shows a last-logged summary for an item with recorded nutrition', async () => {
      await useMealItemStore.getState().touch('Pizza', {
        amountKcal: 320,
        proteinG: 18,
        fatG: 10,
        carbsG: 25,
      })
      render(<MealItemsSection />)

      await screen.findByDisplayValue('Pizza')
      expect(
        screen.getByText('320 kcal last logged · P 18g · F 10g · C 25g'),
      ).toBeInTheDocument()
    })

    it('shows no summary for a bare item with nothing recorded yet', async () => {
      await useMealItemStore.getState().touch('Untouched')
      render(<MealItemsSection />)

      await screen.findByDisplayValue('Untouched')
      expect(screen.queryByText(/last logged/)).not.toBeInTheDocument()
    })

    it('prefills the per-100g rate and quantity back-calculated from stored totals', async () => {
      await useMealItemStore.getState().touch('Pizza', {
        amountKcal: 150,
        proteinG: 5,
        amountG: 50,
      })
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByDisplayValue('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))

      // 150 kcal / 5g protein eaten as a 50g portion back-calculates to
      // 300 kcal/100g and 10g protein/100g.
      expect(screen.getByLabelText('kcal/100g — Pizza')).toHaveValue('300')
      expect(screen.getByLabelText('Protein — Pizza')).toHaveValue('10')
      expect(screen.getByLabelText('Grams — Pizza')).toHaveValue('50')
    })

    it('starts blank when editing an item with nothing recorded yet', async () => {
      await useMealItemStore.getState().touch('Untouched')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByDisplayValue('Untouched')
      await user.click(screen.getByRole('button', { name: 'Edit Untouched' }))

      expect(screen.getByLabelText('kcal/100g — Untouched')).toHaveValue('')
      expect(screen.getByLabelText('Grams — Untouched')).toHaveValue('100')
    })

    it('shows a live preview and saves the scaled totals', async () => {
      await useMealItemStore.getState().touch('Pizza')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByDisplayValue('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))

      await user.type(screen.getByLabelText('kcal/100g — Pizza'), '200')
      await user.type(screen.getByLabelText('Protein — Pizza'), '20')
      await user.clear(screen.getByLabelText('Grams — Pizza'))
      await user.type(screen.getByLabelText('Grams — Pizza'), '50')

      expect(
        screen.getByText('Total: 100 kcal · P 10g · F — · C —'),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Save Pizza' }))

      await waitFor(() =>
        expect(useMealItemStore.getState().items[0]).toMatchObject({
          lastAmountKcal: 100,
          lastProteinG: 10,
          lastAmountG: 50,
        }),
      )
    })
  })
})
