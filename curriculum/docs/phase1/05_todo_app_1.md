# コマ5｜TODOアプリ実装①（追加・完了・削除）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | コマ4 リストと条件付き表示 |
| 次コマ | コマ6 TODOアプリ実装②（保存・ページ分け） |

##  目標

- 画面を見て、どの部品に分け、**どこに state を置くか** を決められる
- フォームの送信を `onSubmit` で受け取り、入力値を配列の state に追加できる
- 親が持つ state を、子から props で渡された関数経由で更新できる（完了・削除）

##  導入

### 前回の振り返り

前回は学食メニューで、配列を `map` で並べ、`[...arr, x]`・`filter`・`map` で **新しい配列を作って** state を更新した。今日はこれを使って、この先 Phase 5 まで育てていく **TODO アプリ** を作り始める。

### 今日作るもの

```text
┌─────────────────────────────────────┐
│ TODOアプリ                           │
│ [ やることを入力         ] [追加]     │
│ ☐ 牛乳を買う                  [削除] │
│ ☑ ~~レポート提出~~            [削除] │
│ 残り 1 件                            │
└─────────────────────────────────────┘
```

- 追加：入力して Enter か「追加」ボタン
- 完了：チェックボックスで ON / OFF。完了したら打ち消し線
- 削除：「削除」ボタン

保存（リロードしても消えない）とページ分けは次回。

### 先に設計する

いきなりコードを書かず、**部品の分け方** と **state の置き場所** を先に決める。

```text
app/page.js（Server Component：見出しを出すだけ）
└── TodoApp（'use client'：TODO の配列 state を持つ）
    ├── TodoForm（入力欄の文字 state を持つ）
    └── TodoList（受け取った配列を並べる）
        └── TodoItem（1件分：チェックボックス＋削除ボタン）
```

**TODO の配列はどこに置く？** → `TodoForm`（追加する側）も `TodoList`（表示する側）も使うので、**両方の親である `TodoApp`** に置く。複数の部品で使う state は **共通の親に持ち上げる**（**state のリフトアップ**）のが React の基本。

##  本題

### 1. プロジェクトを作る

```powershell
cd ~/workspace
npx create-next-app@latest todo-app --js --eslint --app --no-tailwind --no-src-dir --no-react-compiler --import-alias "@/*" --use-npm --yes
cd todo-app
mkdir -Force components
rm app/page.module.css
npm run dev
```

> このプロジェクトは Phase 2 でテストを書き、Phase 3〜4 で GitHub Actions による自動チェックと自動デプロイに使う。名前は `todo-app` のままにしておくと、以降の手順をそのまま使える。

### 2. 土台を整える

使わないフォント設定などを外して、シンプルにする。

```jsx
// app/layout.js
import './globals.css'

export const metadata = {
  title: 'TODOアプリ',
  description: 'Next.js で作る TODO アプリ',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
```

```css
/* app/globals.css（中身を全部置き換える） */
body {
  margin: 0;
  font-family: sans-serif;
  line-height: 1.6;
}

.container {
  max-width: 560px;
  margin: 40px auto;
  padding: 0 16px;
}
```

```jsx
// app/page.js
import TodoApp from '@/components/TodoApp'

export default function Home() {
  return (
    <main className="container">
      <h1>TODOアプリ</h1>
      <TodoApp />
    </main>
  )
}
```

`TodoApp` はまだないのでエラーになる。次で作る。

### 3. まずは表示だけ作る

いきなり全部作らず、**仮のデータを表示する** ところから始める。動く状態を保ちながら少しずつ足すのがコツ。

```jsx
// components/TodoApp.js
'use client'

import { useState } from 'react'

export default function TodoApp() {
  const [todos, setTodos] = useState([
    { id: '1', text: '牛乳を買う', done: false },
    { id: '2', text: 'レポート提出', done: true },
  ])

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  )
}
```

2件表示されればOK。1件の TODO は `{ id, text, done }` の3つの値を持つオブジェクト、と決めた。

> この時点では `setTodos` をまだ使っていない。次のステップで使う。

### 4. TodoForm：入力して追加する

```jsx
// components/TodoForm.js
'use client'

import { useState } from 'react'

export default function TodoForm({ onAdd }) {
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed === '') return
    onAdd(trimmed)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="やることを入力"
        aria-label="やること"
      />
      <button type="submit">追加</button>
    </form>
  )
}
```

- **`<form onSubmit>`**：ボタンのクリックでも Enter キーでも送信される。`onClick` をボタンに付けるより、フォームの送信として扱うほうが自然
- **`e.preventDefault()`**：フォームは送信するとページを再読み込みしようとする（HTML の標準動作）。再読み込みされると state が消えるので止める
- **`text.trim()`**：前後の空白を取り除く。空白だけの TODO を追加させないため
- **`aria-label`**：画面には出ないが、読み上げソフトに「この入力欄は『やること』」と伝えるラベル。Phase 2 のテストでも、この名前で入力欄を探す

`TodoApp` に組み込み、追加の処理を書く。

```jsx
// components/TodoApp.js
'use client'

import { useState } from 'react'
import TodoForm from './TodoForm'

export default function TodoApp() {
  const [todos, setTodos] = useState([])

  function addTodo(text) {
    const newTodo = { id: crypto.randomUUID(), text, done: false }
    setTodos([...todos, newTodo])
  }

  return (
    <div>
      <TodoForm onAdd={addTodo} />
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  )
}
```

入力 → Enter でリストに増えればOK。仮のデータは消して、空の配列から始めるようにした。

> **`crypto.randomUUID()`**：ブラウザに組み込まれている「重複しない ID を作る関数」。`'3b241101-e2bb-4255-8caf-4136c566a962'` のような文字列が返る。
>
> **子から親の state を変える流れ**：`TodoForm` は `todos` を知らない。知っているのは「`onAdd` を呼べば追加される」ことだけ。state を持つ `TodoApp` が変え方（`addTodo`）を決め、関数として子に渡す。

### 5. TodoList と TodoItem に分ける

表示部分を部品にする。

```jsx
// components/TodoItem.js
export default function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li>
      <label style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
        <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
        {todo.text}
      </label>
      <button onClick={() => onDelete(todo.id)} aria-label={`${todo.text}を削除`}>
        削除
      </button>
    </li>
  )
}
```

```jsx
// components/TodoList.js
import TodoItem from './TodoItem'

export default function TodoList({ todos, onToggle, onDelete }) {
  if (todos.length === 0) {
    return <p>やることはありません</p>
  }

  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  )
}
```

- `<label>` でチェックボックスと文字を囲むと、**文字をクリックしてもチェックが切り替わる**。押せる範囲が広がって使いやすい
- 削除ボタンは画面上どれも「削除」なので、`aria-label` で「牛乳を買うを削除」のように **どの TODO の削除か** 分かる名前を付けておく
- `TodoList` と `TodoItem` には `'use client'` がないが、Client Component の `TodoApp` から読み込まれるのでブラウザでも動く

### 6. 完了と削除を TodoApp に書く

```jsx
// components/TodoApp.js
'use client'

import { useState } from 'react'
import TodoForm from './TodoForm'
import TodoList from './TodoList'

export default function TodoApp() {
  const [todos, setTodos] = useState([])

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

| 関数 | やっていること |
|------|---------------|
| `addTodo` | 末尾に1件足した **新しい配列** を作る |
| `toggleTodo` | `map` で全件コピーし、該当の1件だけ `done` を反転したオブジェクトに差し替える |
| `deleteTodo` | `filter` で該当の1件を除いた **新しい配列** を作る |

`remaining`（残り件数）は state にせず、`todos` から計算している。

### 7. 動作確認とコミット

次の順に試す。

1. 「牛乳を買う」「レポート提出」を追加 → 2件表示、「残り 2 件」
2. 「牛乳を買う」の文字をクリック → 打ち消し線、「残り 1 件」
3. 空白だけ入力して Enter → 追加されない
4. 「レポート提出」を削除 → 消える
5. 全部消す → 「やることはありません」

```powershell
git add .
git commit -m "TODOの追加・完了・削除を実装"
```

##  演習

### 演習1（基本）：件数表示を充実させる

「残り ○ 件」を「全 ○ 件 / 完了 ○ 件 / 残り ○ 件」に変える。TODO が0件のときはこの行自体を表示しない。

**確認方法**：3件追加して1件完了にすると「全 3 件 / 完了 1 件 / 残り 2 件」、全部削除すると行が消えればOK。

<details>
<summary>解答例</summary>

```jsx
// components/TodoApp.js（return の前）
const doneCount = todos.filter((todo) => todo.done).length
const remaining = todos.length - doneCount
```

```jsx
// components/TodoApp.js（return の中）
{todos.length > 0 && (
  <p>
    全 {todos.length} 件 / 完了 {doneCount} 件 / 残り {remaining} 件
  </p>
)}
```

</details>

### 演習2（基本）：空のまま追加しようとしたらメッセージを出す

今は空で Enter を押しても何も起きないので、ユーザーは理由が分からない。`TodoForm` で、空のまま送信したら入力欄の下に「やることを入力してください」と赤字で表示する。何か入力し始めたらメッセージを消す。

**確認方法**：空で Enter → 赤字のメッセージ、1文字打つ → メッセージが消える、追加 → 入力欄が空になる、が確認できればOK。

<details>
<summary>解答例</summary>

```jsx
// components/TodoForm.js
'use client'

import { useState } from 'react'

export default function TodoForm({ onAdd }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed === '') {
      setError('やることを入力してください')
      return
    }
    onAdd(trimmed)
    setText('')
  }

  function handleChange(e) {
    setText(e.target.value)
    setError('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={text} onChange={handleChange} placeholder="やることを入力" aria-label="やること" />
      <button type="submit">追加</button>
      {error && (
        <p role="alert" style={{ color: 'red' }}>
          {error}
        </p>
      )}
    </form>
  )
}
```

`role="alert"` を付けると、読み上げソフトがメッセージの出現をすぐに伝えてくれる。テストでも「アラートが出ているか」で確認しやすくなる。

</details>

### 演習3（応用）：「すべて / 未完了 / 完了」で絞り込む

`components/TodoFilter.js` を作り、3つのボタンで表示する TODO を切り替える。選択中のボタンは太字にする。

**確認方法**：3件中1件を完了にして「未完了」を押すと2件、「完了」を押すと1件、「すべて」で3件表示されればOK。絞り込み中でも追加・完了・削除が正しく動くことも確認する。

<details>
<summary>ヒントと解答例</summary>

state に持つのは **選択中の絞り込み条件だけ**。表示する配列は `todos` と条件から計算する（コマ4のカテゴリ絞り込みと同じ考え方）。

```jsx
// components/TodoFilter.js
const filters = [
  { value: 'all', label: 'すべて' },
  { value: 'active', label: '未完了' },
  { value: 'done', label: '完了' },
]

export default function TodoFilter({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px', margin: '8px 0' }}>
      {filters.map((f) => (
        <button key={f.value} onClick={() => onChange(f.value)} style={{ fontWeight: value === f.value ? 'bold' : 'normal' }}>
          {f.label}
        </button>
      ))}
    </div>
  )
}
```

```jsx
// components/TodoApp.js（追加部分）
import TodoFilter from './TodoFilter'

// コンポーネントの中
const [filter, setFilter] = useState('all')

const visibleTodos =
  filter === 'active' ? todos.filter((todo) => !todo.done) : filter === 'done' ? todos.filter((todo) => todo.done) : todos

// return の中
<TodoFilter value={filter} onChange={setFilter} />
<TodoList todos={visibleTodos} onToggle={toggleTodo} onDelete={deleteTodo} />
```

`onChange={setFilter}` のように、**state の更新関数をそのまま props で渡す** こともできる。

</details>

### 演習4（早く終わった人向け）：完了済みを一括削除

「完了済みを削除」ボタンを追加する。完了済みが0件のときはボタンを押せない（`disabled`）ようにする。押したときは `window.confirm('完了済みの TODO を削除しますか？')` で確認し、キャンセルされたら何もしない。

**確認方法**：完了済みがないとボタンがグレーアウトし、ある状態で押して「OK」を選ぶと完了済みだけ消えればOK。

<details>
<summary>解答例</summary>

```jsx
// components/TodoApp.js
function clearDone() {
  if (!window.confirm('完了済みの TODO を削除しますか？')) return
  setTodos(todos.filter((todo) => !todo.done))
}

// return の中
<button onClick={clearDone} disabled={doneCount === 0}>
  完了済みを削除
</button>
```

</details>

##  まとめ

### 今日できるようになったこと

- 部品の分け方と state の置き場所を先に設計してから作れるようになった
- `<form onSubmit>` と `e.preventDefault()` で入力を受け取り、配列の state に追加できるようになった
- 親の state を、子に渡した関数（`onAdd` / `onToggle` / `onDelete`）経由で更新できるようになった

### よくある詰まりポイント

- **追加した瞬間に全部消える**：`e.preventDefault()` を忘れてページが再読み込みされている
- **チェックしても見た目が変わらない**：`toggleTodo` で `todo.done = !todo.done` と直接書き換えている。`{ ...todo, done: !todo.done }` で新しいオブジェクトを作る
- **`onToggle is not a function`**：途中の部品（`TodoList`）で props を受け渡し忘れている。親 → 子 → 孫とバケツリレーで渡す必要がある

### 次コマ予告

今の TODO アプリは、ブラウザを再読み込みすると全部消えてしまう。次回は **localStorage** に保存して消えないようにし、`useEffect` と「サーバでは動かないコード」の扱い方を学ぶ。あわせて「このアプリについて」ページを追加し、Next.js のページ分け（ルーティング）と共通レイアウトを作る。

##  課題

### 基礎課題（必須）

1. 演習1〜3を完成させてコミットする

```powershell
git add .
git commit -m "件数表示・入力チェック・絞り込みを追加"
```

2. 今日の部品構成（`TodoApp` / `TodoForm` / `TodoList` / `TodoItem`）について、それぞれが「持っている state」と「受け取る props」を表にまとめる

### 応用課題（推奨）

3. TODO に **期限** を付けられるようにする。`TodoForm` に `<input type="date">` を追加し、`{ id, text, done, dueDate }` の形で保存する。期限が今日より前で未完了のものは赤字で表示する
4. TODO をダブルクリックすると **その場で編集** できるようにする。「編集中の TODO の id」を1つだけ state に持つ設計と、全 TODO に `isEditing` を持たせる設計のどちらにするか選び、選んだ理由をコメントに書く

### チャレンジ課題（挑戦）

5. `toggleTodo` と `deleteTodo` を、`setTodos(todos.map(...))` ではなく `setTodos((prev) => prev.map(...))` の形に書き換える。コマ3で学んだ「前の値から計算するときは関数を渡す」がここでも当てはまる理由を説明する
6. TODO に **優先度**（高・中・低）を持たせ、「優先度順」「追加順」で並び替えられるようにする。並び替えは表示するときだけ行い、`todos` の state 自体の順番は変えないこと（ヒント：コマ4の `toSorted`）
