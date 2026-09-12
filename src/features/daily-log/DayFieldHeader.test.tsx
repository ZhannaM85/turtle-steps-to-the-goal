import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  DayFieldEditActions,
  DayFieldHeader,
  DayFieldViewActions,
} from './DayFieldHeader'

describe('DayFieldHeader (#858 / #863)', () => {
  it('puts the label on the left and keeps actions on the title row', () => {
    render(
      <DayFieldHeader
        label="Weight (kg)"
        actions={<button type="button">Save weight</button>}
      />,
    )

    const header = screen.getByText('Weight (kg)').closest('div') as HTMLElement
    expect(header).toHaveClass('flex', 'items-center', 'justify-between', 'gap-2')
    expect(header).toHaveTextContent('Weight (kg)')
    expect(within(header).getByRole('button', { name: 'Save weight' })).toBeInTheDocument()
  })

  it('omits the actions cluster when none are passed', () => {
    render(<DayFieldHeader label="Steps" />)

    const header = screen.getByText('Steps').closest('div') as HTMLElement
    expect(within(header).queryByRole('button')).not.toBeInTheDocument()
  })

  it('lays out view actions as icon-sm pencil, then optional trash', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    render(
      <DayFieldHeader
        label="Day's note"
        actions={
          <DayFieldViewActions
            editLabel="Edit note"
            onEdit={onEdit}
            deleteLabel="Delete note"
            onDelete={onDelete}
            showDelete
          />
        }
      />,
    )

    const header = screen.getByText("Day's note").closest('div') as HTMLElement
    const buttons = within(header).getAllByRole('button')
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Edit note',
      'Delete note',
    ])
    expect(buttons[0]).toHaveAttribute('data-size', 'icon-sm')
    expect(buttons[0]).toHaveClass('size-7')
    expect(buttons[1]).toHaveAttribute('data-size', 'icon-sm')
    expect(buttons[1]).toHaveClass('size-7')
  })

  it('hides trash in view mode until delete is offered', () => {
    render(
      <DayFieldHeader
        label="Sleep"
        actions={
          <DayFieldViewActions editLabel="Edit sleep" onEdit={() => {}} />
        }
      />,
    )

    expect(screen.getByRole('button', { name: 'Edit sleep' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete sleep' })).not.toBeInTheDocument()
  })

  it('lays out edit actions as icon-sm save, then cancel, then trash', () => {
    render(
      <DayFieldHeader
        label="Day totals"
        actions={
          <DayFieldEditActions
            saveLabel="Save day totals"
            onSave={() => {}}
            cancelLabel="Cancel editing day totals"
            onCancel={() => {}}
            showCancel
            deleteLabel="Delete day totals"
            onDelete={() => {}}
            showDelete
          />
        }
      />,
    )

    const header = screen.getByText('Day totals').closest('div') as HTMLElement
    const buttons = within(header).getAllByRole('button')
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Save day totals',
      'Cancel editing day totals',
      'Delete day totals',
    ])
    expect(buttons[0]).toHaveAttribute('data-size', 'icon-sm')
    expect(buttons[0]).toHaveClass('size-7')
    expect(buttons[1]).toHaveAttribute('data-size', 'icon-sm')
    expect(buttons[1]).toHaveClass('size-7')
    expect(buttons[2]).toHaveAttribute('data-size', 'icon-sm')
    expect(buttons[2]).toHaveClass('size-7')
  })

  it('keeps cancel and trash off the title row until those actions are offered', () => {
    render(
      <DayFieldHeader
        label="Water"
        actions={
          <DayFieldEditActions
            saveLabel="Save water"
            onSave={() => {}}
            cancelLabel="Cancel editing water"
            onCancel={() => {}}
          />
        }
      />,
    )

    expect(screen.getByRole('button', { name: 'Save water' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Cancel editing water' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Delete water' }),
    ).not.toBeInTheDocument()
  })

  it('does not fire save when the check is disabled (#854)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <DayFieldHeader
        label="Any thoughts?"
        actions={
          <DayFieldEditActions
            saveLabel="Save thoughts"
            onSave={onSave}
            saveDisabled
            cancelLabel="Cancel editing thoughts"
            onCancel={() => {}}
            showCancel
          />
        }
      />,
    )

    const save = screen.getByRole('button', { name: 'Save thoughts' })
    expect(save).toBeDisabled()
    await user.click(save)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('routes title-row clicks to save, cancel, and delete', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const onDelete = vi.fn()

    render(
      <DayFieldHeader
        label="Morning note"
        actions={
          <DayFieldEditActions
            saveLabel="Save morning note"
            onSave={onSave}
            cancelLabel="Cancel editing morning note"
            onCancel={onCancel}
            showCancel
            deleteLabel="Delete morning note"
            onDelete={onDelete}
            showDelete
          />
        }
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Save morning note' }))
    await user.click(
      screen.getByRole('button', { name: 'Cancel editing morning note' }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete morning note' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
