import { describe, expect, it, vi } from 'vitest'
import type { MouseHandlerDataParam } from 'recharts'
import {
  CORRELATION_SCATTER_TOOLTIP_TRIGGER,
  CORRELATION_SCATTER_TOOLTIP_WRAPPER_STYLE,
  correlationScatterTooltipActive,
  handleCorrelationScatterChartClick,
} from './correlationScatterTooltip'

function clickState(
  partial: Partial<MouseHandlerDataParam>,
): MouseHandlerDataParam {
  return {
    activeTooltipIndex: undefined,
    isTooltipActive: false,
    activeIndex: undefined,
    activeLabel: undefined,
    activeDataKey: undefined,
    activeCoordinate: undefined,
    ...partial,
  }
}

describe('correlationScatterTooltip (#712 / #713)', () => {
  it('uses click trigger so touch taps open tooltips', () => {
    expect(CORRELATION_SCATTER_TOOLTIP_TRIGGER).toBe('click')
  })

  it('re-enables pointer events on the tooltip wrapper for the day link', () => {
    expect(CORRELATION_SCATTER_TOOLTIP_WRAPPER_STYLE.pointerEvents).toBe('auto')
  })

  it('forces tooltip inactive while gesturing or suppressed (#713)', () => {
    expect(correlationScatterTooltipActive(false, false)).toBeUndefined()
    expect(correlationScatterTooltipActive(true, false)).toBe(false)
    expect(correlationScatterTooltipActive(false, true)).toBe(false)
  })

  it('dismisses on empty-chart click and reveals on point click (#713)', () => {
    const dismiss = vi.fn()
    const reveal = vi.fn()
    handleCorrelationScatterChartClick(
      clickState({ isTooltipActive: false }),
      dismiss,
      reveal,
    )
    expect(dismiss).toHaveBeenCalledOnce()
    expect(reveal).not.toHaveBeenCalled()

    dismiss.mockClear()
    handleCorrelationScatterChartClick(
      clickState({ isTooltipActive: true, activeIndex: 0 }),
      dismiss,
      reveal,
    )
    expect(reveal).toHaveBeenCalledOnce()
    expect(dismiss).not.toHaveBeenCalled()
  })
})
