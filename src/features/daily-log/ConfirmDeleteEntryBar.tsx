import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'

/**
 * #855 / #670 — two-step inline confirm before deleting a saved Day value.
 * Same muted label + destructive Yes / ghost No as Weight, meals, and
 * History, rather than a Dialog. Copy is `history.confirmDelete*`
 * («Delete this entry?» / «Удалить эту запись?»).
 */
export function ConfirmDeleteEntryBar({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useTranslation()
  return (
    <div className="flex min-h-12 items-center gap-2 rounded-lg bg-muted px-3 py-2">
      <span className="text-sm text-muted-foreground">
        {t.history.confirmDeleteLabel}
      </span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onConfirm}
      >
        {t.history.confirmDeleteYes}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        {t.history.confirmDeleteNo}
      </Button>
    </div>
  )
}
