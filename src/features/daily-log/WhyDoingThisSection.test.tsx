import type { ReactNode } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTrackedFieldsStore } from '@/stores'
import { useWhyDoingThisStore } from '@/stores/whyDoingThisStore'
import { WhyDoingThisSection } from './WhyDoingThisSection'

let capturedOnDragEnd:
  | ((event: { active: { id: string }; over: { id: string } | null }) => void)
  | undefined

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: (props: {
      onDragEnd: typeof capturedOnDragEnd
      children: ReactNode
    }) => {
      capturedOnDragEnd = props.onDragEnd
      return props.children
    },
  }
})

beforeEach(() => {
  localStorage.clear()
  capturedOnDragEnd = undefined
  useWhyDoingThisStore.setState({ cards: [] })
  useTrackedFieldsStore.setState((state) => ({
    tracked: { ...state.tracked, whyDoingThis: true },
  }))
})

afterEach(() => {
  localStorage.clear()
})

describe('WhyDoingThisSection (#1115)', () => {
  it('hides the section while the Settings switch is off and keeps saved text', () => {
    useWhyDoingThisStore.setState({
      cards: [{ id: 'a', text: 'Feel better' }],
    })
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, whyDoingThis: false },
    }))

    render(<WhyDoingThisSection />)

    expect(screen.queryByText("Why I'm doing this")).not.toBeInTheDocument()
    expect(useWhyDoingThisStore.getState().cards).toEqual([
      { id: 'a', text: 'Feel better' },
    ])
  })

  it('shows only the title and a pencil when nothing is saved', () => {
    render(<WhyDoingThisSection />)

    expect(screen.getByText("Why I'm doing this")).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: "Edit why I'm doing this" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: "Show why I'm doing this" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('saves trimmed cards on check and drops blank ones, without writing each keystroke', async () => {
    const user = userEvent.setup()
    render(<WhyDoingThisSection />)

    await user.click(
      screen.getByRole('button', { name: "Edit why I'm doing this" }),
    )
    await user.click(screen.getByRole('button', { name: 'Add a reason' }))
    await user.type(screen.getByRole('textbox', { name: 'Reason 1' }), '  Health  ')
    expect(useWhyDoingThisStore.getState().cards).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Add a reason' }))
    await user.click(
      screen.getByRole('button', { name: "Save why I'm doing this" }),
    )

    expect(useWhyDoingThisStore.getState().cards).toEqual([
      expect.objectContaining({ text: 'Health' }),
    ])
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Health')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: "Show why I'm doing this" }),
    )
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reorder reason 1' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Delete reason 1' }),
    ).not.toBeInTheDocument()
  })

  it('cancel restores the last saved cards', async () => {
    const user = userEvent.setup()
    useWhyDoingThisStore.setState({
      cards: [{ id: 'a', text: 'Feel better' }],
    })
    render(<WhyDoingThisSection />)

    await user.click(
      screen.getByRole('button', { name: "Edit why I'm doing this" }),
    )
    await user.clear(screen.getByRole('textbox', { name: 'Reason 1' }))
    await user.type(screen.getByRole('textbox', { name: 'Reason 1' }), 'Changed')
    await user.click(
      screen.getByRole('button', { name: "Cancel editing why I'm doing this" }),
    )

    expect(useWhyDoingThisStore.getState().cards).toEqual([
      { id: 'a', text: 'Feel better' },
    ])
  })

  it('asks before a card leaves the draft, and save keeps the remaining order', async () => {
    const user = userEvent.setup()
    useWhyDoingThisStore.setState({
      cards: [
        { id: 'a', text: 'First' },
        { id: 'b', text: 'Second' },
      ],
    })
    render(<WhyDoingThisSection />)

    await user.click(
      screen.getByRole('button', { name: "Edit why I'm doing this" }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete reason 1' }))
    expect(useWhyDoingThisStore.getState().cards).toHaveLength(2)
    expect(screen.getByText('Remove this reason?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(useWhyDoingThisStore.getState().cards).toHaveLength(2)
    expect(screen.queryByRole('textbox', { name: 'Reason 2' })).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: "Save why I'm doing this" }),
    )
    expect(useWhyDoingThisStore.getState().cards).toEqual([
      { id: 'b', text: 'Second' },
    ])
  })

  it('reorders the draft with the meal-template drag end, then saves that order', async () => {
    const user = userEvent.setup()
    useWhyDoingThisStore.setState({
      cards: [
        { id: 'a', text: 'First' },
        { id: 'b', text: 'Second' },
      ],
    })
    render(<WhyDoingThisSection />)

    await user.click(
      screen.getByRole('button', { name: "Edit why I'm doing this" }),
    )
    act(() => {
      capturedOnDragEnd?.({
        active: { id: 'b' },
        over: { id: 'a' },
      })
    })
    expect(useWhyDoingThisStore.getState().cards.map((card) => card.id)).toEqual([
      'a',
      'b',
    ])

    await user.click(
      screen.getByRole('button', { name: "Save why I'm doing this" }),
    )
    expect(useWhyDoingThisStore.getState().cards.map((card) => card.id)).toEqual([
      'b',
      'a',
    ])
  })
})
