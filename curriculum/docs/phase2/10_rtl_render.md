# コマ10｜React Testing Library①（表示のテスト）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 2 |
| 所要時間 | 90分 |
| 前提コマ | コマ9 Jest基礎（関数の単体テスト） |
| 次コマ | コマ11 React Testing Library②（ユーザー操作のテスト） |

##  目標

- `render` で部品を表示し、`screen` から要素を探してテストできる
- `getByRole` を中心に、状況に合ったクエリ（`getBy` / `queryBy` / `getAllBy`）を選べる
- props の違いによって表示が変わることを、テストで確かめられる

##  導入

### 前回の振り返り

```powershell
cd ~/workspace/todo-app
git switch main
git pull
npm test
```

前回は `lib/todos.js` の純粋関数をテストした。関数は「入れて → 出てきた値を確かめる」だけでよかった。

> 前回までの内容がない人は、コマ8の本題 3〜4（Jest の導入）を先に済ませておく。今日テストする `TodoItem` / `TodoList` はコマ5で作ったもの（本題に全文を載せてある）。

### 今日のテーマ：画面をテストする

部品の出力は値ではなく **画面**。画面をテストするには、

1. 部品を（偽物のブラウザの中で）表示する
2. 画面から要素を探す
3. その要素が期待どおりか確かめる

の3ステップが必要。これを簡単にしてくれるのが **React Testing Library（RTL）**。

> RTL の考え方：**ユーザーが画面を見て操作するのと同じ方法でテストする**。「`className` が `todo-item` の要素」ではなく「『牛乳を買う』という名前のチェックボックス」のように、ユーザーに見えるもので探す。

##  本題

### 1. テストする部品を確認する

コマ5で作った `TodoItem` と `TodoList`。

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

```powershell
git switch -c test/todo-components
```

### 2. 最初の部品テスト

`components/TodoItem.test.js` を作る。

```jsx
// components/TodoItem.test.js
import { render, screen } from '@testing-library/react'
import TodoItem from './TodoItem'

test('TODO の文字が表示される', () => {
  const todo = { id: '1', text: '牛乳を買う', done: false }

  render(<TodoItem todo={todo} onToggle={() => {}} onDelete={() => {}} />)

  expect(screen.getByText('牛乳を買う')).toBeInTheDocument()
})
```

| 部分 | 意味 |
|------|------|
| `render(<部品 />)` | 部品を偽物のブラウザに表示する |
| `screen` | 表示された画面全体。ここから要素を探す |
| `getByText('...')` | その文字を持つ要素を探す。**見つからなければその場でテスト失敗** |
| `toBeInTheDocument()` | 画面の中にあること（`jest.setup.js` で追加したマッチャー） |
| `onToggle={() => {}}` | 今回は使わないので「何もしない関数」を渡しておく |

```powershell
npm test
```

> テストファイルでも JSX（`<TodoItem ... />`）が書ける。`next/jest` が Next.js と同じ方法で変換してくれる。

### 3. getByRole で探す

RTL で一番おすすめの探し方は **`getByRole`**。要素の **役割（role）** と **名前（name）** で探す。

```jsx
// components/TodoItem.test.js（追加）
test('未完了ならチェックボックスはオフ', () => {
  const todo = { id: '1', text: '牛乳を買う', done: false }

  render(<TodoItem todo={todo} onToggle={() => {}} onDelete={() => {}} />)

  const checkbox = screen.getByRole('checkbox', { name: '牛乳を買う' })
  expect(checkbox).not.toBeChecked()
})

test('削除ボタンに TODO 名入りのラベルが付いている', () => {
  const todo = { id: '1', text: '牛乳を買う', done: false }

  render(<TodoItem todo={todo} onToggle={() => {}} onDelete={() => {}} />)

  expect(screen.getByRole('button', { name: '牛乳を買うを削除' })).toBeInTheDocument()
})
```

主な role：

| HTML | role |
|------|------|
| `<button>` | `button` |
| `<input type="checkbox">` | `checkbox` |
| `<input type="text">` | `textbox` |
| `<a href="...">` | `link` |
| `<h1>`〜`<h6>` | `heading` |
| `<ul>` / `<li>` | `list` / `listitem` |

**name（名前）** は、画面の読み上げソフトが読む名前。ボタンなら中の文字か `aria-label`、チェックボックスなら囲んでいる `<label>` の文字になる。

> **なぜ getByRole がおすすめ？** 読み上げソフトを使う人も、マウスを使う人も、同じ「役割と名前」で要素を見分けている。getByRole で探せない部品は、**アクセシビリティ（誰でも使えること）に問題がある** サインでもある。コマ5で `aria-label` や `<label>` を付けておいたのは、このため。

クエリの優先順位の目安：

1. `getByRole`：ほとんどの場合これ
2. `getByLabelText`：フォームの入力欄
3. `getByText`：ボタンなどの役割を持たない文章
4. `getByTestId`：どうしても上で探せないときの最終手段

### 4. props によって表示が変わることを確かめる

`done` が `true` / `false` で表示が変わる。両方をテストする。

```jsx
// components/TodoItem.test.js（追加）
test('完了済みならチェックがオンで、打ち消し線が付く', () => {
  const todo = { id: '1', text: '牛乳を買う', done: true }

  render(<TodoItem todo={todo} onToggle={() => {}} onDelete={() => {}} />)

  expect(screen.getByRole('checkbox', { name: '牛乳を買う' })).toBeChecked()
  expect(screen.getByText('牛乳を買う')).toHaveStyle({ textDecoration: 'line-through' })
})
```

- `toBeChecked()`：チェックが付いている
- `toHaveStyle({...})`：指定したスタイルが当たっている

> `getByText('牛乳を買う')` は、文字を直接囲んでいる `<label>` を返す。打ち消し線は `<label>` の style に付けているので、`toHaveStyle` で確かめられる。

### 5. 「ないこと」を確かめる：queryBy

`TodoList` に TODO が0件のとき、リスト（`<ul>`）は表示されず、メッセージが出るはず。

```jsx
// components/TodoList.test.js
import { render, screen } from '@testing-library/react'
import TodoList from './TodoList'

test('0件なら「やることはありません」と表示し、リストは出さない', () => {
  render(<TodoList todos={[]} onToggle={() => {}} onDelete={() => {}} />)

  expect(screen.getByText('やることはありません')).toBeInTheDocument()
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
})
```

`getByRole('list')` は、見つからないと **その場でエラー** になる。「ないこと」を確かめたいときは **`queryBy○○`** を使う。見つからなければ `null` を返してくれる。

| クエリ | 見つからないとき | 複数見つかったとき | 使いどころ |
|--------|----------------|-------------------|-----------|
| `getBy○○` | エラー | エラー | あるはずのものを探す |
| `queryBy○○` | `null` を返す | エラー | **ないこと** を確かめる |
| `getAllBy○○` | エラー | 配列で返す | 複数あるものを探す |
| `findBy○○` | （待ってから）エラー | エラー | あとから出てくるもの（コマ12） |

### 6. 複数の要素：getAllBy

```jsx
// components/TodoList.test.js（追加）
test('TODO の数だけ項目が表示される', () => {
  const todos = [
    { id: '1', text: '牛乳を買う', done: false },
    { id: '2', text: 'レポート提出', done: true },
  ]

  render(<TodoList todos={todos} onToggle={() => {}} onDelete={() => {}} />)

  const items = screen.getAllByRole('listitem')
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('牛乳を買う')
  expect(items[1]).toHaveTextContent('レポート提出')
})
```

`toHaveTextContent` は「その要素の中に、この文字が含まれている」を確かめる。

### 7. 困ったら screen.debug()

テストの途中で「今どんな HTML になっているか」を見たいときは、`screen.debug()` を書く。

```jsx
render(<TodoList todos={todos} onToggle={() => {}} onDelete={() => {}} />)
screen.debug()
```

ターミナルに、今の HTML が表示される。探したい要素が **本当にあるか**、**どんな名前が付いているか** を確認できる。確認が終わったら消しておく。

```powershell
npm test
git add .
git commit -m "test: TodoItem と TodoList の表示テストを追加"
```

### 8. Server Component のページもテストできる

`app/about/page.js` は Server Component だが、`async` でなければ普通の部品と同じようにテストできる。

```jsx
// app/about/page.test.js
import { render, screen } from '@testing-library/react'
import AboutPage from './page'

test('見出しが表示される', () => {
  render(<AboutPage />)

  expect(screen.getByRole('heading', { level: 1, name: 'このアプリについて' })).toBeInTheDocument()
})
```

`{ level: 1 }` で `<h1>` に絞り込める。

> `async function` のページ（サーバでデータを取ってくるページ）は、この方法ではテストできない。コマ13で扱う。

```powershell
npm test
git add .
git commit -m "test: aboutページの表示テストを追加"
git push -u origin test/todo-components
gh pr create --fill
```

##  演習

### 演習1（基本）：TodoItem の未完了の見た目

「未完了なら打ち消し線が付かない」ことを確かめるテストを追加する（`textDecoration: 'none'`）。さらに `TodoItem.js` の三項演算子の `'line-through'` と `'none'` をわざと入れ替えて、テストが失敗することを確かめる（確かめたら戻す）。

**確認方法**：正しい実装で PASS、入れ替えると「完了済み」と「未完了」の2つのテストが FAIL になればOK。

<details>
<summary>解答例</summary>

```jsx
test('未完了なら打ち消し線は付かない', () => {
  const todo = { id: '1', text: '牛乳を買う', done: false }

  render(<TodoItem todo={todo} onToggle={() => {}} onDelete={() => {}} />)

  expect(screen.getByText('牛乳を買う')).toHaveStyle({ textDecoration: 'none' })
})
```

</details>

### 演習2（基本）：about ページの中身

`app/about/page.test.js` に、「使っている技術」の箇条書きが2項目あり、1つ目に「Next.js」が含まれていることを確かめるテストを追加する。

**確認方法**：テストが PASS し、`app/about/page.js` の `<li>` を1つ消すと FAIL になればOK。

<details>
<summary>解答例</summary>

```jsx
test('技術の箇条書きが2項目ある', () => {
  render(<AboutPage />)

  const items = screen.getAllByRole('listitem')
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('Next.js')
})
```

</details>

### 演習3（応用）：getByRole で探せない部品を直す

次の部品は、ボタンの中身が絵文字だけで、チェックボックスにもラベルがない。**テストを先に書き**、getByRole で探せないことを確認してから、部品を直して探せるようにする。

```jsx
// components/StarItem.js
export default function StarItem({ title, starred, onToggle }) {
  return (
    <li>
      <input type="checkbox" checked={starred} onChange={onToggle} />
      <span>{title}</span>
      <button onClick={onToggle}>⭐</button>
    </li>
  )
}
```

テストで探したいもの：

- `getByRole('checkbox', { name: 'Next.js の勉強' })`
- `getByRole('button', { name: 'Next.js の勉強をお気に入りに追加' })`

**確認方法**：直す前はテストが FAIL（`Unable to find an accessible element with the role "checkbox" and name ...`）、直したあとは PASS になればOK。

<details>
<summary>解答例</summary>

```jsx
// components/StarItem.js
export default function StarItem({ title, starred, onToggle }) {
  return (
    <li>
      <label>
        <input type="checkbox" checked={starred} onChange={onToggle} />
        {title}
      </label>
      <button onClick={onToggle} aria-label={`${title}をお気に入りに追加`}>
        ⭐
      </button>
    </li>
  )
}
```

```jsx
// components/StarItem.test.js
import { render, screen } from '@testing-library/react'
import StarItem from './StarItem'

test('チェックボックスとボタンを名前で探せる', () => {
  render(<StarItem title="Next.js の勉強" starred={false} onToggle={() => {}} />)

  expect(screen.getByRole('checkbox', { name: 'Next.js の勉強' })).not.toBeChecked()
  expect(screen.getByRole('button', { name: 'Next.js の勉強をお気に入りに追加' })).toBeInTheDocument()
})
```

失敗したときのメッセージには、画面にある role と name の一覧（`Here are the accessible roles:`）が出る。これを見ると「名前が付いていない」ことが分かる。

</details>

### 演習4（早く終わった人向け）：404 ページのリンク先

`app/not-found.js`（コマ6の演習1）をテストする。「TODO 一覧へ戻る」というリンクがあり、リンク先（`href`）が `/` であることを確かめる。

**確認方法**：テストが PASS し、`href="/"` を `href="/todos"` に変えると FAIL になればOK。

<details>
<summary>ヒント</summary>

- リンクは `getByRole('link', { name: '...' })`
- 属性は `toHaveAttribute('href', '/')` で確かめられる
- `not-found.js` がまだない人は、コマ6の演習1の解答例をそのまま作ってから取り組む

</details>

##  まとめ

### 今日できるようになったこと

- `render` と `screen` で部品を表示し、画面から要素を探してテストできるようになった
- `getByRole` を中心に、`queryBy`（ないこと）や `getAllBy`（複数）を使い分けられるようになった
- props の違いによる表示の違い（完了 / 未完了、0件 / 複数件）をテストで確かめられるようになった

### よくある詰まりポイント

- **`Unable to find an accessible element with the role ...`**：エラーに出る `Here are the accessible roles:` の一覧を見て、実際の role と name を確認する。`screen.debug()` も使う
- **`Found multiple elements with ...`**：同じ名前の要素が複数ある。`getAllBy○○` を使うか、`name` をもっと具体的にする
- **「ないこと」を確かめたいのにエラーになる**：`getBy○○` ではなく `queryBy○○` を使う

### 次コマ予告

次回は **ユーザー操作** をテストする。`user-event` で文字を入力したりボタンを押したりして、「追加したら一覧に増える」「チェックしたら残り件数が減る」ところまで確かめる。

##  課題

### 基礎課題（必須）

1. 演習1・2を完成させ、PR を作ってマージする
2. `npm test` の結果（テストの数）を README に「テスト：○件」と書き足してコミットする

### 応用課題（推奨）

3. コマ5演習3の `TodoFilter`（絞り込みボタン）をテストする。`value` に `'active'` を渡したとき、「未完了」ボタンだけが太字（`fontWeight: 'bold'`）になっていることを確かめる。まだ作っていなければ、コマ5の解答例から作る
4. RTL 公式ドキュメントの「About Queries」のページを読み、今日使っていない `getByLabelText` と `getByPlaceholderText` を使って `TodoForm` の入力欄を探すテストを書く。3つの探し方（Role / LabelText / PlaceholderText）のどれが一番よいか、理由を添えて書く

### チャレンジ課題（挑戦）

5. `TodoList` のテストで、`getAllByRole('listitem')` の代わりに `within` を使って「1つ目の項目の中の削除ボタン」を探すテストを書く（ヒント：`within(items[0]).getByRole('button')`）
6. 「クラス名（`className`）で要素を探すテスト」が RTL で推奨されない理由を、「見た目を変えるためにクラス名を変えたらどうなるか」という観点で説明する
