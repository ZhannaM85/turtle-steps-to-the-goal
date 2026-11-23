import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { storeVersions } from '@/data/storeVersions'
import { formatLocalizedDate, useLocaleStore } from '@/i18n'
import { StoreVersionHistory } from './StoreVersionHistory'

describe('StoreVersionHistory', () => {
  it('lists confirmed store versions, most-recent-first, with a locale date', () => {
    useLocaleStore.setState({ locale: 'en' })
    render(<StoreVersionHistory />)

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(storeVersions[0].version)
    for (const line of storeVersions[0].en.split('\n')) {
      expect(items[0]).toHaveTextContent(line)
    }
    expect(items[0]).toHaveTextContent(
      formatLocalizedDate(storeVersions[0].date, 'en'),
    )
    expect(items[0]).not.toHaveTextContent(storeVersions[0].date)
    expect(items.at(-1)).toHaveTextContent(storeVersions.at(-1)!.version)
    expect(items.at(-1)).toHaveTextContent(storeVersions.at(-1)!.en)
  })

  it('shows the Russian store-version text and a Russian date', () => {
    useLocaleStore.setState({ locale: 'ru' })
    render(<StoreVersionHistory />)

    const items = screen.getAllByRole('listitem')
    for (const line of storeVersions[0].ru.split('\n')) {
      expect(items[0]).toHaveTextContent(line)
    }
    expect(items[0]).toHaveTextContent(
      formatLocalizedDate(storeVersions[0].date, 'ru'),
    )

    useLocaleStore.setState({ locale: 'en' })
  })
})