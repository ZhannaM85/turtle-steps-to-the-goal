import { describe, expect, it } from 'vitest'
import {
  CORRELATION_SCATTER_TOOLTIP_TRIGGER,
  CORRELATION_SCATTER_TOOLTIP_WRAPPER_STYLE,
} from './correlationScatterTooltip'

describe('correlationScatterTooltip (#712)', () => {
  it('uses click trigger so touch taps open tooltips', () => {
    expect(CORRELATION_SCATTER_TOOLTIP_TRIGGER).toBe('click')
  })

  it('re-enables pointer events on the tooltip wrapper for the day link', () => {
    expect(CORRELATION_SCATTER_TOOLTIP_WRAPPER_STYLE.pointerEvents).toBe('auto')
  })
})
