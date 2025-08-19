import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startLocalReminders } from './lib/reminders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('Notification' in window) {
  if (Notification.permission === 'default') {
    void Notification.requestPermission()
  }
  startLocalReminders()
}
