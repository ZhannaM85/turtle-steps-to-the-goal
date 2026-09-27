import { useCallback, useMemo, useState, type ReactNode, type RefCallback } from 'react'
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
import { DayPinContext, useDayPinContext } from './dayPinContext'

/**
 * #1022 — Day section pins. The dock lives in the sticky date header.
 * A pinned section portals into its slot (same React tree, so inputs
 * keep their state) and the in-flow anchor hides so it does not leave
 * a gap. Unpinned sections stay in document order. History does not
 * mount the provider, so these controls render nothing there.
 */
export function DayPinProvider({ children }: { children: ReactNode }) {
  const [stripSlot, setStripSlot] = useState<HTMLElement | null>(null)
  const stripSlotRef = useMemo(() => {
    const callback: RefCallback<HTMLElement> = (el) => setStripSlot(el)
    return () => callback
  }, [])
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
  const value = useMemo(
    () => ({ stripSlot, stripSlotRef, slots, slotCallback }),
    [stripSlot, stripSlotRef, slots, slotCallback],
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

export function DayPinDock() {
  const api = useDayPinContext()
  const pinned = useDaySectionPinStore((state) => state.pinned)
  if (!api || pinned.length === 0) return null
  return (
    <div
      data-slot="day-pin-dock"
      className="mt-2 flex flex-col gap-3 [&:not(:has([data-day-section]))]:hidden"
    >
      {pinned.map((id) => (
        <div
          key={id}
          data-day-pin-slot={id}
          ref={api.slotCallback(id)}
          className="empty:hidden"
        />
      ))}
    </div>
  )
}

export function DayPinFrame({
  id,
  children,
}: {
  id: DaySectionPinId
  children: ReactNode
}) {
  const api = useDayPinContext()
  const pinned = useDaySectionPinStore((state) => state.pinned.includes(id))
  if (!api) return children
  const slot = api.slots[id] ?? null
  const moved = pinned && slot !== null
  const body = (
    <div data-day-section={id} className="min-w-0 bg-background">
      {children}
    </div>
  )
  return (
    <div className={cn(moved && 'hidden')} data-day-pin-anchor={id}>
      {moved ? createPortal(body, slot) : body}
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
