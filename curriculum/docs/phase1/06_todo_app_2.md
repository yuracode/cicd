# コマ6｜TODOアプリ実装②（保存・ページ分け）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | コマ5 TODOアプリ実装①（追加・完了・削除） |
| 次コマ | コマ7 GitHub連携・ブランチ・PR体験 |

##  目標

- `useEffect` の役割と依存配列の意味を説明できる
- TODO を localStorage に保存し、再読み込みしても消えないようにできる（サーバでは動かないコードの扱いを含む）
- `app/` のフォルダでページを増やし、`layout.js` と `Link` で共通ヘッダー付きのサイトにできる

##  導入

### 前回の振り返り

```powershell
cd ~/workspace/todo-app
npm run dev
```

前回は TODO の追加・完了・削除まで作った。ところが **ブラウザを再読み込みすると全部消える**。state はブラウザのメモリ上にしかないので、ページを読み直すと初期値（空の配列）に戻ってしまう。

> 前回の `todo-app` がない人は、コマ5の本題 1〜6 を先に済ませておく（`TodoApp` / `TodoForm` / `TodoList` / `TodoItem` の4ファイル）。

### 今日やること

1. **保存**：TODO をブラウザの保存領域（localStorage）に書き込み、再読み込みしても残るようにする
2. **ページ分け**：「このアプリについて」ページを追加し、全ページ共通のヘッダーを付ける

```text
┌─────────────────────────────────────┐
│ TODO   このアプリについて            │ ← 全ページ共通のヘッダー
├─────────────────────────────────────┤
│ TODOアプリ                           │
│ [ やることを入力         ] [追加]     │
│ ...                                  │
└─────────────────────────────────────┘
```

##  本題

### 1. localStorage を触ってみる

**localStorage** は、ブラウザがサイトごとに用意している小さな保存領域。ブラウザを閉じても消えない。

ブラウザで http://localhost:3000 を開き、開発者ツール（F12）の **Console** タブで試す。

```js
localStorage.setItem('greeting', 'こんにちは')
localStorage.getItem('greeting')
// => 'こんにちは'

localStorage.setItem('todos', [{ text: 'a' }])
localStorage.getItem('todos')
// => '[object Object]'  ← 配列がそのまま入らない！
```

localStorage には **文字列しか保存できない**。配列やオブジェクトは JSON の文字列に変換して保存する。

```js
localStorage.setItem('todos', JSON.stringify([{ text: 'a' }]))
localStorage.getItem('todos')
// => '[{"text":"a"}]'
JSON.parse(localStorage.getItem('todos'))
// => [{ text: 'a' }]  ← 配列に戻った

localStorage.clear()   // 試したデータを消しておく
```

| 関数 | 役割 |
|------|------|
| `JSON.stringify(値)` | 配列・オブジェクト → 文字列 |
| `JSON.parse(文字列)` | 文字列 → 配列・オブジェクト |

### 2. useEffect で「変わったら保存」する

**useEffect** は「画面を描いた **あと** に、React の外の世界に何かをする」ための仕組み。localStorage への保存は、まさに React の外への書き込み。

```jsx
useEffect(() => {
  // ここに「描画のあとにやりたいこと」
}, [依存する値])
```

| 第2引数（依存配列） | いつ実行されるか |
|--------------------|-----------------|
| `[todos]` | 最初の描画のあと ＋ `todos` が変わるたび |
| `[]` | 最初の描画のあとだけ |
| 省略 | 描画のたび毎回（ほぼ使わない） |

`components/TodoApp.js` を次のように変える。

```jsx
// components/TodoApp.js
'use client'

import { useEffect, useState } from 'react'
import TodoForm from './TodoForm'
import TodoList from './TodoList'

const STORAGE_KEY = 'todos'

function loadTodos() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? JSON.parse(saved) : []
}

export default function TodoApp() {
  const [todos, setTodos] = useState(loadTodos)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  function addTodo(text) {
    const newTodo = { id: crypto.randomUUID(), text, done: false }
    setTodos([...todos, newTodo])
  }

  function toggleTodo(id) {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)))
  }

  function deleteTodo(id) {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  const remaining = todos.filter((todo) => !todo.done).length

  return (
    <div>
      <TodoForm onAdd={addTodo} />
      <TodoList todos={todos} onToggle={toggleTodo} onDelete={deleteTodo} />
      <p>残り {remaining} 件</p>
    </div>
  )
}
```

- **`useState(loadTodos)`**：初期値に **関数** を渡すと、React は最初の1回だけその関数を呼んで初期値にする。`useState(loadTodos())` と書くと描画のたびに localStorage を読んでしまうので、関数そのものを渡す
- **`useEffect(..., [todos])`**：`todos` が変わるたびに保存する。追加・完了・削除のどれでも、保存の処理を個別に書かなくて済む

### 3. エラーになる：サーバには localStorage がない

保存するとブラウザにエラーが表示され、ターミナルにも次のように出る。

```text
⨯ ReferenceError: localStorage is not defined
    at loadTodos (components/TodoApp.js:10:17)
```

コマ2〜3で見たとおり、Next.js はページを **まずサーバで HTML にしてから** ブラウザに送る。`'use client'` を付けた部品も、最初の HTML を作るために **一度サーバでも実行される**。ところが localStorage はブラウザにしかないので、サーバで `localStorage.getItem` を呼んだ瞬間にエラーになる。

> **なぜ Client Component もサーバで動くの？**：最初の HTML にある程度の中身を入れておくと、JavaScript の読み込みを待たずに画面が表示されるから（表示が速くなる）。その後ブラウザで JavaScript が動き出し、ボタンなどが反応するようになる。この「HTML に命を吹き込む」処理を **ハイドレーション** と呼ぶ。

### 4. TODO 部分だけブラウザで描画させる

TODO の中身はブラウザの保存データ次第なので、サーバで先に作る意味がない。**この部品はブラウザでだけ描画する** と指定する。

`components/TodoAppClient.js` を作る。

```jsx
// components/TodoAppClient.js
'use client'

import dynamic from 'next/dynamic'

const TodoApp = dynamic(() => import('./TodoApp'), {
  ssr: false,
  loading: () => <p>読み込み中…</p>,
})

export default TodoApp
```

`app/page.js` の import を差し替える。

```jsx
// app/page.js
import TodoAppClient from '@/components/TodoAppClient'

export default function Home() {
  return (
    <main className="container">
      <h1>TODOアプリ</h1>
      <TodoAppClient />
    </main>
  )
}
```

- **`dynamic(() => import(...))`**：部品を「必要になったときに読み込む」書き方
- **`ssr: false`**：SSR（Server Side Rendering＝サーバでの HTML 作成）をしない。サーバでは代わりに `loading` の「読み込み中…」を出しておき、ブラウザで JavaScript が動いてから `TodoApp` を描画する
- `ssr: false` は **Client Component の中でしか使えない** ので、`'use client'` 付きの小さなファイルに分けている

動作確認：

1. TODO を2〜3件追加し、1件を完了にする
2. ブラウザを再読み込み → **TODO と完了状態が残っていれば成功**
3. 開発者ツール → **Application** タブ → Local Storage → `http://localhost:3000` で、`todos` に JSON が入っていることを確認する

```powershell
git add .
git commit -m "TODOをlocalStorageに保存"
```

### 5. ページを増やす：フォルダ = URL

Next.js の App Router では、**`app/` の中のフォルダ構成がそのまま URL になる**（ファイルベースルーティング）。

| ファイル | URL |
|---------|-----|
| `app/page.js` | `/` |
| `app/about/page.js` | `/about` |
| `app/help/faq/page.js` | `/help/faq` |

`app/about/page.js` を作る。

```powershell
mkdir -Force app/about
```

```jsx
// app/about/page.js
export const metadata = {
  title: 'このアプリについて | TODOアプリ',
}

export default function AboutPage() {
  return (
    <main className="container">
      <h1>このアプリについて</h1>
      <p>「Webフロントエンド」の授業で作っている TODO アプリです。</p>
      <ul>
        <li>Next.js（App Router）</li>
        <li>データはブラウザの localStorage に保存</li>
      </ul>
    </main>
  )
}
```

http://localhost:3000/about を開いて表示されればOK。ブラウザのタブのタイトルも変わっている。

> **`metadata`**：ページごとに `<title>` などを設定する仕組み。`export const metadata = {...}` と書くだけで Next.js が `<head>` に反映してくれる（Server Component でのみ使える）。

### 6. 共通ヘッダーを layout.js に置く

全ページに同じヘッダーを出したい。ページごとに書くのではなく、**全ページを包む `app/layout.js`** に置く。

まずヘッダー部品を作る。

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

- **`Link`**：Next.js のリンク部品。`<a>` と違い、**ページ全体を読み直さずに** 中身だけ切り替えるので速い。state も消えにくい
- **`usePathname()`**：今の URL のパス（`/` や `/about`）を返すフック。フックなので `'use client'` が必要
- **`aria-current="page"`**：「今いるページのリンク」であることを読み上げソフトに伝える属性

`app/layout.js` にヘッダーを追加する。

```jsx
// app/layout.js
import Header from '@/components/Header'
import './globals.css'

export const metadata = {
  title: 'TODOアプリ',
  description: 'Next.js で作る TODO アプリ',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <Header />
        {children}
      </body>
    </html>
  )
}
```

`children` には **今表示しているページ**（`app/page.js` や `app/about/page.js` の中身）が入る。コマ2で作った `Box` と同じ仕組み。

ヘッダーの見た目を `app/globals.css` の末尾に追加する。

```css
/* app/globals.css（末尾に追加） */
.header {
  background: #222;
  padding: 12px 16px;
}

.nav-link {
  color: #ccc;
  margin-right: 16px;
  text-decoration: none;
}

.nav-link.active {
  color: #fff;
  font-weight: bold;
}
```

動作確認：

1. ヘッダーのリンクで `/` と `/about` を行き来できる
2. 今いるページのリンクが白い太字になる
3. TODO を追加 → about へ移動 → TODO に戻る → TODO が残っている

```powershell
git add .
git commit -m "aboutページと共通ヘッダーを追加"
```

##  演習

### 演習1（基本）：404 ページを作る

存在しない URL（例：http://localhost:3000/abc ）を開くと、Next.js 標準の 404 ページが出る。これを自作のページに差し替える。`app/not-found.js` を作り、「ページが見つかりません」の見出しと、TODO 一覧へ戻るリンクを表示する。

**確認方法**：`/abc` を開くと自作の 404 ページが表示され、ヘッダーも出ていて、リンクで `/` に戻れればOK。

<details>
<summary>解答例</summary>

```jsx
// app/not-found.js
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container">
      <h1>ページが見つかりません</h1>
      <Link href="/">TODO 一覧へ戻る</Link>
    </main>
  )
}
```

`not-found.js` も `page.js` や `layout.js` と同じく、Next.js が **ファイル名で役割を決めている特別なファイル**。layout の中に表示されるので、ヘッダーも自動で付く。

</details>

### 演習2（基本）：「使い方」ページを追加する

`/help` に「使い方」ページを追加し、ヘッダーにもリンクを足す。追加・完了・削除の操作方法を箇条書きで説明する。ブラウザのタブのタイトルは「使い方 | TODOアプリ」にする。

**確認方法**：ヘッダーから `/help` に移動でき、タブのタイトルが変わり、ヘッダーの「使い方」が白い太字になればOK。

<details>
<summary>解答例</summary>

```jsx
// app/help/page.js
export const metadata = {
  title: '使い方 | TODOアプリ',
}

export default function HelpPage() {
  return (
    <main className="container">
      <h1>使い方</h1>
      <ul>
        <li>入力欄にやることを書いて Enter で追加</li>
        <li>チェックボックスで完了 / 未完了を切り替え</li>
        <li>「削除」ボタンで消去</li>
      </ul>
    </main>
  )
}
```

```jsx
// components/Header.js（links に1行追加）
const links = [
  { href: '/', label: 'TODO' },
  { href: '/help', label: '使い方' },
  { href: '/about', label: 'このアプリについて' },
]
```

ヘッダーのリンクを配列で持っているので、**1行足すだけ** で済む。

</details>

### 演習3（応用）：保存データが壊れていても落ちないようにする

開発者ツールの Application タブで、localStorage の `todos` の値を `abc` のような **JSON として正しくない文字列** に書き換えてから再読み込みすると、アプリがエラーで表示されなくなる。`loadTodos` を修正し、読み込みに失敗したら空の配列から始めるようにする。

**確認方法**：`todos` を `abc` に書き換えて再読み込みしても「やることはありません」と表示され、TODO を追加すると正しい JSON で上書き保存されればOK。

<details>
<summary>解答例</summary>

```jsx
// components/TodoApp.js
function loadTodos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}
```

`try { ... } catch { ... }` は「失敗するかもしれない処理」を囲み、失敗したときの代わりの処理を書く構文。**外から入ってくるデータ（保存データ・通信結果・ユーザー入力）は壊れている前提で扱う** のが安全なプログラムの基本。

</details>

### 演習4（早く終わった人向け）：統計ページ

`/stats` に「統計」ページを作り、localStorage の TODO から「全件数」「完了数」「達成率（%）」を表示する。

**確認方法**：TODO 画面で3件中1件を完了にしてから `/stats` を開くと「全 3 件 / 完了 1 件 / 達成率 33%」のように表示されればOK。

<details>
<summary>ヒント</summary>

- 統計の部品（例：`components/TodoStats.js`）も localStorage を読むので、`TodoAppClient` と同じように `dynamic` + `ssr: false` で読み込む
- `loadTodos` を `TodoApp.js` と `TodoStats.js` の両方で使いたくなる。`lib/storage.js` のような別ファイルに移して、両方から import するとよい
- 達成率は `Math.round((完了数 / 全件数) * 100)`。全件数が0のときに割り算しないよう注意

</details>

##  まとめ

### 今日できるようになったこと

- `useEffect` と依存配列で「state が変わったら外の世界（localStorage）に保存する」処理を書けるようになった
- サーバでは localStorage が使えないことを理解し、`dynamic` + `ssr: false` でブラウザだけで描画させられるようになった
- `app/○○/page.js` でページを増やし、`layout.js` の共通ヘッダーと `Link` でページを行き来できるようになった

### よくある詰まりポイント

- **`localStorage is not defined`**：サーバで localStorage に触っている。localStorage を読む部品を `dynamic(..., { ssr: false })` 経由で読み込んでいるか確認する
- **再読み込みすると保存したはずの TODO が消える**：`useState(loadTodos)` ではなく `useState([])` のままになっていないか、`useEffect` の依存配列に `todos` が入っているか確認する
- **`/about` が 404 になる**：ファイル名が `app/about/page.js` になっているか確認する（`app/about.js` ではページにならない）

### 次コマ予告

次回は Phase 1 のまとめとして、`todo-app` を GitHub に上げる。**ブランチを切って機能を追加し、プルリクエスト（PR）を作ってマージする** という、チーム開発の基本の流れを一人で体験する。

##  課題

### 基礎課題（必須）

1. 演習1〜3を完成させてコミットする

```powershell
git add .
git commit -m "404ページ・使い方ページ・読み込みエラー対策を追加"
```

2. `useEffect` の依存配列を `[todos]` から `[]` に変えると、保存の動きがどう変わるか試し、理由を説明する（試したら `[todos]` に戻す）

### 応用課題（推奨）

3. コマ5の演習3で作った「すべて / 未完了 / 完了」の絞り込み状態も localStorage に保存し、再読み込みしても選択が残るようにする。**TODO とは別のキー**（例：`todos-filter`）で保存する
4. `/about` ページに「最終更新日」を表示する。`app/about/page.js` の中で `new Date()` を使って表示した場合、`npm run dev` と `npm run build` → `npm run start` で表示される日時がどう違うかを確かめ、理由を調べる（ヒント：ビルド結果の `○ (Static)`）

### チャレンジ課題（挑戦）

5. `app/layout.js` にフッター（`© 2026 あなたの名前`）を追加する。フッターは **Server Component のまま** にすること。ヘッダーが Client Component でフッターが Server Component になっている理由を説明する
6. `dynamic` + `ssr: false` を使わずに localStorage を安全に読む方法を調べる（キーワード：`useSyncExternalStore`）。今回の方法と比べて、何が良くて何が難しいかをまとめる
