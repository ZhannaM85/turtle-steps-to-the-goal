import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddMealDialogBrowse } from './AddMealDialogBrowse'

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
      recentVisible
      onToggleRecentVisible={vi.fn()}
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

    expect(screen.getByText('No foods found.')).toBeInTheDocument()
    expect(
      screen.queryByText("Can't find it? Add manually"),
    ).not.toBeInTheDocument()

    const leadIn = screen.getByText("Can't find it?")
    expect(leadIn.tagName).toBe('P')
    expect(leadIn.closest('button')).toBeNull()

    const addManually = screen.getByRole('button', { name: 'Add manually' })
    const searchOnline = screen.getByRole('button', { name: 'Search online' })
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
        recentVisible
        onToggleRecentVisible={vi.fn()}
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
