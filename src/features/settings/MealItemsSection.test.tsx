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
      expect((await db.mealItems.toArray())[0].name).toBe(
        'Margherita pizza',
      ),
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
})
