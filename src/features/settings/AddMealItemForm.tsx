import { useState } from 'react'
import { ScanBarcode, Star } from 'lucide-react'
import { useLocale, useTranslation } from '@/i18n'
import { useOnlineStatus } from '@/shared/hooks'
import { formatBarcodeDisplay } from '@/shared/lib/formatBarcode'
import {
  formatComputedTotal,
  parseOptionalMacro,
  portionsToGrams,
  ratesFromAbsolute,
  scaleFromPer100g,
  totalFromPortion,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { BarcodeScannerDialog, lookupBarcode } from '@/features/daily-log'
import {
  macroFieldLabel,
  mealItemRepositoryForBarcodeLookup,
  nutritionFieldClassName,
} from './mealItemsSectionShared'

/**
 * Creates a brand-new dictionary entry (#149) — same name + per-100g
 * nutrition fields `MealItemRow`'s own pencil-triggered editor already
 * uses, just starting from a blank draft instead of an existing `MealItem`.
 * `touch(name, nutrition)` is already a create-or-update primitive
 * independent of any day's log, so no new store action is needed here.
 */
export function AddMealItemForm({
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
          <div className="grid grid-cols-2 gap-4 section-shell p-3">
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
