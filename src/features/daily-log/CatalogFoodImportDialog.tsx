import { useTranslation } from '@/i18n'
import type { FoodItem } from '@/data/foods'
import { CatalogFoodImportSection } from '@/features/settings/CatalogFoodImportSection'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'

/** #1054 — Add meal opens the same catalog JSON paste as Settings. */
export function CatalogFoodImportDialog({
  open,
  onOpenChange,
  onPickFood,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPickFood?: (food: FoodItem) => void
}) {
  const t = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.dailyEntry.closeFoodDialogLabel}>
        <DialogTitle className="pr-8">
          {t.settings.catalogFoodImportLabel}
        </DialogTitle>
        <CatalogFoodImportSection framed={false} onPickFood={onPickFood} />
      </DialogContent>
    </Dialog>
  )
}
