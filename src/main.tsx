import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import './index.css'
import { router } from '@/app'
import { initBackButtonHandler } from '@/shared/native/backButtonHandler'
import { initDailyReminderNotification } from '@/shared/native/dailyReminderNotification'
import { initWidgetDataSync } from '@/shared/native/widgetDataSync'
import { registerServiceWorker } from '@/shared/lib/registerServiceWorker'

initBackButtonHandler()
initDailyReminderNotification()
initWidgetDataSync()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

// #697 — keep Cap splash (same LaunchScreen turtle) until first paint, then
// a short beat so cold launch isn't a ~0.1s flash (launchAutoHide: false).
if (Capacitor.isNativePlatform()) {
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      void SplashScreen.hide({ fadeOutDuration: 200 })
    }, 600)
  })
}
