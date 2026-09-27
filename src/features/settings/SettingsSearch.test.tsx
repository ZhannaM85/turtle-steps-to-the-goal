import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '@/i18n'
import {
  useLastBackupStore,
  useSettingsCardsCollapseStore,
  useSettingsPinStore,
} from '@/stores'
import { SettingsScreen } from './SettingsScreen'

function renderSettings() {
  return render(<SettingsScreen />, { wrapper: MemoryRouter })
}

beforeEach(() => {
  localStorage.clear()
  useSettingsPinStore.setState({ pinned: [] })
  useSettingsCardsCollapseStore.getState().expandAll()
  useLocaleStore.setState({ locale: 'en' })
  useLastBackupStore.setState({
    firstSeenAt: new Date().toISOString(),
    lastExportedAt: new Date().toISOString(),
    dismissedUntil: null,
  })
})

describe('Settings search field (#1018)', () => {
  it('keeps every section when the query is empty', () => {
    renderSettings()

    const search = screen.getByRole('searchbox', { name: 'Search settings' })
    expect(search).toHaveAttribute('placeholder', 'Search settings…')
    expect(search).toHaveValue('')
    expect(
      screen.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Units' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'What to track' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Sleep' })).toBeInTheDocument()
  })

  it('uses the Russian placeholder', () => {
    useLocaleStore.setState({ locale: 'ru' })
    renderSettings()

    expect(
      screen.getByRole('searchbox', { name: 'Поиск настроек' }),
    ).toHaveAttribute('placeholder', 'Поиск настроек…')
  })

  it('filters to the LDL row and restores the full page when cleared', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.type(
      screen.getByRole('searchbox', { name: 'Search settings' }),
      'LDL',
    )

    expect(
      screen.getByRole('switch', { name: 'Show LDL impact' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Sleep' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Units' })).not.toBeInTheDocument()
    // #1020 — the import helper mentions LDL notes, so that row matches too.
    expect(
      screen.getByRole('button', { name: 'Import foods' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(screen.getByRole('searchbox', { name: 'Search settings' })).toHaveValue(
      '',
    )
    expect(screen.getByRole('heading', { name: 'Units' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Sleep' })).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Show LDL impact' }),
    ).toBeInTheDocument()
  })

  it('finds the sleep row from сон', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.type(
      screen.getByRole('searchbox', { name: 'Search settings' }),
      'сон',
    )

    expect(screen.getByRole('switch', { name: 'Sleep' })).toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: 'Show LDL impact' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Units' })).not.toBeInTheDocument()
  })

  it('finds import controls from импорт', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.type(
      screen.getByRole('searchbox', { name: 'Search settings' }),
      'импорт',
    )

    expect(
      screen.getByRole('button', { name: 'Import backup' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import foods' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Units' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Sleep' })).not.toBeInTheDocument()
  })

  it('stacks the sticky header above section pin and collapse icons (#1021)', () => {
    renderSettings()

    const search = screen.getByRole('searchbox', { name: 'Search settings' })
    const sticky = search.parentElement?.parentElement
    expect(sticky).toHaveClass('sticky', 'top-0', 'z-20', 'bg-background')
    expect(sticky).not.toHaveClass('z-10')

    const pin = screen.getAllByRole('button', { name: 'Pin to top' })[0]
    expect(pin?.parentElement).toHaveClass('z-10')
    const collapse = screen.getAllByRole('button', { name: 'Collapse' })[0]
    expect(collapse?.parentElement).toBe(pin?.parentElement)
  })

  it('says when nothing matches', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.type(
      screen.getByRole('searchbox', { name: 'Search settings' }),
      'zzzz-not-a-setting',
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'No settings match that search.',
    )
    expect(screen.queryByRole('heading', { name: 'Units' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'What to track' }),
    ).not.toBeInTheDocument()
  })
})
