import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { Textarea } from '@/shared/ui/textarea'
import {
  DayFieldHeader,
  DayFieldHeaderCancelButton,
  DayFieldHeaderSaveButton,
  DayFieldViewActions,
} from './DayFieldHeader'

export interface NoteEditRowProps {
  label: ReactNode
  textareaProps: ComponentProps<typeof Textarea>
  saveLabel: string
  onSave: () => void
  cancelLabel: string
  onCancel: () => void
  /** #854 — empty / whitespace-only must not save; × still clears/reverts. */
  saveDisabled?: boolean
  /**
   * #855 — when a saved value exists, × means delete (parent shows
   * confirm) rather than only reverting a draft. Unsaved drafts still
   * use `onCancel` with no confirm.
   */
  hasSavedValue?: boolean
  deleteLabel?: string
  onDelete?: () => void
}

/**
 * Shared Day note-style editor (#850 / #851 / #858): auto-growing textarea
 * (#417) with ✓ / × on the **title row** so the field is full width.
 * Empty / single-line text (and the placeholder) is padded into a 48px
 * floor so it sits vertically centered (#841 / #852);
 * `placeholder-shown:whitespace-nowrap` keeps a long empty hint on one
 * line. Multi-line growth keeps the same padding so the first line
 * doesn’t jump.
 *
 * Clear × is always shown (day note, morning note, Night food reason,
 * What helped) so peers stay consistent: discard an unsaved draft
 * immediately, or delete a saved note after confirm (#855).
 */
export function NoteEditRow({
  label,
  textareaProps,
  saveLabel,
  onSave,
  cancelLabel,
  onCancel,
  saveDisabled = false,
  hasSavedValue = false,
  deleteLabel,
  onDelete,
}: NoteEditRowProps) {
  const { className: textareaClassName, ...restTextareaProps } = textareaProps
  const clearIsDelete = hasSavedValue && Boolean(onDelete)

  return (
    <>
      <DayFieldHeader
        label={label}
        actions={
          <>
            <DayFieldHeaderSaveButton
              label={saveLabel}
              onClick={onSave}
              disabled={saveDisabled}
            />
            <DayFieldHeaderCancelButton
              label={clearIsDelete ? (deleteLabel ?? cancelLabel) : cancelLabel}
              onClick={() => {
                if (clearIsDelete) {
                  onDelete?.()
                  return
                }
                onCancel()
              }}
            />
          </>
        }
      />
      <Textarea
        {...restTextareaProps}
        className={cn(
          textareaClassName,
          // 48px min-height − 1px border × 2 − 24px `leading-6`, split as
          // padding so one line is centered without growing past the floor.
          // `content-center` balances leftover height (font metrics) instead
          // of leaving it under the first line (#852). `placeholder:leading-6`
          // keeps the hint on the same line-box as typed text; nowrap stops
          // a long morning-note hint wrapping into a 2-line block that
          // hugs the top. `md:text-base` keeps the 16/24 metrics the
          // padding math assumes — the shared Textarea’s `md:text-sm`
          // would otherwise shrink line-height from the md breakpoint.
          'min-h-12 w-full py-[11px] text-base md:text-base leading-6 placeholder:leading-6 placeholder-shown:whitespace-nowrap content-center',
        )}
      />
    </>
  )
}

/** View-mode peer of `NoteEditRow` (#858): pencil + trash on the title row. */
export function NoteDisplayBlock({
  label,
  text,
  editLabel,
  onEdit,
  canDelete = false,
  deleteLabel,
  onDelete,
}: {
  label: ReactNode
  text: ReactNode
  editLabel: string
  onEdit: () => void
  canDelete?: boolean
  deleteLabel?: string
  onDelete?: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <DayFieldHeader
        label={label}
        actions={
          <DayFieldViewActions
            editLabel={editLabel}
            onEdit={onEdit}
            deleteLabel={deleteLabel}
            onDelete={onDelete}
            showDelete={canDelete}
          />
        }
      />
      {/* #189: min-h-12, not a fixed h-12 — a long note wraps. */}
      <div className="flex min-h-12 items-center rounded-lg bg-muted px-3 py-1.5">
        <span className="text-sm text-foreground">{text}</span>
      </div>
    </div>
  )
}
