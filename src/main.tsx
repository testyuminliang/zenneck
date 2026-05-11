import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.tsx'

if (window.location.pathname === '/privacy' || window.location.pathname === '/privacy/') {
  window.location.replace('/privacy/index.html')
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <Analytics />
      <SpeedInsights />
    </StrictMode>,
  )
}
