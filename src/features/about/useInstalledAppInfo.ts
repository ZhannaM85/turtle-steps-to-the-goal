import { useEffect, useState } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export type InstalledAppInfo =
  | { kind: 'web' }
  | { kind: 'native'; version: string; build: string }
  | { kind: 'unavailable' }

function initialInstalledAppInfo(): InstalledAppInfo | null {
  if (!Capacitor.isNativePlatform()) return { kind: 'web' }
  return null
}

/**
 * Native version and build from Capacitor `App.getInfo()` (#1130).
 * Web/PWA has no native bundle info — `getInfo()` is unimplemented there —
 * so the caller shows that this is the web version instead of a number.
 */
export function useInstalledAppInfo(): InstalledAppInfo | null {
  const [info, setInfo] = useState<InstalledAppInfo | null>(
    initialInstalledAppInfo,
  )

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false
    App.getInfo()
      .then((appInfo) => {
        if (cancelled) return
        const version = appInfo.version.trim()
        const build = appInfo.build.trim()
        if (!version || !build) {
          setInfo({ kind: 'unavailable' })
          return
        }
        setInfo({ kind: 'native', version, build })
      })
      .catch(() => {
        if (!cancelled) setInfo({ kind: 'unavailable' })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return info
}
