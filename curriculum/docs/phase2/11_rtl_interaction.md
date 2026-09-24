# コマ11｜React Testing Library②（ユーザー操作のテスト）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 2 |
| 所要時間 | 90分 |
| 前提コマ | コマ10 React Testing Library①（表示のテスト） |
| 次コマ | コマ12 モックと非同期のテスト |

##  目標

- `user-event` で入力・クリック・キー操作を再現できる
- `jest.fn()` を props に渡し、「正しい引数で呼ばれたか」を確かめられる
- 複数の部品を組み合わせた `TodoApp` を、ユーザーの操作の流れどおりにテストできる

##  導入

### 前回の振り返り

```bash
cd ~/workspace/todo-app
git switch main
git pull
npm test
```

前回は `render` と `screen.getByRole` で、部品が **正しく表示されるか** をテストした。

> 前回までの内容がない人は、コマ8の本題 3〜4（Jest の導入）を先に済ませておく。今日テストする `TodoForm` / `TodoApp` は本題に全文を載せてある。

### 今日のテーマ

アプリは表示して終わりではなく、ユーザーが **操作** する。

- 入力欄に文字を打って Enter を押したら、TODO が増えるか
- チェックボックスを押したら、残り件数が減るか
- 削除ボタンを押したら、その TODO だけ消えるか

これまで手でブラウザを操作して確かめていたことを、テストに書く。

##  本題

### 1. テストする部品を確認する

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

```bash
git switch -c test/user-interaction
```

### 2. user-event で入力とクリックを再現する

```jsx
// components/TodoForm.test.js
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodoForm from './TodoForm'

test('入力して「追加」を押すと、onAdd が入力した文字で呼ばれる', async () => {
  const user = userEvent.setup()
  const handleAdd = jest.fn()
  render(<TodoForm onAdd={handleAdd} />)

  await user.type(screen.getByRole('textbox', { name: 'やること' }), '牛乳を買う')
  await user.click(screen.getByRole('button', { name: '追加' }))

  expect(handleAdd).toHaveBeenCalledTimes(1)
  expect(handleAdd).toHaveBeenCalledWith('牛乳を買う')
})
```

| 部分 | 意味 |
|------|------|
| `userEvent.setup()` | 操作を再現する「ユーザー」を用意する。テストの最初に1回呼ぶ |
| `await user.type(要素, '文字')` | 要素をクリックして、1文字ずつキーを打つ |
| `await user.click(要素)` | 要素をクリックする |
| `async () => { ... }` | 操作は時間のかかる処理として扱うので、テスト関数を `async` にして `await` で待つ |

> **`await` を忘れると？** 操作が終わる前に `expect` が実行され、テストが失敗したり、たまたま通ったりする。**`user.○○` の前には必ず `await`**。

### 3. jest.fn()：呼ばれたかを記録する偽物の関数

`TodoForm` の仕事は「入力された文字を `onAdd` に渡すこと」。実際に TODO を増やすのは親の仕事なので、テストでは **本物の代わりに記録係の関数** を渡す。

```js
const handleAdd = jest.fn()
```

`jest.fn()` で作った関数は、**呼ばれた回数と引数を全部覚えている**。

| マッチャー | 意味 |
|-----------|------|
| `toHaveBeenCalled()` | 1回以上呼ばれた |
| `toHaveBeenCalledTimes(n)` | ちょうど n 回呼ばれた |
| `toHaveBeenCalledWith(引数...)` | その引数で呼ばれた |
| `not.toHaveBeenCalled()` | 1回も呼ばれていない |

こうした「本物の代わりに使う偽物」を **モック** と呼ぶ。次回さらに詳しく扱う。

### 4. Enter キー・空白・入力欄のリセット

```jsx
// components/TodoForm.test.js（追加）
test('Enter キーでも追加でき、前後の空白は取り除かれ、入力欄が空に戻る', async () => {
  const user = userEvent.setup()
  const handleAdd = jest.fn()
  render(<TodoForm onAdd={handleAdd} />)
  const input = screen.getByRole('textbox', { name: 'やること' })

  await user.type(input, '  レポート提出  {Enter}')

  expect(handleAdd).toHaveBeenCalledWith('レポート提出')
  expect(input).toHaveValue('')
})

test('空白だけなら onAdd は呼ばれない', async () => {
  const user = userEvent.setup()
  const handleAdd = jest.fn()
  render(<TodoForm onAdd={handleAdd} />)

  await user.type(screen.getByRole('textbox', { name: 'やること' }), '   {Enter}')

  expect(handleAdd).not.toHaveBeenCalled()
})
```

- `{Enter}` のように `{ }` で囲むと、特殊なキーを押せる（`{Tab}`、`{Backspace}`、`{Escape}` など）
- `toHaveValue('')`：入力欄の中身が空であること

```bash
npm test
```

### 5. TodoItem：クリックで正しい id が渡るか

```jsx
// components/TodoItem.test.js（追加）
import userEvent from '@testing-library/user-event'

test('チェックボックスを押すと onToggle が TODO の id で呼ばれる', async () => {
  const user = userEvent.setup()
  const handleToggle = jest.fn()
  const todo = { id: 'abc', text: '牛乳を買う', done: false }
  render(<TodoItem todo={todo} onToggle={handleToggle} onDelete={() => {}} />)

  await user.click(screen.getByRole('checkbox', { name: '牛乳を買う' }))

  expect(handleToggle).toHaveBeenCalledWith('abc')
})
```

`TodoItem` はチェック状態を自分では変えない（state を持っていない）。だからこのテストでは **チェックが付いたか** ではなく、**親に正しい id を知らせたか** を確かめている。

```bash
git add .
git commit -m "test: TodoForm と TodoItem の操作テストを追加"
```

### 6. TodoApp：部品を組み合わせてテストする

ここまでは部品を1つずつテストした。次は `TodoApp` を丸ごと表示して、**ユーザーが実際に使う流れ** でテストする（**結合テスト**）。

```jsx
// components/TodoApp.test.js
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodoApp from './TodoApp'

beforeEach(() => {
  localStorage.clear()
})

test('TODO を追加・完了・削除できる', async () => {
  const user = userEvent.setup()
  render(<TodoApp />)
  const input = screen.getByRole('textbox', { name: 'やること' })

  // 追加
  await user.type(input, '牛乳を買う{Enter}')
  await user.type(input, 'レポート提出{Enter}')
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByText('残り 2 件')).toBeInTheDocument()

  // 完了
  await user.click(screen.getByRole('checkbox', { name: '牛乳を買う' }))
  expect(screen.getByText('残り 1 件')).toBeInTheDocument()

  // 削除
  await user.click(screen.getByRole('button', { name: 'レポート提出を削除' }))
  expect(screen.queryByText('レポート提出')).not.toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
})
```

- **`beforeEach(() => { ... })`**：このファイルの **各テストの前に毎回** 実行される。`TodoApp` は localStorage に保存するので、前のテストの TODO が残らないように毎回消している
- テストの中身は「ユーザーの操作 → 画面の確認」の繰り返し。**テストを読むだけで操作の手順が分かる** ように書く

> **テストが localStorage を使って大丈夫？** jsdom（偽物のブラウザ）には localStorage も用意されている。テストの中だけの保存領域なので、本物のブラウザのデータには影響しない。

### 7. 保存したデータが読み込まれるか

```jsx
// components/TodoApp.test.js（追加）
test('localStorage に保存された TODO が最初から表示される', () => {
  localStorage.setItem('todos', JSON.stringify([{ id: '1', text: '保存済みの TODO', done: true }]))

  render(<TodoApp />)

  expect(screen.getByRole('checkbox', { name: '保存済みの TODO' })).toBeChecked()
  expect(screen.getByText('残り 0 件')).toBeInTheDocument()
})
```

**準備（Arrange）で localStorage にデータを入れておく** ことで、「前回の続きから始まる」状況を再現している。

```bash
npm test
git add .
git commit -m "test: TodoApp の結合テストを追加"
git push -u origin test/user-interaction
gh pr create --fill
```

##  演習

### 演習1（基本）：削除ボタンのテスト

`components/TodoItem.test.js` に、「削除ボタンを押すと `onDelete` が TODO の id で呼ばれ、`onToggle` は呼ばれない」ことを確かめるテストを追加する。

**確認方法**：テストが PASS し、`TodoItem.js` の削除ボタンの `onClick` を `() => onToggle(todo.id)` にわざと変えると FAIL になればOK。

<details>
<summary>解答例</summary>

```jsx
test('削除ボタンを押すと onDelete が id で呼ばれる', async () => {
  const user = userEvent.setup()
  const handleToggle = jest.fn()
  const handleDelete = jest.fn()
  const todo = { id: 'abc', text: '牛乳を買う', done: false }
  render(<TodoItem todo={todo} onToggle={handleToggle} onDelete={handleDelete} />)

  await user.click(screen.getByRole('button', { name: '牛乳を買うを削除' }))

  expect(handleDelete).toHaveBeenCalledWith('abc')
  expect(handleToggle).not.toHaveBeenCalled()
})
```

</details>

### 演習2（基本）：TodoApp で空の入力を無視する

`components/TodoApp.test.js` に、「空白だけを入力して Enter を押しても TODO は増えず、『やることはありません』のまま」であることを確かめるテストを追加する。

**確認方法**：テストが PASS すればOK。

<details>
<summary>解答例</summary>

```jsx
test('空白だけでは TODO は増えない', async () => {
  const user = userEvent.setup()
  render(<TodoApp />)

  await user.type(screen.getByRole('textbox', { name: 'やること' }), '   {Enter}')

  expect(screen.getByText('やることはありません')).toBeInTheDocument()
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
})
```

</details>

### 演習3（応用）：エラーメッセージを表示する機能をテストで作る

コマ5の演習2（空のまま送信したら「やることを入力してください」と表示する）を、**テストを先に書いてから** 実装する。すでに実装済みの人は、テストだけ書く。

書くテスト：

1. 空のまま「追加」を押すと、`role="alert"` の要素に「やることを入力してください」と表示される
2. その状態で1文字入力すると、メッセージが消える
3. 普通に追加できたときはメッセージが出ない

**確認方法**：実装前は 1・2 が FAIL、実装後はすべて PASS になればOK。

<details>
<summary>解答例（テスト）</summary>

```jsx
test('空のまま追加するとエラーメッセージが出る', async () => {
  const user = userEvent.setup()
  render(<TodoForm onAdd={jest.fn()} />)

  await user.click(screen.getByRole('button', { name: '追加' }))

  expect(screen.getByRole('alert')).toHaveTextContent('やることを入力してください')
})

test('入力を始めるとエラーメッセージが消える', async () => {
  const user = userEvent.setup()
  render(<TodoForm onAdd={jest.fn()} />)

  await user.click(screen.getByRole('button', { name: '追加' }))
  await user.type(screen.getByRole('textbox', { name: 'やること' }), 'a')

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('普通に追加したときはエラーメッセージが出ない', async () => {
  const user = userEvent.setup()
  render(<TodoForm onAdd={jest.fn()} />)

  await user.type(screen.getByRole('textbox', { name: 'やること' }), '牛乳を買う{Enter}')

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
```

実装はコマ5演習2の解答例を参照。

</details>

### 演習4（早く終わった人向け）：キーボードだけで操作できるか

マウスを使わずに **Tab キーと Space キーだけ** で、「入力 → 追加 → 完了にする」ができることをテストする。

**確認方法**：`user.click` を1回も使わずに、TODO を追加して完了にできるテストが PASS すればOK。

<details>
<summary>ヒント</summary>

- `await user.tab()` でフォーカスが次の要素に移る
- `expect(要素).toHaveFocus()` でフォーカスがどこにあるか確かめられる
- チェックボックスにフォーカスがある状態で `await user.keyboard(' ')`（スペース）を押すとチェックが切り替わる
- フォーカスの順番は画面の並び順（入力欄 → 追加ボタン → 1件目のチェックボックス → 1件目の削除ボタン → …）

キーボードだけで操作できることは、アクセシビリティの大事な条件の1つ。

</details>

##  まとめ

### 今日できるようになったこと

- `userEvent.setup()` と `await user.type` / `user.click` で、ユーザーの操作をテストで再現できるようになった
- `jest.fn()` を props に渡し、`toHaveBeenCalledWith` で「正しく親に知らせたか」を確かめられるようになった
- `TodoApp` を丸ごと表示して、追加 → 完了 → 削除の流れを結合テストにできるようになった

### よくある詰まりポイント

- **操作したのに画面が変わっていない**：`user.○○` の前の `await` と、テスト関数の `async` を確認する
- **前のテストの TODO が残っている**：localStorage に保存が残っている。`beforeEach(() => localStorage.clear())` を入れる
- **`toHaveBeenCalledWith` が失敗し、Received に違う値が出る**：部品が `onAdd(text)` ではなく `onAdd(text.trim())` のように加工して渡していないか、コードとテストのどちらが正しいかを考える

### 次コマ予告

`TodoApp` には、まだテストしていない部分がある。「すべて削除」の **確認ダイアログ**、ヘッダーの **今いるページの表示**、そして今日はまだない **通信（fetch）**。次回はこれらを **モック** に置き換えてテストする。

##  課題

### 基礎課題（必須）

1. 演習1・2を完成させ、PR を作ってマージする
2. `npm test` がすべて PASS した状態で、`TodoApp.js` の `handleToggle` の中身をわざと `handleDelete` と同じ処理にして、どのテストが失敗するかを確かめる。失敗したテストの名前とメッセージをメモしてから元に戻す

### 応用課題（推奨）

3. コマ5演習3の「すべて / 未完了 / 完了」の絞り込みを `TodoApp` に入れている人は、「3件追加して1件完了 → 『未完了』を押すと2件だけ表示される」という結合テストを書く
4. コマ9の演習3で作った `editTodo` を使った編集機能を作っている人は、「ダブルクリック（`user.dblClick`）→ 文字を消して入力（`user.clear` → `user.type`）→ Enter」で文字が変わることをテストする

### チャレンジ課題（挑戦）

5. `fireEvent.click` と `user.click` の違いを RTL の公式ドキュメントで調べ、なぜ `user-event` が推奨されるのかを2〜3行でまとめる
6. `TodoApp.test.js` の「追加・完了・削除」のテストは1つのテストで3つのことを確かめている。これを3つのテストに分けた場合と比べて、良い点・悪い点を考察する（ヒント：失敗したときに原因が分かりやすいか、準備の手間はどうか）
