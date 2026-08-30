import 'fake-indexeddb/auto'
import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalorieItem, Emotion } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useFoodOverrideStore, useMealItemStore, useMealLabelPresetStore, useNutritionFactsStore, useRecipeStore, useAddMealRecentVisibilityStore, useEatingReasonTrackingStore } from '@/stores'
import { AddMealDialog, type AddMealDialogProps } from './AddMealDialog'

// Matches FoodPickerDialog.test.tsx's own reasoning — every test here
// renders the dialog open against the full 300+-item food list. Raised
// from 25000 alongside the barcode-scan test's own 20s wait below, so
// that test still has headroom under this timeout.
vi.setConfig({ testTimeout: 30000 })

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
  await db.recipes.clear()
  await db.foodOverrides.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  useRecipeStore.setState({ recipes: [], status: 'idle', error: null })
  useFoodOverrideStore.setState({ overrides: [], status: 'idle', error: null })
  useAddMealRecentVisibilityStore.setState({ recentVisible: true })
  useMealLabelPresetStore.setState({ presets: [] })
  useNutritionFactsStore.setState({ enabled: false })
  useEatingReasonTrackingStore.setState({
    enabled: false,
    customReasons: [],
    builtinLabelOverrides: {},
  })
  localStorage.removeItem('turtle-steps-add-meal-recent-visibility')
})

afterEach(async () => {
  await db.mealItems.clear()
  await db.recipes.clear()
  await db.foodOverrides.clear()
  decodeFromConstraints.mockReset()
  vi.unstubAllGlobals()
})

type ControlledProps = Omit<
  AddMealDialogProps,
  | 'items'
  | 'reaction'
  | 'onAppendItems'
  | 'onRemoveItem'
  | 'onReactionChange'
  | 'eatingReasons'
  | 'onEatingReasonsChange'
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
  const [eatingReasons, setEatingReasons] = useState<string[]>([])
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
      eatingReasons={eatingReasons}
      onEatingReasonsChange={setEatingReasons}
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

      // No items means no "meal so far" block and so no Done footer
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
    // #645 — picking a curated food opens the same item sheet "create a
    // dish" uses, prefilled with its 100g rate; Save commits it as-is.
    await user.click(screen.getByRole('button', { name: 'Save' }))

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

    // #645 — a curated food pick opens in per100g mode (the same "create a
    // dish" sheet), so kcal/protein here are the per-100g rate, not an
    // already-scaled absolute — corrected the same way a manually-typed
    // rate would be.
    const kcal = screen.getByLabelText('kcal/100g')
    const protein = screen.getByLabelText('Protein')
    await user.clear(kcal)
    await user.type(kcal, '250')
    await user.clear(protein)
    await user.type(protein, '30')

    // × 100g portions field — 2 portions = 200g, scaling the corrected
    // rate above to 500 kcal / 60g protein on Save.
    const portions = screen.getByLabelText('× 100g')
    await user.clear(portions)
    await user.type(portions, '2')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onAppendItems).toHaveBeenCalledTimes(1)
    expect(onAppendItems.mock.calls[0][0][0]).toMatchObject({
      name: 'Salmon',
      amountKcal: 500,
      proteinG: 60,
      amountG: 200,
    })
  })

  it('lets the user edit the dish name and brand on the confirm step before adding (#640)', async () => {
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

    const name = screen.getByLabelText('Dish name')
    expect(name).toHaveValue('Salmon')
    await user.clear(name)
    await user.type(name, 'Grilled Salmon')

    const brand = screen.getByLabelText('Brand (optional)')
    expect(brand).toHaveValue('')
    await user.type(brand, 'Ocean Fresh')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onAppendItems).toHaveBeenCalledTimes(1)
    expect(onAppendItems.mock.calls[0][0][0]).toMatchObject({
      name: 'Grilled Salmon',
      brand: 'Ocean Fresh',
    })
  })

  it('offers named serving sizes for a curated food that has some, driving the same portions field (#645)', async () => {
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

    await user.type(screen.getByLabelText('Search foods'), 'Egg')
    await user.click(await screen.findByText('Egg'))

    expect(screen.getByRole('radio', { name: 'Grams' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: '1 medium' }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Egg: 155 kcal/100g, 13g protein/100g. 1 medium = 50g -> scale 0.5.
    expect(onAppendItems).toHaveBeenCalledTimes(1)
    expect(onAppendItems.mock.calls[0][0][0]).toMatchObject({
      name: 'Egg',
      amountKcal: 78,
      proteinG: 6.5,
      amountG: 50,
    })
  })

  it('keeps per-100g density when reusing a personal item and shrinking portion weight (#715)', async () => {
    await useMealItemStore.getState().touch('Cookie', {
      amountKcal: 280,
      proteinG: 5,
      fatG: 18.6,
      carbsG: 22.6,
      amountG: 50,
    })
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

    await user.click(await screen.findByText('Cookie'))

    // Known lastAmountG → open in per-100g with density as source of truth.
    expect(screen.getByLabelText('kcal/100g')).toHaveValue('560')
    expect(screen.getByLabelText('× 100g')).toHaveValue('0.5')

    await user.clear(screen.getByLabelText('× 100g'))
    await user.type(screen.getByLabelText('× 100g'), '0.2')

    expect(
      screen.getByText('Total: 112 kcal · P 2g · F 7g · C 9g'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Portion' }))
    expect(screen.getByLabelText('kcal')).toHaveValue('112')
    expect(screen.getByLabelText('Weight (g)')).toHaveValue('20')

    await user.clear(screen.getByLabelText('Weight (g)'))
    await user.type(screen.getByLabelText('Weight (g)'), '50')
    expect(screen.getByLabelText('kcal')).toHaveValue('280')

    await user.click(screen.getByRole('radio', { name: '100g' }))
    expect(screen.getByLabelText('kcal/100g')).toHaveValue('560')

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onAppendItems.mock.calls[0][0][0]).toMatchObject({
      name: 'Cookie',
      amountKcal: 280,
      amountG: 50,
    })
  })

  it('does not offer a serving-size toggle for a food with none seeded', async () => {
    const user = userEvent.setup()
    render(<ControlledAddMealDialog {...defaultProps} />)

    await user.type(screen.getByLabelText('Search foods'), 'Salmon')
    await user.click(await screen.findByText('Salmon'))

    expect(
      screen.queryByRole('radio', { name: 'Grams' }),
    ).not.toBeInTheDocument()
  })

  it('stays open across multiple adds, accumulating the meal live (persistent multi-add)', async () => {
    const user = userEvent.setup()
    render(<ControlledAddMealDialog {...defaultProps} />)

    await user.type(screen.getByLabelText('Search foods'), 'Salmon')
    await user.click(await screen.findByText('Salmon'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Dialog is still open and searchable — add a second dish.
    await user.clear(screen.getByLabelText('Search foods'))
    await user.type(screen.getByLabelText('Search foods'), 'Chicken breast')
    await user.click(await screen.findByText('Chicken breast'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

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

  it('hides the why-eating dropdown while tracking is off (#764)', () => {
    render(<ControlledAddMealDialog {...defaultProps} />)

    expect(
      screen.queryByLabelText('Why am I eating?'),
    ).not.toBeInTheDocument()
  })

  it('shows the why-eating dropdown above search when tracking is on (#764)', async () => {
    const user = userEvent.setup()
    useEatingReasonTrackingStore.setState({ enabled: true })
    render(<ControlledAddMealDialog {...defaultProps} />)

    const trigger = screen.getByRole('button', { name: 'Why am I eating?' })
    expect(trigger).toBeInTheDocument()
    expect(
      trigger.compareDocumentPosition(screen.getByLabelText('Search foods')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: 'Hunger' }))
    expect(trigger).toHaveTextContent('Hunger')
  })

  it('lists HALT eating reasons in the dropdown (#769)', async () => {
    const user = userEvent.setup()
    useEatingReasonTrackingStore.setState({ enabled: true })
    render(<ControlledAddMealDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Why am I eating?' }))
    expect(screen.getByRole('option', { name: 'Hunger' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Angry' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Lonely' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Tired' })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Tired' }))
    expect(screen.getByRole('button', { name: 'Why am I eating?' })).toHaveTextContent(
      'Tired',
    )
  })

  it('lists custom eating reasons in the dropdown (#765)', async () => {
    const user = userEvent.setup()
    useEatingReasonTrackingStore.setState({
      enabled: true,
      customReasons: ['Tired after work'],
    })
    render(<ControlledAddMealDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Why am I eating?' }))
    await user.click(screen.getByRole('option', { name: 'Tired after work' }))
    expect(screen.getByRole('button', { name: 'Why am I eating?' })).toHaveTextContent(
      'Tired after work',
    )
  })

  it('shows an edited built-in eating reason label while keeping the id (#766)', async () => {
    const user = userEvent.setup()
    useEatingReasonTrackingStore.setState({
      enabled: true,
      builtinLabelOverrides: { hunger: 'Stomach growl' },
    })
    render(<ControlledAddMealDialog {...defaultProps} />)

    const trigger = screen.getByRole('button', { name: 'Why am I eating?' })
    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: 'Stomach growl' }))
    expect(trigger).toHaveTextContent('Stomach growl')
  })

  it('lets the user pick more than one why-eating reason (#774)', async () => {
    const user = userEvent.setup()
    useEatingReasonTrackingStore.setState({ enabled: true })
    render(<ControlledAddMealDialog {...defaultProps} />)

    const trigger = screen.getByRole('button', { name: 'Why am I eating?' })
    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: 'Hunger' }))
    await user.click(screen.getByRole('option', { name: 'Lonely' }))

    expect(trigger).toHaveTextContent('Hunger, Lonely')
    expect(screen.getByRole('option', { name: 'Hunger' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('option', { name: 'Lonely' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.click(screen.getByRole('option', { name: 'Not specified' }))
    expect(trigger).toHaveTextContent('Not specified')
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
    it('resolves a local match straight to the item sheet, prefilled with its last-logged total', async () => {
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

      // Waits on the sheet's own Save button, not the dish name: "Protein
      // Bar" is in the personal library too (touched above so
      // lookupBarcode resolves it locally), so it can render as a Recent
      // row while the lookup is still in flight. Waiting for the *name*
      // could therefore resolve against that row, which the confirm sheet
      // then unmounts — leaving a detached node and an "element could not
      // be found in the document" failure a few hundred ms in, well
      // before any timeout. The long timeout still matters: the chain here
      // (BarcodeScannerDialog's dynamic `@zxing/browser`/`@zxing/library`
      // import, the mocked decode callback, then lookupBarcode's IndexedDB
      // round-trip) has needed it under a full-suite CI run's load.
      const saveButton = await screen.findByRole(
        'button',
        { name: 'Save' },
        { timeout: 20000 },
      )
      expect(screen.getByDisplayValue('Protein Bar')).toBeInTheDocument()
      // #645 — a personal-library hit opens in perPortion mode (its own
      // last-logged total, no rate math needed) — so the kcal field here
      // is labeled "kcal", the same field a curated-food pick's per100g
      // mode instead labels "kcal/100g".
      expect(screen.getByLabelText('kcal')).toHaveValue('200')

      await user.click(saveButton)

      expect(screen.getByText('This meal so far')).toBeInTheDocument()
      expect(screen.getAllByText('Protein Bar').length).toBeGreaterThan(0)
    })

    it('prefills the brand from an Open Food Facts match, still editable (#640)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 1,
              product: {
                product_name: 'Icelandic Skyr',
                brands: 'Siggis, Other',
                nutriments: { 'energy-kcal_100g': 63 },
              },
            }),
        }),
      )
      mockScanning('3333333333333')
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))

      const brand = await screen.findByLabelText('Brand (optional)')
      expect(brand).toHaveValue('Siggis')

      await user.clear(brand)
      await user.type(brand, "Siggi's Dairy")
      expect(brand).toHaveValue("Siggi's Dairy")
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

    it('copies the raw barcode digits to the clipboard (#644)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      mockScanning('0000000000000')
      const writeText = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockResolvedValue(undefined)
      const user = userEvent.setup()
      render(<ControlledAddMealDialog {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
      await screen.findByText('Barcode: 0 000000 000000')

      await user.click(screen.getByRole('button', { name: 'Copy barcode' }))

      // Raw undelimited digits, not the display-grouped label text.
      expect(writeText).toHaveBeenCalledWith('0000000000000')
      expect(
        await screen.findByRole('button', { name: 'Copied' }),
      ).toBeInTheDocument()
      expect(await screen.findByRole('status')).toHaveTextContent(
        'Barcode copied to clipboard',
      )
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

      // Next scan of the same code must resolve locally (prefilled item
      // sheet), not open the not-found sheet again.
      mockScanning('4607001234567')
      await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
      const saveButton = await screen.findByRole(
        'button',
        { name: 'Save' },
        { timeout: 20000 },
      )
      expect(screen.getByDisplayValue('Scanned Yogurt')).toBeInTheDocument()
      expect(
        screen.queryByText(
          'No food found for this barcode — you can still add it by hand below.',
        ),
      ).not.toBeInTheDocument()
      await user.click(saveButton)
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

  it('pins Done in a flex footer instead of sticky inside the scroll (#775)', () => {
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

    const done = screen.getByRole('button', { name: 'Done' })
    expect(done.parentElement).toHaveClass('shrink-0')
    expect(done.parentElement).not.toHaveClass('sticky')
  })

  it('matches dish-sheet 48px height on meal name, time, and note (#730)', () => {
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

    expect(screen.getByLabelText('Meal name')).toHaveClass('h-12')
    expect(screen.getByLabelText('Time').parentElement).toHaveClass('h-12')
    expect(screen.getByLabelText('Meal note')).toHaveClass('h-12')
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

  describe('nutrition facts inline praise (#663)', () => {
    it('shows a satisfied fact by default', () => {
      useNutritionFactsStore.setState({ enabled: true })
      render(
        <ControlledAddMealDialog
          {...defaultProps}
          initialItems={[{ id: 'i1', name: 'Chicken', amountKcal: 200, proteinG: 25 }]}
        />,
      )

      expect(
        screen.getByText('Protein-rich meal', { exact: false }),
      ).toBeInTheDocument()
    })

    it('does not show once disabled', () => {
      useNutritionFactsStore.setState({ enabled: false })
      render(
        <ControlledAddMealDialog
          {...defaultProps}
          initialItems={[{ id: 'i1', name: 'Chicken', amountKcal: 200, proteinG: 25 }]}
        />,
      )

      expect(
        screen.queryByText('Protein-rich meal', { exact: false }),
      ).not.toBeInTheDocument()
    })

    it('does not re-show a fact another meal today already satisfied', () => {
      useNutritionFactsStore.setState({ enabled: true })
      render(
        <ControlledAddMealDialog
          {...defaultProps}
          initialItems={[{ id: 'i1', name: 'Chicken', amountKcal: 200, proteinG: 25 }]}
          alreadySatisfiedFactIds={['proteinRichMeal']}
        />,
      )

      expect(
        screen.queryByText('Protein-rich meal', { exact: false }),
      ).not.toBeInTheDocument()
    })
  })
})
