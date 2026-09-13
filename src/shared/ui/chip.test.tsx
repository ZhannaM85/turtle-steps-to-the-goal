import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Chip } from './chip'

describe('Chip (#874)', () => {
  it('toggles as a single pressed button when there is no remove', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <Chip selected onSelect={onSelect}>
        Breakfast
      </Chip>,
    )

    const chip = screen.getByRole('button', { name: 'Breakfast' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(chip).toHaveClass('rounded-full')
    await user.click(chip)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('keeps select and remove as separate targets', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onRemove = vi.fn()
    render(
      <Chip
        onSelect={onSelect}
        selectLabel="Edit 500 ml"
        onRemove={onRemove}
        removeLabel="Remove 500 ml"
      >
        500 ml
      </Chip>,
    )

    await user.click(screen.getByRole('button', { name: 'Edit 500 ml' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onRemove).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Remove 500 ml' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
