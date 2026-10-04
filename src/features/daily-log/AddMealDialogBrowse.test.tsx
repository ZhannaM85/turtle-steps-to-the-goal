import { fireEvent, render, screen, within } from '@testing-library/react'
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

describe('search field label (#1083)', () => {
  it('shows Search above an empty field and does not repeat it as a placeholder', () => {
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
        onToggleHomemadeOnly={vi.fn()}
        mealNoteField={null}
        showEmptyMealNote={false}
      />,
    )

    const search = screen.getByLabelText('Search')
    const label = screen.getByText('Search')
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveAttribute('for', search.id)
    expect(label).toHaveClass('text-sm', 'leading-none', 'font-medium')
    expect(search.parentElement).toHaveClass('gap-1.5')
    expect(
      label.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(search).toHaveValue('')
    expect(search).not.toHaveAttribute('placeholder')
  })
})

describe('empty food search manual add (#991)', () => {
  it('styles Add manually as an outline button and keeps the lead-in as text', async () => {
    const user = userEvent.setup()
    const onOpenManualAdd = renderEmptySearch()
    await user.click(screen.getByLabelText('Search'))

    const results = screen.getByRole('region', { name: 'Search results' })
    expect(results).toHaveClass(
      'z-30',
      'bg-popover',
      'max-h-[min(28rem,max(35dvh,calc(100dvh-18rem)))]',
      'overflow-y-auto',
    )
    expect(screen.getByLabelText('Search').parentElement).toContainElement(
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

    const searchField = within(screen.getByLabelText('Search').parentElement!)
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

  it('focuses the search field on the first tap and opens Recent with that focus (#1082)', async () => {
    renderRecents()
    const search = screen.getByLabelText('Search')

    fireEvent.pointerDown(search, { button: 0, clientX: 20, clientY: 20 })

    expect(search).not.toHaveFocus()
    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()

    fireEvent.pointerUp(search, { button: 0, clientX: 20, clientY: 20 })

    expect(search).toHaveFocus()
    expect(await screen.findByRole('region', { name: 'Recent' })).toBeInTheDocument()
  })

  it('does not focus the search field when the touch moves (#1082)', () => {
    renderRecents()
    const search = screen.getByLabelText('Search')

    fireEvent.pointerDown(search, { button: 0, clientX: 10, clientY: 10 })
    fireEvent.pointerUp(search, { button: 0, clientX: 40, clientY: 10 })

    expect(search).not.toHaveFocus()
    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()
  })

  it('hides recents until the empty search field is focused', async () => {
    const user = userEvent.setup()
    renderRecents()

    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()
    expect(screen.queryByText('Recent')).not.toBeInTheDocument()

    const search = screen.getByLabelText('Search')
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

    await user.click(screen.getByLabelText('Search'))
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
    const search = screen.getByLabelText('Search')
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

  it('hides the dropdown on a tap outside when the keyboard is closed (#1069)', async () => {
    const user = userEvent.setup()
    renderRecents()

    await user.click(screen.getByLabelText('Search'))
    expect(screen.getByRole('region', { name: 'Recent' })).toBeInTheDocument()

    await user.click(document.body)
    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()
  })

  it('keeps Recent open when the field blurs (#1069)', async () => {
    const user = userEvent.setup()
    renderRecents()
    const search = screen.getByLabelText('Search')
    await user.click(search)
    expect(screen.getByRole('region', { name: 'Recent' })).toBeInTheDocument()

    search.blur()
    expect(screen.getByRole('region', { name: 'Recent' })).toBeInTheDocument()
  })

  it('keeps Recent open while a tap dismisses the keyboard, then closes on the next outside tap (#1069)', async () => {
    const user = userEvent.setup()
    const original = window.innerHeight
    renderRecents()
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    })
    const search = screen.getByLabelText('Search')
    await user.click(search)
    expect(screen.getByRole('region', { name: 'Recent' })).toBeInTheDocument()

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 420,
    })
    await user.click(document.body)
    expect(screen.getByRole('region', { name: 'Recent' })).toBeInTheDocument()

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    })
    await user.click(document.body)
    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: original,
    })
  })

  it('opens Recent again when the field is tapped after Escape (#1069)', async () => {
    const user = userEvent.setup()
    renderRecents()
    const search = screen.getByLabelText('Search')
    await user.click(search)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()

    await user.click(search)
    expect(screen.getByRole('region', { name: 'Recent' })).toBeInTheDocument()
  })

  it('closes Recent on Escape (#1069)', async () => {
    const user = userEvent.setup()
    renderRecents()
    await user.click(screen.getByLabelText('Search'))
    expect(screen.getByRole('region', { name: 'Recent' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()
  })
})

describe('typed food results stay open across keyboard dismissal (#1069)', () => {
  it('keeps matches open on blur and closes them on a later outside tap', async () => {
    const user = userEvent.setup()
    const original = window.innerHeight
    render(
      <AddMealDialogBrowse
        search="soup"
        query="soup"
        matches={[soup]}
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
        mealNoteField={null}
        showEmptyMealNote={false}
      />,
    )
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    })
    const search = screen.getByLabelText('Search')
    await user.click(search)
    expect(screen.getByRole('region', { name: 'Search results' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Recent' })).not.toBeInTheDocument()

    search.blur()
    expect(screen.getByRole('region', { name: 'Search results' })).toBeInTheDocument()

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 420,
    })
    await user.click(document.body)
    expect(screen.getByRole('region', { name: 'Search results' })).toBeInTheDocument()

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    })
    await user.click(document.body)
    expect(
      screen.queryByRole('region', { name: 'Search results' }),
    ).not.toBeInTheDocument()

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: original,
    })
  })
})
