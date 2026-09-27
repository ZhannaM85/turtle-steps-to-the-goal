import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslation } from '@/i18n'
import { getAppScrollport } from '@/shared/lib/appScroll'
import { useTodaySectionsCollapseStore } from '@/stores'
import { useDaySectionPinStore } from '@/stores/daySectionPinStore'
import {
  DAY_MACROS_COMPACT_SUMMARY_CLASSNAME,
  DayMacrosCompactFigures,
} from './DayMacrosCompactSummary'
import {
  daySectionScrollTop,
  formatDayKcalStrip,
  kcalStripRootMarginTopPx,
  kcalStripVisible,
  rectIntersectsBand,
  summaryIsBelowStickyChrome,
} from './dayKcalStripModel'
import { useDayPinContext } from './dayPinContext'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/**
 * #1022 — one-line consumed · remaining strip in the sticky date header.
 * #1029 — only while КБЖУ is collapsed. Expanded cards scroll away with
 * the page and do not mount this strip. An IntersectionObserver on
 * `[data-day-section="macros"]` treats the collapsed row as on screen
 * while any pixel sits below the sticky chrome (rootMargin top = the
 * full intro height, strip included, so mounting the strip cannot slide
 * the row back into view — #1025). A collapsed pin sticks under that
 * chrome, so the strip stays off while the row is still on screen.
 */
export function DayKcalStrip() {
  const slot = useDayPinContext()?.stripSlot ?? null
  const state = useDailyEntryFormStateContext()
  const t = useTranslation()
  const locale = useLocale()
  const macrosPinned = useDaySectionPinStore((s) => s.pinned.includes('macros'))
  const macrosCollapsed = useTodaySectionsCollapseStore((s) => s.sections.macros)
  const [summaryInView, setSummaryInView] = useState(true)
  const hasSummary = Boolean(
    state.dayMacrosSummary || state.dayRemainingMacrosSummary,
  )

  useLayoutEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    let observer: IntersectionObserver | null = null
    let resize: ResizeObserver | null = null
    let cancelled = false

    const liveSummary = () => {
      const el = document.querySelector('[data-day-section="macros"]')
      return el instanceof HTMLElement && el.isConnected ? el : null
    }

    const dockInView = (el: HTMLElement) => {
      const root = getAppScrollport()
      const bounds = root?.getBoundingClientRect() ?? {
        top: 0,
        bottom: window.innerHeight,
      }
      return rectIntersectsBand(el.getBoundingClientRect(), {
        top: bounds.top,
        bottom: bounds.bottom,
      })
    }

    const connect = () => {
      if (cancelled) return
      observer?.disconnect()
      const target = liveSummary()
      if (!target) return
      const root = getAppScrollport()
      const intro = document.querySelector('[data-slot="day-intro"]')
      const introHeight = intro?.getBoundingClientRect().height ?? 0
      const top = kcalStripRootMarginTopPx(introHeight)
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return
          const current = liveSummary()
          if (!current || entry.target !== current) return
          if (current.closest('[data-slot="day-pin-dock"]')) {
            setSummaryInView(entry.isIntersecting || dockInView(current))
            return
          }
          const liveIntro = document.querySelector('[data-slot="day-intro"]')
          const rect = entry.boundingClientRect
          if (liveIntro && rect) {
            setSummaryInView(
              summaryIsBelowStickyChrome({
                summaryBottom: rect.bottom,
                chromeBottom: liveIntro.getBoundingClientRect().bottom,
              }),
            )
            return
          }
          setSummaryInView(entry.isIntersecting)
        },
        { root, rootMargin: `-${top}px 0px 0px 0px`, threshold: 0 },
      )
      observer.observe(target)
      if (!resize && intro instanceof HTMLElement && typeof ResizeObserver !== 'undefined') {
        resize = new ResizeObserver(() => connect())
        resize.observe(intro)
      }
    }

    connect()
    const frame = requestAnimationFrame(() => {
      const el = liveSummary()
      if (el?.closest('[data-slot="day-pin-dock"]')) {
        setSummaryInView(dockInView(el))
      }
      connect()
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      observer?.disconnect()
      resize?.disconnect()
    }
  }, [macrosPinned, hasSummary, macrosCollapsed])

  if (!slot) return null
  const visible = kcalStripVisible({
    hasSummary,
    summaryInView,
    collapsed: macrosCollapsed,
  })
  if (!visible) return null

  const text = formatDayKcalStrip({
    consumedKcal: state.dayTotalCalories,
    remainingKcal: state.remainingKcal,
    proteinG: state.consumedProteinG,
    fatG: state.consumedFatG,
    carbG: state.consumedCarbG,
    locale,
    t,
  })
  const label = text.macros ? `${text.kcal} · ${text.macros}` : text.kcal

  return createPortal(
    <button
      type="button"
      data-slot="day-kcal-strip"
      aria-label={`${t.today.kcalStripLabel}: ${label}`}
      className={DAY_MACROS_COMPACT_SUMMARY_CLASSNAME}
      onClick={() => scrollMacrosIntoView()}
    >
      <DayMacrosCompactFigures kcal={text.kcal} macros={text.macros} />
    </button>,
    slot,
  )
}

function scrollMacrosIntoView() {
  const section = document.querySelector('[data-day-section="macros"]')
  if (!(section instanceof HTMLElement)) return
  const scroller = getAppScrollport()
  const intro = document.querySelector('[data-slot="day-intro"]')
  const introHeight = intro?.getBoundingClientRect().height ?? 0
  if (!scroller) {
    section.scrollIntoView({ block: 'start', behavior: 'smooth' })
    return
  }
  const top = daySectionScrollTop({
    scrollTop: scroller.scrollTop,
    sectionTop: section.getBoundingClientRect().top,
    scrollerTop: scroller.getBoundingClientRect().top,
    introHeight,
  })
  scroller.scrollTo({ top, behavior: 'smooth' })
}
