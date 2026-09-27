import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AddMealItemForm } from './AddMealItemForm'

describe('AddMealItemForm sticky save (#1024)', () => {
  it('pins Save outside the field scroll', () => {
    render(<AddMealItemForm onAdd={vi.fn()} onCancel={vi.fn()} />)

    const save = screen.getByRole('button', { name: 'Save' })
    const scroll = screen.getByTestId('add-meal-item-scroll')
    const dialog = scroll.parentElement?.parentElement

    expect(scroll).toHaveClass(
      'absolute',
      'inset-0',
      'overflow-y-auto',
      'overscroll-y-contain',
    )
    expect(scroll.parentElement).toHaveClass(
      'h-0',
      'min-h-0',
      'grow',
      'basis-0',
      'overflow-hidden',
    )
    expect(dialog).toHaveClass('flex', 'flex-col', 'overflow-hidden', 'pb-0')
    expect(dialog).not.toHaveClass('overflow-y-auto')
    expect(scroll.contains(save)).toBe(false)
    expect(scroll.contains(screen.getByLabelText('Meal item name'))).toBe(true)
    expect(scroll.contains(screen.getByRole('heading', { name: 'Add custom food' }))).toBe(
      false,
    )
    expect(save.parentElement).toHaveClass(
      'shrink-0',
      'pb-[calc(env(safe-area-inset-bottom)+0.75rem)]',
    )
    expect(save.parentElement).not.toHaveClass('sticky')
  })
})
