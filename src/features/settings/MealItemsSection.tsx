import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useLocale, useTranslation } from '@/i18n'
import { cn } from '@/shared/lib/utils'
import type { MealItem } from '@/domain/mealItem'
import {
  countMealLibraryNameMatches,
  isBackfilledMealItemSource,
  normalizeMealLibraryName,
  propagateMealLibraryEdit,
  type MealLibraryPropagationPatch,
} from '@/domain/mealItem'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  isMealLibrarySort,
  sortMealLibraryItems,
} from '@/shared/lib/sortMealLibraryItems'
import { useMealItemStore, useMealLibrarySortStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'
import { ShareFoodDialog, useFoodShareUiStore } from '@/features/food-share'
import { AddMealItemForm } from './AddMealItemForm'
import { MealItemRow } from './MealItemRow'
import { mealItemMatchesSearch } from './mealItemsSectionShared'

const dailyEntryRepositoryForBackfill = new IndexedDbDailyEntryRepository()

export function MealItemsSection() {
  const t = useTranslation()
  const locale = useLocale()
  const items = useMealItemStore((state) => state.items)
  const loadItems = useMealItemStore((state) => state.loadItems)
  const rename = useMealItemStore((state) => state.rename)
  const deleteItem = useMealItemStore((state) => state.deleteItem)
  const touch = useMealItemStore((state) => state.touch)
  const toggleFavorite = useMealItemStore((state) => state.toggleFavorite)
  const setServings = useMealItemStore((state) => state.setServings)
  const setBarcode = useMealItemStore((state) => state.setBarcode)
  const reassignBarcode = useMealItemStore((state) => state.reassignBarcode)
  const setBrand = useMealItemStore((state) => state.setBrand)
  const backfillFromHistory = useMealItemStore(
    (state) => state.backfillFromHistory,
  )
  const removeBackfilledItems = useMealItemStore(
    (state) => state.removeBackfilledItems,
  )
  const setFoodShareEntryOpen = useFoodShareUiStore((s) => s.setEntryOpen)
  const sort = useMealLibrarySortStore((state) => state.sort)
  const setSort = useMealLibrarySortStore((state) => state.setSort)
  const [isAdding, setIsAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [barcodeMovedOffer, setBarcodeMovedOffer] = useState<{
    id: string
    name: string
  } | null>(null)
  const [focusItemId, setFocusItemId] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [backfillBusy, setBackfillBusy] = useState(false)
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null)
  const [shareItem, setShareItem] = useState<MealItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MealItem | null>(null)
  // #542 — after a library rename/nutrition save, offer to rewrite matching
  // past CalorieItem lines (confirm first; all-time name match).
  const [propagateOffer, setPropagateOffer] = useState<{
    patch: MealLibraryPropagationPatch
    count: number
  } | null>(null)
  const [propagateBusy, setPropagateBusy] = useState(false)

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const backfilledCount = items.filter((item) =>
    isBackfilledMealItemSource(item.source),
  ).length

  async function offerPropagate(
    matchName: string,
    patch: Omit<MealLibraryPropagationPatch, 'matchName'>,
  ) {
    const entries = await dailyEntryRepositoryForBackfill.getAll()
    const count = countMealLibraryNameMatches(entries, matchName)
    if (count === 0) return
    setPropagateOffer({
      patch: { matchName, ...patch },
      count,
    })
  }

  async function handleRename(id: string, name: string) {
    const oldName = items.find((item) => item.id === id)?.name
    await rename(id, name)
    if (
      oldName &&
      normalizeMealLibraryName(oldName) !== normalizeMealLibraryName(name)
    ) {
      await offerPropagate(oldName, { newName: name })
    }
  }

  async function handleSaveNutrition(
    name: string,
    nutrition: {
      amountKcal: number
      proteinG: number | undefined
      fatG: number | undefined
      carbsG: number | undefined
      amountG: number
    },
  ) {
    await touch(name, nutrition)
    await offerPropagate(name, { nutrition })
  }

  async function confirmPropagate() {
    if (!propagateOffer) return
    setPropagateBusy(true)
    try {
      const entries = await dailyEntryRepositoryForBackfill.getAll()
      const result = propagateMealLibraryEdit(entries, propagateOffer.patch)
      await Promise.all(
        result.entriesToUpsert.map((entry) =>
          dailyEntryRepositoryForBackfill.upsert(entry),
        ),
      )
      setBackfillMessage(
        t.settings.mealLibraryPropagateDoneMessage(result.updatedItemCount),
      )
      setPropagateOffer(null)
    } catch {
      setBackfillMessage(t.settings.mealLibraryPropagateErrorMessage)
    } finally {
      setPropagateBusy(false)
    }
  }

  async function handleBackfillFromHistory() {
    setBackfillBusy(true)
    setBackfillMessage(null)
    try {
      const entries = await dailyEntryRepositoryForBackfill.getAll()
      const result = await backfillFromHistory(entries, 'history-backfill')
      setBackfillMessage(
        result.truncated
          ? t.settings.mealLibraryBackfillTruncatedMessage(
              result.added,
              result.totalUniqueNamed,
            )
          : t.settings.mealLibraryBackfillDoneMessage(result.added),
      )
    } catch {
      setBackfillMessage(t.settings.mealLibraryBackfillErrorMessage)
    } finally {
      setBackfillBusy(false)
    }
  }

  async function handleRemoveBackfilled() {
    setBackfillBusy(true)
    setBackfillMessage(null)
    try {
      const removed = await removeBackfilledItems()
      setBackfillMessage(
        t.settings.mealLibraryBackfillRemovedMessage(removed),
      )
    } catch {
      setBackfillMessage(t.settings.mealLibraryBackfillErrorMessage)
    } finally {
      setBackfillBusy(false)
    }
  }

  // Same filter-as-you-type shape as FoodListSettingsScreen's search (#179)
  // — name, case-insensitive; **#789** also matches barcode digits (spaces
  // ignored). Empty query shows everything. #684 — then sort.
  const query = search.trim().toLowerCase()
  const filteredItems = query
    ? items.filter((item) => mealItemMatchesSearch(item, search))
    : items
  const visibleItems = sortMealLibraryItems(filteredItems, sort, locale)
  // #786 — hide the leftover-food banner as soon as that row is gone (do
  // not wait for an effect). Search is cleared in confirm-delete below.
  const shownMovedOffer =
    barcodeMovedOffer &&
    items.some((item) => item.id === barcodeMovedOffer.id)
      ? barcodeMovedOffer
      : null

  useEffect(() => {
    if (!focusItemId) return
    const row = listRef.current?.querySelector(
      `[data-meal-item-id="${focusItemId}"]`,
    )
    if (row instanceof HTMLElement && typeof row.scrollIntoView === 'function') {
      row.scrollIntoView({ block: 'nearest' })
    }
  }, [focusItemId, search])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t.settings.mealItemsDescription}
      </p>
      <p className="text-sm text-muted-foreground">
        {t.settings.mealLibraryBackfillDescription}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={backfillBusy}
          onClick={() => void handleBackfillFromHistory()}
        >
          {t.settings.mealLibraryBackfillButton}
        </Button>
        {backfilledCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={backfillBusy}
            onClick={() => void handleRemoveBackfilled()}
          >
            {t.settings.mealLibraryBackfillRemoveButton(backfilledCount)}
          </Button>
        )}
      </div>
      {backfillMessage && (
        <p className="text-sm text-muted-foreground" role="status">
          {backfillMessage}
        </p>
      )}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t.settings.mealItemsEmpty}
        </p>
      )}
      {items.length > 0 && (
        <>
          {/* #570 — library size at a glance; while searching, matching subset. */}
          <p className="text-sm text-muted-foreground" role="status">
            {query
              ? t.settings.mealItemsFilteredCount(
                  visibleItems.length,
                  items.length,
                )
              : t.settings.mealItemsCount(items.length)}
          </p>
          {/* #684 — sort near count/search; preference persisted in localStorage. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meal-library-sort">
              {t.settings.mealItemsSortLabel}
            </Label>
            <Select
              id="meal-library-sort"
              aria-label={t.settings.mealItemsSortLabel}
              value={sort}
              onChange={(e) => {
                const next = e.target.value
                if (isMealLibrarySort(next)) setSort(next)
              }}
            >
              <option value="title-asc">{t.settings.mealItemsSortTitleAsc}</option>
              <option value="title-desc">
                {t.settings.mealItemsSortTitleDesc}
              </option>
              <option value="added-newest">
                {t.settings.mealItemsSortAddedNewest}
              </option>
              <option value="added-oldest">
                {t.settings.mealItemsSortAddedOldest}
              </option>
            </Select>
          </div>
          <div className="relative">
            <Input
              type="text"
              aria-label={t.settings.mealItemSearchLabel}
              placeholder={t.settings.mealItemSearchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(search !== '' && 'pr-10')}
            />
            {search !== '' && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t.settings.mealItemSearchClearLabel}
                className="absolute top-1/2 right-1.5 -translate-y-1/2"
                onClick={() => setSearch('')}
              >
                <X aria-hidden="true" className="size-3.5" />
              </Button>
            )}
          </div>
        </>
      )}
      {shownMovedOffer && (
        <div
          className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3"
          role="status"
        >
          <p className="text-sm">
            {t.settings.mealItemBarcodeMovedMessage(shownMovedOffer.name)}
          </p>
          <Button
            type="button"
            variant="link"
            className="h-auto self-start px-0"
            onClick={() => {
              setSearch(shownMovedOffer.name)
              setFocusItemId(shownMovedOffer.id)
            }}
          >
            {t.settings.mealItemBarcodeOpenOtherLabel(shownMovedOffer.name)}
          </Button>
        </div>
      )}
      {query && visibleItems.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t.settings.noMealItemResultsText}
        </p>
      )}
      {visibleItems.length > 0 && (
        // Capped + independently scrollable (#179) — this list lives inside
        // a Settings Card, not its own page, so an unbounded list would
        // otherwise keep growing the whole Settings screen. #192:
        // overscroll-y-contain stops a touch-scroll gesture that reaches
        // this list's top/bottom edge from "chaining" up to scroll the
        // whole page instead — without it, the browser inconsistently
        // decided which scrollable ancestor a given gesture belonged to.
        <ul
          ref={listRef}
          className="flex max-h-96 flex-col gap-2 overflow-y-auto overscroll-y-contain"
        >
          {visibleItems.map((item) => (
            <MealItemRow
              key={item.id}
              item={item}
              onRename={handleRename}
              onDelete={(id) => {
                const item = items.find((row) => row.id === id)
                if (item) setPendingDelete(item)
              }}
              onSaveNutrition={handleSaveNutrition}
              onSaveBarcode={setBarcode}
              onReassignBarcode={reassignBarcode}
              onBarcodeMoved={setBarcodeMovedOffer}
              onSaveBrand={setBrand}
              onToggleFavorite={toggleFavorite}
              onSaveServings={setServings}
              onShare={setShareItem}
            />
          ))}
        </ul>
      )}
      {propagateOffer && (
        <div
          role="alertdialog"
          aria-labelledby="meal-library-propagate-title"
          className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3"
        >
          <p id="meal-library-propagate-title" className="text-sm">
            {t.settings.mealLibraryPropagateConfirmPrompt(
              propagateOffer.count,
              propagateOffer.patch.matchName,
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={propagateBusy}
              onClick={() => void confirmPropagate()}
            >
              {t.settings.mealLibraryPropagateConfirmYes}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={propagateBusy}
              onClick={() => setPropagateOffer(null)}
            >
              {t.settings.mealLibraryPropagateConfirmNo}
            </Button>
          </div>
        </div>
      )}
      {/* #290 — a dedicated full-screen dialog reachable instantly from
       * this button, instead of an inline form revealed at the bottom of
       * a potentially long, already-scrolled list. */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setIsAdding(true)}
        >
          {t.settings.addMealItemButton}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setFoodShareEntryOpen(true)}
        >
          {t.settings.importSharedFoodButton}
        </Button>
      </div>
      {isAdding && (
        <AddMealItemForm
          onAdd={(name, nutrition, favorite, barcode) => {
            touch(name, nutrition, favorite, barcode)
            setIsAdding(false)
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <DialogContent
          closeLabel={t.settings.mealItemDeleteConfirmCloseLabel}
        >
          {pendingDelete ? (
            <div className="flex flex-col gap-3">
              <DialogTitle>
                {t.settings.mealItemDeleteConfirmTitle(pendingDelete.name)}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {t.settings.mealItemDeleteConfirmDescription}
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPendingDelete(null)}
                >
                  {t.history.confirmDeleteNo}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    const deleted = pendingDelete
                    void deleteItem(deleted.id)
                    setPendingDelete(null)
                    if (barcodeMovedOffer?.id === deleted.id) {
                      setBarcodeMovedOffer(null)
                      if (
                        search.trim().toLowerCase() ===
                        deleted.name.toLowerCase()
                      ) {
                        setSearch('')
                      }
                      setFocusItemId((current) =>
                        current === deleted.id ? null : current,
                      )
                    }
                  }}
                >
                  {t.history.confirmDeleteYes}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <ShareFoodDialog
        open={shareItem !== null}
        onOpenChange={(open) => {
          if (!open) setShareItem(null)
        }}
        item={shareItem}
      />
    </div>
  )
}

