import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
  type RefCallback,
} from 'react'
import { createPortal } from 'react-dom'
import { Pin } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import {
  DAY_SECTION_PIN_IDS,
  useDaySectionPinStore,
  type DaySectionPinId,
} from '@/stores/daySectionPinStore'
import { useTodaySectionsCollapseStore } from '@/stores/todaySectionsCollapseStore'
import { DayPinContext, useDayPinContext } from './dayPinContext'
import {
  dayPinSortsToTop,
  dayPinSticks,
  daySectionSticks,
  stickyStackTopPx,
  todayCollapseKey,
} from './dayPinPlacement'

/**
 * #1022 / #1031 — Day section pins. A pin always leaves document order
 * for the in-flow list at the top of the Day sections (pin order). Only
 * a collapsed pin is `position: sticky` under the date chrome; an
 * expanded pin scrolls with the page. The anchor hides so the old spot
 * does not leave a gap. History does not mount the provider, so these
 * controls render nothing there.
 */
function usePinSlotMap() {
  const [slots, setSlots] = useState<
    Partial<Record<DaySectionPinId, HTMLElement | null>>
  >({})
  const setSlot = useCallback((id: DaySectionPinId, el: HTMLElement | null) => {
    setSlots((prev) => {
      const current = prev[id] ?? null
      if (current === el) return prev
      if (el === null) {
        if (!(id in prev)) return prev
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: el }
    })
  }, [])
  const slotCallback = useMemo(() => {
    const map = new Map<DaySectionPinId, RefCallback<HTMLElement>>()
    for (const id of DAY_SECTION_PIN_IDS) {
      map.set(id, (el) => setSlot(id, el))
    }
    return (id: DaySectionPinId) => map.get(id) as RefCallback<HTMLElement>
  }, [setSlot])
  return { slots, slotCallback }
}

export function DayPinProvider({ children }: { children: ReactNode }) {
  const [stripSlot, setStripSlot] = useState<HTMLElement | null>(null)
  const stripSlotRef = useMemo(() => {
    const callback: RefCallback<HTMLElement> = (el) => setStripSlot(el)
    return () => callback
  }, [])
  const dock = usePinSlotMap()
  const flow = usePinSlotMap()
  const value = useMemo(
    () => ({
      stripSlot,
      stripSlotRef,
      slots: dock.slots,
      slotCallback: dock.slotCallback,
      flowSlots: flow.slots,
      flowSlotCallback: flow.slotCallback,
    }),
    [stripSlot, stripSlotRef, dock.slots, dock.slotCallback, flow.slots, flow.slotCallback],
  )
  return <DayPinContext.Provider value={value}>{children}</DayPinContext.Provider>
}

export function DayKcalStripSlot() {
  const api = useDayPinContext()
  if (!api) return null
  return (
    <div
      data-slot="day-kcal-strip-slot"
      ref={api.stripSlotRef()}
      className="empty:hidden mt-1.5"
    />
  )
}

function PinnedSlots({
  slot,
  attr,
  className,
  slotClassName = 'empty:hidden',
  callback,
}: {
  slot: string
  attr: string
  className: string
  slotClassName?: string
  callback: (id: DaySectionPinId) => RefCallback<HTMLElement>
}) {
  const api = useDayPinContext()
  const pinned = useDaySectionPinStore((state) => state.pinned)
  if (!api || pinned.length === 0) return null
  return (
    <div data-slot={slot} className={className}>
      {pinned.map((id) => (
        <div
          key={id}
          {...{ [attr]: id }}
          ref={callback(id)}
          className={slotClassName}
        />
      ))}
    </div>
  )
}

/**
 * #1040 / #1041 — `main` is `px-4` and `overflow-x: hidden`. This node is
 * portaled through `display: contents`, so it is a flex item. An explicit
 * width without `shrink-0` flexes back to the content box: `-mx-4` then
 * shifts the bar and the scrollport clips the right edge (side peek and
 * the cut-off stripe). `shrink-0` keeps the widened box. The `::before`
 * paints `bg-background` out to the scrollport clip edge so any gutter
 * the width misses stays opaque. `border-b` is the bottom of that opaque
 * box — the next section scrolls under the fill, not through a bare line.
 * Horizontal paint only; the bar does not grow the page (#1025).
 */
const DAY_PIN_STICKY_BLEED_CLASSNAME = [
  'relative sticky z-[9] -mx-4 w-[calc(100%+2rem)] min-w-[calc(100%+2rem)] max-w-none shrink-0',
  'border-b border-border bg-background px-4 pb-3',
  'before:pointer-events-none before:absolute before:-inset-y-px before:-left-[100vw] before:-right-[100vw]',
  'before:-z-10 before:bg-background before:content-[""]',
].join(' ')

/** Header slot from #1022. Day no longer portals sections here (#1031):
 * an empty dock would still be `display: none`, and keeping bodies out
 * of the sticky chrome avoids the #1025 height thrash. */
export function DayPinDock() {
  const api = useDayPinContext()
  if (!api) return null
  return (
    <PinnedSlots
      slot="day-pin-dock"
      attr="data-day-pin-slot"
      className="mt-2 flex flex-col gap-3 [&:not(:has([data-day-section]))]:hidden"
      callback={api.slotCallback}
    />
  )
}

/** Every pin, in pin order, at the top of the Day section list.
 * `contents` so a collapsed pin's sticky box is the day column, not a
 * wrapper that is only as tall as the row (that wrapper would not stick).
 * The list itself is not sticky (#1025). */
export function DayPinnedFlow() {
  const api = useDayPinContext()
  if (!api) return null
  return (
    <PinnedSlots
      slot="day-pinned-flow"
      attr="data-day-pin-flow"
      className="contents"
      slotClassName="contents"
      callback={api.flowSlotCallback}
    />
  )
}

export function DayPinFrame({
  id,
  children,
  stick,
}: {
  id: DaySectionPinId
  children: ReactNode
  /**
   * Override the collapsed flag. Accordion sections stick only while
   * collapsed; an explicit `false` keeps an expanded pin in the flow list.
   */
  stick?: boolean
}) {
  const api = useDayPinContext()
  const pinnedIds = useDaySectionPinStore((state) => state.pinned)
  const pinned = pinnedIds.includes(id)
  const collapseId = todayCollapseKey(id)
  const collapsed = useTodaySectionsCollapseStore((state) =>
    collapseId ? state.sections[collapseId] : null,
  )
  const collapsedStick = daySectionSticks(collapsed, stick)
  const sticky = dayPinSticks(pinned, collapsedStick)
  const target = dayPinSortsToTop(pinned) ? (api?.flowSlots[id] ?? null) : null
  useLayoutEffect(() => {
    const el = document.querySelector(`[data-day-section="${id}"]`)
    if (!(el instanceof HTMLElement) || target === null || !sticky) {
      if (el instanceof HTMLElement) el.style.removeProperty('top')
      return
    }
    const apply = () => {
      const intro = document.querySelector('[data-slot="day-intro"]')
      const introHeight =
        intro instanceof HTMLElement ? intro.getBoundingClientRect().height : 0
      const previous: number[] = []
      for (const other of pinnedIds) {
        if (other === id) break
        const prev = document.querySelector(`[data-day-section="${other}"]`)
        if (!(prev instanceof HTMLElement)) continue
        if (prev.getAttribute('data-day-pin-sticky') !== 'true') continue
        previous.push(prev.getBoundingClientRect().height)
      }
      el.style.top = `${stickyStackTopPx(introHeight, previous)}px`
    }
    apply()
    if (typeof ResizeObserver === 'undefined') return
    const intro = document.querySelector('[data-slot="day-intro"]')
    if (!(intro instanceof HTMLElement)) return
    const observer = new ResizeObserver(apply)
    observer.observe(intro)
    return () => observer.disconnect()
  }, [id, pinnedIds, sticky, target])
  if (!api) return children
  const body = (
    <div
      data-day-section={id}
      data-day-pin-sticky={target !== null && sticky ? 'true' : 'false'}
      className={cn(
        'min-w-0 bg-background',
        target !== null && sticky && DAY_PIN_STICKY_BLEED_CLASSNAME,
      )}
    >
      {children}
    </div>
  )
  return (
    <div className={cn(target !== null && 'hidden')} data-day-pin-anchor={id}>
      {target !== null ? createPortal(body, target) : body}
    </div>
  )
}

export function DaySectionPinButton({ id }: { id: DaySectionPinId }) {
  const api = useDayPinContext()
  const t = useTranslation()
  const pinned = useDaySectionPinStore((state) => state.pinned.includes(id))
  const toggle = useDaySectionPinStore((state) => state.toggle)
  if (!api) return null
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-touch"
      data-day-pin-button={id}
      aria-label={pinned ? t.today.unpinSectionLabel : t.today.pinSectionLabel}
      aria-pressed={pinned}
      onClick={(event) => {
        event.stopPropagation()
        toggle(id)
      }}
    >
      <Pin className={pinned ? 'fill-current' : undefined} aria-hidden />
    </Button>
  )
}
