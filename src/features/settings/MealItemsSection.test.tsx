import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore } from '@/stores'
import { MealItemsSection } from './MealItemsSection'

// #289 — same real-class mock as MealList.test.tsx's own barcode-scanning
// tests (vi.fn().mockImplementation(() => ({...})) doesn't reliably
// support `new`, which BarcodeScannerDialog calls under the hood).
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

  it('contains scroll within the list instead of letting it chain to the page (#192)', async () => {
    await useMealItemStore.getState().touch('Pizza')
    render(<MealItemsSection />)

    const list = (await screen.findByDisplayValue('Pizza')).closest('ul')
    expect(list).toHaveClass('overflow-y-auto', 'overscroll-y-contain')
  })

  describe('favorites (#279)', () => {
    it('toggles favorite on an existing item', async () => {
      await useMealItemStore.getState().touch('Pizza')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByDisplayValue('Pizza')
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

      await screen.findByDisplayValue('Pizza')
      await user.type(
        screen.getByLabelText('Search meal items'),
        'piz',
      )

      expect(screen.getByDisplayValue('Pizza')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('Salad')).not.toBeInTheDocument()
    })

    it('shows a no-results message when nothing matches', async () => {
      await useMealItemStore.getState().touch('Pizza')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByDisplayValue('Pizza')
      await user.type(
        screen.getByLabelText('Search meal items'),
        'nonexistent',
      )

      expect(screen.queryByDisplayValue('Pizza')).not.toBeInTheDocument()
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
      await user.type(screen.getByLabelText('Protein'), '12')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(
        await screen.findByDisplayValue('Homemade granola'),
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

      expect(await screen.findByDisplayValue('Tea')).toBeInTheDocument()
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
      await user.type(screen.getByLabelText('kcal/100g'), '450')
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
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(useMealItemStore.getState().items[0]).toMatchObject({
          name: 'Chocolate Bar',
          barcode: '9999999999999',
        }),
      )
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

    it('prefills the per-100g rate and portion count back-calculated from stored totals (#140)', async () => {
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
      // 300 kcal/100g and 10g protein/100g; 50g is 0.5 portions of 100g.
      expect(screen.getByLabelText('kcal/100g — Pizza')).toHaveValue('300')
      expect(screen.getByLabelText('Protein — Pizza')).toHaveValue('10')
      expect(screen.getByLabelText('× 100g — Pizza')).toHaveValue('0.5')
    })

    it('starts blank when editing an item with nothing recorded yet', async () => {
      await useMealItemStore.getState().touch('Untouched')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByDisplayValue('Untouched')
      await user.click(screen.getByRole('button', { name: 'Edit Untouched' }))

      expect(screen.getByLabelText('kcal/100g — Untouched')).toHaveValue('')
      expect(screen.getByLabelText('× 100g — Untouched')).toHaveValue('1')
    })

    it('shows a live preview and saves the scaled totals', async () => {
      await useMealItemStore.getState().touch('Pizza')
      const user = userEvent.setup()
      render(<MealItemsSection />)

      await screen.findByDisplayValue('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))

      await user.type(screen.getByLabelText('kcal/100g — Pizza'), '200')
      await user.type(screen.getByLabelText('Protein — Pizza'), '20')
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

      await screen.findByDisplayValue('Pizza')
      await user.click(screen.getByRole('button', { name: 'Edit Pizza' }))
      await user.click(screen.getByRole('radio', { name: 'Portion' }))
      await user.type(screen.getByLabelText('kcal/100g — Pizza'), '450')
      await user.click(screen.getByRole('button', { name: 'Save Pizza' }))

      await waitFor(() =>
        expect(useMealItemStore.getState().items[0]).toMatchObject({
          lastAmountKcal: 450,
        }),
      )
    })
  })
})
