import { db } from '@/infrastructure/persistence/indexeddb'

export interface StorageBreakdown {
  usage: number
  quota: number | null
  appData: number
  offlineCache: number
  other: number
  source: 'browser' | 'measured'
}

interface DetailedStorageEstimate extends StorageEstimate {
  usageDetails?: Record<string, number>
}

/** Browser totals include database overhead and may be rounded for privacy. */
export function allocateStorageUsage(
  usage: number,
  quota: number | null,
  appData: number,
  offlineCache: number,
  source: StorageBreakdown['source'],
): StorageBreakdown {
  const total = Math.max(0, usage)
  const known = Math.max(0, appData) + Math.max(0, offlineCache)
  const scale = known > total && known > 0 ? total / known : 1
  const data = Math.max(0, appData) * scale
  const cache = Math.max(0, offlineCache) * scale
  return {
    usage: total,
    quota,
    appData: data,
    offlineCache: cache,
    other: known > total ? 0 : Math.max(0, total - data - cache),
    source,
  }
}

async function measureAppDataBytes(): Promise<number> {
  await db.open()
  const encoder = new TextEncoder()
  let bytes = 0
  for (const table of db.tables) {
    await table.each((record: unknown) => {
      bytes += encoder.encode(JSON.stringify(record)).byteLength
    })
  }
  return bytes
}

async function measureOfflineCacheBytes(): Promise<number> {
  if (typeof caches === 'undefined') return 0
  let bytes = 0
  for (const name of await caches.keys()) {
    const cache = await caches.open(name)
    for (const request of await cache.keys()) {
      const response = await cache.match(request)
      if (response) bytes += (await response.blob()).size
    }
  }
  return bytes
}

export async function readStorageBreakdown(): Promise<StorageBreakdown | null> {
  if (!navigator.storage?.estimate) return null
  const estimate = (await navigator.storage.estimate()) as DetailedStorageEstimate
  if (typeof estimate.usage !== 'number') return null
  const quota = typeof estimate.quota === 'number' ? estimate.quota : null
  const details = estimate.usageDetails
  const appData = details?.indexedDB ?? details?.indexedDb
  const offlineCache = details?.caches ?? details?.cacheStorage
  if (typeof appData === 'number' || typeof offlineCache === 'number') {
    return allocateStorageUsage(
      estimate.usage,
      quota,
      appData ?? 0,
      offlineCache ?? 0,
      'browser',
    )
  }

  // Safari may report only the total. Count the app's serialized records and
  // cached response bodies without storing an export or loading whole tables.
  const [dataResult, cacheResult] = await Promise.allSettled([
    measureAppDataBytes(),
    measureOfflineCacheBytes(),
  ])
  return allocateStorageUsage(
    estimate.usage,
    quota,
    dataResult.status === 'fulfilled' ? dataResult.value : 0,
    cacheResult.status === 'fulfilled' ? cacheResult.value : 0,
    'measured',
  )
}

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
