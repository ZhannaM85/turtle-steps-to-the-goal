import type { ReactNode } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'

/**
 * Shared Day field title row (#858): label left, `icon-sm` actions right.
 * Same geometry as Weight / Sleep / Body composition (#750 / #752 / #798 /
 * #807) so note, steps, and metric-note peers stay aligned.
 */
export function DayFieldHeader({
  label,
  actions,
}: {
  label: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1 text-sm font-medium">
        {label}
      </span>
      {actions ? (
        <span className="flex shrink-0 items-center gap-1">{actions}</span>
      ) : null}
    </div>
  )
}

export function DayFieldHeaderSaveButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        onClick()
      }}
    >
      <Check aria-hidden="true" />
    </Button>
  )
}

export function DayFieldHeaderCancelButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
    >
      <X aria-hidden="true" />
    </Button>
  )
}

export function DayFieldHeaderEditButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
    >
      <Pencil aria-hidden="true" />
    </Button>
  )
}

export function DayFieldHeaderDeleteButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
    >
      <Trash2 aria-hidden="true" />
    </Button>
  )
}

/** View mode: pencil + optional trash (#858). */
export function DayFieldViewActions({
  editLabel,
  onEdit,
  deleteLabel,
  onDelete,
  showDelete = false,
}: {
  editLabel: string
  onEdit: () => void
  deleteLabel?: string
  onDelete?: () => void
  showDelete?: boolean
}) {
  return (
    <>
      <DayFieldHeaderEditButton label={editLabel} onClick={onEdit} />
      {showDelete && deleteLabel && onDelete ? (
        <DayFieldHeaderDeleteButton label={deleteLabel} onClick={onDelete} />
      ) : null}
    </>
  )
}

/**
 * #860 edit-mode rule (all Day fields):
 * - ✓ saves; empty / whitespace stays disabled (#854)
 * - × always cancels / reverts the draft — never deletes
 * - trash deletes a saved value after `ConfirmDeleteEntryBar` (#855)
 * View mode stays pencil + trash. Notes no longer treat × as delete.
 */
export function DayFieldEditActions({
  saveLabel,
  onSave,
  saveDisabled = false,
  cancelLabel,
  onCancel,
  showCancel = false,
  deleteLabel,
  onDelete,
  showDelete = false,
}: {
  saveLabel: string
  onSave: () => void
  saveDisabled?: boolean
  cancelLabel: string
  onCancel: () => void
  showCancel?: boolean
  deleteLabel?: string
  onDelete?: () => void
  showDelete?: boolean
}) {
  return (
    <>
      <DayFieldHeaderSaveButton
        label={saveLabel}
        onClick={onSave}
        disabled={saveDisabled}
      />
      {showCancel ? (
        <DayFieldHeaderCancelButton label={cancelLabel} onClick={onCancel} />
      ) : null}
      {showDelete && deleteLabel && onDelete ? (
        <DayFieldHeaderDeleteButton label={deleteLabel} onClick={onDelete} />
      ) : null}
    </>
  )
}
