import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarcodeScannerDialog } from '@/features/daily-log/BarcodeScannerDialog'
import { useTranslation } from '@/i18n'
import { useMealItemStore } from '@/stores/mealItemStore'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useFoodShareUiStore } from './foodShareUiStore'
import { ImportSharedFoodDialog } from './ImportSharedFoodDialog'
import {
  decodeSharedFoodPayload,
  parseSharedFoodFromText,
  SHARE_FOOD_QUERY_PARAM,
} from './sharedFoodPayload'

/**
 * #661 — mounts once under AppShell: watches `?shareFood=` deep links and
 * owns the import-entry / QR-scan / review dialogs. Settings opens the
 * entry UI via `useFoodShareUiStore`.
 */
export function SharedFoodImportHost() {
  const t = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const items = useMealItemStore((state) => state.items)
  const loadItems = useMealItemStore((state) => state.loadItems)
  const applySharedFood = useMealItemStore((state) => state.applySharedFood)

  const entryOpen = useFoodShareUiStore((s) => s.entryOpen)
  const setEntryOpen = useFoodShareUiStore((s) => s.setEntryOpen)
  const importOpen = useFoodShareUiStore((s) => s.importOpen)
  const payload = useFoodShareUiStore((s) => s.payload)
  const openImport = useFoodShareUiStore((s) => s.openImport)
  const setImportOpen = useFoodShareUiStore((s) => s.setImportOpen)

  const [scanOpen, setScanOpen] = useState(false)
  const [pasteValue, setPasteValue] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  useEffect(() => {
    const raw = searchParams.get(SHARE_FOOD_QUERY_PARAM)
    if (!raw) return
    const decoded = decodeSharedFoodPayload(raw)
    const next = new URLSearchParams(searchParams)
    next.delete(SHARE_FOOD_QUERY_PARAM)
    setSearchParams(next, { replace: true })
    if (decoded) openImport(decoded)
  }, [searchParams, setSearchParams, openImport])

  function handlePasteSubmit() {
    const decoded = parseSharedFoodFromText(pasteValue)
    if (!decoded) {
      setPasteError(t.settings.importSharedFoodPasteInvalidMessage)
      return
    }
    setPasteValue('')
    setPasteError(null)
    openImport(decoded)
  }

  async function handleQrScanned(text: string) {
    const decoded = parseSharedFoodFromText(text)
    if (!decoded) {
      setPasteError(t.settings.importSharedFoodPasteInvalidMessage)
      setEntryOpen(true)
      return
    }
    openImport(decoded)
  }

  return (
    <>
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent closeLabel={t.settings.shareFoodCloseLabel}>
          <DialogTitle>{t.settings.importSharedFoodEntryTitle}</DialogTitle>
          <DialogDescription>
            {t.settings.importSharedFoodEntryDescription}
          </DialogDescription>
          <div className="flex flex-col gap-4 pt-2">
            <Button
              type="button"
              onClick={() => {
                setEntryOpen(false)
                setScanOpen(true)
              }}
            >
              {t.settings.importSharedFoodScanQrButton}
            </Button>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="import-shared-food-paste">
                {t.settings.importSharedFoodPasteLabel}
              </Label>
              <Input
                id="import-shared-food-paste"
                value={pasteValue}
                onChange={(e) => {
                  setPasteValue(e.target.value)
                  setPasteError(null)
                }}
                placeholder={t.settings.importSharedFoodPastePlaceholder}
              />
              {pasteError ? (
                <p className="text-sm text-destructive">{pasteError}</p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="self-start"
                disabled={!pasteValue.trim()}
                onClick={handlePasteSubmit}
              >
                {t.settings.importSharedFoodPasteSubmitButton}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {scanOpen ? (
        <BarcodeScannerDialog
          open={scanOpen}
          onOpenChange={setScanOpen}
          scanKind="qr"
          title={t.settings.importSharedFoodScanQrTitle}
          instructions={t.settings.importSharedFoodScanQrInstructions}
          onScanned={handleQrScanned}
        />
      ) : null}

      <ImportSharedFoodDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        payload={payload}
        existingItems={items}
        onConfirm={async (result) => {
          await applySharedFood({
            name: result.name,
            barcode: result.barcode,
            nutrition: result.nutrition,
            servings: result.servings,
            existingId: result.existingId,
          })
        }}
      />
    </>
  )
}
