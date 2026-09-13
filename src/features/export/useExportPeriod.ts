import { useEffect, useRef, useState } from 'react'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  exportPeriodFileStamp,
  exportPeriodForPreset,
  type ExportRangePreset,
} from './exportPeriodFileStamp'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/** Period + filename stem for ranged backup / Excel / CSV / Markdown (#868). */
export function useExportPeriod() {
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [rangePreset, setRangePreset] = useState<ExportRangePreset>('all')
  const [fileStem, setFileStem] = useState(() =>
    `turtle-steps-daily-log-${exportPeriodFileStamp('', '')}`,
  )
  const earliestEntryDateRef = useRef<string | undefined>(undefined)
  const skipAllAutofillRef = useRef(false)

  function setPeriodRange(
    start: string,
    end: string,
    preset: ExportRangePreset,
  ) {
    if (preset !== 'all') skipAllAutofillRef.current = true
    setFileStem((prev) => {
      const oldDefault = `turtle-steps-daily-log-${exportPeriodFileStamp(periodStart, periodEnd)}`
      const nextDefault = `turtle-steps-daily-log-${exportPeriodFileStamp(start, end)}`
      return prev === oldDefault || !prev.trim() ? nextDefault : prev
    })
    setPeriodStart(start)
    setPeriodEnd(end)
    setRangePreset(preset)
  }

  function applyRangePreset(preset: ExportRangePreset) {
    if (preset === 'custom') {
      skipAllAutofillRef.current = true
      setRangePreset('custom')
      return
    }
    if (preset !== 'all') skipAllAutofillRef.current = true
    const bounds = exportPeriodForPreset(
      preset,
      new Date(),
      earliestEntryDateRef.current,
    )
    setPeriodRange(bounds.start, bounds.end, preset)
  }

  // #830 — All starts blank until we know the first logged day, then fills
  // first-day → today so the date fields and filename show the real span.
  useEffect(() => {
    let cancelled = false
    dailyEntryRepository.getEarliestEntryDate().then((earliest) => {
      if (cancelled) return
      earliestEntryDateRef.current = earliest
      if (skipAllAutofillRef.current) return
      const bounds = exportPeriodForPreset('all', new Date(), earliest)
      setFileStem((prev) => {
        const oldDefault = `turtle-steps-daily-log-${exportPeriodFileStamp('', '')}`
        const nextDefault = `turtle-steps-daily-log-${exportPeriodFileStamp(bounds.start, bounds.end)}`
        return prev === oldDefault || !prev.trim() ? nextDefault : prev
      })
      setPeriodStart(bounds.start)
      setPeriodEnd(bounds.end)
      setRangePreset('all')
    })
    return () => {
      cancelled = true
    }
  }, [])

  return {
    periodStart,
    periodEnd,
    rangePreset,
    fileStem,
    setFileStem,
    setPeriodRange,
    applyRangePreset,
  }
}
