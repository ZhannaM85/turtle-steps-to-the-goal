import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrandAutocomplete } from './BrandAutocomplete'

function ControlledBrandAutocomplete(props: { suggestions: string[] }) {
  const [value, setValue] = useState('')
  return (
    <BrandAutocomplete
      value={value}
      onChange={setValue}
      onSubmit={vi.fn()}
      suggestions={props.suggestions}
      enabled={false}
      ariaLabel="Brand (optional)"
      placeholder="e.g. Perdue"
    />
  )
}

describe('BrandAutocomplete (#969)', () => {
  it('stays closed on focus alone, even with suggestions available', async () => {
    const user = userEvent.setup()
    render(
      <BrandAutocomplete
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        suggestions={['Perdue', 'Danone']}
        enabled={false}
        ariaLabel="Brand (optional)"
        placeholder="e.g. Perdue"
      />,
    )

    await user.click(screen.getByLabelText('Brand (optional)'))

    expect(
      screen.queryByRole('button', { name: 'Perdue' }),
    ).not.toBeInTheDocument()
  })

  it('filters stored brands as the user types', async () => {
    const user = userEvent.setup()
    render(<ControlledBrandAutocomplete suggestions={['Perdue', 'Danone']} />)

    await user.type(screen.getByLabelText('Brand (optional)'), 'per')

    expect(screen.getByRole('button', { name: 'Perdue' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Danone' }),
    ).not.toBeInTheDocument()
  })

  it('fills the field and closes when a suggestion is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <BrandAutocomplete
        value=""
        onChange={onChange}
        onSubmit={vi.fn()}
        suggestions={['Perdue']}
        enabled={false}
        ariaLabel="Brand (optional)"
        placeholder="e.g. Perdue"
      />,
    )

    await user.type(screen.getByLabelText('Brand (optional)'), 'p')
    await user.click(screen.getByRole('button', { name: 'Perdue' }))

    expect(onChange).toHaveBeenCalledWith('Perdue')
    expect(
      screen.queryByRole('button', { name: 'Perdue' }),
    ).not.toBeInTheDocument()
  })

  it('shows no list when nothing matches', async () => {
    const user = userEvent.setup()
    render(<ControlledBrandAutocomplete suggestions={['Perdue']} />)

    await user.type(screen.getByLabelText('Brand (optional)'), 'xyz')

    expect(
      screen.queryByRole('button', { name: 'Perdue' }),
    ).not.toBeInTheDocument()
  })

  it('still lets the user type a brand that is not in the list', async () => {
    const user = userEvent.setup()
    render(<ControlledBrandAutocomplete suggestions={['Perdue']} />)

    await user.type(screen.getByLabelText('Brand (optional)'), 'Ocean Fresh')

    expect(screen.getByLabelText('Brand (optional)')).toHaveValue('Ocean Fresh')
    expect(
      screen.queryByRole('button', { name: 'Perdue' }),
    ).not.toBeInTheDocument()
  })
})
