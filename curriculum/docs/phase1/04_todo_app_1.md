# コマ4｜TODOアプリ実装①（追加・表示・削除）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | コマ3 コンポーネント設計 |
| 次コマ | コマ5 TODOアプリ実装②（useEffect・API連携） |

##  目標

- 新規プロジェクト `todo-app` を作成し、コンポーネント構成を自分で設計できる
- フォーム入力から state に値を追加・表示・削除できる
- 配列の state を「新しい配列を作って更新する」イミュータブルな扱いができる

##  導入（15分）

### 前回の振り返り

プロフィールカードで「親に state を持ち、props で値と関数を渡す」パターンを学んだ。今日はそれを使ってアプリらしいものを作る。

### 今日作るもの

シンプルなTODOリスト。

```
┌─────────────────────────────────┐
│ TODOアプリ                       │
│ [           入力欄           ] [追加]│
│ ─────────────────────────────── │
│ ☐ 牛乳を買う          [削除]     │
│ ☐ レポート提出        [削除]     │
│ ☐ 友達に連絡          [削除]     │
└─────────────────────────────────┘
```

追加・表示・削除までを今日、永続化（localStorage）とAPI連携は次回。

### コンポーネント構成を先に考える

黒板（またはホワイトボード）で一緒に考える：

- `App`：state（TODO配列）を持つ
- `TodoForm`：入力欄＋追加ボタン
- `TodoList`：TODO配列を受け取って一覧表示
- `TodoItem`：TODO1件＋削除ボタン

##  本題（65分）

### 1. 新規プロジェクト作成（5分）

```bash
cd ~/workspace
npm create vite@latest todo-app -- --template react
cd todo-app
npm install
npm run dev
```

`src/App.jsx` の中身をまっさらにする（デフォルトのロゴ等は削除）。

```jsx
// src/App.jsx
function App() {
  return <h1>TODOアプリ</h1>
}

export default App
```

### 2. state に仮のTODOを入れて表示（10分）

まず **表示だけ** 先に作る。追加機能はあとから。

```jsx
// src/App.jsx
import { useState } from 'react'

function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: '牛乳を買う' },
    { id: 2, text: 'レポート提出' },
  ])

  return (
    <div>
      <h1>TODOアプリ</h1>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  )
}

export default App
```

ブラウザで2件表示されていればOK。

### 3. TodoForm で追加機能（20分）

入力欄の値を管理するために、もう1つ state を用意する。

```jsx
// src/TodoForm.jsx
import { useState } from 'react'

function TodoForm({ onAdd }) {
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (text.trim() === '') return
    onAdd(text)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="やることを入力"
      />
      <button type="submit">追加</button>
    </form>
  )
}

export default TodoForm
```

> **`e.preventDefault()`** が必要な理由：フォームは submit するとページがリロードされてしまう（HTMLのデフォルト動作）。それを止めないとReactの state が吹き飛ぶ。
>
> **`value` と `onChange` がセット**：これを **制御コンポーネント** と呼ぶ。入力値をReactの state で管理する書き方。

`App.jsx` に組み込む：

```jsx
// src/App.jsx
import { useState } from 'react'
import TodoForm from './TodoForm'

function App() {
  const [todos, setTodos] = useState([])

  const addTodo = (text) => {
    const newTodo = { id: Date.now(), text }
    setTodos([...todos, newTodo])
  }

  return (
    <div>
      <h1>TODOアプリ</h1>
      <TodoForm onAdd={addTodo} />
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  )
}

export default App
```

> **`id: Date.now()`**：今の時刻（ミリ秒の数値）をidにしている。簡単な実装では一意性が十分確保できるので使いやすい。
>
> **`[...todos, newTodo]` がポイント**：元の配列を書き換えず、**新しい配列を作って** setTodos に渡す。これがReactの鉄則「**state はイミュータブル（不変）に扱う**」。

ここで動作確認。入力→追加→リストに出る までが動けばOK。

### 4. TodoList と TodoItem に分解（10分）

コードが膨らんできたのでコンポーネントに分ける。

```jsx
// src/TodoItem.jsx
function TodoItem({ todo, onDelete }) {
  return (
    <li>
      {todo.text}
      <button onClick={() => onDelete(todo.id)} style={{ marginLeft: '8px' }}>
        削除
      </button>
    </li>
  )
}

export default TodoItem
```

```jsx
// src/TodoList.jsx
import TodoItem from './TodoItem'

function TodoList({ todos, onDelete }) {
  if (todos.length === 0) {
    return <p>やることはありません</p>
  }

  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onDelete={onDelete} />
      ))}
    </ul>
  )
}

export default TodoList
```

### 5. 削除機能（15分）

`App.jsx` に削除関数を追加。

```jsx
// src/App.jsx
import { useState } from 'react'
import TodoForm from './TodoForm'
import TodoList from './TodoList'

function App() {
  const [todos, setTodos] = useState([])

  const addTodo = (text) => {
    const newTodo = { id: Date.now(), text }
    setTodos([...todos, newTodo])
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  return (
    <div>
      <h1>TODOアプリ</h1>
      <TodoForm onAdd={addTodo} />
      <TodoList todos={todos} onDelete={deleteTodo} />
    </div>
  )
}

export default App
```

> **`filter()`** は条件に合うものだけ残した **新しい配列** を返す。元の配列は変わらない。これもイミュータブルな更新。

### 6. 動作確認（5分）

- 追加 → リストに出るか
- 削除 → 消えるか
- 空文字で追加 → ブロックされるか
- リロードしてTODOが消えること → 次回 localStorage で解決

##  まとめ（10分）

### 今日できるようになったこと

- フォーム入力を制御コンポーネントで扱える
- 配列の state に対して `[...arr, 新要素]` / `arr.filter(...)` でイミュータブル更新ができる
- 親に state、子に props で関数を渡すパターンでアプリが組める

### よくある詰まりポイント

- **`e.preventDefault()` 忘れ**：ページがリロードされてTODOが消える
- **`setTodos(todos.push(...))` と書いてしまう**：push は元の配列を変える＋ undefined を返すので state が壊れる。**必ず新しい配列を作る**
- **`key` に `index` を使う**：追加・削除で順序が変わると挙動が怪しくなる。idを使うこと

### 次コマ予告

次回はリロードしても消えないようにする（localStorage）と、外部APIからTODOを取得する（fetch）をやる。`useEffect` が初登場。

##  課題

### 基礎課題（必須）

1. TODOアイテムにチェックボックスを追加して、完了状態をON/OFFできるようにする（`completed: true/false` を持たせる）
2. 完了済みのTODOは打ち消し線（`textDecoration: 'line-through'`）で表示する

ヒント：

```jsx
<li style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
```

### 応用課題（推奨）

3. **「すべて削除」ボタン** を追加する。押す前に `window.confirm('本当に削除しますか？')` で確認ダイアログを出す。ユーザーがキャンセルしたら何もしない
4. 画面上部に **「全○件 / 完了○件 / 未完了○件」** の件数サマリを表示する。配列のメソッド（`filter` や `reduce`）を使って集計する
5. TODO項目の **順番を「新しい順」⇔「古い順」で並び替えるボタン** を追加する。state に `order: 'asc' | 'desc'` を持たせ、表示時だけソートする（元配列は変更しない＝イミュータブル）

> **狙い：** 「state の形」を自分で決める経験。件数や並び順のような「派生する情報」は state に持たずに **計算で出す** のが原則。

### チャレンジ課題（挑戦）

6. TODOに **カテゴリ**（仕事／個人／学習）を持たせる。追加時にドロップダウンで選ぶ。表示時はカテゴリごとに色のタグを出す。**どういうデータ構造にするか** （文字列？ enum的な定数？ オブジェクト？）を自分で決めて、その決断理由をコメントに1行書く
7. TODOアイテムをクリックすると **編集モード** に入り、その場でテキスト編集→Enterで確定できるようにする。編集中の状態管理をどう設計するか（編集中のidを1つだけstateに持つ？ 全TODOに `isEditing` フラグ？）を自分で選択する（ヒント：前者が小さくて済む）
