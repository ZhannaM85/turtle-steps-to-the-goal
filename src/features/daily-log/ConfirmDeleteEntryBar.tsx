import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { NoticeBar } from '@/shared/ui/notice-bar'

/**
 * #855 / #670 — two-step inline confirm before deleting a saved Day value.
 * #875 — chrome is `NoticeBar` `confirm` so meals / discard / undo match.
 * #870 — optional `label` for field-specific wording.
 */
export function ConfirmDeleteEntryBar({
  label,
  onConfirm,
  onCancel,
}: {
  label?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useTranslation()
  return (
    <NoticeBar
      variant="confirm"
      actions={
        <>
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
        </>
      }
    >
      {label ?? t.history.confirmDeleteLabel}
    </NoticeBar>
  )
}
