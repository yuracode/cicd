# コマ12｜モックと非同期のテスト

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 2 |
| 所要時間 | 90分 |
| 前提コマ | コマ11 React Testing Library②（ユーザー操作のテスト） |
| 次コマ | コマ13 カバレッジとNext.jsのテスト戦略 |

##  目標

- `jest.spyOn` / `jest.mock` で、確認ダイアログや `next/navigation` を偽物（モック）に置き換えてテストできる
- `fetch` をモックして、通信の成功・失敗をテストで再現できる
- 「あとから画面が変わる」非同期の処理を `findBy` や `waitForElementToBeRemoved` で待ってテストできる

##  導入

### 前回の振り返り

```powershell
cd ~/workspace/todo-app
git switch main
git pull
npm test
```

前回は `user-event` で操作し、`jest.fn()` を props に渡して「呼ばれたか」を確かめた。

> 前回までの内容がない人は、コマ8の本題 3〜4（Jest の導入）を先に済ませておく。今日テストする部品は本題に全文を載せてある。

### 今日のテーマ：テストしにくいもの

TODO アプリには、そのままではテストしにくいものが残っている。

| テストしにくいもの | なぜ困るか |
|------------------|-----------|
| `window.confirm`（確認ダイアログ） | テスト中に「OK」を押してくれる人がいない |
| `usePathname`（今の URL） | テストには Next.js のページ移動の仕組みがない |
| `fetch`（通信） | 相手のサーバが落ちていたらテストも落ちる。遅い。失敗の再現が難しい |

こうしたものは **偽物（モック）に置き換えて**、「OK が押されたら」「URL が `/about` なら」「通信が失敗したら」という状況を自由に作ってテストする。

##  本題

### 1. jest.spyOn：確認ダイアログを置き換える

コマ7で作った「すべて削除」は、`window.confirm` で確認してから削除する。

```jsx
// components/TodoApp.js（該当部分）
function clearAll() {
  if (!window.confirm('すべての TODO を削除しますか？')) return
  setTodos([])
}
```

```powershell
git switch -c test/mocks
```

```jsx
// components/TodoApp.test.js（追加）
afterEach(() => {
  jest.restoreAllMocks()
})

test('すべて削除：キャンセルしたら何も消えない', async () => {
  const user = userEvent.setup()
  localStorage.setItem('todos', JSON.stringify([{ id: '1', text: '牛乳を買う', done: false }]))
  jest.spyOn(window, 'confirm').mockReturnValue(false)
  render(<TodoApp />)

  await user.click(screen.getByRole('button', { name: 'すべて削除' }))

  expect(window.confirm).toHaveBeenCalledWith('すべての TODO を削除しますか？')
  expect(screen.getByText('牛乳を買う')).toBeInTheDocument()
})
```

| 部分 | 意味 |
|------|------|
| `jest.spyOn(window, 'confirm')` | `window.confirm` を見張り、呼ばれた記録を取れるようにする |
| `.mockReturnValue(false)` | 呼ばれたら **本物のダイアログを出さずに** `false`（キャンセル）を返す |
| `jest.restoreAllMocks()` | テストのあとで本物に戻す。戻さないと次のテストにも偽物が残る |

`afterEach` は `beforeEach` の逆で、**各テストのあとに毎回** 実行される。

### 2. jest.mock：モジュールを丸ごと置き換える

コマ6の `Header` は、`next/navigation` の `usePathname` で今のページを調べている。

```jsx
// components/Header.js
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'TODO' },
  { href: '/about', label: 'このアプリについて' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="header">
      <nav>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? 'nav-link active' : 'nav-link'}
            aria-current={pathname === link.href ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
```

テストでは Next.js のページ移動の仕組みが動いていないので、`usePathname` の結果を **自分で決める**。

```jsx
// components/Header.test.js
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import Header from './Header'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

test('/ にいるときは「TODO」が現在のページになる', () => {
  usePathname.mockReturnValue('/')

  render(<Header />)

  expect(screen.getByRole('link', { name: 'TODO' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'このアプリについて' })).not.toHaveAttribute('aria-current')
})
```

- **`jest.mock('モジュール名', () => ({ ... }))`**：そのモジュールを import したとき、本物の代わりに `{ ... }` の中身が返るようにする。ファイルのどこに書いても、import より先に実行される
- `usePathname: jest.fn()`：中身は「記録係の関数」にしておき、テストごとに `mockReturnValue` で返す値を決める
- **`aria-current`** で確かめているのは、クラス名（`active`）より **利用者にとっての意味** に近いから

```powershell
npm test
git add .
git commit -m "test: 確認ダイアログとHeaderのテストをモックで追加"
```

### 3. 通信する関数を作る

TODO アプリに「サンプルを読み込む」機能を追加する。**JSONPlaceholder**（学習用の無料のお試し API）から TODO を3件取ってくる。

ブラウザで次の URL を開いてみる。

```text
https://jsonplaceholder.typicode.com/todos?_limit=3
```

```json
[
  { "userId": 1, "id": 1, "title": "delectus aut autem", "completed": false },
  ...
]
```

`title` だけを取り出して配列で返す関数を `lib/api.js` に作る。

```js
// lib/api.js
const SAMPLE_URL = 'https://jsonplaceholder.typicode.com/todos?_limit=3'

export async function fetchSampleTodos() {
  const res = await fetch(SAMPLE_URL)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.map((item) => item.title)
}
```

> **async / await のおさらい**：`fetch` は結果が返るまで時間がかかる。`await` を付けると「結果が返ってくるまで待ってから次の行へ進む」。`await` を使う関数には `async` を付ける。`async` 関数は、戻り値を **Promise**（あとで結果が届く約束）に包んで返す。
>
> **`res.ok`**：通信が成功（ステータスコードが 200 番台）なら `true`。サーバが 404 や 500 を返したときは `false` になる。`fetch` は **サーバがエラーを返しても自分からはエラーを投げない** ので、自分で確かめて `throw` する。

### 4. fetch をモックしてテストする

テストで本物の JSONPlaceholder に通信すると、

- ネットがない場所ではテストが落ちる
- 相手が落ちているとテストも落ちる
- 「サーバが 500 を返した」状況を作れない

そこで `fetch` を偽物にする。**jsdom（偽物のブラウザ）にはもともと `fetch` がない** ので、テストの中で用意する。

```js
// lib/api.test.js
import { fetchSampleTodos } from './api'

beforeEach(() => {
  global.fetch = jest.fn()
})

test('成功したら title だけの配列を返す', async () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => [
      { id: 1, title: 'delectus aut autem', completed: false },
      { id: 2, title: 'quis ut nam facilis', completed: true },
    ],
  })

  const result = await fetchSampleTodos()

  expect(result).toEqual(['delectus aut autem', 'quis ut nam facilis'])
  expect(fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/todos?_limit=3')
})

test('サーバがエラーを返したら例外を投げる', async () => {
  fetch.mockResolvedValue({ ok: false, status: 500 })

  await expect(fetchSampleTodos()).rejects.toThrow('HTTP 500')
})
```

| 部分 | 意味 |
|------|------|
| `global.fetch = jest.fn()` | テスト中の `fetch` を記録係の偽物にする |
| `mockResolvedValue(値)` | 呼ばれたら「値」で **成功する Promise** を返す |
| `json: async () => [...]` | 本物のレスポンスと同じく、`res.json()` で中身が取れるようにする |
| `await expect(...).rejects.toThrow(...)` | Promise が **失敗する** ことを確かめる |

偽物のレスポンスには、**関数が実際に使う部分（`ok`、`status`、`json`）だけ** 用意すればよい。

```powershell
npm test
git add .
git commit -m "feat: サンプルTODOを取得する fetchSampleTodos を追加"
```

### 5. 読み込みボタンの部品を作る

```jsx
// components/SampleLoader.js
'use client'

import { useState } from 'react'
import { fetchSampleTodos } from '@/lib/api'

export default function SampleLoader({ onLoad }) {
  const [status, setStatus] = useState('idle')

  async function handleClick() {
    setStatus('loading')
    try {
      const texts = await fetchSampleTodos()
      onLoad(texts)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={status === 'loading'}>
        サンプルを読み込む
      </button>
      {status === 'loading' && <p>読み込み中…</p>}
      {status === 'error' && <p role="alert">読み込みに失敗しました</p>}
    </div>
  )
}
```

状態を `'idle'`（待機）/ `'loading'`（読み込み中）/ `'error'`（失敗）の3つの文字列で表している。「読み込み中なのにエラー」のようなありえない組み合わせが起きない。

`TodoApp` に組み込む。

```jsx
// components/TodoApp.js（追加部分）
import SampleLoader from './SampleLoader'

// コンポーネントの中
function handleLoadSamples(texts) {
  setTodos(texts.reduce((acc, text) => addTodo(acc, text), todos))
}

// return の中、<TodoForm ... /> の下
<SampleLoader onLoad={handleLoadSamples} />
```

`reduce` で、受け取った文字の数だけ `addTodo` を順に適用している。ブラウザで「サンプルを読み込む」を押し、英語の TODO が3件増えることを確かめる。

### 6. 部品のテストでは lib/api を丸ごとモックする

`SampleLoader` のテストでは、「`fetchSampleTodos` がどう動くか」は `lib/api.test.js` で確かめ済み。ここでは **`fetchSampleTodos` が成功・失敗したときに画面がどうなるか** だけを確かめたいので、`lib/api` ごとモックする。

```jsx
// components/SampleLoader.test.js
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fetchSampleTodos } from '@/lib/api'
import SampleLoader from './SampleLoader'

jest.mock('@/lib/api')

test('読み込みに成功したら、取得した文字で onLoad が呼ばれる', async () => {
  const user = userEvent.setup()
  fetchSampleTodos.mockResolvedValue(['サンプル1', 'サンプル2'])
  const handleLoad = jest.fn()
  render(<SampleLoader onLoad={handleLoad} />)

  await user.click(screen.getByRole('button', { name: 'サンプルを読み込む' }))

  expect(handleLoad).toHaveBeenCalledWith(['サンプル1', 'サンプル2'])
})

test('読み込みに失敗したらエラーメッセージを表示する', async () => {
  const user = userEvent.setup()
  fetchSampleTodos.mockRejectedValue(new Error('HTTP 500'))
  render(<SampleLoader onLoad={jest.fn()} />)

  await user.click(screen.getByRole('button', { name: 'サンプルを読み込む' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('読み込みに失敗しました')
})
```

- **`jest.mock('@/lib/api')`**：第2引数を省略すると、そのファイルが export している関数が **全部 `jest.fn()` に自動で置き換わる**
- **`mockRejectedValue(エラー)`**：呼ばれたら **失敗する Promise** を返す
- **`findByRole`**：要素が **出てくるまで待ってから** 返す（最大1秒）。通信のように「少しあとで画面が変わる」ものを探すときに使う

> `jest.mock('@/lib/api')` の `@/` が解決できるのは、`jest.config.mjs` に `moduleNameMapper` を書いてあるから。これがないと `Cannot find module '@/lib/api'` になる。

```powershell
npm test
git add .
git commit -m "feat: サンプル読み込みボタンを追加（テスト付き）"
git push -u origin test/mocks
gh pr create --fill
```

##  演習

### 演習1（基本）：確認ダイアログで OK を押した場合

`components/TodoApp.test.js` に「すべて削除：OK を押したら全部消えて『やることはありません』になる」テストを追加する。

**確認方法**：テストが PASS し、`clearAll` の `setTodos([])` をコメントアウトすると FAIL になればOK。

<details>
<summary>解答例</summary>

```jsx
test('すべて削除：OK なら全部消える', async () => {
  const user = userEvent.setup()
  localStorage.setItem('todos', JSON.stringify([{ id: '1', text: '牛乳を買う', done: false }]))
  jest.spyOn(window, 'confirm').mockReturnValue(true)
  render(<TodoApp />)

  await user.click(screen.getByRole('button', { name: 'すべて削除' }))

  expect(screen.getByText('やることはありません')).toBeInTheDocument()
})
```

</details>

### 演習2（基本）：/about にいるときのヘッダー

`components/Header.test.js` に「`/about` にいるときは『このアプリについて』が現在のページになり、『TODO』はそうならない」テストを追加する。

**確認方法**：テストが PASS すればOK。

<details>
<summary>解答例</summary>

```jsx
test('/about にいるときは「このアプリについて」が現在のページになる', () => {
  usePathname.mockReturnValue('/about')

  render(<Header />)

  expect(screen.getByRole('link', { name: 'このアプリについて' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'TODO' })).not.toHaveAttribute('aria-current')
})
```

</details>

### 演習3（応用）：TodoApp でサンプルを読み込む結合テスト

`components/TodoApp.test.js` で `lib/api` をモックし、「サンプルを読み込むを押すと、取得した TODO が一覧に追加され、残り件数も増える」ことをテストする。

**確認方法**：TODO が1件ある状態から読み込んで、`listitem` が 3 件（1 + 2）になり、「残り 3 件」と表示されるテストが PASS すればOK。

<details>
<summary>解答例</summary>

```jsx
// components/TodoApp.test.js（ファイルの上のほう）
import { fetchSampleTodos } from '@/lib/api'

jest.mock('@/lib/api')
```

```jsx
test('サンプルを読み込むと一覧に追加される', async () => {
  const user = userEvent.setup()
  localStorage.setItem('todos', JSON.stringify([{ id: '1', text: '牛乳を買う', done: false }]))
  fetchSampleTodos.mockResolvedValue(['サンプル1', 'サンプル2'])
  render(<TodoApp />)

  await user.click(screen.getByRole('button', { name: 'サンプルを読み込む' }))

  expect(await screen.findByText('サンプル2')).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(3)
  expect(screen.getByText('残り 3 件')).toBeInTheDocument()
})
```

`findByText` で「サンプル2 が出てくるまで」待ってから、残りを確かめている。

</details>

### 演習4（早く終わった人向け）：「読み込み中…」の表示をテストする

`SampleLoader` で、通信中は「読み込み中…」が表示されてボタンが押せなくなり、通信が終わると元に戻ることをテストする。

**確認方法**：「読み込み中…」が出ている間にボタンが `disabled` で、終わったあとは消えてボタンが押せる、を確かめるテストが PASS すればOK。

<details>
<summary>ヒントと解答例</summary>

`mockResolvedValue` だとすぐに成功してしまい、「読み込み中」の瞬間を確かめられない。**自分で成功させるタイミングを決められる Promise** を渡す。

```jsx
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'

test('通信中は「読み込み中…」を表示し、ボタンを押せなくする', async () => {
  const user = userEvent.setup()
  let resolveFetch
  fetchSampleTodos.mockReturnValue(
    new Promise((resolve) => {
      resolveFetch = resolve
    }),
  )
  render(<SampleLoader onLoad={jest.fn()} />)

  await user.click(screen.getByRole('button', { name: 'サンプルを読み込む' }))

  expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'サンプルを読み込む' })).toBeDisabled()

  resolveFetch([])
  await waitForElementToBeRemoved(() => screen.queryByText('読み込み中…'))
  expect(screen.getByRole('button', { name: 'サンプルを読み込む' })).toBeEnabled()
})
```

`waitForElementToBeRemoved` は「その要素が **消えるまで** 待つ」。`findBy` の逆。

</details>

##  まとめ

### 今日できるようになったこと

- `jest.spyOn` で `window.confirm` を、`jest.mock` で `next/navigation` や `lib/api` を偽物に置き換えられるようになった
- `global.fetch = jest.fn()` と `mockResolvedValue` で、通信の成功・失敗をテストの中で再現できるようになった
- `findBy` / `waitForElementToBeRemoved` で、あとから変わる画面を待ってテストできるようになった

### よくある詰まりポイント

- **`fetch is not defined`**：jsdom には `fetch` がない。テストで `global.fetch = jest.fn()` を用意するか、`fetch` を呼ぶ関数ごと `jest.mock` する
- **前のテストのモックが残っている**：`afterEach(() => jest.restoreAllMocks())` で元に戻す。`jest.mock` で作った `jest.fn()` の戻り値は、テストごとに `mockReturnValue` などで設定し直す
- **`getBy` で探すと見つからないのに、画面にはあとで出る**：非同期で表示されるものは `findBy` で待つ

### 次コマ予告

次回は Phase 2 のまとめ。**カバレッジ**（テストがコードのどこまでを通ったか）を測り、テストの抜けを見つける。あわせて、Next.js ならではの **async な Server Component** のテストの考え方を整理する。

##  課題

### 基礎課題（必須）

1. 演習1〜3を完成させ、PR を作ってマージする
2. 「モックを使うと何が良くて、何が危ないか」を3行でまとめる（ヒント：本物の API の形が変わったら、モックのテストは気づけるか）

### 応用課題（推奨）

3. `lib/api.test.js` に「通信そのものが失敗した（ネットにつながらない）とき、例外がそのまま投げられる」テストを追加する（ヒント：`fetch.mockRejectedValue(new TypeError('Failed to fetch'))`）
4. `SampleLoader` のエラーメッセージの下に「再試行」ボタンを付け、押すともう一度読み込むようにする。「1回目は失敗、2回目は成功」をテストで再現する（ヒント：`mockRejectedValueOnce(...)` と `mockResolvedValueOnce(...)` を続けて書く）

### チャレンジ課題（挑戦）

5. JSONPlaceholder の件数を `?_limit=3` から引数で変えられるように `fetchSampleTodos(limit = 3)` に変更し、`fetch` に渡る URL が変わることをテストする
6. `jest.mock('@/lib/api')`（自動モック）と `jest.mock('@/lib/api', () => ({ fetchSampleTodos: jest.fn() }))`（手動で中身を書く）の違いを調べ、どんなときに手動で書く必要があるかを説明する
