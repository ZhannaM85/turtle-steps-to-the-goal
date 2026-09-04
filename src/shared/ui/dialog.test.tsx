import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Dialog, DialogContent, DialogTitle } from './dialog'

describe('DialogContent', () => {
  it('fullscreen sheets fade without a transform enter animation (#808)', () => {
    render(
      <Dialog open>
        <DialogContent size="fullscreen" closeLabel="Close">
          <DialogTitle>Add dish</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    const content = document.querySelector('[data-slot="dialog-content"]')
    expect(content).toBeTruthy()
    expect(content).toHaveClass('transform-none')
    expect(content).toHaveClass('data-[state=open]:dialog-fade-in')
    expect(content?.className).not.toContain('animate-in')
  })

  it('centered cards still use the default zoom enter animation', () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close">
          <DialogTitle>Confirm</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    const content = document.querySelector('[data-slot="dialog-content"]')
    expect(content?.className).toContain('animate-in')
    expect(content?.className).not.toContain('dialog-fade-in')
  })
})
