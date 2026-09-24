'use client'

import { useEffect, useState } from 'react'

// NEXT_PUBLIC_API_MOCKING=enabled のときだけ、ブラウザで MSW（Service Worker）を起動する。
// 起動が終わるまで画面を描かないことで、最初の通信からモックに横取りさせる
const isMockingEnabled = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'

// 開発中の React は effect を2回実行して確かめるので、起動は1回だけにする
let startPromise = null

function startMocking() {
  if (!startPromise) {
    startPromise = import('@/mocks/browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }))
  }
  return startPromise
}

export default function MswProvider({ children }) {
  const [isReady, setIsReady] = useState(!isMockingEnabled)

  useEffect(() => {
    if (isReady) return
    startMocking().then(() => setIsReady(true))
  }, [isReady])

  if (!isReady) return null
  return children
}
