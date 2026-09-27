import { createContext, useContext } from 'react'

type SettingsSearchContextValue = {
  query: string
  setQuery: (query: string) => void
}

export const SettingsSearchContext = createContext<SettingsSearchContextValue>({
  query: '',
  setQuery: () => {},
})

export function useSettingsSearchQuery(): string {
  return useContext(SettingsSearchContext).query
}

export function useSetSettingsSearchQuery(): (query: string) => void {
  return useContext(SettingsSearchContext).setQuery
}
