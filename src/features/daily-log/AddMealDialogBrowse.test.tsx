import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PickableItem } from './addMealDialogHelpers'
import { AddMealDialogBrowse } from './AddMealDialogBrowse'

const soup: PickableItem = {
  source: 'mealItem',
  mealItem: {
    id: 'soup',
    name: 'Homemade soup',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    lastAmountKcal: 320,
  },
}

function renderEmptySearch(onOpenManualAdd = vi.fn()) {
  render(
    <AddMealDialogBrowse
      mealLabel="Breakfast"
      search="honey pie"
      query="honey pie"
      matches={[]}
      recentItems={[]}
      allMealItemsCount={0}
      recentCount={3}
      showAllRecent={false}
      onToggleShowAllRecent={vi.fn()}
      textFor={() => ''}
      isFavorite={() => false}
      onToggleFavorite={vi.fn()}
      onPick={vi.fn()}
      onOpenManualAdd={onOpenManualAdd}
      onOpenBarcode={vi.fn()}
      onOpenRecipe={vi.fn()}
      onImportSharedFood={vi.fn()}
      onlineHits={[]}
      onlineSearchStatus="idle"
      onlineRemoteStatus={null}
      onRunOnlineSearch={vi.fn()}
      onPickOnlineHit={vi.fn()}
      onChangeSearch={vi.fn()}
      onClearSearch={vi.fn()}
      homemadeOnly={false}
      onToggleHomemadeOnly={vi.fn()}
      mealNoteField={null}
      showEmptyMealNote={false}
    />,
  )
  return onOpenManualAdd
}

describe('empty food search manual add (#991)', () => {
  it('styles Add manually as an outline button and keeps the lead-in as text', async () => {
    const user = userEvent.setup()
    const onOpenManualAdd = renderEmptySearch()
    await user.click(screen.getByLabelText('Search foods'))

    const results = screen.getByRole('region', { name: 'Search results' })
    expect(results).toHaveClass('z-30', 'bg-popover')
    expect(screen.getByLabelText('Search foods').parentElement).toContainElement(
      results,
    )
    expect(results.compareDocumentPosition(screen.getByRole('button', { name: 'Homemade' }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(results).toContainElement(screen.getByText('No foods found.'))
    expect(
      screen.queryByText("Can't find it? Add manually"),
    ).not.toBeInTheDocument()

    const leadIn = screen.getByText("Can't find it?")
    expect(leadIn.tagName).toBe('P')
    expect(leadIn.closest('button')).toBeNull()

    const addManually = screen.getByRole('button', { name: 'Add manually' })
    const searchOnline = screen.getByRole('button', { name: 'Search online' })
    expect(results).toContainElement(searchOnline)
    expect(addManually).toHaveAttribute('data-variant', 'outline')
    expect(addManually).toHaveAttribute('data-size', 'sm')
    expect(searchOnline).toHaveAttribute('data-variant', 'outline')
    expect(searchOnline).toHaveAttribute('data-size', 'sm')

    await user.click(addManually)
    expect(onOpenManualAdd).toHaveBeenCalledTimes(1)
    expect(onOpenManualAdd).toHaveBeenCalledWith('honey pie')
  })

  it('does not pass the search query from the Add food shortcut (#992)', async () => {
    const user = userEvent.setup()
    const onOpenManualAdd = renderEmptySearch()

    await user.click(screen.getByRole('button', { name: 'Add food' }))
    expect(onOpenManualAdd).toHaveBeenCalledTimes(1)
    expect(onOpenManualAdd).toHaveBeenCalledWith()
  })
})

describe('meal search barcode entry (#998)', () => {
  it('keeps the scan tile and has no barcode control in the search field', async () => {
    const user = userEvent.setup()
    const onOpenBarcode = vi.fn()
    render(
      <AddMealDialogBrowse
        mealLabel="Breakfast"
        search="honey"
        query="honey"
        matches={[]}
        recentItems={[]}
        allMealItemsCount={0}
        recentCount={3}
        showAllRecent={false}
        onToggleShowAllRecent={vi.fn()}
        textFor={() => ''}
        isFavorite={() => false}
        onToggleFavorite={vi.fn()}
        onPick={vi.fn()}
        onOpenManualAdd={vi.fn()}
        onOpenBarcode={onOpenBarcode}
        onOpenRecipe={vi.fn()}
        onImportSharedFood={vi.fn()}
        onlineHits={[]}
        onlineSearchStatus="idle"
        onlineRemoteStatus={null}
        onRunOnlineSearch={vi.fn()}
        onPickOnlineHit={vi.fn()}
        onChangeSearch={vi.fn()}
        onClearSearch={vi.fn()}
        homemadeOnly={false}
        onToggleHomemadeOnly={vi.fn()}
        mealNoteField={null}
        showEmptyMealNote={false}
      />,
    )

    const searchField = within(screen.getByLabelText('Search foods').parentElement!)
    expect(
      searchField.getByRole('button', { name: 'Clear search' }),
    ).toBeInTheDocument()
    expect(
      searchField.queryByRole('button', { name: 'Scan barcode' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Scan barcode' }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Scan barcode — Breakfast' }),
    )
    expect(onOpenBarcode).toHaveBeenCalledTimes(1)
  })
})

describe('homemade meal-search chip (#994)', () => {
  it('shows a homemade chip that starts off', async () => {
    const user = userEvent.setup()
    const onToggleHomemadeOnly = vi.fn()
    render(
      <AddMealDialogBrowse
        mealLabel="Breakfast"
        search=""
        query=""
        matches={[]}
        recentItems={[]}
        allMealItemsCount={0}
        recentCount={3}
        showAllRecent={false}
        onToggleShowAllRecent={vi.fn()}
        textFor={() => ''}
        isFavorite={() => false}
        onToggleFavorite={vi.fn()}
        onPick={vi.fn()}
        onOpenManualAdd={vi.fn()}
        onOpenBarcode={vi.fn()}
        onOpenRecipe={vi.fn()}
        onImportSharedFood={vi.fn()}
        onlineHits={[]}
        onlineSearchStatus="idle"
        onlineRemoteStatus={null}
        onRunOnlineSearch={vi.fn()}
        onPickOnlineHit={vi.fn()}
        onChangeSearch={vi.fn()}
        onClearSearch={vi.fn()}
        homemadeOnly={false}
        onToggleHomemadeOnly={onToggleHomemadeOnly}
        mealNoteField={null}
        showEmptyMealNote={false}
      />,
    )

    const chip = screen.getByRole('button', { name: 'Homemade' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    await user.click(chip)
    expect(onToggleHomemadeOnly).toHaveBeenCalledTimes(1)
  })
})

describe('compact catalog JSON action (#1054)', () => {
  it('packs five quick actions and opens the catalog paste', async () => {
    const user = userEvent.setup()
    renderEmptySearch()

    const addFood = screen.getByRole('button', { name: 'Add food' })
    const grid = addFood.parentElement
    expect(grid).toHaveClass('grid-cols-2', 'gap-1.5')
    expect(within(grid!).getAllByRole('button')).toHaveLength(5)
    expect(addFood).toHaveClass('min-h-11', 'gap-1.5', 'px-2')

    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    expect(
      screen.getByRole('heading', { name: 'Import catalog foods' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Import catalog foods' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Import foods' }),
    ).toBeInTheDocument()
  })
})

describe('recent foods dropdown (#1055)', () => {
  function renderRecents(onPick = vi.fn(), onToggleShowAllRecent = vi.fn()) {
    render(
      <AddMealDialogBrowse
        mealLabel="Breakfast"
        search=""
        query=""
        matches={[]}
        recentItems={[soup]}
        allMealItemsCount={4}
        recentCount={3}
        showAllRecent={false}
        onToggleShowAllRecent={onToggleShowAllRecent}
        textFor={(item) =>
          item.source === 'mealItem' ? item.mealItem.name : ''
        }
        isFavorite={() => false}
        onToggleFavorite={vi.fn()}
        onPick={onPick}
        onOpenManualAdd={vi.fn()}
        onOpenBarcode={vi.fn()}
        onOpenRecipe={vi.fn()}
        onImportSharedFood={vi.fn()}
        onlineHits={[]}
        onlineSearchStatus="idle"
        onlineRemoteStatus={null}
        onRunOnlineSearch={vi.fn()}
        onPickOnlineHit={vi.fn()}
        onChangeSearch={vi.fn()}
        onClearSearch={vi.fn()}
        homemadeOnly={false}
        onToggleHomemadeOnly={vi.fn()}
        mealNoteField={null}
        showEmptyMealNote={false}
      />,
    )
    return { onPick, onToggleShowAllRecent }
  }

  it('hides recents until the empty search field is focused', async () => {
    const user = userEvent.setup()
    renderRecents()

    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()
    expect(screen.queryByText('Recent')).not.toBeInTheDocument()

    const search = screen.getByLabelText('Search foods')
    await user.click(search)

    const dropdown = screen.getByRole('region', { name: 'Recent' })
    expect(dropdown).toContainElement(screen.getByText('Homemade soup'))
    expect(search.parentElement).toContainElement(dropdown)
    expect(screen.getByRole('button', { name: 'Show all' })).toBeInTheDocument()
  })

  it('picks a recent row and closes the dropdown', async () => {
    const user = userEvent.setup()
    const { onPick } = renderRecents()

    await user.click(screen.getByLabelText('Search foods'))
    await user.click(screen.getByText('Homemade soup'))

    expect(onPick).toHaveBeenCalledWith(soup)
    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()
  })

  it('stacks an opaque recents panel over the homemade chip and meal note (#1056)', async () => {
    const user = userEvent.setup()
    render(
      <AddMealDialogBrowse
        mealLabel="Night food"
        search=""
        query=""
        matches={[]}
        recentItems={[soup]}
        allMealItemsCount={4}
        recentCount={3}
        showAllRecent={false}
        onToggleShowAllRecent={vi.fn()}
        textFor={(item) =>
          item.source === 'mealItem' ? item.mealItem.name : ''
        }
        isFavorite={() => false}
        onToggleFavorite={vi.fn()}
        onPick={vi.fn()}
        onOpenManualAdd={vi.fn()}
        onOpenBarcode={vi.fn()}
        onOpenRecipe={vi.fn()}
        onImportSharedFood={vi.fn()}
        onlineHits={[]}
        onlineSearchStatus="idle"
        onlineRemoteStatus={null}
        onRunOnlineSearch={vi.fn()}
        onPickOnlineHit={vi.fn()}
        onChangeSearch={vi.fn()}
        onClearSearch={vi.fn()}
        homemadeOnly={false}
        onToggleHomemadeOnly={vi.fn()}
        mealNoteField={<input aria-label="Note about night food" />}
        showEmptyMealNote
      />,
    )

    const homemade = screen.getByRole('button', { name: 'Homemade' })
    const note = screen.getByLabelText('Note about night food')
    const search = screen.getByLabelText('Search foods')
    expect(search.parentElement).not.toHaveClass('z-30')

    await user.click(search)

    const dropdown = screen.getByRole('region', { name: 'Recent' })
    expect(dropdown).toHaveClass('z-30', 'bg-popover')
    expect(search.parentElement).toHaveClass('relative', 'z-30')
    expect(search.parentElement).toContainElement(dropdown)
    expect(dropdown.compareDocumentPosition(homemade)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(dropdown.compareDocumentPosition(note)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(screen.getByText('Homemade soup')).toBeInTheDocument()
  })

  it('hides the dropdown when focus leaves the field', async () => {
    const user = userEvent.setup()
    renderRecents()

    await user.click(screen.getByLabelText('Search foods'))
    expect(screen.getByRole('region', { name: 'Recent' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add food' }))
    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()
  })
})
