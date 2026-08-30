import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore, useMealLibrarySortStore } from '@/stores'
import { MealItemsSection } from './MealItemsSection'

// #289 — same real-class mock as MealList.test.tsx's own barcode-scanning
// tests (vi.fn().mockImplementation(() => ({...})) doesn't reliably
// support `new`, which BarcodeScannerDialog calls under the hood).
const decodeFromConstraints = vi.fn()
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    decodeFromConstraints = decodeFromConstraints
  },
}))

function mockScanning(barcode: string) {
  decodeFromConstraints.mockImplementation(
    async (_deviceId: unknown, _videoElement: unknown, callback: (result: unknown) => void) => {
      callback({ getText: () => barcode })
      return { stop: vi.fn() }
    },
  )
}

beforeEach(async () => {
  await db.mealItems.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  useMealLibrarySortStore.setState({ sort: 'title-asc' })
  localStorage.removeItem('turtle-steps-meal-library-sort')
})

afterEach(async () => {
  await db.mealItems.clear()
  localStorage.removeItem('turtle-steps-meal-library-sort')
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

    expect(await screen.findByText('Pizza')).toBeInTheDocument()
    expect(screen.getByText('Salad')).toBeInTheDocument()
    expect(screen.queryByLabelText('Meal item name')).not.toBeInTheDocument()
  })

  it('shows a food count and updates it while searching (#570)', async () => {
    await useMealItemStore.getState().touch('Pizza')
    await useMealItemStore.getState().touch('Salad')
    const user = userEvent.setup()
    render(<MealItemsSection />)

    expect(await screen.findByText('2 foods')).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Search meal items'),
      'piz',
    )
    expect(await screen.findByText('1 of 2 matching')).toBeInTheDocument()
  })

  it('sorts by title and by date added (#684)', async () => {
    await db.mealItems.bulkPut([
      {
        id: 'salad',
        name: 'Salad',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'pizza',
        name: 'Pizza',
        createdAt: '2026-08-10T00:00:00.000Z',
        updatedAt: '2026-08-10T00:00:00.000Z',
      },
      {
        id: 'apple',
        name: 'Apple',
        createdAt: '2026-08-05T00:00:00.000Z',
        updatedAt: '2026-08-05T00:00:00.000Z',
      },
    ])
    await useMealItemStore.getState().loadItems()
    const user = userEvent.setup()
    render(<MealItemsSection />)

    expect(await screen.findByText('Apple')).toBeInTheDocument()
    const list = screen.getByRole('list')
    const orderOf = (...labels: string[]) => {
      const text = list.textContent ?? ''
      return labels.map((label) => text.indexOf(label))
    }

    let positions = orderOf('Apple', 'Pizza', 'Salad')
    expect(positions[0]).toBeLessThan(positions[1])
    expect(positions[1]).toBeLessThan(positions[2])

    await user.selectOptions(screen.getByLabelText('Sort by'), 'title-desc')
    positions = orderOf('Salad', 'Pizza', 'Apple')
    expect(positions[0]).toBeLessThan(positions[1])
    expect(positions[1]).toBeLessThan(positions[2])

    await user.selectOptions(
      screen.getByLabelText('Sort by'),
      'added-newest',
    )
    positions = orderOf('Pizza', 'Apple', 'Salad')
    expect(positions[0]).toBeLessThan(positions[1])
    expect(positions[1]).toBeLessThan(positions[2])

    await user.selectOptions(
      screen.getByLabelText('Sort by'),
      'added-oldest',
    )
    positions = orderOf('Salad', 'Apple', 'Pizza')
    expect(positions[0]).toBeLessThan(positions[1])
    expect(positions[1]).toBeLessThan(positions[2])
  })

  it('renames an item when saving edit with the check (#584/#589/#780)', async () => {
    await useMealItemStore.getState().touch('Pizza')
    const user = userEvent.setup()
    render(<MealItemsSection />)

    await screen.findByText('Pizza')
    await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))
    const input = screen.getByLabelText('Meal item name')
    await user.clear(input)
    await user.type(input, 'Margherita pizza')
    await user.click(screen.getByRole('button', { name: 'Save Pizza' }))

    expect(await screen.findByText('Margherita pizza')).toBeInTheDocument()
    await waitFor(() =>
      expect(useMealItemStore.getState().items[0].name).toBe(
        'Margherita pizza',
      ),
    )
    await waitFor(async () =>
      expect((await db.mealItems.toArray())[0].name).toBe('Margherita pizza'),
    )
  })

  it('shows the dish title as plain text until the pencil is tapped (#584)', async () => {
    await useMealItemStore.getState().touch('Pizza')
    const user = userEvent.setup()
    render(<MealItemsSection />)

    expect(await screen.findByText('Pizza')).toBeInTheDocument()
    expect(screen.queryByLabelText('Meal item name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))
    expect(screen.getByLabelText('Meal item name')).toHaveValue('Pizza')
    expect(
      screen.getByRole('button', { name: 'Save Pizza' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit Pizza' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save Pizza' }))
    await waitFor(() => {
      expect(screen.queryByLabelText('Meal item name')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Pizza')).toBeInTheDocument()
  })

  it('discards in-progress edits when Cancel is pressed (#589)', async () => {
    await useMealItemStore.getState().touch('Pizza', {
      amountKcal: 250,
      proteinG: 10,
      amountG: 100,
    })
    const user = userEvent.setup()
    render(<MealItemsSection />)

    await screen.findByText('Pizza')
    await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))
    const nameInput = screen.getByLabelText('Meal item name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Changed')
    await user.clear(screen.getByLabelText('kcal/100g — Pizza'))
    await user.type(screen.getByLabelText('kcal/100g — Pizza'), '999')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByLabelText('Meal item name')).not.toBeInTheDocument()
    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(useMealItemStore.getState().items[0]).toMatchObject({
      name: 'Pizza',
      lastAmountKcal: 250,
    })
  })

  it('puts the dish name input inside the same bordered edit panel as nutrition (#583)', async () => {
    await useMealItemStore.getState().touch('Pizza')
    const user = userEvent.setup()
    render(<MealItemsSection />)

    await screen.findByText('Pizza')
    await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))

    const nameInput = screen.getByLabelText('Meal item name')
    // Prefer bg-muted/40 — Inputs also have a `border` class, so `.border`
    // would match the name field itself and miss the Save control.
    const panel = nameInput.closest('[class*="bg-muted/40"]')
    expect(panel).not.toBeNull()
    expect(
      within(panel as HTMLElement).getByRole('button', {
        name: 'Save Pizza',
      }),
    ).toBeInTheDocument()
    expect(nameInput).toHaveClass('h-12', 'w-full')
  })

  it('deletes an item', async () => {
    await useMealItemStore.getState().touch('Pizza')
    const user = userEvent.setup()
    render(<MealItemsSection />)

    await screen.findByText('Pizza')
    await user.click(screen.getByRole('button', { name: 'Delete "Pizza"' }))

    await waitFor(() =>
      expect(screen.queryByText('Pizza')).not.toBeInTheDocument(),
    )
    expect(useMealItemStore.getState().items).toEqual([])
  })

  it('adds and removes a named serving for a personal meal item (#603)', async () => {
    await useMealItemStore.getState().touch('Rice')
    const user = userEvent.setup()
    render(<MealItemsSection />)

    await screen.findByText('Rice')
    await user.click(screen.getByRole('button', { name: 'Edit Rice' }))
    await user.type(
      screen.getByLabelText('Serving name — Rice'),
      '1 cup',
    )
    await user.type(screen.getByLabelText('Grams — Rice'), '158')
    await user.click(screen.getByRole('button', { name: 'Add serving' }))

    expect(await screen.findByText('1 cup — 158g')).toBeInTheDocument()
    await waitFor(() =>
      expect(useMealItemStore.getState().items[0].servings).toEqual([
        { en: '1 cup', ru: '1 cup', grams: 158 },
      ]),
    )

    await user.click(
      screen.getByRole('button', { name: 'Remove serving 1 cup' }),
    )

    expect(screen.queryByText('1 cup — 158g')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(useMealItemStore.getState().items[0].servings).toEqual([]),
    )
  })

  it('contains scroll within the list instead of letting it chain to the page (#192)', async () => {
    await useMealItemStore.getState().touch('Pizza')
    render(<MealItemsSection />)

    const list = (await screen.findByText('Pizza')).closest('ul')
    expect(list).toHaveClass('overflow-y-auto', 'overscroll-y-contain')
  })

  describe('favorites (#279)', () => {
    it('toggles favorite on an existing item', async () => {
      await useMealItemStore.getState().touch('Pizza')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      await user.click(
        screen.getByRole('button', { name: 'Add Pizza to favorites' }),
      )

      await waitFor(() =>
        expect(useMealItemStore.getState().items[0].favorite).toBe(true),
      )
      expect(
        screen.getByRole('button', { name: 'Remove Pizza from favorites' }),
      ).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Remove Pizza from favorites' }),
      )

      await waitFor(() =>
        expect(useMealItemStore.getState().items[0].favorite).toBe(false),
      )
    })

    it('can favorite a brand-new dish right at creation time', async () => {
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await user.click(
        screen.getByRole('button', { name: 'Add custom food' }),
      )
      await user.type(screen.getByLabelText('Meal item name'), 'Granola')
      await user.type(screen.getByLabelText('kcal/100g'), '450')
      await user.click(
        screen.getByRole('button', { name: 'Add Granola to favorites' }),
      )
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(useMealItemStore.getState().items[0]).toMatchObject({
          name: 'Granola',
          favorite: true,
        }),
      )
    })
  })

  describe('search (#179)', () => {
    it('filters the list by name as the user types', async () => {
      await useMealItemStore.getState().touch('Pizza')
      await useMealItemStore.getState().touch('Salad')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      await user.type(
        screen.getByLabelText('Search meal items'),
        'piz',
      )

      expect(screen.getByText('Pizza')).toBeInTheDocument()
      expect(screen.queryByText('Salad')).not.toBeInTheDocument()
    })

    it('shows a no-results message when nothing matches', async () => {
      await useMealItemStore.getState().touch('Pizza')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      await user.type(
        screen.getByLabelText('Search meal items'),
        'nonexistent',
      )

      expect(screen.queryByText('Pizza')).not.toBeInTheDocument()
      expect(
        screen.getByText('No meal items match your search.'),
      ).toBeInTheDocument()
    })

    it('does not show the search field in the empty state', async () => {
      render(<MealItemsSection />)

      await screen.findByText(
        "Nothing yet — items appear here once you've logged a meal.",
      )
      expect(
        screen.queryByLabelText('Search meal items'),
      ).not.toBeInTheDocument()
    })
  })

  describe('add-food dialog (#290)', () => {
    it('opens the add-food form as a dialog, reachable regardless of an existing long list', async () => {
      await useMealItemStore.getState().touch('Pizza')
      await useMealItemStore.getState().touch('Salad')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Add custom food' }),
      )

      const dialog = screen.getByRole('dialog')
      expect(
        within(dialog).getByRole('heading', { name: 'Add custom food' }),
      ).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Meal item name')).toHaveValue('')
    })

    it('closes the dialog without creating anything when its own close button is clicked', async () => {
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await user.click(
        screen.getByRole('button', { name: 'Add custom food' }),
      )
      await user.type(screen.getByLabelText('Meal item name'), 'Discarded')
      await user.click(
        screen.getByRole('button', { name: 'Close add food dialog' }),
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(useMealItemStore.getState().items).toEqual([])
    })
  })

  describe('adding a new dictionary entry (#149)', () => {
    it('creates a new item without any meal ever being logged', async () => {
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await user.click(
        screen.getByRole('button', { name: 'Add custom food' }),
      )
      await user.type(
        screen.getByLabelText('Meal item name'),
        'Homemade granola',
      )
      await user.type(screen.getByLabelText('kcal/100g'), '450')
      await user.type(screen.getByLabelText('Protein/100g'), '12')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(
        await screen.findByText('Homemade granola'),
      ).toBeInTheDocument()
      await waitFor(() =>
        expect(useMealItemStore.getState().items[0]).toMatchObject({
          name: 'Homemade granola',
          lastAmountKcal: 450,
          lastProteinG: 12,
        }),
      )
      await waitFor(async () =>
        expect((await db.mealItems.toArray())[0]).toMatchObject({
          name: 'Homemade granola',
        }),
      )
    })

    it('works from the empty state too', async () => {
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText(
        "Nothing yet — items appear here once you've logged a meal.",
      )
      await user.click(
        screen.getByRole('button', { name: 'Add custom food' }),
      )
      await user.type(screen.getByLabelText('Meal item name'), 'Tea')
      await user.type(screen.getByLabelText('kcal/100g'), '0')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(await screen.findByText('Tea')).toBeInTheDocument()
    })

    it('disables Save until a name and a valid kcal/100g are entered', async () => {
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await user.click(
        screen.getByRole('button', { name: 'Add custom food' }),
      )
      const saveButton = screen.getByRole('button', { name: 'Save' })
      expect(saveButton).toBeDisabled()

      await user.type(screen.getByLabelText('kcal/100g'), '200')
      expect(saveButton).toBeDisabled()

      await user.type(screen.getByLabelText('Meal item name'), 'Oats')
      expect(saveButton).toBeEnabled()
    })

    it('discards the draft on cancel without creating anything', async () => {
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await user.click(
        screen.getByRole('button', { name: 'Add custom food' }),
      )
      await user.type(screen.getByLabelText('Meal item name'), 'Discarded')
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByDisplayValue('Discarded')).not.toBeInTheDocument()
      expect(useMealItemStore.getState().items).toEqual([])
    })

    it('saves the typed total directly in Portion mode, no multiplication (#170)', async () => {
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await user.click(
        screen.getByRole('button', { name: 'Add custom food' }),
      )
      await user.click(screen.getByRole('radio', { name: 'Portion' }))
      await user.type(screen.getByLabelText('Meal item name'), 'Sandwich')
      await user.type(screen.getByLabelText('kcal'), '450')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(useMealItemStore.getState().items[0]).toMatchObject({
          name: 'Sandwich',
          lastAmountKcal: 450,
        }),
      )
    })
  })

  describe('barcode scanning (#289)', () => {
    it('opens the scanner dialog when "Scan barcode" is clicked', async () => {
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await user.click(screen.getByRole('button', { name: 'Add custom food' }))
      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      expect(
        screen.getByText(
          'Point your camera at the barcode. Tap inside the frame to focus.',
        ),
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
      render(<MealItemsSection />)

      await user.click(screen.getByRole('button', { name: 'Add custom food' }))
      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      // "Protein Bar" also appears in the saved-items list above the add
      // form (that's the item the scan matched) — scope to the add form's
      // own name field via its placeholder, the one thing that
      // distinguishes it from MealItemRow's.
      await waitFor(() =>
        expect(screen.getByPlaceholderText('Meal item name')).toHaveValue(
          'Protein Bar',
        ),
      )
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
              nutriments: { 'energy-kcal_100g': 520 },
            },
          }),
        }),
      )
      mockScanning('9999999999999')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await user.click(screen.getByRole('button', { name: 'Add custom food' }))
      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      expect(
        await screen.findByDisplayValue('Chocolate Bar'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('kcal/100g')).toHaveValue('520')
    })

    it('shows a quiet message when nothing matches anywhere', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      mockScanning('0000000000000')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await user.click(screen.getByRole('button', { name: 'Add custom food' }))
      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      expect(
        await screen.findByText(
          'No food found for this barcode — you can still add it by hand below.',
        ),
      ).toBeInTheDocument()
      // #519 — scanned code visible on the Add food dialog.
      expect(screen.getByText('Barcode: 0 000000 000000')).toBeInTheDocument()
    })

    it('records the scanned barcode on the new MealItem once saved', async () => {
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
      render(<MealItemsSection />)

      await user.click(screen.getByRole('button', { name: 'Add custom food' }))
      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
      await screen.findByDisplayValue('Chocolate Bar')
      // #519 — barcode shown on Add food while the scanned code is held.
      expect(screen.getByText('Barcode: 9 999999 999999')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(useMealItemStore.getState().items[0]).toMatchObject({
          name: 'Chocolate Bar',
          barcode: '9999999999999',
        }),
      )
      // #519/#520 — stored barcode remains visible (spaced) on the list row.
      expect(screen.getByText('Barcode: 9 999999 999999')).toBeInTheDocument()
    })
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

      await screen.findByText('Pizza')
      expect(
        screen.getByText('320 kcal last logged · P 18g · F 10g · C 25g'),
      ).toBeInTheDocument()
    })

    it('shows no summary for a bare item with nothing recorded yet', async () => {
      await useMealItemStore.getState().touch('Untouched')
      render(<MealItemsSection />)

      await screen.findByText('Untouched')
      expect(screen.queryByText(/last logged/)).not.toBeInTheDocument()
    })

    it('prefills the per-100g rate and portion count back-calculated from stored totals (#140)', async () => {
      await useMealItemStore.getState().touch('Pizza', {
        amountKcal: 150,
        proteinG: 5,
        amountG: 50,
      })
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))

      // 150 kcal / 5g protein eaten as a 50g portion back-calculates to
      // 300 kcal/100g and 10g protein/100g; 50g is 0.5 portions of 100g.
      expect(screen.getByLabelText('kcal/100g — Pizza')).toHaveValue('300')
      expect(screen.getByLabelText('Protein/100g — Pizza')).toHaveValue('10')
      expect(screen.getByLabelText('× 100g — Pizza')).toHaveValue('0.5')
    })

    it('starts blank when editing an item with nothing recorded yet', async () => {
      await useMealItemStore.getState().touch('Untouched')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Untouched')
      await user.click(screen.getByRole('button', { name: 'Edit Untouched' }))

      expect(screen.getByLabelText('kcal/100g — Untouched')).toHaveValue('')
      expect(screen.getByLabelText('× 100g — Untouched')).toHaveValue('1')
    })

    it('shows a live preview and saves the scaled totals', async () => {
      await useMealItemStore.getState().touch('Pizza')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))

      await user.type(screen.getByLabelText('kcal/100g — Pizza'), '200')
      await user.type(screen.getByLabelText('Protein/100g — Pizza'), '20')
      await user.clear(screen.getByLabelText('× 100g — Pizza'))
      await user.type(screen.getByLabelText('× 100g — Pizza'), '0.5')

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

    it('switches to Portion mode and saves the typed total directly, no multiplication (#170)', async () => {
      await useMealItemStore.getState().touch('Pizza')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))
      await user.click(screen.getByRole('radio', { name: 'Portion' }))
      await user.type(screen.getByLabelText('kcal — Pizza'), '450')
      await user.click(screen.getByRole('button', { name: 'Save Pizza' }))

      await waitFor(() =>
        expect(useMealItemStore.getState().items[0]).toMatchObject({
          lastAmountKcal: 450,
        }),
      )
    })

    it('saves a typed barcode onto an existing food without one (#779)', async () => {
      await useMealItemStore.getState().touch('Pizza', { amountKcal: 200 })
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      expect(screen.queryByLabelText('Barcode — Pizza')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))
      await user.type(
        screen.getByLabelText('Barcode — Pizza'),
        '4601234567890',
      )
      await user.click(screen.getByRole('button', { name: 'Save Pizza' }))

      await waitFor(() =>
        expect(useMealItemStore.getState().items[0].barcode).toBe(
          '4601234567890',
        ),
      )
    })

    it('keeps a newly typed barcode on an already-logged food after save (#784)', async () => {
      await useMealItemStore
        .getState()
        .touch('Peas', { amountKcal: 44 }, undefined, '3083681187090')
      await useMealItemStore.getState().touch('Pizza', {
        amountKcal: 134,
        proteinG: 8,
        fatG: 4,
        carbsG: 16,
      })
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))
      await user.type(
        screen.getByLabelText('Barcode — Pizza'),
        '4601234567890',
      )
      await user.click(screen.getByRole('button', { name: 'Save Pizza' }))

      await waitFor(() =>
        expect(
          useMealItemStore.getState().items.find((i) => i.name === 'Pizza')
            ?.barcode,
        ).toBe('4601234567890'),
      )
      expect(
        await screen.findByText('Barcode: 4 601234 567890'),
      ).toBeInTheDocument()
    })

    it('keeps barcode and brand together after nutrition save (#784)', async () => {
      await useMealItemStore.getState().touch('Pizza', {
        amountKcal: 134,
        proteinG: 8,
        fatG: 4,
        carbsG: 16,
      })
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))
      await user.type(
        screen.getByLabelText('Brand (optional) — Pizza'),
        'Savushkin',
      )
      await user.type(
        screen.getByLabelText('Barcode — Pizza'),
        '4810168012345',
      )
      await user.click(screen.getByRole('button', { name: 'Save Pizza' }))

      await waitFor(() => {
        const pizza = useMealItemStore
          .getState()
          .items.find((i) => i.name === 'Pizza')
        expect(pizza?.brand).toBe('Savushkin')
        expect(pizza?.barcode).toBe('4810168012345')
      })
    })

    it('names the other food when the typed barcode is already taken (#784)', async () => {
      await useMealItemStore
        .getState()
        .touch('Peas', { amountKcal: 44 }, undefined, '3083681187090')
      await useMealItemStore.getState().touch('Pizza', {
        amountKcal: 134,
        proteinG: 8,
        fatG: 4,
        carbsG: 16,
      })
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))
      await user.type(
        screen.getByLabelText('Brand (optional) — Pizza'),
        'Savushkin',
      )
      await user.type(
        screen.getByLabelText('Barcode — Pizza'),
        '3083681187090',
      )
      await user.click(screen.getByRole('button', { name: 'Save Pizza' }))

      expect(
        await screen.findByRole('alert'),
      ).toHaveTextContent('This barcode is already on “Peas”.')
      expect(screen.getByRole('button', { name: 'Save Pizza' })).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Move barcode here' }),
      ).toBeInTheDocument()
      expect(
        useMealItemStore.getState().items.find((i) => i.name === 'Pizza')
          ?.barcode,
      ).toBeUndefined()
      expect(
        useMealItemStore.getState().items.find((i) => i.name === 'Pizza')
          ?.brand,
      ).toBe('Savushkin')
      expect(
        useMealItemStore.getState().items.find((i) => i.name === 'Peas')
          ?.barcode,
      ).toBe('3083681187090')
    })

    it('moves a taken barcode here and links to the other food (#785)', async () => {
      await useMealItemStore
        .getState()
        .touch('Peas', { amountKcal: 44 }, undefined, '3083681187090')
      await useMealItemStore.getState().touch('Pizza', {
        amountKcal: 134,
        proteinG: 8,
        fatG: 4,
        carbsG: 16,
      })
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))
      await user.type(
        screen.getByLabelText('Barcode — Pizza'),
        '3083681187090',
      )
      await user.click(screen.getByRole('button', { name: 'Save Pizza' }))

      expect(
        await screen.findByRole('alert'),
      ).toHaveTextContent('This barcode is already on “Peas”.')
      await user.click(
        screen.getByRole('button', { name: 'Move barcode here' }),
      )

      await waitFor(() => {
        expect(
          useMealItemStore.getState().items.find((i) => i.name === 'Pizza')
            ?.barcode,
        ).toBe('3083681187090')
      })
      expect(
        useMealItemStore.getState().items.find((i) => i.name === 'Peas')
          ?.barcode,
      ).toBeUndefined()

      expect(
        await screen.findByText(
          'Barcode moved off “Peas”. You can delete that food if you no longer need it.',
        ),
      ).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Open “Peas”' }))

      expect(screen.getByLabelText('Search meal items')).toHaveValue('Peas')
      expect(
        await screen.findByRole('button', { name: 'Delete "Peas"' }),
      ).toBeInTheDocument()
    })

    it('saves a typed brand onto an existing food (#781)', async () => {
      await useMealItemStore.getState().touch('Pizza', { amountKcal: 200 })
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      expect(
        screen.queryByLabelText('Brand (optional) — Pizza'),
      ).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))
      await user.type(
        screen.getByLabelText('Brand (optional) — Pizza'),
        'Perdue',
      )
      await user.click(screen.getByRole('button', { name: 'Save Pizza' }))

      await waitFor(() =>
        expect(useMealItemStore.getState().items[0].brand).toBe('Perdue'),
      )
    })

    it('shows /100g on macro labels and a nutrition heading in per-100g mode (#583)', async () => {
      await useMealItemStore.getState().touch('Pizza', { amountKcal: 100 })
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByText('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))

      expect(screen.getByText('Nutrition (per 100g)')).toBeInTheDocument()
      expect(screen.getByLabelText('Protein/100g — Pizza')).toBeInTheDocument()
      expect(screen.getByLabelText('Fat/100g — Pizza')).toBeInTheDocument()
      expect(screen.getByLabelText('Carbs/100g — Pizza')).toBeInTheDocument()

      await user.click(screen.getByRole('radio', { name: 'Portion' }))

      expect(screen.getByText('Nutrition')).toBeInTheDocument()
      expect(screen.getByLabelText('Protein — Pizza')).toBeInTheDocument()
      expect(screen.queryByLabelText('Protein/100g — Pizza')).not.toBeInTheDocument()
    })
  })
})
