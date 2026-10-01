import { useState, type ReactNode } from 'react'
import { ChefHat, FileJson, QrCode, ScanBarcode, Utensils, X } from 'lucide-react'
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
import { AddMealQuickActionCard } from './AddMealQuickActionCard'
import { CatalogFoodImportDialog } from './CatalogFoodImportDialog'
import { HomemadeFoodFilterChip } from './HomemadeFoodFilterChip'
import type { PickableItem } from './addMealDialogHelpers'
import type {
  MealSearchDeleteMode,
  MealSearchDeleteResult,
} from './catalogItemDelete'

const suggestionPanelClassName =
  'absolute top-full right-0 left-0 z-30 mt-1 flex flex-col gap-1 rounded-xl bg-popover shadow-md [&_ul]:bg-popover'

export function AddMealDialogBrowse({
  mealLabel,
  search,
  query,
  matches,
  recentItems,
  allMealItemsCount,
  recentCount,
  showAllRecent,
  onToggleShowAllRecent,
  textFor,
  isFavorite,
  onToggleFavorite,
  onPick,
  onDeleteItem,
  deleteMode,
  onOpenManualAdd,
  onOpenBarcode,
  onOpenRecipe,
  onImportSharedFood,
  onlineHits,
  onlineSearchStatus,
  onlineRemoteStatus,
  onRunOnlineSearch,
  onPickOnlineHit,
  onChangeSearch,
  onClearSearch,
  homemadeOnly,
  onToggleHomemadeOnly,
  mealNoteField,
  showEmptyMealNote,
}: {
  mealLabel: string
  search: string
  query: string
  matches: PickableItem[]
  recentItems: PickableItem[]
  allMealItemsCount: number
  recentCount: number
  showAllRecent: boolean
  onToggleShowAllRecent: () => void
  textFor: (item: PickableItem) => string
  isFavorite: (item: PickableItem) => boolean
  onToggleFavorite: (item: PickableItem) => void
  onPick: (item: PickableItem) => void
  onDeleteItem?: (item: PickableItem) => Promise<MealSearchDeleteResult>
  deleteMode?: (item: PickableItem) => MealSearchDeleteMode
  onOpenManualAdd: (initialName?: string) => void
  onOpenBarcode: () => void
  onOpenRecipe: () => void
  onImportSharedFood: () => void
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
  const [catalogImportOpen, setCatalogImportOpen] = useState(false)
  // #1055 / #1057 — one suggestion panel under the field. Empty focus
  // shows recents; a typed query shows matches. Blur or Escape hides it.
  // #1056 — the panel is opaque and stacked above the homemade chip and note.
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const showRecentDropdown =
    suggestionOpen && !query && !homemadeOnly && recentItems.length > 0
  const showSearchDropdown = suggestionOpen && Boolean(query)
  const showSuggestionPanel = showRecentDropdown || showSearchDropdown

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        <AddMealQuickActionCard
          Icon={Utensils}
          label={t.dailyEntry.quickActionAddFoodLabel}
          onClick={() => onOpenManualAdd()}
        />
        <AddMealQuickActionCard
          Icon={ScanBarcode}
          label={t.dailyEntry.scanBarcodeButton}
          ariaLabel={`${t.dailyEntry.scanBarcodeButton} — ${mealLabel}`}
          onClick={onOpenBarcode}
        />
        <AddMealQuickActionCard
          Icon={ChefHat}
          label={t.recipes.logRecipeButton}
          onClick={onOpenRecipe}
        />
        <AddMealQuickActionCard
          Icon={QrCode}
          label={t.dailyEntry.quickActionImportSharedFoodLabel}
          onClick={onImportSharedFood}
        />
        <AddMealQuickActionCard
          Icon={FileJson}
          label={t.dailyEntry.quickActionImportCatalogLabel}
          onClick={() => setCatalogImportOpen(true)}
        />
      </div>
      {catalogImportOpen && (
        <CatalogFoodImportDialog
          open
          onOpenChange={setCatalogImportOpen}
        />
      )}
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
            {allMealItemsCount > recentCount && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start bg-popover"
                onClick={onToggleShowAllRecent}
              >
                {showAllRecent
                  ? t.dailyEntry.collapseRecentLabel
                  : t.dailyEntry.showAllRecentLabel}
              </Button>
            )}
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
      <HomemadeFoodFilterChip
        pressed={homemadeOnly}
        onToggle={onToggleHomemadeOnly}
      />

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
