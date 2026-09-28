import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App'
import DemoPage from './demo/DemoPage'

// /demo runs the user app inside its own in-memory router (a phone frame), so it
// mounts outside the BrowserRouter; React Router does not allow nested routers.
const isDemo = /^\/demo\/?$/.test(window.location.pathname)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDemo ? (
      <DemoPage />
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
)
