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
   * 'fullscreen' (#122) is a large flyout instead of the default centered
   * card — for content dense enough that even the 85dvh centered treatment
   * feels cramped. Still one scroll unit (same dvh reasoning as the
   * comment below), just sized to dominate the viewport rather than
   * centered/capped.
   *
   * #461: inset top/bottom by a small fixed gap rather than sitting truly
   * edge-to-edge (`inset-0`/`h-dvh`) — installed iOS home-screen PWAs
   * (standalone display mode only, not Safari itself) intermittently left
   * the screen blank after this dialog closed, recovering only once the
   * user tapped the screen to force a repaint. That only ever happened
   * with this literally-edge-to-edge fixed layer; giving it a real gap
   * from the viewport edges sidesteps whatever WebKit standalone-mode
   * compositing bug that depended on.
   *
   * #461 reopened: still went blank afterward — tried moving
   * `MealItemEditorSheet` off 'fullscreen', then `AddMealDialog` too, but
   * kept recurring for each. **Not actually about this variant at all**:
   * `AddMealDialog` (the one dialog in the reported repro) was reached via
   * a dedicated route (`/entry/:date/meal/:mealId`, #157) rather than
   * opened in place — closing it called `navigate(-1)`, unmounting
   * TodayScreen's whole `<main>` and relying on browser history/
   * `popstate` to bring it back, which is a known-unreliable mechanism in
   * installed standalone iOS PWAs specifically (their own isolated
   * navigation history, separate from a normal Safari tab) — confirmed
   * live via devtools that `<main>` was genuinely *empty* while the
   * dialog was open, not just visually covered. Fixed at the actual
   * source: the route removed entirely, `AddMealDialog` now opens as a
   * plain state-controlled overlay like it already did for adding a new
   * meal (see `MealList.tsx`) — TodayScreen never unmounts, so there's no
   * history round-trip to fail. Both dialogs stayed on 'fullscreen'; the
   * `size="default"` attempts for each were reverted once this was found.
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
            'fixed inset-x-0 top-[calc(env(safe-area-inset-top)+16px)] bottom-[calc(env(safe-area-inset-bottom)+16px)] z-50 overflow-y-auto rounded-xl bg-card p-5 text-card-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
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
