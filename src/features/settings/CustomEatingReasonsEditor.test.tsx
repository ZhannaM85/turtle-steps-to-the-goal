import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useEatingReasonTrackingStore } from '@/stores'
import { CustomEatingReasonsEditor } from './CustomEatingReasonsEditor'

beforeEach(() => {
  useEatingReasonTrackingStore.setState({
    enabled: true,
    customReasons: ['Stress snack'],
    builtinLabelOverrides: {},
  })
})

describe('CustomEatingReasonsEditor', () => {
  it('asks before deleting a custom reason (#890)', async () => {
    const user = userEvent.setup()
    render(<CustomEatingReasonsEditor />)

    await user.click(
      screen.getByRole('button', { name: 'Delete "Stress snack"' }),
    )

    expect(useEatingReasonTrackingStore.getState().customReasons).toEqual([
      'Stress snack',
    ])
    expect(screen.getByText('Delete Stress snack?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(useEatingReasonTrackingStore.getState().customReasons).toEqual([])
    expect(screen.queryByText('Stress snack')).not.toBeInTheDocument()
  })
})
