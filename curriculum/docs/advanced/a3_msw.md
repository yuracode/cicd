# 発展3｜MSWでAPIモックを本格化する

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 | 90分 |
| 前提コマ | コマ12 モックと非同期のテスト |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- `global.fetch = jest.fn()` による差し替えの限界と、MSW が解決することを説明できる
- MSW を Jest + React Testing Library のテストに導入し、テストごとに成功・失敗・遅延を切り替えられる
- 同じモックの定義を、Next.js の開発サーバ（ブラウザ）でも使える

##  導入

### コマ12のやり方をふりかえる

コマ12では、`fetch` を偽物の関数に置き換えてテストした。

```js
global.fetch = jest.fn()
fetch.mockResolvedValue({ ok: true, json: async () => [...] })
```

動くことは動くが、弱点がある。

| 弱点 | 説明 |
|------|------|
| 実装の中身に依存する | アプリが `fetch` から別の通信ライブラリ（`axios` など）に変わると、テストを全部書き直すことになる |
| 本物らしくない | `{ ok: true, json: ... }` は「fetch の戻り値のふりをしたオブジェクト」。ステータスコードやヘッダーの動きは再現できない |
| URL を見ていない | どの URL への通信でも同じ偽物が返る。URL ごとに変えるには自分で分岐を書く必要がある |

### MSW とは

**MSW（Mock Service Worker）** は、**通信の途中で** リクエストを横取りして、偽のレスポンスを返すライブラリ。

```text
コマ12の方法： アプリ → [偽物の fetch 関数]                ← 関数を差し替える
MSW：          アプリ → 本物の fetch → [偽物のサーバ]      ← 通信相手を差し替える
```

アプリのコードは **本物の API と通信しているつもりのまま**。テスト（Node.js）でも、開発中のブラウザでも、**同じ偽物のサーバの定義** を使い回せる。

##  本題

### 1. インストールと Jest の設定

```powershell
cd ~/workspace/todo-app
git switch main
git pull
git switch -c feature/msw

npm install -D msw jest-fixed-jsdom cross-env
```

`jest.config.mjs` の `testEnvironment` を変える。

```js
// jest.config.mjs（変更部分）
  testEnvironment: 'jest-fixed-jsdom',
```

> **なぜ `jest-fixed-jsdom`？** コマ12で見たとおり、jsdom（偽物のブラウザ）には `fetch` がない。MSW は本物の `fetch`・`Request`・`Response` を横取りする仕組みなので、それらがないと動かない（`ReferenceError: Request is not defined` になる）。`jest-fixed-jsdom` は、jsdom に Node.js の `fetch` などを足してくれるテスト環境。

`package.json` のテスト用のコマンドを変える。

```powershell
npm pkg set scripts.test="cross-env NODE_OPTIONS=--experimental-vm-modules jest" scripts.test:watch="cross-env NODE_OPTIONS=--experimental-vm-modules jest --watch" scripts.test:coverage="cross-env NODE_OPTIONS=--experimental-vm-modules jest --coverage"
```

> **`NODE_OPTIONS=--experimental-vm-modules` の意味**：MSW が使っている部品の中に、**ES モジュール（`import` / `export`）の形でしか配布されていないもの** がある。Jest は標準では古い形式（CommonJS）でファイルを読み込むので、そのままだと `Must use import to load ES Module` というエラーになる。このオプションで、Node.js 24 の「ES モジュールを読み込む機能」を Jest の中でも使えるようにしている。実行すると `ExperimentalWarning` が1行出るが、問題ない。
>
> **`cross-env` の意味**：npm の scripts は Windows では cmd.exe で実行されるので、Linux 流の `変数=値 コマンド` という書き方が使えない。`cross-env 変数=値 コマンド` と書くと、Windows でも Linux（CI）でも同じように環境変数を設定してくれる。

### 2. ハンドラ：偽物の API の仕様書

「どの URL に何を返すか」を **ハンドラ** として書く。置き場所は `mocks/`。

```powershell
mkdir -Force mocks
```

```js
// mocks/handlers.js
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('https://jsonplaceholder.typicode.com/todos', () => {
    return HttpResponse.json([
      { userId: 1, id: 1, title: 'MSWで返したTODO', completed: false },
      { userId: 1, id: 2, title: '2件目', completed: true },
    ])
  }),
]
```

- **`http.get(URL, 関数)`**：「この URL に GET が来たら、この関数の戻り値を返す」という宣言
- **`HttpResponse.json(データ)`**：ステータス 200 で、JSON を返すレスポンスを作る
- アプリは `?_limit=3` を付けて通信しているが、MSW は **パス部分（`/todos`）で** 一致を判断するので、このハンドラで横取りできる

### 3. テスト用の偽物のサーバを用意する

```js
// mocks/server.js
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

`jest.setup.js` に、テスト全体の開始・終了の処理を追加する。

```js
// jest.setup.js
import '@testing-library/jest-dom'
import { server } from '@/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })) // 全テストの前：横取り開始
afterEach(() => server.resetHandlers()) // 各テストの後：ハンドラを最初の状態に戻す
afterAll(() => server.close()) // 全テストの後：横取り終了
```

| 部分 | 意味 |
|------|------|
| `onUnhandledRequest: 'error'` | ハンドラを書いていない URL に通信したら **エラーにする**。テストが知らないうちに本物の API を呼ぶのを防ぐ |
| `resetHandlers()` | テストの中で上書きしたハンドラ（後述）を、次のテストに持ち越さない |

### 4. lib/api のテストを書き直す

コマ12で書いた `lib/api.test.js` を、MSW を使う形に書き直す。**`global.fetch = jest.fn()` が丸ごと消える** ことに注目。

```js
// lib/api.test.js
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { fetchSampleTodos } from './api'

const SAMPLE_URL = 'https://jsonplaceholder.typicode.com/todos'

test('成功したら title だけの配列を返す', async () => {
  await expect(fetchSampleTodos()).resolves.toEqual(['MSWで返したTODO', '2件目'])
})

test('サーバが 500 を返したら例外を投げる', async () => {
  server.use(http.get(SAMPLE_URL, () => new HttpResponse(null, { status: 500 })))

  await expect(fetchSampleTodos()).rejects.toThrow('HTTP 500')
})

test('通信そのものが失敗したら例外を投げる', async () => {
  server.use(http.get(SAMPLE_URL, () => HttpResponse.error()))

  await expect(fetchSampleTodos()).rejects.toThrow()
})
```

| 書き方 | 意味 |
|--------|------|
| （何も書かない） | `mocks/handlers.js` の標準の応答がそのまま使われる |
| `server.use(ハンドラ)` | **このテストの間だけ** ハンドラを上書きする |
| `new HttpResponse(null, { status: 500 })` | ステータス 500 のレスポンス。本物の `fetch` と同じく `res.ok` が `false` になる |
| `HttpResponse.error()` | 通信そのものの失敗（ネットにつながらない状態）を再現する |

```powershell
npm test
```

コマ12の方法と比べると、

- `{ ok: false, status: 500 }` のような **手作りのオブジェクトがなくなった**。`status: 500` と書けば、あとは本物の `fetch` の動きのまま
- 成功のテストには **モックのコードが1行もない**。ハンドラが「標準の仕様書」になっている
- アプリの通信ライブラリを変えても、**このテストは書き直さなくてよい**

### 5. 部品のテストも本物の通信の流れで書く

コマ12では、`SampleLoader` のテストで `jest.mock('@/lib/api')` を使い、`fetchSampleTodos` ごと偽物にしていた。MSW があれば、**`lib/api.js` も本物のまま** 通して確かめられる。

```jsx
// components/SampleLoader.test.js
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import SampleLoader from './SampleLoader'

const SAMPLE_URL = 'https://jsonplaceholder.typicode.com/todos'

async function clickLoad(handleLoad = jest.fn()) {
  const user = userEvent.setup()
  render(<SampleLoader onLoad={handleLoad} />)
  await user.click(screen.getByRole('button', { name: 'サンプルを読み込む' }))
  return handleLoad
}

test('読み込みに成功したら、取得した文字で onLoad が呼ばれる', async () => {
  const handleLoad = await clickLoad()

  await waitFor(() => expect(handleLoad).toHaveBeenCalledWith(['MSWで返したTODO', '2件目']))
})

test('サーバが 500 を返したらエラーメッセージを表示する', async () => {
  server.use(http.get(SAMPLE_URL, () => new HttpResponse(null, { status: 500 })))

  await clickLoad()

  expect(await screen.findByRole('alert')).toHaveTextContent('読み込みに失敗しました')
})

test('通信中は「読み込み中…」を表示する', async () => {
  server.use(
    http.get(SAMPLE_URL, async () => {
      await delay(200)
      return HttpResponse.json([{ id: 1, title: '遅れて届いたTODO', completed: false }])
    }),
  )

  const handleLoad = await clickLoad()

  expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  await waitForElementToBeRemoved(() => screen.queryByText('読み込み中…'))
  expect(handleLoad).toHaveBeenCalledWith(['遅れて届いたTODO'])
})
```

- **`waitFor(() => expect(...))`**：中の `expect` が通るまで、少しずつ待ちながらくり返す。通信の結果を待つときに使う
- **`delay(200)`**：MSW の機能で、応答を 200 ミリ秒遅らせる。コマ12の演習4では「自分で成功させるタイミングを決める Promise」を作ったが、MSW なら1行で済む

```powershell
npm test
git add .
git commit -m "test: MSWで通信をモックする"
```

### 6. 開発中のブラウザでも使う

MSW のもう1つの強みは、**テストと同じハンドラを、開発中のブラウザでも使える** こと。API がまだ完成していなくても、画面の開発を先に進められる。

ブラウザ用の Service Worker のファイルを `public/` に作る。

```powershell
npx msw init public --save
```

`public/mockServiceWorker.js` ができる。自動で作られたファイルなので、ESLint と Prettier の対象から外す。

```js
// eslint.config.mjs（globalIgnores の中に追加）
    'public/mockServiceWorker.js',
```

`.prettierignore` の末尾にも1行足す。

```text
public/mockServiceWorker.js
```

ブラウザ用の設定を作る。

```js
// mocks/browser.js
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

**MSW の準備ができてから画面を描く** ための部品を作る。

```jsx
// components/MswProvider.js
'use client'

import { useEffect, useState } from 'react'

// NEXT_PUBLIC_API_MOCKING=enabled のときだけ、ブラウザで MSW を起動する
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
```

| 部分 | 意味 |
|------|------|
| `process.env.NEXT_PUBLIC_API_MOCKING` | モックを使うかどうかを環境変数で切り替える（コマ19）。本番では設定しないので、MSW は動かない |
| `import('@/mocks/browser')` | MSW のブラウザ用のコードを **必要なときだけ** 読み込む。サーバ側では読み込まれない |
| `onUnhandledRequest: 'bypass'` | ハンドラのない通信（画像など）は、そのまま本物に流す |
| `startPromise` | 開発中の React（StrictMode）は、確かめるために effect を **2回** 実行する。2回起動すると MSW がエラーになるので、1回にまとめている |
| `if (!isReady) return null` | 起動が終わるまで何も描かない。**最初の通信から** 確実に横取りさせるため |

`app/layout.js` で全体を包む。

```jsx
// app/layout.js（変更部分）
import MswProvider from '@/components/MswProvider'

// <body> の中
<Header />
<MswProvider>{children}</MswProvider>
<Footer />
```

モックを有効にして起動するコマンドを追加する。

```powershell
npm pkg set scripts.dev:mock="cross-env NEXT_PUBLIC_API_MOCKING=enabled next dev"
npm run dev:mock
```

ブラウザで「サンプルを読み込む」を押すと、「MSWで返したTODO」「2件目」が追加される。開発者ツールの **Console** には、次のように表示される。

```text
[MSW] Mocking enabled.
[MSW] 12:34:56 GET https://jsonplaceholder.typicode.com/todos (200 OK)
```

`npm run dev`（モックなし）で起動し直すと、本物の JSONPlaceholder のデータに戻る。

```powershell
npm run lint
npm test
npm run build
git add .
git commit -m "feat: 開発中のブラウザでもMSWを使えるようにする"
git push -u origin feature/msw
gh pr create --fill
```

> **Service Worker とは**：ブラウザが、ページとは別に動かしておけるスクリプト。ページの通信を仲介できる。MSW はこれを使って「ブラウザの中に偽物のサーバを立てる」。

##  演習

### 演習1（基本）：通信が失敗したときのテスト

`components/SampleLoader.test.js` に、「通信そのものが失敗しても（`HttpResponse.error()`）エラーメッセージが表示される」テストを追加する。

**確認方法**：テストが通り、`SampleLoader.js` の `catch` の中の `setStatus('error')` を消すと失敗すればOK（確かめたら戻す）。

### 演習2（基本）：ハンドラを変えて、ブラウザで確かめる

`mocks/handlers.js` の返すデータを3件に増やし、`npm run dev:mock` で読み込んだときに3件追加されることを確かめる。

**確認方法**：ブラウザでは3件追加される。`npm test` を実行すると、「成功したら title だけの配列を返す」テストが失敗する（2件を期待しているため）ので、テストも直して通ればOK。

> ハンドラは **テストとブラウザで共有** している。データを変えるとテストも影響を受ける。テストで特定のデータに依存したいときは、テストの中で `server.use` を使って上書きするのが安全。

### 演習3（応用）：ゆっくり届く通信をブラウザで観察する

`mocks/handlers.js` のハンドラの中で `await delay(2000)` を入れ、`npm run dev:mock` で「読み込み中…」が2秒表示されることを確かめる。

ただし、このままだと **テストも2秒ずつ遅くなる**。テストのときだけ待たないようにする。

**確認方法**：ブラウザでは2秒待ち、`npm test` の時間は変わらなければOK。

<details>
<summary>ヒント</summary>

Jest でテストを実行している間は、`process.env.NODE_ENV` が `'test'` になっている。

```js
import { delay, http, HttpResponse } from 'msw'

http.get('https://jsonplaceholder.typicode.com/todos', async () => {
  if (process.env.NODE_ENV !== 'test') {
    await delay(2000)
  }
  return HttpResponse.json([...])
})
```

</details>

### 演習4（早く終わった人向け）：URL のパラメータで応答を変える

アプリは `?_limit=3` を付けて通信している。ハンドラの中で `request.url` から `_limit` を読み取り、**その件数だけ** TODO を返すようにする。`lib/api.js` の `_limit` を 5 にしたら、5件返ることをテストで確かめる。

**確認方法**：`_limit` を変えると、返ってくる件数が変わることをテストで確かめられればOK。

<details>
<summary>ヒント</summary>

```js
http.get('https://jsonplaceholder.typicode.com/todos', ({ request }) => {
  const url = new URL(request.url)
  const limit = Number(url.searchParams.get('_limit') ?? 10)
  const todos = Array.from({ length: limit }, (_, i) => ({ userId: 1, id: i + 1, title: `TODO ${i + 1}`, completed: false }))
  return HttpResponse.json(todos)
})
```

</details>

##  まとめ

### 今日できるようになったこと

- MSW で通信を横取りし、`global.fetch = jest.fn()` や `jest.mock('@/lib/api')` を使わずにテストできるようになった
- `server.use()` で、テストごとに成功・500・通信失敗・遅延を切り替えられるようになった
- 同じハンドラを、`MswProvider` を通して開発中のブラウザでも使えるようになった

### よくある詰まりポイント

- **`ReferenceError: Request is not defined`**：`testEnvironment` が `'jest-fixed-jsdom'` になっているか確認する
- **`Must use import to load ES Module`**：`npm test` のコマンドに `cross-env NODE_OPTIONS=--experimental-vm-modules` が付いているか確認する（`npx jest` を直接実行するときは `npx cross-env NODE_OPTIONS=--experimental-vm-modules jest` とする）
- **`server.use` の上書きが他のテストに影響する**：`jest.setup.js` に `afterEach(() => server.resetHandlers())` があるか確認する
- **ブラウザでモックが効かない**：`public/mockServiceWorker.js` があるか、`npm run dev:mock`（環境変数付き）で起動しているかを確認する

### 次の一歩

発展6では、PokeAPI（実在の公開 API）を MSW で丸ごと偽装して、ポケモン図鑑アプリを1から作る。複数の URL・URL のパラメータ・画像の表示まで含めた総合演習になっている。

##  課題

### 基礎課題（必須）

1. `lib/api.test.js` と `components/SampleLoader.test.js` を MSW 版に書き換え、PR でマージする（CI が緑になること）
2. `components/TodoApp.test.js` の `jest.mock('@/lib/api')` も外し、MSW のハンドラでサンプル読み込みの結合テストを書き直す

### 応用課題（推奨）

3. 演習3・4を完成させる
4. `onUnhandledRequest: 'error'` の効果を確かめる。`lib/api.js` の URL をわざと `https://jsonplaceholder.typicode.com/posts` に変えてテストを実行し、どんなエラーが出るかを読む（確かめたら戻す）

### チャレンジ課題（挑戦）

5. ハンドラの中に配列を持たせ、`http.get`・`http.post`・`http.delete` で増えたり減ったりする **状態を持った偽物の API** を作る。TODO をサーバに保存するアプリを、本物のサーバなしで作ってみる
6. コマ12の `jest.fn()` の方法と MSW の方法のテストを見比べ、「実装の中身に依存しないテスト」がどう実現されているかを3行でまとめる
