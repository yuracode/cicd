// mocks/browser.js（開発用：ブラウザの Service Worker で通信を横取りする）
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
