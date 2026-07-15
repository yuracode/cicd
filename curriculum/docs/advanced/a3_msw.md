# 発展3｜MSWでAPIモックを本格化する

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 |  |
| 前提コマ | Phase 2 修了（コマ11 モック・非同期テストまで） |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- `vi.fn()` による fetch差し替えの限界と、MSWが解決することを説明できる
- MSWをVitest + React Testing Library のテストに導入できる
- テストごとにAPIの応答（成功／失敗）を切り替えられる

##  導入

### コマ11のチャレンジ課題の答え合わせ

コマ11で「なぜ `vi.fn` で fetch を書き換えるより MSW を使った方が良いとされるのか」を調べた。今日はそれを実際に手を動かして確かめる。

### fetch差し替え方式の限界

`globalThis.fetch = vi.fn()` 方式には弱点がある。

- **実装に密結合**：アプリが `fetch` から `axios` に乗り換えたら、テストが全部書き直し
- **本物っぽさがない**：`{ ok: true, json: async () => ... }` は「fetchの戻り値のフリをしたオブジェクト」であって、HTTPの挙動（ステータスコード、ヘッダ）を再現しきれない
- **URLを見ていない**：どのURLへのリクエストかを区別するには自前の分岐が必要

> **MSW（Mock Service Worker）とは**：**ネットワークのレイヤーで** リクエストを横取りして偽のレスポンスを返すライブラリ。アプリのコードは本物のAPIと通信しているつもりのまま。テスト（Node）でも開発中のブラウザでも同じモック定義を使い回せる。

### 考え方の違い

```text
vi.fn方式：  アプリ → [偽のfetch関数]           ← 関数を差し替える
MSW方式：    アプリ → 本物のfetch → [偽のサーバ] ← 通信相手を差し替える
```

「アプリのコードを一切書き換えずに、通信相手だけ偽物にする」のがMSW。

##  本題

### 1. インストール

コマ11で使った `todo-app`（`ApiSample.jsx` があるプロジェクト）で進める。

```bash
cd ~/workspace/todo-app
npm install -D msw
```

### 2. ハンドラの定義：偽APIの仕様書

「どのURLに何を返すか」を **ハンドラ** として定義する。置き場所は `src/mocks/`。

```javascript
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw'

export const handlers = [
  // GET https://jsonplaceholder.typicode.com/todos への応答を定義
  http.get('https://jsonplaceholder.typicode.com/todos', () => {
    return HttpResponse.json([
      { id: 1, title: 'MSWで返したTODO', completed: false },
      { id: 2, title: '2件目', completed: true },
    ])
  }),
]
```

> **`http.get(url, resolver)`**：「このURLへのGETが来たら、この関数の戻り値を返せ」という宣言。REST APIの仕様書をコードで書いているのに近い。

### 3. テスト用サーバのセットアップ

```javascript
// src/mocks/server.js
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

コマ9で作ったセットアップファイル（`src/setupTests.js`）に、テスト全体の開始・終了処理を追加する。

```javascript
// src/setupTests.js
import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen())      // 全テスト開始前：横取り開始
afterEach(() => server.resetHandlers()) // 各テスト後：ハンドラを初期状態に戻す
afterAll(() => server.close())        // 全テスト終了後：横取り解除
```

> **`resetHandlers()` が重要な理由**：後述の「テスト内でのハンドラ上書き」が次のテストに漏れないようにする。コマ11の「テスト間の汚染に注意」と同じ話。

### 4. テストを書き換える

コマ11で書いた `ApiSample.test.jsx` をMSW版にする。**`beforeEach` での fetch差し替えが丸ごと消える** ことに注目。

```jsx
// src/ApiSample.test.jsx
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'
import ApiSample from './ApiSample'

describe('ApiSample（MSW版）', () => {
  it('取得成功時にリストが表示される', async () => {
    // ハンドラのデフォルト応答がそのまま使われる
    render(<ApiSample />)

    expect(await screen.findByText(/MSWで返したTODO/)).toBeInTheDocument()
    expect(screen.getByText(/2件目/)).toBeInTheDocument()
  })

  it('サーバエラー時にエラーが表示される', async () => {
    // このテストだけ 500 を返すように上書き
    server.use(
      http.get('https://jsonplaceholder.typicode.com/todos', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )

    render(<ApiSample />)

    expect(await screen.findByText(/エラー/)).toBeInTheDocument()
  })

  it('ネットワーク断でもエラーが表示される', async () => {
    server.use(
      http.get('https://jsonplaceholder.typicode.com/todos', () => {
        return HttpResponse.error() // 通信自体の失敗を再現
      }),
    )

    render(<ApiSample />)

    expect(await screen.findByText(/エラー/)).toBeInTheDocument()
  })
})
```

```bash
npm run test
```

vi.fn版と比べて何が変わったか：

- **`{ ok: false }` のような手作りオブジェクトが消えた**。`status: 500` と書けば、`res.ok` が `false` になるのは本物のfetchの挙動そのまま
- **成功系のテストにモックコードが1行もない**。デフォルトのハンドラが仕様書として機能している
- アプリ側を `axios` に書き換えても、**このテストは1文字も変えずに通る**

> **クエリパラメータの注意**：`ApiSample.jsx` のURLに `?_limit=5` が付いていても、MSWはパス部分（`/todos`）でマッチするので上のハンドラで捕捉できる。パラメータごとに応答を変えたい場合は resolver内で `request.url` を調べる。

### 5. 開発中のブラウザでも使う（Service Worker モード）

MSWの真価は **テストと開発で同じハンドラを共有できる** こと。バックエンドが未完成でも、フロント開発を先に進められる。

```bash
npx msw init public/
```

これで `public/mockServiceWorker.js` が生成される。次にブラウザ用のセットアップ：

```javascript
// src/mocks/browser.js
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

`src/main.jsx` の先頭で、開発時のみ起動するようにする：

```jsx
// src/main.jsx（先頭に追加）
async function enableMocking() {
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser')
  return worker.start()
}

enableMocking().then(() => {
  // 既存の createRoot(...).render(...) をこの中に移動
})
```

```bash
npm run dev -- --host
```

ブラウザの開発者ツール → Networkタブを開くと、リクエストがService Workerに横取りされ、`handlers.js` で定義したデータが画面に出ていることが確認できる。

> **Service Workerとは**：ブラウザがページとは別に動かすスクリプトで、ページの通信を仲介できる。MSWはこれを利用して「ブラウザ内に偽サーバを立てる」。

##  まとめ

### 今日できるようになったこと

- MSWでネットワーク層のモックを構築し、テストから fetch差し替えコードを一掃できる
- `server.use()` でテストごとに成功／失敗の応答を切り替えられる
- 同じハンドラ定義を開発中のブラウザでも使える

### よくある詰まりポイント

- **`server.use` の上書きが他のテストに影響**：`afterEach(() => server.resetHandlers())` がセットアップファイルに入っているか確認
- **ブラウザでモックが効かない**：`npx msw init public/` を忘れている、またはService Worker登録前に画面を描画している（`enableMocking().then(...)` の構造を確認）

### 次の一歩

発展4（Playwright E2E）と組み合わせると「E2EテストでもMSWでAPIを固定する」という実務的な構成に進める。個人制作でバックエンドが必要になったら、まずMSWでAPIの仕様を先に決めて画面を作る「モックファースト開発」も試してほしい。

##  課題

### 基礎課題（必須）

1. `ApiSample.test.jsx` をMSW版に書き換え、成功・500エラー・ネットワーク断の3テストをPASSさせる
2. ブランチ→PR→CI緑→マージ の流れで取り込む

### 応用課題（推奨）

3. **遅延の再現**：resolver内で `await delay(1000)`（`msw` の `delay` をimport）してから応答を返し、「読み込み中…」の表示をブラウザで目視確認する
4. **POSTのモック**：`http.post()` でTODO追加APIのハンドラを書き、`request.json()` で受け取ったボディをそのまま `HttpResponse.json()` で返す

### チャレンジ課題（挑戦）

5. ハンドラ内に配列を持たせて **GET/POST/DELETEで増減する「状態付きモックAPI」** を作る。本物のバックエンドが無くても、TODOアプリのAPI連携版が完全に動くことを確認する
6. vi.fn方式とMSW方式のテストコードを見比べ、「実装詳細に依存しないテスト」というコマ11の教えがどう実現されているかを3行でまとめる
