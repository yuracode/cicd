# コマ10｜React Testing Library②（ユーザー操作テスト）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 2 |
| 所要時間 | 90分 |
| 前提コマ | コマ9 React Testing Library①（レンダリングテスト） |
| 次コマ | コマ11 モック・非同期テスト |

## 🎯 目標

- `userEvent` を使ってクリック・文字入力を再現できる
- コールバック関数の呼び出しを `vi.fn()` で検証できる
- フォーム → 送信 → リストに反映 のような **結合テスト** を1本書ける

## 📋 導入（15分）

### 前回の振り返り

`render` と `screen.getByText` で「表示されているか」はテストできるようになった。今日は「**ボタンを押したら**どうなるか」を検証する。

### userEvent とは

`@testing-library/user-event` は、キーボード入力やクリックを「本物のユーザーに近い形」で再現してくれるライブラリ。

**類似のAPIに `fireEvent` もある** が、userEventのほうが実ブラウザの挙動に近い（例：inputに文字を打つと keydown → input → change が正しい順で発火）。**迷ったら userEvent を使う**。

### 今日やること

1. ボタンクリックのテスト（TodoItemの削除ボタン）
2. フォーム入力のテスト（TodoForm）
3. 親子を合わせた結合テスト（App全体）

## 🛠 本題（65分）

### 1. TodoItem の削除ボタンをテスト（15分）

前回書いた `TodoItem.test.jsx` に追加する。

```jsx
// src/TodoItem.test.jsx に追記
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import TodoItem from './TodoItem'

describe('TodoItem の削除ボタン', () => {
  it('削除ボタンを押すと onDelete が id 付きで呼ばれる', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const todo = { id: 42, text: 'テスト', completed: false }

    render(<TodoItem todo={todo} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: '削除' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(42)
  })
})
```

> **解説：**
> - **`userEvent.setup()`**：ユーザー操作のセッションを1回作る。テストごとに呼ぶのが推奨
> - **`vi.fn()`**：何もしないけど呼ばれたかを記録する「モック関数」（`jest.fn` と同じ）
> - **`await user.click(...)`**：クリックは非同期。必ず `await` を付ける
> - **`.toHaveBeenCalledTimes(1)`**：1回呼ばれたか
> - **`.toHaveBeenCalledWith(42)`**：引数 `42` で呼ばれたか

```bash
npm run test
```

PASSすればOK。

### 2. TodoForm のテスト（20分）

前提：コマ4で作った `TodoForm.jsx` があるはず。無ければ以下を用意。

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

テスト：

```jsx
// src/TodoForm.test.jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import TodoForm from './TodoForm'

describe('TodoForm', () => {
  it('入力→追加ボタンで onAdd が入力値付きで呼ばれる', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(<TodoForm onAdd={onAdd} />)

    const input = screen.getByPlaceholderText('やることを入力')
    await user.type(input, '牛乳を買う')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(onAdd).toHaveBeenCalledWith('牛乳を買う')
  })

  it('送信後に入力欄が空になる', async () => {
    const user = userEvent.setup()
    render(<TodoForm onAdd={() => {}} />)

    const input = screen.getByPlaceholderText('やることを入力')
    await user.type(input, 'abc')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(input).toHaveValue('')
  })

  it('空文字では onAdd が呼ばれない', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(<TodoForm onAdd={onAdd} />)
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(onAdd).not.toHaveBeenCalled()
  })

  it('Enter キーでも送信できる', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(<TodoForm onAdd={onAdd} />)
    const input = screen.getByPlaceholderText('やることを入力')
    await user.type(input, 'レポート{Enter}')

    expect(onAdd).toHaveBeenCalledWith('レポート')
  })
})
```

> **`user.type(input, 'abc')`** は「abcを1文字ずつ順に入力する」動作。実ユーザーの打鍵に近い。
>
> **`{Enter}`** のような特殊キー表記で特定キーを送れる（`{Backspace}` / `{Tab}` など）。

```bash
npm run test
```

4件PASSを確認。

### 3. 結合テスト：App 全体（20分）

ここまでは部品単体のテスト。今度は **「親子を一緒に動かして、本物っぽく振る舞うか」** をチェックする。

```jsx
// src/App.test.jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App 統合', () => {
  beforeEach(() => {
    // localStorage を毎テスト初期化（前のテストの影響を切る）
    localStorage.clear()
  })

  it('TODO を追加するとリストに表示される', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByPlaceholderText('やることを入力')
    await user.type(input, '牛乳を買う')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(screen.getByText('牛乳を買う')).toBeInTheDocument()
  })

  it('追加→削除でリストから消える', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByPlaceholderText('やることを入力')
    await user.type(input, '一時TODO')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(screen.getByText('一時TODO')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '削除' }))
    expect(screen.queryByText('一時TODO')).not.toBeInTheDocument()
  })
})
```

> **`beforeEach`**：各テストの前に必ず実行される。localStorageのような「テスト間で引き継がれる状態」を初期化する定番パターン。
>
> **`queryByText` + `.not.toBeInTheDocument()`**：「存在しないこと」を確認する時のセット。`getByText` は無いとエラーになるので使えない。

### 4. ここまでで学んだRTLの考え方（5分）

RTLの思想は「**ユーザーが実際にやる操作しかしない**」。

- ❌ `component.state.todos` を直接覗く
- ❌ 内部関数を直接呼ぶ
- ⭕ 画面に見えるもの（文字・ボタン）を探して、実際に押す

**この考え方のメリット：**

- 実装詳細（内部のstate構造、クラス名）を変えてもテストが壊れない
- 本当に壊れた時だけFAILする（過剰にFAILしない）

### 5. watchモードで開発サイクルを体感（5分）

`npm run test` をwatchモードのまま、`TodoForm.jsx` の挙動を壊してみる：

```jsx
// わざと「空でも送信」するように変える
const handleSubmit = (e) => {
  e.preventDefault()
  onAdd(text)  // 空文字チェックを削除
  setText('')
}
```

即座に該当テスト（空文字では onAdd が呼ばれない）がFAIL。戻すと即PASS。

これが **テスト駆動開発（TDD）の肝**。壊れたらすぐ気付ける安全ネット。

戻しておく。

## ✅ まとめ（10分）

### 今日できるようになったこと

- `userEvent` でクリック・入力・Enterを再現できる
- `vi.fn()` でコールバックの呼ばれ方を検証できる
- 親子を合わせた結合テストが書ける

### よくある詰まりポイント

- **`await` 忘れ**：`user.click` / `user.type` は非同期。`await` し忘れるとテストが通ったり通らなかったり不安定になる
- **テスト間の状態汚染**：localStorage やグローバル変数は `beforeEach` でクリア
- **`getByRole('button')` で複数マッチ**：`{ name: '追加' }` のようにアクセシブル名で絞る

### 次コマ予告

次回は **モック** と **非同期テスト**。外部APIに依存するコード（前回の `fetch`）をどうテストするかをやる。

## 📝 課題

1. コマ9の課題で追加したチェックボックスに対して、`user.click` でチェックを入れたら `onToggle` が呼ばれるテストを書く
2. `npm run test` が全件PASSした状態で `test:` プレフィックスでコミット
