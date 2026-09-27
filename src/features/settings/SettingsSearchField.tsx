import { useMemo, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  SettingsSearchContext,
  useSetSettingsSearchQuery,
  useSettingsSearchQuery,
} from './settingsSearchContext'

export function SettingsSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('')
  const value = useMemo(() => ({ query, setQuery }), [query])
  return (
    <SettingsSearchContext.Provider value={value}>
      {children}
    </SettingsSearchContext.Provider>
  )
}

export function SettingsSearchField() {
  const t = useTranslation()
  const query = useSettingsSearchQuery()
  const setQuery = useSetSettingsSearchQuery()

  return (
    <div className="relative">
      <Input
        id="settings-search"
        type="search"
        aria-label={t.settings.searchLabel}
        placeholder={t.settings.searchPlaceholder}
        value={query}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => setQuery(event.target.value)}
        className="h-12 pe-12 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {query.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute end-1 top-1/2 -translate-y-1/2"
          aria-label={t.settings.clearSearchLabel}
          onClick={() => setQuery('')}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
