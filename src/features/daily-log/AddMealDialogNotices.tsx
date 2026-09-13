import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { NoticeBar } from '@/shared/ui/notice-bar'

export function AddMealDialogNotices({
  isConfirmingDiscard,
  onConfirmDiscard,
  onCancelDiscard,
  discardConfirmLabel,
  confirmRemoveItemId,
  onConfirmRemoveItem,
  onCancelRemoveItem,
}: {
  isConfirmingDiscard: boolean
  onConfirmDiscard?: () => void
  onCancelDiscard?: () => void
  discardConfirmLabel?: string
  confirmRemoveItemId: string | null
  onConfirmRemoveItem: (itemId: string) => void
  onCancelRemoveItem: () => void
}) {
  const t = useTranslation()
  return (
    <>
      {isConfirmingDiscard && onConfirmDiscard && onCancelDiscard && (
        <NoticeBar
          variant="confirm"
          className="flex-col items-stretch sm:flex-row"
          actions={
            <>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onConfirmDiscard}
              >
                {t.dailyEntry.confirmDiscardInProgressMealYes}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancelDiscard}
              >
                {t.dailyEntry.confirmDiscardInProgressMealNo}
              </Button>
            </>
          }
        >
          {discardConfirmLabel ?? t.dailyEntry.confirmDiscardInProgressMealLabel}
        </NoticeBar>
      )}
      {confirmRemoveItemId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-remove-item-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-card p-5 text-card-foreground shadow-lg ring-1 ring-foreground/10">
            <p
              id="confirm-remove-item-title"
              className="text-sm text-muted-foreground"
            >
              {t.dailyEntry.confirmDeleteItemLabel}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onConfirmRemoveItem(confirmRemoveItemId)}
              >
                {t.dailyEntry.confirmDeleteItemYes}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancelRemoveItem}
              >
                {t.dailyEntry.confirmDeleteItemNo}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
