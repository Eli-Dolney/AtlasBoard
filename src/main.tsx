import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startLocalReminders } from './lib/reminders'
import { ensureStarterData } from './lib/seed'
import { initTheme } from './lib/theme'

initTheme()

void ensureStarterData().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})

if ('Notification' in window) {
  if (Notification.permission === 'granted') startLocalReminders()
}
