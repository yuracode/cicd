# コマ11｜モック・非同期テスト

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 2 |
| 所要時間 | 90分 |
| 前提コマ | コマ10 React Testing Library②（ユーザー操作テスト） |
| 次コマ | コマ12 カバレッジ計測 |

## 🎯 目標

- **モック（mock）** の役割を説明でき、なぜテストで必要なのかを言える
- `vi.fn()` と `vi.spyOn()` / グローバル `fetch` の差し替えを使い分けられる
- `findBy〜` と `waitFor` で非同期UIの検証ができる

## 📋 導入（15分）

### 前回の振り返り

クリック・入力のテストが書けた。ただ、前のコマ5でやった **APIサンプル** はそのままではテストしづらい。

### 何が困るのか

テストで本物のAPIに通信してしまうと：

- **遅い**（ネットワーク次第で数秒）
- **不安定**（相手が落ちていたらFAIL）
- **副作用**（本番にゴミデータを書くかも）
- **オフラインで動かない**

→ **本物のAPI相当の偽物を差し込む = モック**

### モックを使う場面

1. **外部API**（fetch など）
2. **時間の関係するもの**（`setTimeout`, `Date.now()`）
3. **環境に依存するもの**（`process.env`、ブラウザAPIの一部）
4. **コールバック関数**（前回の `vi.fn()` もモックの一種）

## 🛠 本題（65分）

### 1. モック基礎：vi.fn と vi.spyOn（10分）

**`vi.fn()`** … 新しい「何もしないけど記録する関数」を作る。

```javascript
const handler = vi.fn()
handler('a')
expect(handler).toHaveBeenCalledWith('a')
```

**戻り値も指定できる：**

```javascript
const fn = vi.fn().mockReturnValue(42)
expect(fn()).toBe(42)

const asyncFn = vi.fn().mockResolvedValue({ ok: true })
await asyncFn() // => { ok: true }
```

**`vi.spyOn(obj, 'method')`** … 既存オブジェクトのメソッドを「覗く／差し替える」。

```javascript
const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
console.log('hello')
expect(spy).toHaveBeenCalledWith('hello')
spy.mockRestore() // 元に戻す
```

### 2. fetch をモックする（20分）

前々回作った `ApiSample.jsx` を思い出す：

```jsx
// src/ApiSample.jsx（再掲）
import { useState, useEffect } from 'react'

function ApiSample() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const res = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5')
        if (!res.ok) throw new Error('通信失敗')
        const data = await res.json()
        setTodos(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTodos()
  }, [])

  if (loading) return <p>読み込み中…</p>
  if (error) return <p>エラー：{error}</p>

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          {todo.completed ? '✅' : '⬜'} {todo.title}
        </li>
      ))}
    </ul>
  )
}

export default ApiSample
```

これをテストする。`fetch` を丸ごと差し替える。

```jsx
// src/ApiSample.test.jsx
import { render, screen } from '@testing-library/react'
import { beforeEach, afterEach, vi } from 'vitest'
import ApiSample from './ApiSample'

describe('ApiSample', () => {
  beforeEach(() => {
    // 毎回 fetch を差し替える
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('読み込み中は「読み込み中…」が表示される', () => {
    // fetch が永遠に返らないPromiseを返すようにする
    globalThis.fetch.mockReturnValue(new Promise(() => {}))
    render(<ApiSample />)
    expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  })

  it('取得成功時にリストが表示される', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, title: 'A', completed: false },
        { id: 2, title: 'B', completed: true },
      ],
    })

    render(<ApiSample />)

    // 非同期に現れる要素は findBy で待つ
    expect(await screen.findByText(/A/)).toBeInTheDocument()
    expect(screen.getByText(/B/)).toBeInTheDocument()
  })

  it('通信失敗時にエラーが表示される', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
    })

    render(<ApiSample />)

    expect(await screen.findByText(/エラー/)).toBeInTheDocument()
  })

  it('ネットワーク例外時にもエラー表示される', async () => {
    globalThis.fetch.mockRejectedValue(new Error('network down'))

    render(<ApiSample />)

    expect(await screen.findByText('エラー：network down')).toBeInTheDocument()
  })
})
```

> **ポイント：**
> - **`globalThis.fetch = vi.fn()`**：Node 18+ は `fetch` がグローバルにある。そこを差し替える
> - **`mockResolvedValue(x)`**：「このPromiseを返す非同期関数」にする
> - **`mockRejectedValue(err)`**：エラー版
> - **`findByText`**：**非同期に出てくる要素** を待つ。最大 1000ms で出現を待機

```bash
npm run test
```

### 3. findBy と waitFor の使い分け（10分)

| API | 用途 |
|-----|------|
| `findBy〜` | 要素が非同期で出てくるのを待つ（`get`の非同期版） |
| `waitFor(() => {...})` | 任意のアサーションが満たされるのを待つ |

**例1：findBy の典型**

```javascript
expect(await screen.findByText('読み込み完了')).toBeInTheDocument()
```

**例2：waitFor の典型**（要素が **消える** のを待つ、等）

```javascript
import { waitFor } from '@testing-library/react'

await waitFor(() => {
  expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument()
})
```

> **迷ったら `findBy` を優先**。シンプルで十分なケースが多い。

### 4. タイマーのモック（10分）

時間が絡むコードをテストする例。`setTimeout` の完了を待つのは面倒なので、**仮想タイマー** を使う。

```jsx
// src/AutoHide.jsx
import { useState, useEffect } from 'react'

function AutoHide({ message }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(id)
  }, [])

  if (!visible) return null
  return <p>{message}</p>
}

export default AutoHide
```

```jsx
// src/AutoHide.test.jsx
import { render, screen, act } from '@testing-library/react'
import { vi } from 'vitest'
import AutoHide from './AutoHide'

describe('AutoHide', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('最初はメッセージが見える', () => {
    render(<AutoHide message="Hi" />)
    expect(screen.getByText('Hi')).toBeInTheDocument()
  })

  it('3秒経つと消える', () => {
    render(<AutoHide message="Hi" />)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText('Hi')).not.toBeInTheDocument()
  })
})
```

> **仮想タイマーの利点**：実時間では3秒待つところを、`vi.advanceTimersByTime(3000)` で一瞬で進められる。

### 5. モック使用時の注意点（10分）

**やりすぎ注意：**

- モックだらけのテストは「本物と別物」を確認しているだけになる
- 外部APIやタイマーなど **制御しにくいもの** に限定する

**テスト間の汚染に注意：**

- 各テストの前後で `vi.restoreAllMocks()` や `vi.clearAllMocks()` を呼ぶ
- `beforeEach` / `afterEach` で自動化

**実装詳細を見すぎない：**

- 「fetch が何回呼ばれたか」より「画面に正しく表示されたか」を基本にする

### 6. 一通りテスト実行（5分）

ここまでの全テスト：

```bash
npm run test
```

全PASSすればPhase 2前半はクリア。watchモードの Vitest UI も便利なので紹介：

```bash
npm install -D @vitest/ui
```

`package.json` の scripts に追加：

```json
"test:ui": "vitest --ui"
```

```bash
npm run test:ui
```

ブラウザでテスト結果がグラフィカルに確認できる。

## ✅ まとめ（10分）

### 今日できるようになったこと

- `vi.fn()` / `mockResolvedValue` で外部依存を差し替えられる
- `findBy〜` と `waitFor` で非同期UIを検証できる
- タイマーを仮想化してテスト時間を短縮できる

### よくある詰まりポイント

- **モックのリセット忘れ**：前のテストの設定が残って、別テストが不安定になる
- **async テストなのに await 忘れ**：一見PASSに見えるが、後続テストに漏れる
- **`act(...)` 警告**：state更新を伴う非同期処理で出る。`findBy〜` や `act` で囲むと解消

### 次コマ予告

次回は **カバレッジ**。どれだけのコードをテストが通過したかを計測し、足りていないところを見つける。Phase 2のラスト。

## 📝 課題

1. `ApiSample` にリトライボタンを追加し、ボタン押下で再 fetch する挙動のテストを書く（fetch を2回呼ばせる）
2. 差分をコミットし、これまでのブランチで全テストPASSを確認してから PR を作る
