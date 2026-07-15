import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen()) // 全テスト開始前：横取り開始
afterEach(() => server.resetHandlers()) // 各テスト後：ハンドラを初期状態に戻す
afterAll(() => server.close()) // 全テスト終了後：横取り解除
