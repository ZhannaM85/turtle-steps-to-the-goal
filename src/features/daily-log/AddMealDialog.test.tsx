import 'fake-indexeddb/auto'
import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieItem, Emotion } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useFoodOverrideStore, useMealItemStore, useMealLabelPresetStore, useRecipeStore, useAddMealRecentVisibilityStore } from '@/stores'
import { AddMealDialog, type AddMealDialogProps } from './AddMealDialog'

// Matches FoodPickerDialog.test.tsx's own reasoning — every test here
// renders the dialog open against the full 300+-item food list. Raised
// from 25000 alongside the barcode-scan test's own 20s wait below, so
// that test still has headroom under this timeout.
vi.setConfig({ testTimeout: 30000 })

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
  await db.recipes.clear()
  await db.foodOverrides.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  useRecipeStore.setState({ recipes: [], status: 'idle', error: null })
  useFoodOverrideStore.setState({ overrides: [], status: 'idle', error: null })
  useAddMealRecentVisibilityStore.setState({ recentVisible: true })
  useMealLabelPresetStore.setState({ presets: [] })
  localStorage.removeItem('turtle-steps-add-meal-recent-visibility')
})

afterEach(async () => {
  await db.mealItems.clear()
  await db.recipes.clear()
  await db.foodOverrides.clear()
  decodeFromVideoDevice.mockReset()
  vi.unstubAllGlobals()
})

type ControlledProps = Omit<
  AddMealDialogProps,
  | 'items'
  | 'reaction'
  | 'onAppendItems'
  | 'onRemoveItem'
  | 'onReactionChange'
  | 'note'
  | 'onNoteChange'
  | 'mealLabel'
  | 'onMealLabelChange'
> & {
  initialItems?: CalorieItem[]
  mealLabel?: string
  onMealLabelChange?: (value: string) => void
}

// Mirrors MealList's own real wiring (an in-progress meal's items/reaction
// live in the *parent*, not the dialog) — a plain vi.fn() for onAppendItems
// would never let the "meal so far" list actually grow across interactions,
// same reasoning MealList.test.tsx's own ControlledMealList exists for.
function ControlledAddMealDialog({
  initialItems,
  mealLabel: mealLabelProp = 'Breakfast',
  onMealLabelChange,
  ...props
}: ControlledProps) {
  const [items, setItems] = useState<CalorieItem[]>(initialItems ?? [])
  const [reaction, setReaction] = useState<Emotion | undefined>(undefined)
  const [note, setNote] = useState('')
  const [mealLabel, setMealLabel] = useState(mealLabelProp)
  return (
    <AddMealDialog
      {...props}
      mealLabel={mealLabel}
      onMealLabelChange={(value) => {
        setMealLabel(value)
        onMealLabelChange?.(value)
      }}
      items={items}
      reaction={reaction}
      onReactionChange={setReaction}
      note={note}
      onNoteChange={setNote}
      onAppendItems={(newItems) => setItems((prev) => [...prev, ...newItems])}
      onRemoveItem={(id) =>
        setItems((prev) => prev.filter((item) => item.id !== id))
      }
      onUpdateItem={(updated) =>
        setItems((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        )
      }
    />
  )
}

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  mealLabel: 'Breakfast',
  onMealLabelChange: vi.fn(),
  timeEaten: '08:00',
  onTimeEatenChange: vi.fn(),
  note: '',
  onNoteChange: vi.fn(),
  todayTotals: { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
}

describe('AddMealDialog (#454)', () => {
  it('shows the meal label and time field', () => {
    render(<ControlledAddMealDialog {...defaultProps} />)

    expect(screen.getByRole('heading', { name: 'Breakfast' })).toBeInTheDocument()
    expect(screen.getByLabelText('Meal name')).toHaveValue('Breakfast')
    expect(screen.getByLabelText('Time')).toHaveValue('08:00')
  })

  it('renames the meal via free text or a Breakfast/Lunch/Dinner chip (#563)', async () => {
    const user = userEvent.setup()
    const onMealLabelChange = vi.fn()
    render(
      <ControlledAddMealDialog
        {...defaultProps}
        onMealLabelChange={onMealLabelChange}
      />,
    )

    expect(screen.getByRole('button', { name: 'Lunch' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dinner' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Snack' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Lunch' }))
    expect(onMealLabelChange).toHaveBeenCalledWith('Lunch')
    expect(screen.getByLabelText('Meal name')).toHaveValue('Lunch')
    expect(screen.getByRole('heading', { name: 'Lunch' })).toBeInTheDocument()

    const nameField = screen.getByLabelText('Meal name')
    await user.clear(nameField)
    await user.type(nameField, 'Brunch')
    expect(onMealLabelChange).toHaveBeenCalledWith('Brunch')
    expect(nameField).toHaveValue('Brunch')
  })

  it('does not offer other-locale default meal names as chips (#567)', () => {
    useMealLabelPresetStore.setState({
      presets: ['Завтрак', 'Обед', 'Brunch'],
    })
    render(<ControlledAddMealDialog {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Breakfast' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brunch' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Завтрак' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Обед' })).not.toBeInTheDocument()
  })

  it('does not auto-focus the time field on open (#487)', () => {
    render(<ControlledAddMealDialog {...defaultProps} />)

    // Pre-#487 Radix FocusScope focused the header `type="time"` input,
    // which presents the native time picker on iOS/Safari.
    expect(screen.getByLabelText('Time')).not.toHaveFocus()
  })

  describe('header CTAs regrouped (#508)', () => {
    const savedMealProps = {
      ...defaultProps,
      mealPosition: 1,
      initialItems: [{ id: 'i1', name: 'Oatmeal', amountKcal: 250 }],
    }

    it('leaves only the time widget beside the title — delete is not in the header', () => {
      render(
        <ControlledAddMealDialog {...savedMealProps} onDeleteMeal={vi.fn()} />,
      )

      const header = screen.getByRole('heading', { name: 'Breakfast' })
        .parentElement as HTMLElement
      expect(within(header).getByLabelText('Time')).toBeInTheDocument()
      expect(
        within(header).queryByRole('button', { name: 'Delete meal 1' }),
      ).not.toBeInTheDocument()
    })

    it('puts the clear-time control inside the time field itself', () => {
      render(
        <ControlledAddMealDialog {...savedMealProps} onDeleteMeal={vi.fn()} />,
      )

      // Pre-#508 this was a standalone ghost ✕ next to the dialog's own
      // Close ✕ — two bare ✕ icons of the same weight in one corner.
      const clear = screen.getByRole('button', { name: 'Clear time' })
      expect(clear.parentElement).toContainElement(screen.getByLabelText('Time'))
    })

    it('deletes the whole meal from a labelled button by the Done footer', async () => {
      const user = userEvent.setup()
      const onDeleteMeal = vi.fn()
      render(
        <ControlledAddMealDialog
          {...savedMealProps}
          onDeleteMeal={onDeleteMeal}
        />,
      )

      const deleteMeal = screen.getByRole('button', { name: 'Delete meal 1' })
      expect(deleteMeal).toHaveTextContent('Delete meal')

      await user.click(deleteMeal)
      expect(screen.getByText('Delete this entry?')).toBeInTheDocument()
      expect(onDeleteMeal).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: 'Delete' }))
      expect(onDeleteMeal).toHaveBeenCalled()
    })

    it('still offers delete when the saved meal has no items left', () => {
      render(
        <ControlledAddMealDialog
          {...savedMealProps}
          initialItems={[]}
          onDeleteMeal={vi.fn()}
        />,
      )

      // No items means no "meal so far" block and so no sticky Done footer
      // to sit above — the control has to render in the browse body instead.
      expect(
        screen.getByRole('button', { name: 'Delete meal 1' }),
      ).toBeInTheDocument()
    })
  })

  it('has a meal note field next to the reaction block (#480)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledAddMealDialog
        {...defaultProps}
        initialItems={[{ id: 'i1', name: 'Oatmeal', amountKcal: 250 }]}
      />,
    )

    const note = screen.getByLabelText('Meal note')
    expect(note).toHaveAttribute('placeholder', 'Note about breakfast')
    await user.type(note, 'Cheat day')
    expect(note).toHaveValue('Cheat day')
  })

  it('still offers the meal note before any food is added (#480 regression)', async () => {
    const user = userEvent.setup()
    render(<ControlledAddMealDialog {...defaultProps} />)

    // #129's flow types the note first, then adds the item — moving the
    // note next to the reaction block (which needs an item) must not drop
    // the field for an empty meal.
    const note = screen.getByLabelText('Meal note')
    await user.type(note, 'Ate chocolates')

    expect(note).toHaveValue('Ate chocolates')
  })

  it('searches the food list, confirms a quantity, and adds it to the meal so far', async () => {
    const user = userEvent.setup()
    render(<ControlledAddMealDialog {...defaultProps} />)

    await user.type(screen.getByLabelText('Search foods'), 'Salmon')
    await user.click(await screen.findByText('Salmon'))
    // Confirm-quantity step — default 100g, "+ Add item" commits it.
    await user.click(screen.getByRole('button', { name: '+ Add item' }))

    expect(screen.getByText('This meal so far')).toBeInTheDocument()
    expect(screen.getByText('Salmon')).toBeInTheDocument()
  })

  it('shows a clear control that empties the food search (#533)', async () => {
    const user = userEvent.setup()
    render(<ControlledAddMealDialog {...defaultProps} />)

    const search = screen.getByLabelText('Search foods')
    expect(
      screen.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument()

    await user.type(search, 'Chocolate')
    expect(search).toHaveValue('Chocolate')

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(search).toHaveValue('')
    expect(
      screen.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Scan barcode' }),
    ).toBeInTheDocument()
  })

  it('lets the user edit kcal/macros on the confirm step before adding (#517)', async () => {
    const user = userEvent.setup()
    const onAppendItems = vi.fn()
    render(
      <AddMealDialog
        {...defaultProps}
        items={[]}
        reaction={undefined}
        onReactionChange={vi.fn()}
        onAppendItems={onAppendItems}
        onRemoveItem={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Search foods'), 'Salmon')
    await user.click(await screen.findByText('Salmon'))

    const kcal = screen.getByLabelText('kcal')
    const protein = screen.getByLabelText('Protein')
    await user.clear(kcal)
    await user.type(kcal, '250')
    await user.clear(protein)
    await user.type(protein, '30')

    // Changing quantity rescale from the corrected per-100g rates
    // (250 kcal / 100g → 500 at 200g; 30g protein → 60).
    const quantity = screen.getByLabelText('Quantity (g)')
    await user.clear(quantity)
    await user.type(quantity, '200')

    expect(kcal).toHaveValue('500')
    expect(protein).toHaveValue('60')

    await user.click(screen.getByRole('button', { name: '+ Add item' }))

    expect(onAppendItems).toHaveBeenCalledTimes(1)
    expect(onAppendItems.mock.calls[0][0][0]).toMatchObject({
      name: 'Salmon',
      amountKcal: 500,
      proteinG: 60,
      amountG: 200,
    })
  })

  it('stays open across multiple adds, accumulating the meal live (persistent multi-add)', async () => {
    const user = userEvent.setup()
    render(<ControlledAddMealDialog {...defaultProps} />)

    await user.type(screen.getByLabelText('Search foods'), 'Salmon')
    await user.click(await screen.findByText('Salmon'))
    await user.click(screen.getByRole('button', { name: '+ Add item' }))

    // Dialog is still open and searchable — add a second dish.
    await user.clear(screen.getByLabelText('Search foods'))
    await user.type(screen.getByLabelText('Search foods'), 'Chicken breast')
    await user.click(await screen.findByText('Chicken breast'))
    await user.click(screen.getByRole('button', { name: '+ Add item' }))

    const mealSoFar = screen.getByText('This meal so far').closest('div')!
    expect(mealSoFar).toHaveTextContent('Salmon')
    expect(mealSoFar).toHaveTextContent('Chicken breast')
  })

  it('shows the "was it tasty?" reaction picker once the meal has at least one item', async () => {
    const user = userEvent.setup()
    const onReactionChange = vi.fn()
    render(
      <AddMealDialog
        {...defaultProps}
        items={[{ id: 'i1', amountKcal: 200 }]}
        reaction={undefined}
        onReactionChange={onReactionChange}
        onAppendItems={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    )

    expect(screen.getByText('Was it tasty?')).toBeInTheDocument()
    // EmotionPicker's aria-label includes the contextLabel suffix
    // (`${label} — ${contextLabel}`) to disambiguate from any other
    // EmotionPicker on screen — here that's the meal label itself. #459
    // switched this picker's own labelFor from emotionLabel ("Happy") to
    // mealReactionValueLabel ("Yes") to match the mockup's Yes/So-so/No
    // wording for "Was it tasty?" specifically.
    await user.click(screen.getByRole('button', { name: 'Yes — Breakfast' }))

    expect(onReactionChange).toHaveBeenCalledWith('happy')
  })

  it('does not show the reaction picker (or Done) with an empty meal', () => {
    render(<ControlledAddMealDialog {...defaultProps} />)

    expect(screen.queryByText('Was it tasty?')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
  })

  it('asks before removing an item from the meal so far (#509)', async () => {
    const user = userEvent.setup()
    const onRemoveItem = vi.fn()
    render(
      <AddMealDialog
        {...defaultProps}
        items={[{ id: 'i1', name: 'Oatmeal', amountKcal: 200 }]}
        reaction={undefined}
        onReactionChange={vi.fn()}
        onAppendItems={vi.fn()}
        onRemoveItem={onRemoveItem}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete item' }))
    expect(onRemoveItem).not.toHaveBeenCalled()
    const confirm = screen.getByRole('alertdialog')
    expect(confirm).toHaveTextContent('Remove this food?')

    await user.click(within(confirm).getByRole('button', { name: 'Remove' }))
    expect(onRemoveItem).toHaveBeenCalledWith('i1')
  })

  describe('Recent (#454)', () => {
    it('shows recently-touched personal items when the search box is empty', async () => {
      await useMealItemStore.getState().touch('Homemade soup', { amountKcal: 320 })
      render(<ControlledAddMealDialog {...defaultProps} />)

      expect(screen.getByText('Recent')).toBeInTheDocument()
      expect(await screen.findByText('Homemade soup')).toBeInTheDocument()
    })

    it('does not show a Recent section with no personal items yet', () => {
      render(<ControlledAddMealDialog {...defaultProps} />)

      expect(screen.queryByText('Recent')).not.toBeInTheDocument()
    })
  })

  describe('Recent eye toggle (#507)', () => {
    it('hides the Recent list while keeping the heading so it can be shown again', async () => {
      const user = userEvent.setup()
      await useMealItemStore.getState().touch('Homemade soup', { amountKcal: 320 })
      render(<ControlledAddMealDialog {...defaultProps} />)

      expect(await screen.findByText('Homemade soup')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Hide Recent' }))

      expect(screen.getByText('Recent')).toBeInTheDocument()
      expect(screen.queryByText('Homemade soup')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Show Recent' })).toBeInTheDocument()
    })

    it('shows the Recent list again after tapping Show', async () => {
      const user = userEvent.setup()
      await useMealItemStore.getState().touch('Homemade soup', { amountKcal: 320 })
      useAddMealRecentVisibilityStore.setState({ recentVisible: false })
      render(<ControlledAddMealDialog {...defaultProps} />)

      expect(screen.getByText('Recent')).toBeInTheDocument()
      expect(screen.queryByText('Homemade soup')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Show Recent' }))

      expect(await screen.findByText('Homemade soup')).toBeInTheDocument()
    })
  })

  describe('manual entry fallback (#454)', () => {
    it('adds a manually-typed dish via the "Add food" quick action', async () => {
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Add food' }))
      await user.type(screen.getByLabelText('Dish name'), 'Homemade soup')
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      // The saved dish is also touched into the personal library, so once
      // search is empty again it can legitimately show up a second time in
      // "Recent" — scope this assertion to the meal-so-far list itself,
      // same reasoning as the "Repeat yesterday's meal" test below.
      const mealSoFar = screen.getByText('This meal so far').closest('div')!
      expect(mealSoFar).toHaveTextContent('Homemade soup')
    })

    it('does not race two writes to the personal food library for the same dish (regression)', async () => {
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Add food' }))
      await user.type(screen.getByLabelText('Dish name'), 'Homemade soup')
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.click(
        screen.getByRole('button', { name: 'Add Homemade soup to favorites' }),
      )
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(
          useMealItemStore
            .getState()
            .items.filter((item) => item.name === 'Homemade soup'),
        ).toHaveLength(1),
      )
      expect(useMealItemStore.getState().items[0]).toMatchObject({
        name: 'Homemade soup',
        favorite: true,
      })
    })
  })

  describe('barcode scanning', () => {
    it('resolves a local match straight to the quantity-confirm step, not the manual sheet', async () => {
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
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      // Waits on the quantity-confirm step itself, not on the dish name:
      // "Protein Bar" is in the personal library too (touched above so
      // lookupBarcode resolves it locally), so it can render as a Recent
      // row while the lookup is still in flight. Waiting for the *name*
      // could therefore resolve against that row, which the confirm step
      // then unmounts — leaving a detached node and an "element could not
      // be found in the document" failure a few hundred ms in, well
      // before any timeout. "+ Add item" only exists in the confirm step,
      // so it can't resolve early. The long timeout still matters: the
      // chain here (BarcodeScannerDialog's dynamic
      // `@zxing/browser`/`@zxing/library` import, the mocked decode
      // callback, then lookupBarcode's IndexedDB round-trip) has needed
      // it under a full-suite CI run's load.
      const addItemButton = await screen.findByRole(
        'button',
        { name: '+ Add item' },
        { timeout: 20000 },
      )
      expect(screen.getByText('Protein Bar')).toBeInTheDocument()
      expect(
        screen.queryByLabelText('Dish name'),
      ).not.toBeInTheDocument()

      await user.click(addItemButton)

      expect(screen.getByText('This meal so far')).toBeInTheDocument()
      expect(screen.getAllByText('Protein Bar').length).toBeGreaterThan(0)
    })

    it('falls back to the manual sheet when nothing matches anywhere', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      mockScanning('0000000000000')
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      expect(
        await screen.findByText(
          'No food found for this barcode — you can still add it by hand below.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Dish name')).toHaveValue('')
      // #519 — pending scan code is visible on the Add food sheet.
      expect(screen.getByText('Barcode: 0 000000 000000')).toBeInTheDocument()
    })

    it('remembers a food created after a not-found scan for the next scan (#518)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      mockScanning('4607001234567')
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
      expect(
        await screen.findByText(
          'No food found for this barcode — you can still add it by hand below.',
        ),
      ).toBeInTheDocument()

      await user.type(screen.getByLabelText('Dish name'), 'Scanned Yogurt')
      await user.type(screen.getByLabelText('kcal/100g'), '80')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(
          useMealItemStore
            .getState()
            .items.find((item) => item.name === 'Scanned Yogurt'),
        ).toMatchObject({ barcode: '4607001234567' }),
      )

      // Next scan of the same code must resolve locally (confirm step),
      // not open the not-found manual sheet again.
      mockScanning('4607001234567')
      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
      const addItemButton = await screen.findByRole(
        'button',
        { name: '+ Add item' },
        { timeout: 20000 },
      )
      expect(screen.getByText('Scanned Yogurt')).toBeInTheDocument()
      expect(
        screen.queryByText(
          'No food found for this barcode — you can still add it by hand below.',
        ),
      ).not.toBeInTheDocument()
      await user.click(addItemButton)
    })

    it('requires a dish name after a not-found scan so Custom foods can be written (#518)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      mockScanning('1111111111111')
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
      await screen.findByText(
        'No food found for this barcode — you can still add it by hand below.',
      )
      await user.type(screen.getByLabelText('kcal/100g'), '90')

      // Calories alone used to enable Save; touch then skipped (no name),
      // so the meal line appeared but Custom foods / rescan stayed empty.
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    it('still saves a barcode-sourced food when its name matches a curated catalog entry (#518)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      mockScanning('2222222222222')
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
      await screen.findByText(
        'No food found for this barcode — you can still add it by hand below.',
      )
      // "Salmon" is in foods.ts — the curated-name skip must not apply
      // when a scanned barcode is being attached.
      await user.type(screen.getByLabelText('Dish name'), 'Salmon')
      await user.type(screen.getByLabelText('kcal/100g'), '150')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(
          useMealItemStore
            .getState()
            .items.find((item) => item.name === 'Salmon'),
        ).toMatchObject({ barcode: '2222222222222', lastAmountKcal: 150 }),
      )
    })
  })

  describe("Repeat yesterday's meal", () => {
    it('offers to repeat when a previous meal is passed, appending the selected items', async () => {
      const user = userEvent.setup()
      render(
        <ControlledAddMealDialog
          {...defaultProps}
          previousMeal={{
            items: [{ id: 'yi1', name: 'Eggs', amountKcal: 150 }],
          }}
        />,
      )

      await user.click(
        screen.getByRole('button', { name: "Repeat yesterday's Breakfast" }),
      )
      await user.click(screen.getByRole('button', { name: 'Add selected' }))

      // A repeated item is also touched into the personal library, so once
      // search is empty again it can legitimately show up a second time in
      // "Recent" — scope this assertion to the meal-so-far list itself.
      const mealSoFar = screen.getByText('This meal so far').closest('div')!
      expect(mealSoFar).toHaveTextContent('Eggs')
    })

    it('does not offer to repeat when there is no previous meal', () => {
      render(<ControlledAddMealDialog {...defaultProps} />)

      expect(
        screen.queryByRole('button', { name: /Repeat yesterday's/ }),
      ).not.toBeInTheDocument()
    })
  })

  describe('logging a recipe', () => {
    it('adds a new item from the logged recipe, scaled by servings eaten', async () => {
      await db.recipes.put({
        id: 'recipe-1',
        name: 'Chili',
        servings: 4,
        ingredients: [
          { id: 'ing-1', name: 'Ground beef', amountKcal: 800, proteinG: 60 },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Log recipe' }))
      await user.click(await screen.findByRole('button', { name: 'Chili' }))
      const servingsInput = screen.getByLabelText('Servings eaten')
      await user.clear(servingsInput)
      await user.type(servingsInput, '2')
      await user.click(screen.getByRole('button', { name: 'Log' }))

      expect(screen.getByText('This meal so far')).toBeInTheDocument()
      expect(screen.getByText('Chili')).toBeInTheDocument()
    })
  })

  it('calls onOpenChange(false) when Done is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <AddMealDialog
        {...defaultProps}
        onOpenChange={onOpenChange}
        items={[{ id: 'i1', amountKcal: 200 }]}
        reaction={undefined}
        onReactionChange={vi.fn()}
        onAppendItems={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('gives Done the same 48px footer-CTA size as every other primary footer action (#474)', () => {
    render(
      <AddMealDialog
        {...defaultProps}
        items={[{ id: 'i1', amountKcal: 200 }]}
        reaction={undefined}
        onReactionChange={vi.fn()}
        onAppendItems={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    )

    // It used to be the default h-8 size with only w-full, which read as
    // visibly smaller than MealItemEditorSheet's Save right next to it.
    const done = screen.getByRole('button', { name: 'Done' })
    expect(done).toHaveClass('h-12')
    expect(done).not.toHaveClass('h-8')
  })

  it('does not auto-focus the dish name when editing an existing item (#475)', async () => {
    const user = userEvent.setup()
    render(
      <ControlledAddMealDialog
        {...defaultProps}
        initialItems={[{ id: 'i1', name: 'Oatmeal', amountKcal: 250 }]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit item' }))

    expect(
      await screen.findByRole('heading', { name: 'Edit item' }),
    ).toBeInTheDocument()
    const nameInput = screen.getByLabelText('Dish name')
    expect(nameInput).toHaveValue('Oatmeal')
    // Pre-#475 Radix FocusScope focused the first tabbable and called
    // `.select()`, so a stray keystroke replaced the whole name.
    expect(nameInput).not.toHaveFocus()
  })

  describe('remaining-calories preview (#566)', () => {
    it('counts meal items once when todayTotals excludes this meal', () => {
      // Caller contract (MealList): todayTotals = other meals only. If the
      // parent also included this meal's 529 kcal in todayTotals, remaining
      // would show 642 (double subtract) instead of 1,171.
      render(
        <ControlledAddMealDialog
          {...defaultProps}
          todayTotals={{ kcal: 300, proteinG: 0, fatG: 0, carbsG: 0 }}
          dailyCalorieTargetKcal={2000}
          initialItems={[{ id: 'i1', name: 'Dish', amountKcal: 529 }]}
        />,
      )

      expect(
        screen.getByText('1,171 kcal remaining (was 1,700 kcal remaining)'),
      ).toBeInTheDocument()
    })
  })
})
