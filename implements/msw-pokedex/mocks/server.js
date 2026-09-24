// mocks/server.js（テスト用：Node の中で通信を横取りする）
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
