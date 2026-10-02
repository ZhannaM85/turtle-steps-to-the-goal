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
      search="honey pie"
      query="honey pie"
      matches={[]}
      recentItems={[]}
      textFor={() => ''}
      isFavorite={() => false}
      onToggleFavorite={vi.fn()}
      onPick={vi.fn()}
      onOpenManualAdd={onOpenManualAdd}
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
    expect(results).toHaveClass(
      'z-30',
      'bg-popover',
      'max-h-[min(28rem,max(35dvh,calc(100dvh-18rem)))]',
      'overflow-y-auto',
    )
    expect(screen.getByLabelText('Search foods').parentElement).toContainElement(
      results,
    )
    expect(screen.queryByRole('button', { name: 'Homemade' })).not.toBeInTheDocument()
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

})

describe('meal search barcode entry (#998)', () => {
  it('has no barcode control in the search field', () => {
    render(
      <AddMealDialogBrowse
        search="honey"
        query="honey"
        matches={[]}
        recentItems={[]}
        textFor={() => ''}
        isFavorite={() => false}
        onToggleFavorite={vi.fn()}
        onPick={vi.fn()}
        onOpenManualAdd={vi.fn()}
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
  })
})

describe('homemade meal-search chip (#994)', () => {
  it('hides the homemade pill on Add food (#1058)', () => {
    const onToggleHomemadeOnly = vi.fn()
    render(
      <AddMealDialogBrowse
        search=""
        query=""
        matches={[]}
        recentItems={[]}
        textFor={() => ''}
        isFavorite={() => false}
        onToggleFavorite={vi.fn()}
        onPick={vi.fn()}
        onOpenManualAdd={vi.fn()}
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

    expect(screen.queryByRole('button', { name: 'Homemade' })).not.toBeInTheDocument()
    expect(onToggleHomemadeOnly).not.toHaveBeenCalled()
  })
})

describe('recent foods dropdown (#1055)', () => {
  function renderRecents(onPick = vi.fn()) {
    render(
      <AddMealDialogBrowse
        search=""
        query=""
        matches={[]}
        recentItems={[soup]}
        textFor={(item) =>
          item.source === 'mealItem' ? item.mealItem.name : ''
        }
        isFavorite={() => false}
        onToggleFavorite={vi.fn()}
        onPick={onPick}
        onOpenManualAdd={vi.fn()}
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
    return { onPick }
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
    expect(dropdown).toHaveClass(
      'max-h-[min(28rem,max(35dvh,calc(100dvh-18rem)))]',
      'overflow-y-auto',
    )
    expect(
      screen.queryByRole('button', { name: 'Show all' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Show less' }),
    ).not.toBeInTheDocument()
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
        search=""
        query=""
        matches={[]}
        recentItems={[soup]}
        textFor={(item) =>
          item.source === 'mealItem' ? item.mealItem.name : ''
        }
        isFavorite={() => false}
        onToggleFavorite={vi.fn()}
        onPick={vi.fn()}
        onOpenManualAdd={vi.fn()}
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

    expect(screen.queryByRole('button', { name: 'Homemade' })).not.toBeInTheDocument()
    const note = screen.getByLabelText('Note about night food')
    const search = screen.getByLabelText('Search foods')
    expect(search.parentElement).not.toHaveClass('z-30')

    await user.click(search)

    const dropdown = screen.getByRole('region', { name: 'Recent' })
    expect(dropdown).toHaveClass('z-30', 'bg-popover')
    expect(search.parentElement).toHaveClass('relative', 'z-30')
    expect(search.parentElement).toContainElement(dropdown)
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

    await user.click(document.body)
    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()
  })
})
