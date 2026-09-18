import { useTranslation } from '@/i18n'
import { formatStorageBytes, type StorageBreakdown } from './storageBreakdown'
import { STORAGE_USAGE_CHART_COLORS } from './storageUsageChartColors'

export function StorageUsageBreakdown({ data }: { data: StorageBreakdown }) {
  const t = useTranslation()
  const categories = [
    { label: t.export.storageAppDataLabel, value: data.appData, color: STORAGE_USAGE_CHART_COLORS.appData },
    { label: t.export.storageCacheLabel, value: data.offlineCache, color: STORAGE_USAGE_CHART_COLORS.offlineCache },
    { label: t.export.storageOtherLabel, value: data.other, color: STORAGE_USAGE_CHART_COLORS.other },
  ]
  let cursor = 0
  const sectors = categories.map(({ value, color }) => {
    const start = cursor
    cursor += data.usage > 0 ? (value / data.usage) * 100 : 0
    return `${color} ${start}% ${cursor}%`
  })

  return (
    <div className="mt-2 flex flex-col gap-2" aria-label={t.export.storageBreakdownTitle}>
      <p className="text-sm font-medium">{t.export.storageBreakdownTitle}</p>
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="h-24 w-24 shrink-0 rounded-full"
          style={{ background: data.usage > 0 ? `conic-gradient(${sectors.join(', ')})` : 'var(--muted)' }}
        />
        <ul className="min-w-0 space-y-1 text-xs">
          {categories.map(({ label, value, color }) => (
            <li key={label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span>{label}: {formatStorageBytes(value)}</span>
            </li>
          ))}
          <li>{t.export.storagePdfLabel}: 0 B</li>
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">{t.export.storageBreakdownEstimateNote}</p>
      <p className="text-xs text-muted-foreground">{t.export.storagePdfNote}</p>
    </div>
  )
}
