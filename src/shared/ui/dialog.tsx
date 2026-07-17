import * as React from 'react'
import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { cn } from '@/shared/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger

function DialogContent({
  className,
  children,
  closeLabel,
  size = 'default',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** Accessible name for the close button — no visible text, icon only. */
  closeLabel: string
  /**
   * 'fullscreen' (#122) covers the whole viewport instead of the default
   * centered card — for content dense enough that even the 85dvh centered
   * treatment feels cramped (the meal-item editor's larger touch targets).
   * Still one scroll unit (same dvh reasoning as the comment below), just
   * sized to the full viewport rather than centered/capped.
   */
  size?: 'default' | 'fullscreen'
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // max-h uses dvh (dynamic viewport height), not vh — on mobile,
          // vh doesn't shrink when the on-screen keyboard opens, which let
          // tall dialog content (e.g. FoodPickerDialog, #74) get pushed
          // partly behind the keyboard with no way to scroll to the rest.
          // dvh tracks the actual visible viewport, so capping height and
          // scrolling the whole dialog as one unit keeps everything reachable.
          size === 'default' &&
            'fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-card p-5 text-card-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          size === 'fullscreen' &&
            'fixed inset-0 z-50 h-dvh w-full overflow-y-auto bg-card p-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] text-card-foreground outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg font-semibold text-foreground', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription }
