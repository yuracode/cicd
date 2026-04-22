# コマ9｜React Testing Library①（レンダリングテスト）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 2 |
| 所要時間 |  |
| 前提コマ | コマ8 Vitest基礎（describe/it/expect） |
| 次コマ | コマ10 React Testing Library②（ユーザー操作テスト） |

##  目標

- React Testing Library（RTL） + jsdom のセットアップができる
- `render` / `screen.getByText` を使ってコンポーネントの表示を検証できる
- props を変えた時に表示がどう変わるかをテストできる

##  導入

### 前回の振り返り

純粋関数に対する単体テストが書けるようになった。今日は **React コンポーネントそのもの** をテストする。

### React Testing Library（RTL）とは

Reactコンポーネントをテストするための事実上の標準ライブラリ。

- 画面に描画した結果を **ユーザー視点** で検索できる（「画面に"追加"ボタンある？」のように）
- 実装詳細（内部state、クラス名など）ではなく**振る舞い**を検証する思想
- Vitest と一緒に使える

### 今日のゴール

`Greeting` と `TodoItem` に対して、

- 「画面に正しく名前が出ているか」
- 「完了済みの時は打ち消し線スタイルが当たっているか」

をテストで自動確認できる状態にする。

##  本題

### 1. RTL と関連パッケージのインストール

```bash
cd ~/workspace/todo-app
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

各パッケージの役割：

| パッケージ | 役割 |
|----------|------|
| `@testing-library/react` | コンポーネントをレンダリング＆要素検索 |
| `@testing-library/jest-dom` | `.toBeInTheDocument()` などDOM向け matcher 追加 |
| `@testing-library/user-event` | クリック・入力などユーザー操作のシミュレート（次回） |
| `jsdom` | Node上で動く仮想DOM（ブラウザが無くてもDOM操作できる） |

### 2. Vitest の設定

`vite.config.js` を編集（`test` セクションを追加）：

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
```

> **各オプションの意味：**
> - `globals: true`：`describe` や `expect` を毎回 import しなくて良くなる
> - `environment: 'jsdom'`：テスト中は仮想DOMの中で動かす
> - `setupFiles`：テスト前に読み込む初期化ファイル

`src/setupTests.js` を作成：

```javascript
// src/setupTests.js
import '@testing-library/jest-dom/vitest'
```

これで `.toBeInTheDocument()` 等が使えるようになる。

### 3. Greeting コンポーネントのテスト

`src/Greeting.jsx` を作成：

```jsx
// src/Greeting.jsx
function Greeting({ name }) {
  return <p>こんにちは、{name}さん！</p>
}

export default Greeting
```

`src/Greeting.test.jsx` を作成：

```jsx
// src/Greeting.test.jsx
import { render, screen } from '@testing-library/react'
import Greeting from './Greeting'

describe('Greeting', () => {
  it('名前を含む挨拶が表示される', () => {
    render(<Greeting name="太郎" />)
    expect(screen.getByText('こんにちは、太郎さん！')).toBeInTheDocument()
  })

  it('違う名前を渡すと表示も変わる', () => {
    render(<Greeting name="花子" />)
    expect(screen.getByText('こんにちは、花子さん！')).toBeInTheDocument()
  })
})
```

> **ポイント解説：**
> - `render(<X />)`：仮想DOMの中にコンポーネントを描画
> - `screen.getByText('...')`：画面から文字を探す。**見つからなければエラー**
> - `.toBeInTheDocument()`：DOM内にその要素が存在することを確認

```bash
npm run test
```

2件PASSすればOK。

### 4. クエリ関数の種類を整理

RTLには要素を探す関数がたくさんあるが、基本の違いは**接頭辞**で決まる。

| 接頭辞 | 見つからなかった時 | 見つかった時 | 非同期 |
|-------|------------------|------------|-------|
| `getBy〜` | **エラー** | 要素を返す | × |
| `queryBy〜` | `null` を返す | 要素を返す | × |
| `findBy〜` | タイムアウト後エラー | Promise で要素 | ○ |

**使い分け：**

- 「存在するはず」→ `getBy〜`（ほとんどこれ）
- 「存在しないことを確認したい」→ `queryBy〜`（`null` を `.not.toBeInTheDocument()`）
- 「非同期で出てくる」→ `findBy〜`（次々回）

**セレクタ（何で探すか）：**

| セレクタ | 例 | 用途 |
|---------|-----|------|
| `ByText` | `getByText('追加')` | 表示されている文字 |
| `ByRole` | `getByRole('button', { name: '追加' })` | アクセシブルロール（推奨） |
| `ByLabelText` | `getByLabelText('メール')` | フォームラベル |
| `ByPlaceholderText` | `getByPlaceholderText('名前')` | placeholder属性 |
| `ByTestId` | `getByTestId('my-id')` | `data-testid="my-id"` 専用 |

> **優先順位：** `ByRole` > `ByLabelText` > `ByText` > `ByTestId` の順で使う。`ByTestId` は最終手段。理由は「実際のユーザーが認識する手がかり」に近いほうがテストとして信頼できるから。

### 5. TodoItem のテスト

`src/TodoItem.jsx` を少し拡張する（完了状態で打ち消し線）：

```jsx
// src/TodoItem.jsx
function TodoItem({ todo, onDelete }) {
  const style = {
    textDecoration: todo.completed ? 'line-through' : 'none',
  }

  return (
    <li>
      <span style={style}>{todo.text}</span>
      <button onClick={() => onDelete(todo.id)} style={{ marginLeft: '8px' }}>
        削除
      </button>
    </li>
  )
}

export default TodoItem
```

`src/TodoItem.test.jsx` を作成：

```jsx
// src/TodoItem.test.jsx
import { render, screen } from '@testing-library/react'
import TodoItem from './TodoItem'

describe('TodoItem', () => {
  it('text が画面に表示される', () => {
    const todo = { id: 1, text: '牛乳を買う', completed: false }
    render(<TodoItem todo={todo} onDelete={() => {}} />)
    expect(screen.getByText('牛乳を買う')).toBeInTheDocument()
  })

  it('削除ボタンが存在する', () => {
    const todo = { id: 1, text: 'テスト', completed: false }
    render(<TodoItem todo={todo} onDelete={() => {}} />)
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument()
  })

  it('completed が true なら打ち消し線スタイルが当たる', () => {
    const todo = { id: 1, text: 'done', completed: true }
    render(<TodoItem todo={todo} onDelete={() => {}} />)
    const text = screen.getByText('done')
    expect(text).toHaveStyle({ textDecoration: 'line-through' })
  })

  it('completed が false なら打ち消し線は当たらない', () => {
    const todo = { id: 1, text: 'todo', completed: false }
    render(<TodoItem todo={todo} onDelete={() => {}} />)
    const text = screen.getByText('todo')
    expect(text).toHaveStyle({ textDecoration: 'none' })
  })
})
```

> **`onDelete={() => {}}`** の意味：propsが必須だから空関数を渡しているだけ。クリック系は次回ちゃんとテストする。

```bash
npm run test
```

6件（Greeting 2件 + TodoItem 4件）PASSすれば完了。

### 6. テストを壊して気付き

あえてコンポーネントを壊して、テストがちゃんとFAILするか確認する。

```jsx
// TodoItem.jsx の span を div に変えてみる
<div style={style}>{todo.text}</div>
```

→ テストは通る（テキストは存在するから）。

```jsx
// text に余計な文字を付けてみる
<span style={style}>{todo.text}!!</span>
```

→ `getByText('牛乳を買う')` がFAIL。**テストが壊れ方を教えてくれる** 体験。

元に戻しておく。

##  まとめ

### 今日できるようになったこと

- RTLのセットアップができた
- `render` + `screen.getByText` / `getByRole` でコンポーネントを検証できる
- props を変えて表示が変わることをテストできる

### よくある詰まりポイント

- **`toBeInTheDocument` が未定義**：`setupTests.js` の import 忘れ or `vite.config.js` の `setupFiles` 指定ミス
- **`getByText` で要素が見つからない**：テキストが複数要素に分かれている（`こんにちは、` と `太郎` が別spanなど）→ `getByText('こんにちは、', { exact: false })` や関数形 `getByText((_, node) => node.textContent === '期待する文字')` で対応可
- **テストを書くために props を公開し過ぎる**：必要最低限に。テスト用に実装を歪めない

### 次コマ予告

次回は **クリックや入力** を扱う。`user-event` ライブラリでボタン押下や文字入力を再現し、TODOフォームをテストする。

##  課題

### 基礎課題（必須）

1. `TodoItem` に「完了チェックボックス」を追加し、チェック状態が正しく反映されるテストを書く（ヒント：`screen.getByRole('checkbox')`）
2. ↑のテストが通ることを確認し、コミットする（コミットメッセージは `test:` で始める）

### 応用課題（推奨）

3. `TodoItem` に `deadline`（期限）propsを追加し、**期限切れなら赤文字で表示** する仕様にする。その挙動のテストを書く（期限内・期限切れ・期限未設定の3パターン）
4. **複数の状態パターンを1つのテストで扱う `it.each`** を使ってみる：

```jsx
it.each([
  { completed: false, expected: 'none' },
  { completed: true, expected: 'line-through' },
])('completed=$completed の時は $expected', ({ completed, expected }) => {
  // ...
})
```

> **狙い：** 同じロジックで入力だけ変えるテストは `it.each` でスッキリさせられる。「テーブル駆動テスト」という考え方。

### チャレンジ課題（挑戦）

5. **スナップショットテスト** を1本書いてみる：

```jsx
it('UIが変わっていないか（snapshot）', () => {
  const { container } = render(<TodoItem todo={{ id: 1, text: 'a' }} />)
  expect(container).toMatchSnapshot()
})
```

→ 初回は `__snapshots__/` に自動生成される。意図的にUIを変更→差分でFAIL→確認後 `u` キーで更新、の流れを体験。**いつ使うと便利／使いすぎると危険か** を自分の言葉でメモにまとめる

6. **アクセシビリティ視点のテスト** に挑戦：`getByRole('checkbox', { name: '牛乳を買う' })` のように **アクセシブルネーム（読み上げ名）で要素を取る** 書き方を全面採用してみる。`<label>` と `<input>` の関連付けができていないと取れない → UIの質も上がる
