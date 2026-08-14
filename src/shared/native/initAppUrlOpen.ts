import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { router } from '@/app'
import { searchFromIncomingShareUrl } from './searchFromIncomingShareUrl'

/**
 * #724 — iOS native: a day-log (or food-share) URL opened from the share
 * sheet / a link lands on the existing confirm UI, not a silent write.
 * No-op on web/PWA (#721 already watches `?shareDay=`).
 */
export function initAppUrlOpen() {
  if (!Capacitor.isNativePlatform()) return

  const apply = (url: string) => {
    const search = searchFromIncomingShareUrl(url)
    if (!search) return
    void router.navigate({ pathname: '/', search })
  }

  void App.getLaunchUrl().then((result) => {
    if (result?.url) apply(result.url)
  })
  void App.addListener('appUrlOpen', ({ url }) => {
    apply(url)
  })
}
