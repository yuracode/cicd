# コマ5｜TODOアプリ実装②（useEffect・API連携）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | コマ4 TODOアプリ実装①（追加・表示・削除） |
| 次コマ | コマ6 GitHub連携・ブランチ戦略・PR体験 |

## 🎯 目標

- **useEffect** の役割と依存配列（dependency array）を説明できる
- localStorage を使ってTODOをリロードしても保持できる
- fetch と useEffect を組み合わせて外部APIからデータを取得できる

## 📋 導入（15分）

### 前回の振り返り

TODOの追加・削除ができるようになったが、**リロードするとすべて消える**。今日はこれを直す。

### 今日やること

1. **localStorage に保存** → リロードしても消えないTODOアプリに
2. **JSONPlaceholder から初期TODOを取得** → 外部APIの体験

### 問いかけ

> 「画面が表示された時に、自動で何かを読み込む処理はどこに書けばいい？」

関数コンポーネントの中に直接書くと、**毎回のレンダリング** で実行されて大変なことになる。そこで登場するのが `useEffect`。

## 🛠 本題（65分）

### 1. useEffect とは（10分）

**useEffect = 「レンダリング後に実行する処理」を書く場所**

例：

```jsx
import { useEffect } from 'react'

useEffect(() => {
  console.log('レンダリング後に実行される')
}, [])
```

- 第1引数：実行したい関数
- 第2引数：**依存配列**。ここに書いた値が変わった時だけ再実行される
  - `[]`（空）…初回レンダリング時だけ実行（よく使う）
  - `[count]`…count が変わった時だけ実行
  - 省略…毎回のレンダリングで実行（ほぼ使わない）

**典型的な用途：**

- 画面表示時のデータ取得
- state の変更を外部（localStorage等）に書き出し
- タイマー開始／停止

### 2. localStorage でTODOを永続化（20分）

前回のTODOアプリを引き続き編集する。

```bash
cd ~/workspace/todo-app
npm run dev
```

`App.jsx` の useState の初期値を「localStorage から読む」に変える。

```jsx
// src/App.jsx
import { useState, useEffect } from 'react'
import TodoForm from './TodoForm'
import TodoList from './TodoList'

function App() {
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('todos')
    return saved ? JSON.parse(saved) : []
  })

  // todos が変わるたびに localStorage に保存
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

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

> **`useState(() => ...)` の書き方**：初期値を **関数** で渡すと、初回レンダリング時だけ実行される。`localStorage.getItem` を毎回呼びたくないのでこの書き方を使う。
>
> **`localStorage` とは**：ブラウザが持つ小さな保存領域。文字列しか入らないので、配列やオブジェクトは **JSON.stringify** で文字列化、**JSON.parse** でオブジェクトに戻す。

動作確認：

1. TODOを2〜3個追加
2. ブラウザをリロード → TODOが残っていればOK
3. 開発者ツール → Application → Local Storage で実際の値も確認できる

### 3. fetch と JSONPlaceholder（20分）

外部APIから初期データを取ってみる。**JSONPlaceholder** は学習用の無料フェイクAPI。

```
https://jsonplaceholder.typicode.com/todos?_limit=5
```

ブラウザで開くとJSONが返ってくる。これをアプリで取得する。

**今回は別の小さなサンプル** を作って試す（永続化アプリは壊さない）。

`src/ApiSample.jsx` を新規作成：

```jsx
// src/ApiSample.jsx
import { useState, useEffect } from 'react'

function ApiSample() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/todos?_limit=5')
      .then((res) => {
        if (!res.ok) throw new Error('通信失敗')
        return res.json()
      })
      .then((data) => {
        setTodos(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
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

`App.jsx` に追加して表示：

```jsx
// src/App.jsx の return 内にあるものの下に追加
<h2>API取得サンプル</h2>
<ApiSample />
```

（`import ApiSample from './ApiSample'` も忘れずに）

> **3つの state パターン**：`data` / `loading` / `error` の3つを持つのは非同期処理の定番。
>
> **`useEffect(..., [])`** の依存配列が空なので、**初回レンダリング時だけ** fetch が走る。空にしないと「データ取得→state更新→再レンダリング→また取得」の無限ループになる。

### 4. async/await で書き直し（10分）

`.then` のチェーンは読みにくいので、**async/await** のほうが今は主流。

```jsx
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
```

> **なぜ `useEffect(async () => {...})` と書かないの？**：useEffect のコールバックは **クリーンアップ関数** を返すことがあるが、async 関数は Promise を返すのでルール違反。中で別の async 関数を定義して呼ぶのが定石。

### 5. まとめて動作確認（5分）

- 永続化アプリのTODO追加→リロード→残る
- APIサンプルが初回に5件読み込まれる
- ネットを切って読み込むとエラーが出る（エラーハンドリング確認）

## ✅ まとめ（10分）

### 今日できるようになったこと

- useEffect の第2引数（依存配列）の意味を理解した
- localStorage で state の永続化ができるようになった
- fetch + useEffect で外部APIからデータを取ってこられる

### よくある詰まりポイント

- **依存配列を省略して無限ループ**：必ず `[]` か必要な値を入れる
- **`JSON.parse` でエラー**：localStorage に壊れた値が入っている場合。開発者ツールで削除する
- **CORSエラー**：今回の JSONPlaceholder は大丈夫だが、本番APIでは許可設定が必要になることがある

### 次コマ予告

次回はPhase 1のラスト。今まで作ったTODOアプリをGitHubに上げ、**ブランチを切ってPRを作る** 一連の流れを体験する。チーム開発の基本リズムを身につける。

## 📝 課題

1. APIサンプルの `_limit=5` を `_limit=10` に変えて再取得できることを確認する
2. 「再読み込み」ボタンを追加し、押したらAPIから再取得するようにする（state に `reloadKey` を持たせて useEffect の依存配列に入れる）
