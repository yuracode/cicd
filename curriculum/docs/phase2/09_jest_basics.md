# コマ9｜Jest基礎（関数の単体テスト）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 2 |
| 所要時間 | 90分 |
| 前提コマ | コマ8 テスト入門とJestの導入 |
| 次コマ | コマ10 React Testing Library①（表示のテスト） |

##  目標

- TODO の追加・完了・削除の処理を、テストしやすい **純粋関数** として切り出せる
- `describe` / `test` / `test.each` でテストを整理して書ける
- 「元の配列を書き換えていない（イミュータブル）」ことをテストで確かめられる

##  導入

### 前回の振り返り

```powershell
cd ~/workspace/todo-app
git switch main
git pull
npm test
```

前回は Jest を入れて、`lib/todos.js` の `countRemaining` をテストした。

> 前回の内容がない人は、コマ8の本題 3〜6 を先に済ませておく（Jest のインストール、`jest.config.mjs`、`jest.setup.js`、`lib/todos.js`）。

### 今日のテーマ

`components/TodoApp.js` の中にある追加・完了・削除の処理は、今は部品の中に埋め込まれている。

```jsx
function toggleTodo(id) {
  setTodos(todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)))
}
```

`setTodos` を呼んでいるので、この関数だけを取り出してテストするのは難しい。そこで **「新しい配列を計算する部分」** と **「state を更新する部分」** を分ける。

```text
計算する部分（lib/todos.js）         state を更新する部分（TodoApp.js）
toggleTodo(todos, id) → 新しい配列  →  setTodos(新しい配列)
         ↑ ここを Jest でテストする
```

##  本題

### 1. 純粋関数とは

**純粋関数** は、次の2つを満たす関数。

1. **同じ入力なら、いつも同じ出力** を返す
2. 引数や外の変数を **書き換えない**（画面や保存領域にも触らない）

```js
// 純粋関数：入力の配列から新しい配列を返すだけ
function deleteTodo(todos, id) {
  return todos.filter((todo) => todo.id !== id)
}

// 純粋ではない：state を更新している（外の世界を変えている）
function handleDelete(id) {
  setTodos(todos.filter((todo) => todo.id !== id))
}
```

純粋関数は「入れて → 出てきた値を確かめる」だけでテストできる。**ロジックはできるだけ純粋関数に寄せる** とテストが楽になる。

### 2. ブランチを切って関数を切り出す

```powershell
git switch -c refactor/todo-logic
```

`lib/todos.js` に関数を追加する。

```js
// lib/todos.js
export function createTodo(text) {
  return { id: crypto.randomUUID(), text, done: false }
}

export function addTodo(todos, text) {
  return [...todos, createTodo(text)]
}

export function toggleTodo(todos, id) {
  return todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo))
}

export function deleteTodo(todos, id) {
  return todos.filter((todo) => todo.id !== id)
}

export function countRemaining(todos) {
  return todos.filter((todo) => !todo.done).length
}
```

### 3. describe でテストを整理する

テストが増えると、どの関数のテストか分かりにくくなる。**`describe` でグループにまとめる**。

`lib/todos.test.js` を次のように書き直す。

```js
// lib/todos.test.js
import { addTodo, countRemaining, deleteTodo, toggleTodo } from './todos'

const sample = [
  { id: 'a', text: '牛乳を買う', done: false },
  { id: 'b', text: 'レポート提出', done: true },
]

describe('addTodo', () => {
  test('末尾に未完了の TODO が1件増える', () => {
    const result = addTodo(sample, '部屋の掃除')

    expect(result).toHaveLength(3)
    expect(result[2]).toEqual({ id: expect.any(String), text: '部屋の掃除', done: false })
  })
})

describe('toggleTodo', () => {
  test('指定した id の done だけが反転する', () => {
    const result = toggleTodo(sample, 'a')

    expect(result[0].done).toBe(true)
    expect(result[1].done).toBe(true)
  })
})

describe('deleteTodo', () => {
  test('指定した id の TODO だけが消える', () => {
    const result = deleteTodo(sample, 'a')

    expect(result).toEqual([{ id: 'b', text: 'レポート提出', done: true }])
  })

  test('存在しない id なら何も消えない', () => {
    const result = deleteTodo(sample, 'zzz')

    expect(result).toEqual(sample)
  })
})

describe('countRemaining', () => {
  test('未完了の数を返す', () => {
    expect(countRemaining(sample)).toBe(1)
  })

  test('0件なら 0', () => {
    expect(countRemaining([])).toBe(0)
  })

  test('すべて完了なら 0', () => {
    const allDone = [
      { id: 'x', text: 'A', done: true },
      { id: 'y', text: 'B', done: true },
    ]
    expect(countRemaining(allDone)).toBe(0)
  })
})
```

- **`sample`**：複数のテストで使う共通のデータ。ファイルの上のほうに1回だけ書く
- **`expect.any(String)`**：「何かの文字列であればよい」という意味。ID は毎回ランダムに変わるので、値そのものではなく **型だけ** 確かめる

```powershell
npm test
```

```text
 PASS  lib/todos.test.js
  addTodo
    ✓ 末尾に未完了の TODO が1件増える
  toggleTodo
    ✓ 指定した id の done だけが反転する
  deleteTodo
    ✓ 指定した id の TODO だけが消える
    ✓ 存在しない id なら何も消えない
  countRemaining
    ✓ 未完了の数を返す
    ✓ 0件なら 0
    ✓ すべて完了なら 0
```

`describe` の名前ごとに字下げされて表示される。**テストの一覧が、そのまま関数の仕様書として読める** のが理想。

### 4. 元の配列を書き換えていないことを確かめる

コマ4で学んだとおり、React の state は **書き換えずに新しく作る** 必要がある。これもテストで守る。

```js
// lib/todos.test.js（addTodo の describe の中に追加）
test('元の配列は書き換えない', () => {
  const result = addTodo(sample, '部屋の掃除')

  expect(result).not.toBe(sample)
  expect(sample).toHaveLength(2)
})
```

```js
// lib/todos.test.js（toggleTodo の describe の中に追加）
test('元の TODO オブジェクトは書き換えない', () => {
  toggleTodo(sample, 'a')

  expect(sample[0].done).toBe(false)
})

test('変更していない TODO は同じオブジェクトのまま', () => {
  const result = toggleTodo(sample, 'a')

  expect(result[1]).toBe(sample[1])
})
```

- `not.toBe(sample)`：返ってきた配列が **別の配列** であること
- `sample[0].done` が `false` のまま：元のデータに手を加えていないこと
- `result[1]` が `sample[1]` と **同じもの**：関係ない TODO まで無駄にコピーしていないこと

試しに `toggleTodo` を次のような「書き換える」実装にして、テストが失敗することを確認する（確認したら戻す）。

```js
export function toggleTodo(todos, id) {
  const todo = todos.find((t) => t.id === id)
  todo.done = !todo.done   // 元のオブジェクトを書き換えている
  return [...todos]
}
```

画面上はそれっぽく動いてしまうこともあるが、テストで **「やってはいけない書き方」を防げる**。

### 5. TodoApp から使う

`components/TodoApp.js` の中の処理を、`lib/todos.js` の関数に置き換える。名前がぶつからないように、部品の中の関数は `handle○○` にする。

```jsx
// components/TodoApp.js
'use client'

import { useEffect, useState } from 'react'
import { addTodo, countRemaining, deleteTodo, toggleTodo } from '@/lib/todos'
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

  function handleAdd(text) {
    setTodos(addTodo(todos, text))
  }

  function handleToggle(id) {
    setTodos(toggleTodo(todos, id))
  }

  function handleDelete(id) {
    setTodos(deleteTodo(todos, id))
  }

  function clearAll() {
    if (!window.confirm('すべての TODO を削除しますか？')) return
    setTodos([])
  }

  const remaining = countRemaining(todos)

  return (
    <div>
      <TodoForm onAdd={handleAdd} />
      <TodoList todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
      <p>残り {remaining} 件</p>
      <button onClick={clearAll} disabled={todos.length === 0}>
        すべて削除
      </button>
    </div>
  )
}
```

> `clearAll`（すべて削除）はコマ7で追加したもの。まだない人は、この形で追加しておく。

テストとブラウザの両方で確認する。

```powershell
npm test
npm run dev
```

ブラウザで追加・完了・削除がこれまでどおり動けばOK。このように **動きを変えずにコードの中身を整理すること** を **リファクタリング** と呼ぶ。テストがあると、整理しても壊していないと自信を持てる。

```powershell
git add .
git commit -m "refactor: TODOの操作をlib/todos.jsの純粋関数に切り出し"
```

### 6. test.each で同じ形のテストをまとめる

「すべて / 未完了 / 完了」の絞り込み関数を追加する。

```js
// lib/todos.js（追加）
export function filterTodos(todos, filter) {
  if (filter === 'active') return todos.filter((todo) => !todo.done)
  if (filter === 'done') return todos.filter((todo) => todo.done)
  return todos
}
```

入力だけが違う同じ形のテストは、`test.each` で表のように書ける。

```js
// lib/todos.test.js（追加。import に filterTodos を足す）
describe('filterTodos', () => {
  test.each([
    ['all', ['a', 'b']],
    ['active', ['a']],
    ['done', ['b']],
  ])('%s のとき id が %j の TODO が残る', (filter, expectedIds) => {
    const result = filterTodos(sample, filter)

    expect(result.map((todo) => todo.id)).toEqual(expectedIds)
  })
})
```

```text
  filterTodos
    ✓ all のとき id が ["a","b"] の TODO が残る
    ✓ active のとき id が ["a"] の TODO が残る
    ✓ done のとき id が ["b"] の TODO が残る
```

`%s`（文字列）や `%j`（JSON）の部分に、表の値が入ってテスト名が作られる。

```powershell
git add .
git commit -m "feat: filterTodos を追加"
git push -u origin refactor/todo-logic
gh pr create --fill
```

##  演習

### 演習1（基本）：deleteTodo と countRemaining のイミュータブルテスト

`deleteTodo` について「元の配列は書き換えない」テストを追加する。さらに `deleteTodo` の実装を `splice` を使った「書き換える」版にわざと変えて、テストが失敗することを確かめる（確かめたら戻す）。

**確認方法**：正しい実装で PASS、`splice` 版で FAIL になればOK。

<details>
<summary>解答例</summary>

```js
// lib/todos.test.js（deleteTodo の describe の中）
test('元の配列は書き換えない', () => {
  const result = deleteTodo(sample, 'a')

  expect(result).not.toBe(sample)
  expect(sample).toHaveLength(2)
})
```

```js
// わざと壊した実装（確認用）
export function deleteTodo(todos, id) {
  const index = todos.findIndex((todo) => todo.id === id)
  todos.splice(index, 1)
  return todos
}
```

`splice` 版では `not.toBe(sample)` が失敗する（同じ配列を返している）。

</details>

### 演習2（基本）：テストを先に書いて clearDone を作る

完了済みの TODO をすべて取り除く関数 `clearDone(todos)` を、**テストを先に書いてから** 作る（TDD）。

1. `lib/todos.test.js` に `describe('clearDone', ...)` を書き、次の3つのテストを書く
   - 完了済みがすべて消え、未完了だけが残る
   - 完了済みがなければ、中身が同じ配列を返す
   - 元の配列は書き換えない
2. `npm test` → `clearDone is not a function` で失敗することを確認（赤）
3. `lib/todos.js` に `clearDone` を書いて、テストを通す（緑）

**確認方法**：赤 → 緑の順に表示が変わり、3つのテストがすべて PASS すればOK。

<details>
<summary>解答例</summary>

```js
// lib/todos.test.js
describe('clearDone', () => {
  test('完了済みが消え、未完了だけが残る', () => {
    expect(clearDone(sample)).toEqual([{ id: 'a', text: '牛乳を買う', done: false }])
  })

  test('完了済みがなければ中身は同じ', () => {
    const todos = [{ id: 'x', text: 'X', done: false }]
    expect(clearDone(todos)).toEqual(todos)
  })

  test('元の配列は書き換えない', () => {
    clearDone(sample)
    expect(sample).toHaveLength(2)
  })
})
```

```js
// lib/todos.js
export function clearDone(todos) {
  return todos.filter((todo) => !todo.done)
}
```

</details>

### 演習3（応用）：TODO の文字を変更する関数

TODO の文字を書き換える `editTodo(todos, id, text)` を作り、テストする。次の仕様を満たすこと。

- 指定した id の TODO の `text` だけが変わる（`done` や `id` はそのまま）
- 新しい文字は前後の空白を取り除く
- 前後の空白を除いて空になる場合は、**何も変えずに元の配列をそのまま返す**
- 元の配列・オブジェクトは書き換えない

**確認方法**：仕様4つに対応するテストがすべて PASS すればOK。

<details>
<summary>解答例</summary>

```js
// lib/todos.js
export function editTodo(todos, id, text) {
  const trimmed = text.trim()
  if (trimmed === '') return todos
  return todos.map((todo) => (todo.id === id ? { ...todo, text: trimmed } : todo))
}
```

```js
// lib/todos.test.js
describe('editTodo', () => {
  test('text だけが変わる', () => {
    const result = editTodo(sample, 'b', '企画書提出')
    expect(result[1]).toEqual({ id: 'b', text: '企画書提出', done: true })
  })

  test('前後の空白は取り除く', () => {
    const result = editTodo(sample, 'a', '  豆乳を買う  ')
    expect(result[0].text).toBe('豆乳を買う')
  })

  test('空なら元の配列をそのまま返す', () => {
    expect(editTodo(sample, 'a', '   ')).toBe(sample)
  })

  test('元のオブジェクトは書き換えない', () => {
    editTodo(sample, 'a', '豆乳を買う')
    expect(sample[0].text).toBe('牛乳を買う')
  })
})
```

「空なら元の配列をそのまま返す」を `toBe` で確かめている点に注目。何も変わらないときに同じ配列を返せば、React は「変更なし」と判断して無駄な描画をしない。

</details>

### 演習4（早く終わった人向け）：並び替え関数を test.each で

`sortTodos(todos, order)` を作る。`order` が `'created'` なら元の順、`'undone-first'` なら未完了を先・完了を後（それぞれの中では元の順）にする。`test.each` を使って両方のパターンをテストし、元の配列を書き換えていないことも確かめる。

**確認方法**：`test.each` のテスト名に order の値が入って表示され、すべて PASS すればOK。

<details>
<summary>ヒント</summary>

- `toSorted` は元の配列を書き換えずに並び替えたコピーを返す
- 「未完了を先に」は `(a, b) => Number(a.done) - Number(b.done)`（`false` は 0、`true` は 1）
- `toSorted` は同じ値同士の順番を保つ（安定ソート）ので、それぞれの中では元の順が保たれる

</details>

##  まとめ

### 今日できるようになったこと

- 追加・完了・削除などの処理を、テストしやすい純粋関数として `lib/` に切り出せるようになった
- `describe` / `test.each` で、仕様書のように読めるテストを書けるようになった
- `not.toBe` や「元のデータが変わっていない」確認で、イミュータブルな更新をテストで守れるようになった

### よくある詰まりポイント

- **ID が毎回違ってテストが通らない**：`crypto.randomUUID()` の値は予想できない。`expect.any(String)` を使うか、ID 以外の項目だけを確かめる
- **あるテストの結果が他のテストに影響する**：共通データ（`sample`）を関数の中で書き換えているとテスト同士が干渉する。イミュータブルに書けていれば起きない
- **切り出したあと画面が動かない**：`lib/todos.js` の関数名と `TodoApp.js` の関数名がぶつかっていないか確認する（部品側は `handle○○` にする）

### 次コマ予告

次回からは **画面（部品）** のテストに入る。React Testing Library を使って、`TodoItem` や `TodoList` を表示し、「チェックボックスが付いているか」「空のときにメッセージが出るか」を確かめる。

##  課題

### 基礎課題（必須）

1. 演習1・2を完成させ、PR を作ってマージする
2. `clearDone` を使って、コマ5演習4の「完了済みを削除」ボタン（まだ作っていなければ作る）を書き換える。テストとブラウザの両方で確認する

### 応用課題（推奨）

3. 演習3の `editTodo` を使って、TODO をダブルクリックすると編集できる機能を作る（コマ5の課題4をまだやっていなければここでやる）。**ロジックは `lib/` でテスト済み、部品は呼び出すだけ** という分け方を意識する
4. `lib/todos.test.js` を読み直し、テスト名だけを上から読んで「TODO の操作の仕様書」になっているか確認する。分かりにくいテスト名があれば書き直す

### チャレンジ課題（挑戦）

5. `loadTodos`（localStorage から読む関数）を `lib/storage.js` に移し、テストを書く。jsdom には localStorage があるので、テストの中で `localStorage.setItem(...)` してから `loadTodos()` を呼べる。壊れた JSON が入っていたときに空の配列を返すことも確かめる（ヒント：`beforeEach(() => localStorage.clear())`）
6. 「純粋関数にできない処理」を TODO アプリの中から3つ探し、なぜ純粋にできないのか（何の「外の世界」に触っているのか）を説明する
