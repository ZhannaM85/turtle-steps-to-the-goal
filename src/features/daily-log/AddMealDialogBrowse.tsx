import { useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useLocale, useTranslation } from '@/i18n'
import { formatKcal } from '@/shared/lib/macroDisplay'
import { useOnlineStatus } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  OFF_SEARCH_MIN_CHARS,
  type OnlineFoodHit,
  type OnlineSearchRemoteStatus,
} from './searchOnlineFoods'
import { AddMealPickableItemList } from './AddMealPickableItemList'
import type { PickableItem } from './addMealDialogHelpers'
import type {
  MealSearchDeleteMode,
  MealSearchDeleteResult,
} from './catalogItemDelete'

// #1061 — one scrollport for recents and typed matches. The cap stays
// inside the visible sheet when the keyboard is open; the inner list
// must not start a second scrollbar.
const suggestionPanelClassName =
  'absolute top-full right-0 left-0 z-30 mt-1 flex max-h-[min(12rem,35dvh)] flex-col gap-1 overflow-y-auto overscroll-y-contain rounded-xl bg-popover shadow-md [&_ul]:max-h-none [&_ul]:overflow-visible [&_ul]:bg-popover'

export function AddMealDialogBrowse({
  search,
  query,
  matches,
  recentItems,
  textFor,
  isFavorite,
  onToggleFavorite,
  onPick,
  onDeleteItem,
  deleteMode,
  onOpenManualAdd,
  onlineHits,
  onlineSearchStatus,
  onlineRemoteStatus,
  onRunOnlineSearch,
  onPickOnlineHit,
  onChangeSearch,
  onClearSearch,
  homemadeOnly,
  mealNoteField,
  showEmptyMealNote,
}: {
  search: string
  query: string
  matches: PickableItem[]
  recentItems: PickableItem[]
  textFor: (item: PickableItem) => string
  isFavorite: (item: PickableItem) => boolean
  onToggleFavorite: (item: PickableItem) => void
  onPick: (item: PickableItem) => void
  onDeleteItem?: (item: PickableItem) => Promise<MealSearchDeleteResult>
  deleteMode?: (item: PickableItem) => MealSearchDeleteMode
  onOpenManualAdd: (initialName?: string) => void
  onlineHits: OnlineFoodHit[]
  onlineSearchStatus: 'idle' | 'loading' | 'done'
  onlineRemoteStatus: OnlineSearchRemoteStatus | null
  onRunOnlineSearch: () => void
  onPickOnlineHit: (hit: OnlineFoodHit) => void
  onChangeSearch: (value: string) => void
  onClearSearch: () => void
  homemadeOnly: boolean
  onToggleHomemadeOnly: () => void
  mealNoteField: ReactNode
  showEmptyMealNote: boolean
}) {
  const t = useTranslation()
  const locale = useLocale()
  const isOnline = useOnlineStatus()
  // #1055 / #1057 — one suggestion panel under the field. Empty focus
  // shows recents; a typed query shows matches. Blur or Escape hides it.
  // #1056 — the panel is opaque and stacked above the meal note.
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const showRecentDropdown =
    suggestionOpen && !query && !homemadeOnly && recentItems.length > 0
  const showSearchDropdown = suggestionOpen && Boolean(query)
  const showSuggestionPanel = showRecentDropdown || showSearchDropdown

  return (
    <>
      <div className={cn('relative', showSuggestionPanel && 'z-30')}>
        <Input
          type="text"
          aria-label={t.dailyEntry.foodSearchLabel}
          aria-expanded={showSuggestionPanel}
          placeholder={t.dailyEntry.foodSearchPlaceholder}
          value={search}
          onChange={(e) => onChangeSearch(e.target.value)}
          onFocus={() => setSuggestionOpen(true)}
          onBlur={() => setSuggestionOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSuggestionOpen(false)
          }}
          className={cn('h-12 text-base', search !== '' && 'pr-10')}
        />
        {search !== '' && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t.dailyEntry.clearFoodSearchLabel}
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClearSearch}
          >
            <X aria-hidden="true" className="size-3.5" />
          </Button>
        )}
        {showRecentDropdown && (
          <div
            role="region"
            aria-label={t.dailyEntry.recentFoodsLabel}
            className={suggestionPanelClassName}
            onMouseDown={(event) => event.preventDefault()}
          >
            <AddMealPickableItemList
              items={recentItems}
              textFor={textFor}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              onPick={(item) => {
                setSuggestionOpen(false)
                onPick(item)
              }}
              onDeleteItem={onDeleteItem}
              deleteMode={deleteMode}
              t={t}
              locale={locale}
            />
          </div>
        )}
        {showSearchDropdown && (
          <div
            role="region"
            aria-label={t.dailyEntry.foodSearchResultsLabel}
            className={cn(suggestionPanelClassName, 'gap-3 p-3')}
            onMouseDown={(event) => event.preventDefault()}
          >
            {matches.length === 0 ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground">
                  {t.dailyEntry.noFoodResultsText}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.dailyEntry.cantFindItLeadIn}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => onOpenManualAdd(search.trim())}
                >
                  {t.dailyEntry.cantFindItAddManuallyLabel}
                </Button>
              </div>
            ) : (
              <AddMealPickableItemList
                items={matches}
                textFor={textFor}
                isFavorite={isFavorite}
                onToggleFavorite={onToggleFavorite}
                onPick={(item) => {
                  setSuggestionOpen(false)
                  onPick(item)
                }}
                onDeleteItem={onDeleteItem}
                deleteMode={deleteMode}
                t={t}
                locale={locale}
              />
            )}

            {!homemadeOnly && search.trim().length >= OFF_SEARCH_MIN_CHARS && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={onlineSearchStatus === 'loading'}
                  onClick={onRunOnlineSearch}
                >
                  {onlineSearchStatus === 'loading'
                    ? t.dailyEntry.searchingOnlineLabel
                    : t.dailyEntry.searchOnlineButton}
                </Button>
                {!isOnline && (
                  <p className="text-sm text-muted-foreground">
                    {t.dailyEntry.searchOnlineOfflineBundledHint}
                  </p>
                )}
                {onlineSearchStatus === 'done' &&
                  onlineRemoteStatus === 'unavailable' && (
                    <p className="text-sm text-muted-foreground">
                      {t.dailyEntry.onlineFoodUnavailableText}
                    </p>
                  )}
                {onlineSearchStatus === 'done' &&
                  (onlineHits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t.dailyEntry.noOnlineFoodResultsText}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t.dailyEntry.onlineFoodResultsHeading}
                      </span>
                      <ul className="flex flex-col gap-1">
                        {onlineHits.map((hit) => (
                          <li key={`${hit.code ?? hit.name}-${hit.kcal100}`}>
                            <button
                              type="button"
                              className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-muted"
                              onClick={() => onPickOnlineHit(hit)}
                            >
                              <span className="text-sm font-medium text-foreground">
                                {hit.brand
                                  ? `${hit.name} · ${hit.brand}`
                                  : hit.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatKcal(hit.kcal100, locale, t)}
                                {' · '}
                                {t.dailyEntry.per100gLabel}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* #1058 — Домашнее stays off this screen for now. Tagged foods and
          the dish editor checkbox are unchanged; homemadeOnly still filters
          if a caller sets it. */}

      {!query && homemadeOnly ? (
        recentItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.dailyEntry.noFoodResultsText}
          </p>
        ) : (
          <AddMealPickableItemList
            items={recentItems}
            textFor={textFor}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            onPick={onPick}
            onDeleteItem={onDeleteItem}
            deleteMode={deleteMode}
            t={t}
            locale={locale}
          />
        )
      ) : (
        showEmptyMealNote ? mealNoteField : null
      )}
    </>
  )
}
