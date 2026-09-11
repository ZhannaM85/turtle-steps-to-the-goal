import type { ComponentProps } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'

export interface NoteEditRowProps {
  textareaProps: ComponentProps<typeof Textarea>
  saveLabel: string
  onSave: () => void
  cancelLabel: string
  onCancel: () => void
}

/**
 * Shared Day note-style edit row (#850 / #851): auto-growing textarea
 * (#417) plus a **fixed-size** save checkmark and clear ×. The field still
 * floors at 48px so a short note matches the `icon-xl` buttons (#420 /
 * #841), but the buttons stay 48×48 when the textarea grows — they must
 * not stretch with multi-line height. The row uses `items-center` so those
 * fixed buttons sit in the vertical middle of a tall field (#851). Empty /
 * single-line text (and the placeholder) is padded into that 48px floor so
 * it sits vertically centered (#841 / #852); `content-center` splits any
 * leftover height equally, and a long empty placeholder stays on one line
 * (`placeholder-shown:whitespace-nowrap`) so it cannot wrap into a block
 * that hugs the top. Multi-line growth keeps the same padding so the first
 * line doesn’t jump.
 *
 * Clear × is always shown (day note, morning note, Night food reason,
 * What helped) so peers stay consistent: discard a draft, or revert a
 * saved note.
 */
export function NoteEditRow({
  textareaProps,
  saveLabel,
  onSave,
  cancelLabel,
  onCancel,
}: NoteEditRowProps) {
  const { className: textareaClassName, ...restTextareaProps } = textareaProps

  return (
    <div className="flex items-center gap-3">
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
          'min-h-12 flex-1 py-[11px] text-base md:text-base leading-6 placeholder:leading-6 placeholder-shown:whitespace-nowrap content-center',
        )}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-xl"
        aria-label={saveLabel}
        onClick={onSave}
      >
        <Check aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xl"
        aria-label={cancelLabel}
        onClick={onCancel}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
