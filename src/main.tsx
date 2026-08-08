import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from '@/app'
import { initBackButtonHandler } from '@/shared/native/backButtonHandler'
import { initDailyReminderNotification } from '@/shared/native/dailyReminderNotification'
import { registerServiceWorker } from '@/shared/lib/registerServiceWorker'

initBackButtonHandler()
initDailyReminderNotification()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
