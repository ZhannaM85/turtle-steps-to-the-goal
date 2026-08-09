import { useEffect, useState } from 'react'
import { Pencil, ScanBarcode, Share2, Star, Trash2 } from 'lucide-react'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import type { MealItem, MealItemServing } from '@/domain/mealItem'
import {
  countMealLibraryNameMatches,
  isBackfilledMealItemSource,
  normalizeMealLibraryName,
  propagateMealLibraryEdit,
  type MealLibraryPropagationPatch,
} from '@/domain/mealItem'
import {
  IndexedDbDailyEntryRepository,
  IndexedDbMealItemRepository,
} from '@/infrastructure/persistence/indexeddb'
import { useOnlineStatus } from '@/shared/hooks'
import { formatBarcodeDisplay } from '@/shared/lib/formatBarcode'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import {
  formatComputedTotal,
  parseOptionalMacro,
  portionsToGrams,
  ratesFromAbsolute,
  scaleFromPer100g,
  totalFromPortion,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { rankBySearchMatch } from '@/shared/lib/searchRank'
import { cn } from '@/shared/lib/utils'
import { useMealItemStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { BarcodeScannerDialog, lookupBarcode } from '@/features/daily-log'
import { ShareFoodDialog, useFoodShareUiStore } from '@/features/food-share'

// #289 — read-only, one-shot lookup outside the store, same module-scope
// pattern MealList.tsx already uses for its own barcode-scan entry point.
const mealItemRepositoryForBarcodeLookup = new IndexedDbMealItemRepository()
// #541 — Settings backfill reads day history once on demand.

/** #583 — protein/fat/carbs labels mirror kcal's /100g cue when that mode
 * is on; portion mode keeps the plain names. */
function macroFieldLabel(
  macro: 'protein' | 'fat' | 'carbs',
  macroMode: 'per100g' | 'perPortion',
  t: ReturnType<typeof useTranslation>,
): string {
  if (macroMode === 'per100g') {
    switch (macro) {
      case 'protein':
        return t.dailyEntry.proteinPer100gLabel
      case 'fat':
        return t.dailyEntry.fatPer100gLabel
      case 'carbs':
        return t.dailyEntry.carbsPer100gLabel
    }
  }
  switch (macro) {
    case 'protein':
      return t.dailyEntry.proteinLabel
    case 'fat':
      return t.dailyEntry.fatLabel
    case 'carbs':
      return t.dailyEntry.carbsLabel
  }
}

/** #583 — stronger field framing on the dense Settings Dishes nutrition
 * inputs (muted panel + default transparent input made borders easy to miss). */
const nutritionFieldClassName = 'border-border bg-background'
const dailyEntryRepositoryForBackfill = new IndexedDbDailyEntryRepository()

function MealItemRow({
  item,
  onRename,
  onDelete,
  onSaveNutrition,
  onToggleFavorite,
  onSaveServings,
  onShare,
}: {
  item: MealItem
  onRename: (id: string, name: string) => void | Promise<void>
  onDelete: (id: string) => void
  onSaveNutrition: (
    name: string,
    nutrition: {
      amountKcal: number
      proteinG: number | undefined
      fatG: number | undefined
      carbsG: number | undefined
      amountG: number
    },
  ) => void | Promise<void>
  onToggleFavorite: (id: string) => void
  onSaveServings: (id: string, servings: MealItemServing[]) => void
  onShare: (item: MealItem) => void
}) {
  const t = useTranslation()
  const locale = useLocale()
  const [value, setValue] = useState(item.name)
  const [isEditingNutrition, setIsEditingNutrition] = useState(false)
  const [kcal100, setKcal100] = useState('')
  const [protein100, setProtein100] = useState('')
  const [fat100, setFat100] = useState('')
  const [carbs100, setCarbs100] = useState('')
  const [amountG, setAmountG] = useState('1')
  // #603 — draft fields for the "add a serving" row only; the list itself
  // reads straight from `item.servings` and commits immediately on
  // add/remove, same "doesn't wait for Save" shape favoriting already has.
  const [draftServingName, setDraftServingName] = useState('')
  const [draftServingGrams, setDraftServingGrams] = useState('')
  // Per 100g / Per portion entry mode (#170, extending #111's toggle from
  // manual meal entry to this screen's editor).
  const [macroMode, setMacroMode] = useState<'per100g' | 'perPortion'>(
    'per100g',
  )

  function commit() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== item.name) {
      void onRename(item.id, trimmed)
    } else {
      setValue(item.name)
    }
  }

  function stopEditing() {
    commit()
    setIsEditingNutrition(false)
  }

  /** #589 — leave edit without saving nutrition or renaming. */
  function cancelEditing() {
    setValue(item.name)
    setIsEditingNutrition(false)
  }

  // Per-100g + quantity (#99), same input model #96 already uses
  // everywhere else — a MealItem's stored lastAmountKcal etc. are the
  // *last logged absolute totals*, so back-calculate a rate + quantity to
  // prefill editing rather than showing the raw totals directly. A bare
  // name with nothing recorded yet just starts blank. Always resets to
  // per100g mode (#170) — same as restoring a suggestion elsewhere in the
  // app, since MealItem.lastAmountKcal etc. don't carry a mode of their own.
  // #584: the same pencil also reveals the name Input (plain text until then).
  function startEditNutrition() {
    setValue(item.name)
    if (item.lastAmountKcal === undefined) {
      setKcal100('')
      setProtein100('')
      setFat100('')
      setCarbs100('')
      setAmountG('1')
    } else {
      const rates = ratesFromAbsolute(
        item.lastAmountKcal,
        item.lastProteinG,
        item.lastFatG,
        item.lastCarbsG,
        item.lastAmountG,
      )
      setKcal100(String(rates.kcal100))
      setProtein100(
        rates.protein100 === undefined ? '' : String(rates.protein100),
      )
      setFat100(rates.fat100 === undefined ? '' : String(rates.fat100))
      setCarbs100(rates.carbs100 === undefined ? '' : String(rates.carbs100))
      setAmountG(String(rates.portions))
    }
    setMacroMode('per100g')
    setIsEditingNutrition(true)
  }

  // Mirrors handleAddMacroModeChange in MealList.tsx — converts the
  // currently-typed numbers rather than silently reinterpreting them under
  // the new mode.
  function handleMacroModeChange(newMode: 'per100g' | 'perPortion') {
    if (newMode === macroMode) return
    const amountNum = parseNumberInput(kcal100)
    if (amountNum && amountNum > 0) {
      if (newMode === 'perPortion') {
        const scaled = scaleFromPer100g(
          amountNum,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          amountG,
        )
        setKcal100(String(scaled.amountKcal))
        setProtein100(
          scaled.proteinG === undefined ? '' : String(scaled.proteinG),
        )
        setFat100(scaled.fatG === undefined ? '' : String(scaled.fatG))
        setCarbs100(scaled.carbsG === undefined ? '' : String(scaled.carbsG))
      } else {
        const rates = ratesFromAbsolute(
          amountNum,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          portionsToGrams(amountG),
        )
        setKcal100(String(rates.kcal100))
        setProtein100(
          rates.protein100 === undefined ? '' : String(rates.protein100),
        )
        setFat100(rates.fat100 === undefined ? '' : String(rates.fat100))
        setCarbs100(rates.carbs100 === undefined ? '' : String(rates.carbs100))
        setAmountG(String(rates.portions))
      }
    }
    setMacroMode(newMode)
  }

  function saveNutrition() {
    const parsedKcal100 = parseNumberInput(kcal100)
    if (parsedKcal100 === undefined || parsedKcal100 < 0) return
    commit()
    const scaled =
      macroMode === 'per100g'
        ? scaleFromPer100g(
            parsedKcal100,
            parseOptionalMacro(protein100),
            parseOptionalMacro(fat100),
            parseOptionalMacro(carbs100),
            amountG,
          )
        : totalFromPortion(
            parsedKcal100,
            parseOptionalMacro(protein100),
            parseOptionalMacro(fat100),
            parseOptionalMacro(carbs100),
            amountG,
          )
    const nameForSave = value.trim() || item.name
    void onSaveNutrition(nameForSave, {
      ...scaled,
      amountG: scaled.amountG ?? 100,
    })
    setIsEditingNutrition(false)
  }

  // #603 — stores the same label in both `en`/`ru` rather than asking a
  // single-language user to also type a translation; see `MealItemServing`'s
  // own doc comment for the reasoning.
  const draftServingGramsNum = parseNumberInput(draftServingGrams)
  const canAddServing =
    draftServingName.trim() !== '' &&
    draftServingGramsNum !== undefined &&
    draftServingGramsNum > 0

  function addServing() {
    if (!canAddServing || draftServingGramsNum === undefined) return
    const name = draftServingName.trim()
    onSaveServings(item.id, [
      ...(item.servings ?? []),
      { en: name, ru: name, grams: draftServingGramsNum },
    ])
    setDraftServingName('')
    setDraftServingGrams('')
  }

  function removeServing(index: number) {
    onSaveServings(
      item.id,
      (item.servings ?? []).filter((_, i) => i !== index),
    )
  }

  const kcal100Num = parseNumberInput(kcal100)
  const nutritionPreview =
    kcal100Num && kcal100Num > 0
      ? formatComputedTotal(
          macroMode === 'per100g'
            ? scaleFromPer100g(
                kcal100Num,
                parseOptionalMacro(protein100),
                parseOptionalMacro(fat100),
                parseOptionalMacro(carbs100),
                amountG,
              )
            : totalFromPortion(
                kcal100Num,
                parseOptionalMacro(protein100),
                parseOptionalMacro(fat100),
                parseOptionalMacro(carbs100),
                amountG,
              ),
          locale,
          t,
        )
      : null

  return (
    <li className="flex flex-col gap-1.5">
      {isEditingNutrition ? (
        // #583 rework — one bordered panel around name + nutrition so the
        // edit chrome reads as a single card (name was outside the border).
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/40 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              aria-label={t.settings.mealItemNameLabel}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  // #589 — commit name with Save / pencil close, not blur,
                  // so Cancel can discard a typed rename.
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              className={cn('h-8 flex-1', nutritionFieldClassName)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                item.favorite
                  ? t.dailyEntry.unfavoriteFoodLabel(item.name)
                  : t.dailyEntry.favoriteFoodLabel(item.name)
              }
              aria-pressed={item.favorite ?? false}
              onClick={() => onToggleFavorite(item.id)}
            >
              <Star
                aria-hidden="true"
                className={cn(item.favorite && 'fill-current')}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.settings.editMealItemLabel(item.name)}
              onClick={() => stopEditing()}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.settings.shareMealItemLabel(item.name)}
              onClick={() => onShare(item)}
            >
              <Share2 aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.settings.deleteMealItemLabel(item.name)}
              onClick={() => onDelete(item.id)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
          {item.barcode && (
            <span className="pl-1 text-xs text-muted-foreground">
              {t.dailyEntry.itemBarcodeLabel(formatBarcodeDisplay(item.barcode))}
            </span>
          )}
          <ToggleGroup
            type="single"
            aria-label={`${t.dailyEntry.macroModeLabel} — ${item.name}`}
            value={macroMode}
            onValueChange={(value) =>
              value && handleMacroModeChange(value as 'per100g' | 'perPortion')
            }
            className="w-fit gap-2 p-0.5"
          >
            <ToggleGroupItem value="per100g" className="h-7 px-3 text-xs">
              {t.dailyEntry.macroModePer100gOption}
            </ToggleGroupItem>
            <ToggleGroupItem value="perPortion" className="h-7 px-3 text-xs">
              {t.dailyEntry.macroModePerPortionOption}
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs font-medium text-foreground">
            {t.dailyEntry.itemNutritionSectionLabel(macroMode === 'per100g')}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {macroMode === 'per100g'
                  ? t.dailyEntry.addCaloriesLabel
                  : t.dailyEntry.addCaloriesPortionLabel}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`${
                  macroMode === 'per100g'
                    ? t.dailyEntry.addCaloriesLabel
                    : t.dailyEntry.addCaloriesPortionLabel
                } — ${item.name}`}
                value={kcal100}
                onChange={(e) => setKcal100(e.target.value)}
                className={cn('h-7 w-16', nutritionFieldClassName)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {macroFieldLabel('protein', macroMode, t)}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`${macroFieldLabel('protein', macroMode, t)} — ${item.name}`}
                value={protein100}
                onChange={(e) => setProtein100(e.target.value)}
                className={cn('h-7 w-14', nutritionFieldClassName)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {macroFieldLabel('fat', macroMode, t)}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`${macroFieldLabel('fat', macroMode, t)} — ${item.name}`}
                value={fat100}
                onChange={(e) => setFat100(e.target.value)}
                className={cn('h-7 w-14', nutritionFieldClassName)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {macroFieldLabel('carbs', macroMode, t)}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`${macroFieldLabel('carbs', macroMode, t)} — ${item.name}`}
                value={carbs100}
                onChange={(e) => setCarbs100(e.target.value)}
                className={cn('h-7 w-14', nutritionFieldClassName)}
              />
            </div>
            {macroMode === 'per100g' ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {t.dailyEntry.itemPortionsLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={`${t.dailyEntry.itemPortionsLabel} — ${item.name}`}
                  value={amountG}
                  onChange={(e) => setAmountG(e.target.value)}
                  className={cn('h-7 w-14', nutritionFieldClassName)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">&nbsp;</span>
                <span className="flex h-7 items-center text-xs text-muted-foreground">
                  {t.dailyEntry.macroModePerPortionOption}
                </span>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={t.settings.saveMealItemLabel(item.name)}
              onClick={saveNutrition}
            >
              {t.dailyEntry.saveButton}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t.settings.cancelAddMealItemLabel}
              onClick={cancelEditing}
            >
              {t.settings.cancelAddMealItemLabel}
            </Button>
          </div>
          {nutritionPreview && (
            <p className="text-xs text-muted-foreground">
              {t.dailyEntry.computedTotalPrefix} {nutritionPreview}
            </p>
          )}
          {/* #603 — named serving descriptors, same convenience #254 gave
           * curated foods; picked up automatically by FoodPickerDialog's
           * own servings toggle once at least one exists. */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-foreground">
              {t.settings.mealItemServingsLabel}
            </p>
            {item.servings && item.servings.length > 0 && (
              <ul className="flex flex-col gap-1">
                {item.servings.map((serving, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1 text-xs text-foreground"
                  >
                    <span>
                      {serving[locale]} —{' '}
                      {formatNumber(serving.grams, locale, 0)}g
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.settings.removeMealItemServingLabel(
                        serving[locale],
                      )}
                      onClick={() => removeServing(index)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {t.settings.mealItemServingNameLabel}
                </span>
                <Input
                  type="text"
                  aria-label={`${t.settings.mealItemServingNameLabel} — ${item.name}`}
                  placeholder={t.settings.mealItemServingNamePlaceholder}
                  value={draftServingName}
                  onChange={(e) => setDraftServingName(e.target.value)}
                  className={cn('h-7 w-28', nutritionFieldClassName)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {t.settings.mealItemServingGramsLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={`${t.settings.mealItemServingGramsLabel} — ${item.name}`}
                  value={draftServingGrams}
                  onChange={(e) => setDraftServingGrams(e.target.value)}
                  className={cn('h-7 w-16', nutritionFieldClassName)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canAddServing}
                onClick={addServing}
              >
                {t.settings.addMealItemServingButton}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {/* #584 — plain text until pencil (same pencil opens nutrition edit). */}
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {item.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                item.favorite
                  ? t.dailyEntry.unfavoriteFoodLabel(item.name)
                  : t.dailyEntry.favoriteFoodLabel(item.name)
              }
              aria-pressed={item.favorite ?? false}
              onClick={() => onToggleFavorite(item.id)}
            >
              <Star
                aria-hidden="true"
                className={cn(item.favorite && 'fill-current')}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.settings.editMealItemLabel(item.name)}
              onClick={() => startEditNutrition()}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.settings.shareMealItemLabel(item.name)}
              onClick={() => onShare(item)}
            >
              <Share2 aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.settings.deleteMealItemLabel(item.name)}
              onClick={() => onDelete(item.id)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
          {item.lastAmountKcal !== undefined && (
            <span className="pl-1 text-xs text-muted-foreground">
              {formatNumber(item.lastAmountKcal, locale, 0)}{' '}
              {t.dailyEntry.kcalUnit} {t.dailyEntry.lastLoggedLabel} ·{' '}
              {macrosSummaryTextCompact(
                item.lastProteinG,
                item.lastFatG,
                item.lastCarbsG,
                locale,
                t,
              )}
            </span>
          )}
          {item.barcode && (
            <span className="pl-1 text-xs text-muted-foreground">
              {t.dailyEntry.itemBarcodeLabel(formatBarcodeDisplay(item.barcode))}
            </span>
          )}
        </>
      )}
    </li>
  )
}

/**
 * Creates a brand-new dictionary entry (#149) — same name + per-100g
 * nutrition fields `MealItemRow`'s own pencil-triggered editor already
 * uses, just starting from a blank draft instead of an existing `MealItem`.
 * `touch(name, nutrition)` is already a create-or-update primitive
 * independent of any day's log, so no new store action is needed here.
 */
function AddMealItemForm({
  onAdd,
  onCancel,
}: {
  onAdd: (
    name: string,
    nutrition: {
      amountKcal: number
      proteinG: number | undefined
      fatG: number | undefined
      carbsG: number | undefined
      amountG: number
    },
    favorite: boolean,
    barcode: string | undefined,
  ) => void
  onCancel: () => void
}) {
  const t = useTranslation()
  const locale = useLocale()
  const isOnline = useOnlineStatus()
  const [name, setName] = useState('')
  const [kcal100, setKcal100] = useState('')
  const [protein100, setProtein100] = useState('')
  const [fat100, setFat100] = useState('')
  const [carbs100, setCarbs100] = useState('')
  const [amountG, setAmountG] = useState('1')
  // #279 — lets a brand-new dish be favorited right at creation time,
  // instead of only afterward via the food picker's own star (#276).
  const [favorite, setFavorite] = useState(false)
  // #289 — same local-first/Open-Food-Facts-fallback scan entry point
  // #256 already gave the daily-log add-row, reused here.
  const [barcode, setBarcode] = useState<string | undefined>(undefined)
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false)
  const [barcodeNotFoundMessage, setBarcodeNotFoundMessage] = useState(false)
  // Per 100g / Per portion entry mode (#170).
  const [macroMode, setMacroMode] = useState<'per100g' | 'perPortion'>(
    'per100g',
  )

  async function handleBarcodeScanned(scanned: string) {
    const result = await lookupBarcode(
      scanned,
      mealItemRepositoryForBarcodeLookup,
      isOnline,
    )
    setBarcodeNotFoundMessage(false)
    setMacroMode('per100g')
    if (result.source === 'local') {
      setName(result.item.name)
      setBarcode(result.item.barcode)
      if (result.item.lastAmountKcal === undefined) {
        setKcal100('')
        setProtein100('')
        setFat100('')
        setCarbs100('')
        setAmountG('1')
      } else {
        const rates = ratesFromAbsolute(
          result.item.lastAmountKcal,
          result.item.lastProteinG,
          result.item.lastFatG,
          result.item.lastCarbsG,
          result.item.lastAmountG,
        )
        setKcal100(String(rates.kcal100))
        setProtein100(
          rates.protein100 === undefined ? '' : String(rates.protein100),
        )
        setFat100(rates.fat100 === undefined ? '' : String(rates.fat100))
        setCarbs100(rates.carbs100 === undefined ? '' : String(rates.carbs100))
        setAmountG(String(rates.portions))
      }
    } else if (result.source === 'openFoodFacts') {
      setName(result.name)
      setKcal100(String(result.kcal100))
      setProtein100(result.protein100 === undefined ? '' : String(result.protein100))
      setFat100(result.fat100 === undefined ? '' : String(result.fat100))
      setCarbs100(result.carbs100 === undefined ? '' : String(result.carbs100))
      setAmountG('1')
      setBarcode(scanned)
    } else {
      setBarcodeNotFoundMessage(true)
      setBarcode(scanned)
    }
  }

  function handleMacroModeChange(newMode: 'per100g' | 'perPortion') {
    if (newMode === macroMode) return
    const amountNum = parseNumberInput(kcal100)
    if (amountNum && amountNum > 0) {
      if (newMode === 'perPortion') {
        const scaled = scaleFromPer100g(
          amountNum,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          amountG,
        )
        setKcal100(String(scaled.amountKcal))
        setProtein100(
          scaled.proteinG === undefined ? '' : String(scaled.proteinG),
        )
        setFat100(scaled.fatG === undefined ? '' : String(scaled.fatG))
        setCarbs100(scaled.carbsG === undefined ? '' : String(scaled.carbsG))
      } else {
        const rates = ratesFromAbsolute(
          amountNum,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          portionsToGrams(amountG),
        )
        setKcal100(String(rates.kcal100))
        setProtein100(
          rates.protein100 === undefined ? '' : String(rates.protein100),
        )
        setFat100(rates.fat100 === undefined ? '' : String(rates.fat100))
        setCarbs100(rates.carbs100 === undefined ? '' : String(rates.carbs100))
        setAmountG(String(rates.portions))
      }
    }
    setMacroMode(newMode)
  }

  const kcal100Num = parseNumberInput(kcal100)
  const canSave = name.trim() !== '' && kcal100Num !== undefined && kcal100Num >= 0
  const scale = (kcalRate: number) =>
    macroMode === 'per100g'
      ? scaleFromPer100g(
          kcalRate,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          amountG,
        )
      : totalFromPortion(
          kcalRate,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          amountG,
        )
  const nutritionPreview =
    kcal100Num && kcal100Num > 0
      ? formatComputedTotal(scale(kcal100Num), locale, t)
      : null

  function save() {
    if (!canSave || kcal100Num === undefined) return
    const scaled = scale(kcal100Num)
    onAdd(
      name.trim(),
      { ...scaled, amountG: scaled.amountG ?? 100 },
      favorite,
      barcode,
    )
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onCancel()}>
      <DialogContent
        size="fullscreen"
        closeLabel={t.settings.closeAddMealItemDialogLabel}
        className="flex flex-col"
      >
        <DialogTitle>{t.settings.addMealItemDialogTitle}</DialogTitle>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pt-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                {t.settings.mealItemNameLabel}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    favorite
                      ? t.dailyEntry.unfavoriteFoodLabel(name || t.settings.mealItemNameLabel)
                      : t.dailyEntry.favoriteFoodLabel(name || t.settings.mealItemNameLabel)
                  }
                  aria-pressed={favorite}
                  onClick={() => setFavorite((prev) => !prev)}
                >
                  <Star aria-hidden="true" className={cn(favorite && 'fill-current')} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.dailyEntry.scanBarcodeButton}
                  onClick={() => setIsBarcodeScannerOpen(true)}
                >
                  <ScanBarcode aria-hidden="true" />
                </Button>
              </div>
            </div>
            <Input
              type="text"
              aria-label={t.settings.mealItemNameLabel}
              placeholder={t.settings.mealItemNameLabel}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          {isBarcodeScannerOpen && (
            <BarcodeScannerDialog
              open={isBarcodeScannerOpen}
              onOpenChange={setIsBarcodeScannerOpen}
              onScanned={handleBarcodeScanned}
            />
          )}
          {barcodeNotFoundMessage && (
            <p className="text-sm text-muted-foreground">
              {t.dailyEntry.noFoodFoundForBarcodeMessage}
            </p>
          )}
          {barcode && (
            <p className="text-sm text-muted-foreground">
              {t.dailyEntry.itemBarcodeLabel(formatBarcodeDisplay(barcode))}
            </p>
          )}
          <ToggleGroup
            type="single"
            aria-label={t.dailyEntry.macroModeLabel}
            value={macroMode}
            onValueChange={(value) =>
              value && handleMacroModeChange(value as 'per100g' | 'perPortion')
            }
            className="w-fit gap-3 p-1"
          >
            <ToggleGroupItem value="per100g" className="h-10 px-4 text-sm">
              {t.dailyEntry.macroModePer100gOption}
            </ToggleGroupItem>
            <ToggleGroupItem value="perPortion" className="h-10 px-4 text-sm">
              {t.dailyEntry.macroModePerPortionOption}
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-sm font-medium text-foreground">
            {t.dailyEntry.itemNutritionSectionLabel(macroMode === 'per100g')}
          </p>
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {macroMode === 'per100g'
                  ? t.dailyEntry.addCaloriesLabel
                  : t.dailyEntry.addCaloriesPortionLabel}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={
                  macroMode === 'per100g'
                    ? t.dailyEntry.addCaloriesLabel
                    : t.dailyEntry.addCaloriesPortionLabel
                }
                value={kcal100}
                onChange={(e) => setKcal100(e.target.value)}
                className={cn('h-12 text-base', nutritionFieldClassName)}
              />
            </div>
            {macroMode === 'per100g' ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">
                  {t.dailyEntry.itemPortionsLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={t.dailyEntry.itemPortionsLabel}
                  value={amountG}
                  onChange={(e) => setAmountG(e.target.value)}
                  className={cn('h-12 text-base', nutritionFieldClassName)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">&nbsp;</span>
                <span className="flex h-12 items-center text-base text-muted-foreground">
                  {t.dailyEntry.macroModePerPortionOption}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {macroFieldLabel('protein', macroMode, t)}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={macroFieldLabel('protein', macroMode, t)}
                value={protein100}
                onChange={(e) => setProtein100(e.target.value)}
                className={cn('h-12 text-base', nutritionFieldClassName)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {macroFieldLabel('fat', macroMode, t)}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={macroFieldLabel('fat', macroMode, t)}
                value={fat100}
                onChange={(e) => setFat100(e.target.value)}
                className={cn('h-12 text-base', nutritionFieldClassName)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {macroFieldLabel('carbs', macroMode, t)}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={macroFieldLabel('carbs', macroMode, t)}
                value={carbs100}
                onChange={(e) => setCarbs100(e.target.value)}
                className={cn('h-12 text-base', nutritionFieldClassName)}
              />
            </div>
          </div>
          {nutritionPreview && (
            <p className="text-sm text-muted-foreground">
              {t.dailyEntry.computedTotalPrefix} {nutritionPreview}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.settings.cancelAddMealItemLabel}
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!canSave}
            onClick={save}
          >
            {t.dailyEntry.saveButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MealItemsSection() {
  const t = useTranslation()
  const items = useMealItemStore((state) => state.items)
  const loadItems = useMealItemStore((state) => state.loadItems)
  const rename = useMealItemStore((state) => state.rename)
  const deleteItem = useMealItemStore((state) => state.deleteItem)
  const touch = useMealItemStore((state) => state.touch)
  const toggleFavorite = useMealItemStore((state) => state.toggleFavorite)
  const setServings = useMealItemStore((state) => state.setServings)
  const backfillFromHistory = useMealItemStore(
    (state) => state.backfillFromHistory,
  )
  const removeBackfilledItems = useMealItemStore(
    (state) => state.removeBackfilledItems,
  )
  const setFoodShareEntryOpen = useFoodShareUiStore((s) => s.setEntryOpen)
  const [isAdding, setIsAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [backfillBusy, setBackfillBusy] = useState(false)
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null)
  const [shareItem, setShareItem] = useState<MealItem | null>(null)
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
  // — filters by name, case-insensitive, empty query shows everything.
  // #204: rankBySearchMatch reorders (doesn't change) the filtered result
  // so exact/whole-word matches surface above ones where the query only
  // occurs mid-word.
  const query = search.trim().toLowerCase()
  const visibleItems = query
    ? rankBySearchMatch(
        items.filter((item) => item.name.toLowerCase().includes(query)),
        query,
        (item) => item.name,
      )
    : items

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
          <Input
            type="text"
            aria-label={t.settings.mealItemSearchLabel}
            placeholder={t.settings.mealItemSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </>
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
        <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto overscroll-y-contain">
          {visibleItems.map((item) => (
            <MealItemRow
              key={item.id}
              item={item}
              onRename={handleRename}
              onDelete={deleteItem}
              onSaveNutrition={handleSaveNutrition}
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
