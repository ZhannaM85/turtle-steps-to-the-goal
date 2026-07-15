import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore } from './mealItemStore'

beforeEach(async () => {
  await db.mealItems.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.mealItems.clear()
})

describe('useMealItemStore', () => {
  it('starts empty', () => {
    expect(useMealItemStore.getState().items).toEqual([])
  })

  it('loads persisted items', async () => {
    await useMealItemStore.getState().touch('Pizza')
    useMealItemStore.setState({ items: [], status: 'idle' })

    await useMealItemStore.getState().loadItems()

    expect(useMealItemStore.getState().items.map((i) => i.name)).toEqual([
      'Pizza',
    ])
  })

  it('touch creates a new item on first use', async () => {
    await useMealItemStore.getState().touch('Pizza')

    expect(useMealItemStore.getState().items).toHaveLength(1)
    expect(useMealItemStore.getState().items[0].name).toBe('Pizza')
  })

  it('touch does not duplicate an existing item, just bumps updatedAt', async () => {
    await useMealItemStore.getState().touch('Pizza')
    const firstId = useMealItemStore.getState().items[0].id
    const firstUpdatedAt = useMealItemStore.getState().items[0].updatedAt

    await new Promise((resolve) => setTimeout(resolve, 5))
    await useMealItemStore.getState().touch('Pizza')

    const items = useMealItemStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(firstId)
    expect(items[0].updatedAt >= firstUpdatedAt).toBe(true)
  })

  it('touch trims whitespace and ignores an empty name', async () => {
    await useMealItemStore.getState().touch('  Pizza  ')
    await useMealItemStore.getState().touch('   ')

    const items = useMealItemStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('Pizza')
  })

  it('rename updates the name without touching unrelated items', async () => {
    await useMealItemStore.getState().touch('Pizza')
    await useMealItemStore.getState().touch('Salad')
    const pizza = useMealItemStore
      .getState()
      .items.find((i) => i.name === 'Pizza')!

    await useMealItemStore.getState().rename(pizza.id, 'Margherita pizza')

    const names = useMealItemStore
      .getState()
      .items.map((i) => i.name)
      .sort()
    expect(names).toEqual(['Margherita pizza', 'Salad'])
  })

  it('rename onto an existing name merges into it instead of erroring', async () => {
    await useMealItemStore.getState().touch('Pizza')
    await useMealItemStore.getState().touch('Salad')
    const salad = useMealItemStore
      .getState()
      .items.find((i) => i.name === 'Salad')!

    await useMealItemStore.getState().rename(salad.id, 'Pizza')

    const names = useMealItemStore.getState().items.map((i) => i.name)
    expect(names).toEqual(['Pizza'])
  })

  it('deleteItem removes an item', async () => {
    await useMealItemStore.getState().touch('Pizza')
    const id = useMealItemStore.getState().items[0].id

    await useMealItemStore.getState().deleteItem(id)

    expect(useMealItemStore.getState().items).toEqual([])
  })
})
