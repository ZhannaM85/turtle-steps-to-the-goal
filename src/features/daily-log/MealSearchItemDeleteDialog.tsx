import { useState } from 'react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import type { MealSearchDeleteMode } from './catalogItemDelete'
import type { PickableItem } from './addMealDialogHelpers'

export function MealSearchItemDeleteDialog({
  item,
  mode,
  name,
  blocked,
  onConfirm,
  onClose,
}: {
  item: PickableItem | null
  mode: MealSearchDeleteMode
  name: string
  blocked: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const t = useTranslation()
  const [busy, setBusy] = useState(false)
  const open = item !== null && mode !== 'none'

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent closeLabel={t.settings.mealItemDeleteConfirmCloseLabel}>
        {blocked ? (
          <>
            <DialogTitle>{t.dailyEntry.catalogItemInUseMessage}</DialogTitle>
            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                {t.dailyEntry.catalogItemInUseDismiss}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle>
              {mode === 'duplicate'
                ? t.dailyEntry.catalogDeleteDuplicateTitle(name)
                : t.dailyEntry.confirmDeleteNamedLabel(name)}
            </DialogTitle>
            {mode === 'duplicate' ? (
              <p className="text-sm text-muted-foreground">
                {t.dailyEntry.catalogDeleteDuplicateDescription}
              </p>
            ) : null}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                {t.history.confirmDeleteNo}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => {
                  void confirm()
                }}
              >
                {t.history.confirmDeleteYes}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
