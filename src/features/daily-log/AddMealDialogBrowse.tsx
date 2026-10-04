import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useLocale, useTranslation } from '@/i18n'
import { formatKcal } from '@/shared/lib/macroDisplay'
import { useOnlineStatus } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
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

// #1061 — one scrollport for recents and typed matches. The inner list
// must not start a second scrollbar.
// #1068 — `min(12rem, 35dvh)` stuck at two rows once the visible viewport
// was taller than ~34rem, leaving empty sheet above the keyboard. Fill
// the space under the search field (about 18rem of chrome above the
// panel), never grow past the old 35dvh cap on a short keyboard viewport,
// and stop at 28rem when the keyboard is closed.
const suggestionPanelClassName =
  'absolute top-full right-0 left-0 z-30 mt-1 flex max-h-[min(28rem,max(35dvh,calc(100dvh-18rem)))] flex-col gap-1 overflow-y-auto overscroll-y-contain rounded-xl bg-popover shadow-md [&_ul]:max-h-none [&_ul]:overflow-visible [&_ul]:bg-popover'

// #1069 — `interactive-widget=resizes-content` shrinks the layout viewport
// while the keyboard is up. A drop of this size is a keyboard, not the
// browser chrome, so that tap only hides the keyboard.
const KEYBOARD_OPEN_DROP_PX = 120

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
  // shows recents; a typed query shows matches.
  // #1056 — the panel is opaque and stacked above the meal note.
  // #1069 — blurring the field (the mobile keyboard going away) leaves
  // the panel up. Escape, a picked row, or a tap outside while the
  // keyboard is already closed hides it.
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportAtFocusRef = useRef<number | null>(null)
  // #1082 — a short tap focuses on pointerup. A drag is the sheet scrolling.
  const tapOriginRef = useRef<{ x: number; y: number } | null>(null)
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  function rememberOpenViewport() {
    const height = window.innerHeight
    const previous = viewportAtFocusRef.current
    if (previous == null || height > previous) {
      viewportAtFocusRef.current = height
    }
  }
  const showRecentDropdown =
    suggestionOpen && !query && !homemadeOnly && recentItems.length > 0
  const showSearchDropdown = suggestionOpen && Boolean(query)
  const showSuggestionPanel = showRecentDropdown || showSearchDropdown

  useEffect(() => {
    if (!suggestionOpen) return
    function keyboardIsOpen() {
      const baseline = viewportAtFocusRef.current
      if (baseline == null) return false
      return window.innerHeight < baseline - KEYBOARD_OPEN_DROP_PX
    }
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current
      if (root && event.target instanceof Node && root.contains(event.target)) {
        return
      }
      if (keyboardIsOpen()) return
      setSuggestionOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setSuggestionOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    // Window capture runs before the dialog's document listener, so Escape
    // closes this list and leaves the meal sheet open.
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [suggestionOpen])

  return (
    <>
      <div
        ref={rootRef}
        className={cn(
          // #1083 — same label-to-control gap as meal name and why-eating.
          'relative grid grid-cols-1 gap-1.5',
          showSuggestionPanel && 'z-30',
        )}
      >
        <Label htmlFor="add-meal-food-search">
          {t.dailyEntry.addMealSearchFieldLabel}
        </Label>
        <Input
          id="add-meal-food-search"
          type="text"
          aria-label={t.dailyEntry.addMealSearchFieldLabel}
          aria-expanded={showSuggestionPanel}
          value={search}
          onChange={(e) => onChangeSearch(e.target.value)}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            rememberOpenViewport()
            tapOriginRef.current = { x: event.clientX, y: event.clientY }
            // #1082 — mounting the list here changes the DOM before iOS
            // focuses the field, so the keyboard waits for a second tap.
            // A field that is already focused (Escape closed the list)
            // still opens here, because focus will not fire again.
            if (document.activeElement === event.currentTarget) {
              setSuggestionOpen(true)
            }
          }}
          onPointerUp={(event) => {
            const origin = tapOriginRef.current
            tapOriginRef.current = null
            if (event.button !== 0 || !origin) return
            const dx = event.clientX - origin.x
            const dy = event.clientY - origin.y
            if (dx * dx + dy * dy > 100) return
            const input = event.currentTarget
            if (document.activeElement !== input) input.focus({ preventScroll: true })
          }}
          onPointerCancel={() => {
            tapOriginRef.current = null
          }}
          onFocus={() => {
            rememberOpenViewport()
            // After the tap's focus event, so the list mount cannot cancel
            // the keyboard the focus just requested.
            queueMicrotask(() => setSuggestionOpen(true))
          }}
          // #1066 — the scroll frame clips outward rings at both sides.
          // Paint the focus ring inside the field so every edge stays visible.
          className={cn(
            'col-start-1 row-start-2 h-12 text-base focus-visible:ring-inset',
            search !== '' && 'pr-10',
          )}
        />
        {search !== '' && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t.dailyEntry.clearFoodSearchLabel}
            className="z-10 col-start-1 row-start-2 mr-1.5 self-center justify-self-end"
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
