import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 開発時のみMSW（Service Worker）を起動する。
// 本番ビルドでは早期returnするので、モックのコードはバンドルにも含まれない
async function enableMocking() {
  // return
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser')
  return worker.start()
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
