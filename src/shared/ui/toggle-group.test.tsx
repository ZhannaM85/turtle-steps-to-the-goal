import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  PeriodToggleGroup,
  PeriodToggleGroupItem,
  TOGGLE_GROUP_CLASS,
  TOGGLE_GROUP_ITEM_CLASS,
  TOGGLE_GROUP_PERIOD_CLASS,
  TOGGLE_GROUP_PERIOD_ITEM_CLASS,
} from './toggle-group'

describe('PeriodToggleGroup (#951)', () => {
  it('uses the Export period track, selected pill, and 48px items', () => {
    render(
      <PeriodToggleGroup type="single" aria-label="Export period" value="week">
        <PeriodToggleGroupItem value="week">Week</PeriodToggleGroupItem>
        <PeriodToggleGroupItem value="month">Month</PeriodToggleGroupItem>
      </PeriodToggleGroup>,
    )

    const group = screen.getByRole('radiogroup', { name: 'Export period' })
    expect(TOGGLE_GROUP_CLASS).toContain('rounded-lg')
    expect(TOGGLE_GROUP_CLASS).toContain('bg-muted')
    expect(TOGGLE_GROUP_CLASS).toContain('p-1')
    expect(TOGGLE_GROUP_ITEM_CLASS).toContain('rounded-md')
    expect(TOGGLE_GROUP_ITEM_CLASS).toContain('text-sm')
    expect(TOGGLE_GROUP_ITEM_CLASS).toContain('font-medium')
    expect(TOGGLE_GROUP_ITEM_CLASS).toContain('data-[state=on]:bg-card')
    expect(TOGGLE_GROUP_ITEM_CLASS).toContain('data-[state=on]:shadow-sm')
    expect(TOGGLE_GROUP_PERIOD_CLASS).toBe('flex flex-wrap justify-start')
    expect(TOGGLE_GROUP_PERIOD_ITEM_CLASS).toBe('h-12')

    expect(group).toHaveClass('flex', 'flex-wrap', 'justify-start')
    expect(group).toHaveClass('rounded-lg', 'bg-muted', 'p-1')
    const week = screen.getByRole('radio', { name: 'Week' })
    expect(week).toHaveClass('h-12', 'rounded-md', 'text-sm', 'font-medium')
    expect(week.className).toContain('data-[state=on]:bg-card')
    expect(week.className).toContain('data-[state=on]:shadow-sm')
  })
})
