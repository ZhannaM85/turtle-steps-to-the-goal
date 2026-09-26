import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { matchSplitText } from './matchSplitText'
import { ReadableNutritionPreview } from './ReadableNutritionPreview'

function span(text: string) {
  return (_content: string, element: Element | null) =>
    element?.tagName === 'SPAN' &&
    element.classList.contains('whitespace-nowrap') &&
    element.textContent === text
}

describe('ReadableNutritionPreview (#1004)', () => {
  it('splits the today line so each macro stays in one token and «было» is its own row', () => {
    render(
      <ReadableNutritionPreview text="Итог за сегодня будет: 1 030 ккал · Б 40г · Ж 46г · У 114г (было 350 ккал · Б 26г · Ж 24г · У 6г)" />,
    )

    const carbs = screen.getByText(span(' · У 114г'))
    const previous = screen.getByText(span('(было 350 ккал'))
    expect(carbs.textContent).toBe(' · У 114г')
    expect(carbs.closest('[data-preview-row]')).toHaveAttribute(
      'data-preview-row',
      'current',
    )
    expect(previous.closest('[data-preview-row]')).toHaveAttribute(
      'data-preview-row',
      'previous',
    )
    expect(carbs.closest('[data-preview-row]')).not.toBe(
      previous.closest('[data-preview-row]'),
    )
    expect(screen.getByText(span(' · У 6г)'))).toBeInTheDocument()
    expect(screen.getByText(span('Итог за сегодня будет:'))).toBeInTheDocument()
    expect(screen.getByText(span(' 1 030 ккал'))).toBeInTheDocument()
    expect(
      screen.getByText(
        matchSplitText(
          'Итог за сегодня будет: 1 030 ккал · Б 40г · Ж 46г · У 114г (было 350 ккал · Б 26г · Ж 24г · У 6г)',
        ),
      ),
    ).toBeInTheDocument()
  })

  it('keeps the entry total macros whole, including the last one', () => {
    render(
      <ReadableNutritionPreview text="Итого: 680 ккал · Б 14г · Ж 22г · У 108г" />,
    )

    expect(screen.getByText(span(' · У 108г'))).toBeInTheDocument()
    expect(document.querySelectorAll('[data-preview-row="previous"]')).toHaveLength(
      0,
    )
  })

  it('puts the previous remaining calories on their own line', () => {
    render(
      <ReadableNutritionPreview text="Останется: 375 ккал (было 1 055 ккал)" />,
    )

    expect(screen.getByText(span('Останется:'))).toBeInTheDocument()
    expect(screen.getByText(span(' 375 ккал'))).toBeInTheDocument()
    expect(screen.getByText(span('(было 1 055 ккал)'))).toHaveClass(
      'whitespace-nowrap',
    )
    expect(
      screen.getByText(span('(было 1 055 ккал)')).closest('[data-preview-row]'),
    ).toHaveAttribute('data-preview-row', 'previous')
  })

  it('uses the same breaks for the English sentence', () => {
    render(
      <ReadableNutritionPreview text="Today would be: 1,030 kcal · P 40g · F 46g · C 114g (was 350 kcal · P 26g · F 24g · C 6g)" />,
    )

    const carbs = screen.getByText(span(' · C 114g'))
    const previous = screen.getByText(span('(was 350 kcal'))
    expect(carbs.closest('[data-preview-row]')).toHaveAttribute(
      'data-preview-row',
      'current',
    )
    expect(previous.closest('[data-preview-row]')).toHaveAttribute(
      'data-preview-row',
      'previous',
    )
    expect(screen.getByText(span('Today would be:'))).toBeInTheDocument()
    expect(screen.getByText(span(' 1,030 kcal'))).toBeInTheDocument()
  })
})
