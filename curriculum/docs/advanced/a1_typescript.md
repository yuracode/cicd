# 発展1｜TypeScript化（TODOアプリをJSからTSへ移行する）

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 | 90分 |
| 前提コマ | Phase 2 修了（コマ13 カバレッジとNext.jsのテスト戦略まで） |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- TypeScript が「何を解決する道具」なのかを自分の言葉で説明できる
- Next.js の `todo-app` を、動かしたまま1ファイルずつ TypeScript に移行できる
- props・state・テストのモックに型を付け、`tsc --noEmit` をローカルと CI で通せる

##  導入

### JavaScript で起きがちなバグ

これまで `todo-app` を作ってきて、こんな経験はなかっただろうか。

- `todo.text` と書くべきところを `todo.title` と書いてしまい、画面に何も出ない
- `onToggle(todo.id)` のつもりで `onToggle(todo)` と書いてしまい、クリックしても何も起きない
- `filterTodos(todos, 'actve')` のように文字列を打ち間違えて、絞り込みが効かない

どれも **実行してみるまで気づけない**。テストがあれば見つかることもあるが、テストを書いていない場所では見逃してしまう。

**TypeScript（TS）** は、JavaScript に **「値の形（型）」を書き足せる** ようにした言語。型を書いておくと、**保存した瞬間にエディタが、実行する前にコンパイラが** 間違いを教えてくれる。

> ブラウザや Node.js は TS を直接は実行できない。Next.js（SWC）が、型の部分を取り除いて JavaScript に変換してから動かしている。

### Next.js と TypeScript

`create-next-app` は、実は TypeScript が標準（`--js` を付けなければ TS になる）。この授業では「まず React の考え方に集中する」ために JS で始めたが、現場の Next.js プロジェクトはほとんどが TS で書かれている。

今日は `todo-app` を **動かしたまま、少しずつ** TS に移行する。「既存の JS プロジェクトを段階的に TS 化する」のは、実務でもよくある仕事。

##  本題

### 1. ブランチを切ってパッケージを入れる

```powershell
cd ~/workspace/todo-app
git switch main
git pull
git switch -c feature/typescript

npm install -D typescript @types/react @types/react-dom @types/node @types/jest
```

| パッケージ | 役割 |
|-----------|------|
| `typescript` | 型チェックをする本体（`tsc` コマンド） |
| `@types/react`・`@types/react-dom` | React の型の辞書 |
| `@types/node` | `process.env` など Node.js の型 |
| `@types/jest` | テストの `test`・`expect`・`jest.fn` の型 |

> **`@types/○○` とは**：JavaScript で書かれたライブラリに、あとから型だけを足すパッケージ。「型の辞書」のようなもの。

### 2. tsconfig.json を作る

`jsconfig.json` の代わりに `tsconfig.json` を使う。`jsconfig.json` を消して、`tsconfig.json` を作る。

```powershell
git rm jsconfig.json
```

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts", "**/*.mts"],
  "exclude": ["node_modules"]
}
```

大事な設定は4つ。

| 設定 | 意味 |
|------|------|
| `"strict": true` | 型チェックを一番厳しくする。最初から厳しくしておくほうが、結局ラク |
| `"allowJs": true` | `.js` と `.ts` が混ざっていてもよい。**1ファイルずつ移行** できるのはこれのおかげ |
| `"noEmit": true` | `tsc` は型チェックだけをする。JavaScript への変換は Next.js に任せる |
| `"paths"` | `@/` をプロジェクト直下として扱う（`jsconfig.json` に書いてあったものと同じ） |

型チェックのコマンドを追加する。

```powershell
npm pkg set scripts.typecheck="tsc --noEmit"
npm run typecheck
```

まだ `.ts` のファイルが1つもないので、エラーは出ない。

> `npm run dev` や `npm run build` を実行すると、Next.js が `next-env.d.ts` という型の設定ファイルを自動で作る。`.gitignore` に入っているのでコミットしなくてよい。

### 3. まずはロジック（lib/todos.js）から

移行は **他から使われる側（土台）から** 始めると楽。`lib/todos.js` を `lib/todos.ts` にする。

```powershell
git mv lib/todos.js lib/todos.ts
npm run typecheck
```

```text
lib/todos.ts(1,28): error TS7006: Parameter 'text' implicitly has an 'any' type.
lib/todos.ts(5,25): error TS7006: Parameter 'todos' implicitly has an 'any' type.
...
```

**「引数の型が分からない（any になっている）」** というエラーがたくさん出る。`strict` にしているので、型が決まらないものはエラーになる。TODO の形を **型** として宣言し、引数と戻り値に付ける。

```ts
// lib/todos.ts
export type Todo = {
  id: string
  text: string
  done: boolean
}

export type TodoFilter = 'all' | 'active' | 'done'

export function createTodo(text: string): Todo {
  return { id: crypto.randomUUID(), text, done: false }
}

export function addTodo(todos: Todo[], text: string): Todo[] {
  return [...todos, createTodo(text)]
}

export function toggleTodo(todos: Todo[], id: string): Todo[] {
  return todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo))
}

export function deleteTodo(todos: Todo[], id: string): Todo[] {
  return todos.filter((todo) => todo.id !== id)
}

export function countRemaining(todos: Todo[]): number {
  return todos.filter((todo) => !todo.done).length
}

export function filterTodos(todos: Todo[], filter: TodoFilter): Todo[] {
  if (filter === 'active') return todos.filter((todo) => !todo.done)
  if (filter === 'done') return todos.filter((todo) => todo.done)
  return todos
}
```

（コマ9の演習で作った `clearDone`・`editTodo` などがあれば、同じように型を付ける）

| 書き方 | 意味 |
|--------|------|
| `type Todo = { ... }` | TODO 1件の **形** に名前を付ける。`export` すると他のファイルでも使える |
| `(text: string)` | 引数 `text` は文字列 |
| `): Todo[]` | この関数は `Todo` の配列を返す |
| `'all' \| 'active' \| 'done'` | **文字列リテラル型**。この3つの文字列 **しか** 入らない |

試しに、わざと間違えてみる。

```ts
export function countRemaining(todos: Todo[]): number {
  return todos.filter((todo) => !todo.don).length   // done の打ち間違い
}
```

VS Code で `todo.don` に赤い波線が付き、`npm run typecheck` でもエラーになる。

```text
error TS2551: Property 'don' does not exist on type 'Todo'. Did you mean 'done'?
```

**実行する前に**、しかも「`done` のことでは？」と教えてくれる。確かめたら戻す。

```powershell
npm run typecheck
npm test
git add .
git commit -m "refactor: lib/todos をTypeScriptに移行"
```

`.ts` と `.js` が混ざったまま、テストもアプリも普通に動く。

### 4. 部品（components）を移行する：props に型を付ける

`components/` の中のファイルを `.tsx`（JSX を含む TS）にする。

```powershell
git mv components/TodoItem.js components/TodoItem.tsx
git mv components/TodoList.js components/TodoList.tsx
git mv components/TodoForm.js components/TodoForm.tsx
npm run typecheck
```

props に型を付ける。**props の型は `○○Props` という名前にする** のが一般的。

```tsx
// components/TodoItem.tsx
import type { Todo } from '@/lib/todos'

type TodoItemProps = {
  todo: Todo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
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

- `(id: string) => void`：「文字列を1つ受け取って、何も返さない関数」という **関数の型**
- `import type { Todo }`：型だけを読み込む書き方。実行時には消える

`TodoList.tsx` も同じように型を付ける（演習1）。

フォームのイベントには、React が用意している型を使う。

```tsx
// components/TodoForm.tsx（変更部分）
import { useState, type FormEvent } from 'react'

type TodoFormProps = {
  onAdd: (text: string) => void
}

export default function TodoForm({ onAdd }: TodoFormProps) {
  const [text, setText] = useState('')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // ...（中身はそのまま）
  }
  // ...
}
```

> **イベントの型が分からないとき**：JSX に `onSubmit={(e) => {}}` と直接書いて、`e` にマウスを乗せると VS Code が型を教えてくれる（`React.FormEvent<HTMLFormElement>`）。それを関数の引数に書けばよい。

`useState('')` のように初期値から型が分かるものは、型を書かなくてよい（**型推論**）。`text` は自動で `string` になる。

### 5. state と、残りの部品を移行する

`TodoApp.js` と `SampleLoader.js`、`lib/` の残りのファイルも移行する。

```powershell
git mv components/TodoApp.js components/TodoApp.tsx
git mv components/SampleLoader.js components/SampleLoader.tsx
git mv lib/api.js lib/api.ts
npm run typecheck
```

**初期値だけでは型が決まらない state** には、`useState<型>` で型を教える。

```tsx
// components/TodoApp.tsx（変更部分）
import { addTodo, countRemaining, deleteTodo, toggleTodo, type Todo } from '@/lib/todos'

function loadTodos(): Todo[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? JSON.parse(saved) : []
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos)

  function handleAdd(text: string) {
    setTodos(addTodo(todos, text))
  }

  function handleToggle(id: string) {
    setTodos(toggleTodo(todos, id))
  }

  function handleDelete(id: string) {
    setTodos(deleteTodo(todos, id))
  }

  function handleLoadSamples(texts: string[]) {
    setTodos(texts.reduce((acc, text) => addTodo(acc, text), todos))
  }
  // ...（残りはそのまま）
}
```

`SampleLoader` の状態も文字列リテラル型にすると、`'loadng'` のような打ち間違いを防げる。

```tsx
// components/SampleLoader.tsx（変更部分）
type SampleLoaderProps = {
  onLoad: (texts: string[]) => void
}

type Status = 'idle' | 'loading' | 'error'

export default function SampleLoader({ onLoad }: SampleLoaderProps) {
  const [status, setStatus] = useState<Status>('idle')
  // ...
}
```

通信で受け取る JSON にも型を付ける。

```ts
// lib/api.ts
const SAMPLE_URL = 'https://jsonplaceholder.typicode.com/todos?_limit=3'

type SampleTodo = {
  userId: number
  id: number
  title: string
  completed: boolean
}

export async function fetchSampleTodos(): Promise<string[]> {
  const res = await fetch(SAMPLE_URL)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const data: SampleTodo[] = await res.json()
  return data.map((item) => item.title)
}
```

> **`res.json()` の結果は `any`**（何でも入る型）になる。`const data: SampleTodo[]` と書くのは「このデータはこの形のはず」という **宣言** であって、本当にその形かを確かめているわけではない。外から来るデータを本当に確かめる方法は課題5で扱う。

残りの `app/`・`components/`・`lib/` のファイルも、同じ手順で `.tsx` / `.ts` にする。`app/layout.tsx` の `children` には `ReactNode` という型を付ける。

```tsx
// app/layout.tsx（変更部分）
import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
```

```powershell
npm run typecheck
npm run dev
```

ブラウザで、これまでどおり動くことを確かめる。

### 6. テストを移行する：モックに型を付ける

テストファイルも `.test.tsx` / `.test.ts` にし、`jest.setup.js` を `jest.setup.ts` にする（`jest.config.mjs` の `setupFilesAfterEnv` も `'<rootDir>/jest.setup.ts'` に直す）。

```powershell
npm run typecheck
```

```text
components/Header.test.tsx: error TS2339: Property 'mockReturnValue' does not exist on type '() => string'.
lib/api.test.ts: error TS2339: Property 'mockResolvedValue' does not exist on type '...fetch...'.
```

`jest.mock` で偽物にしても、TypeScript から見ると `usePathname` は **本物の型のまま**。「これはモックだ」と教えるのが **`jest.mocked()`**。

```tsx
// components/Header.test.tsx（変更部分）
jest.mocked(usePathname).mockReturnValue('/')
```

```ts
// lib/api.test.ts（変更部分）
jest.mocked(fetch).mockResolvedValue({
  ok: true,
  json: async () => [
    { id: 1, title: 'delectus aut autem', completed: false },
    { id: 2, title: 'quis ut nam facilis', completed: true },
  ],
} as Response)
```

- `jest.mocked(関数)`：その関数をモックの型として扱う。`mockReturnValue` などが使えるようになる
- `as Response`：「これは Response として扱ってよい」という **型アサーション**。偽物のレスポンスには必要な部分しかないので、ここでは型チェックを緩めている

`test.each` の表にも型を付けると、`filterTodos` に渡す文字列の打ち間違いが防げる。

```ts
test.each<[TodoFilter, string[]]>([
  ['all', ['a', 'b']],
  ['active', ['a']],
  ['done', ['b']],
])('%s のとき id が %j の TODO が残る', (filter, expectedIds) => {
```

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

4つとも通れば移行完了。

> **型チェックとテストは別物**：Jest（SWC）は TS を JavaScript に変換して実行するだけで、**型のエラーがあってもテストは動いてしまう**。だから `npm run typecheck` を別に実行する必要がある。

### 7. CI に型チェックを加える

`ci.yml` の `lint` ジョブに、型チェックのステップを追加する。

```yaml
# .github/workflows/ci.yml（lint ジョブの steps の最後に追加）
      - name: Type check
        run: npm run typecheck
```

```powershell
git add .
git commit -m "refactor: todo-app をTypeScriptに移行し、CIに型チェックを追加"
git push -u origin feature/typescript
gh pr create --fill
gh pr checks --watch
```

これで **lint・型チェック・テスト・ビルド** の4段階のチェックが、PR のたびに自動で動く。

##  演習

### 演習1（基本）：TodoList に型を付ける

`components/TodoList.tsx` の props に型を付け、`npm run typecheck` を通す。

**確認方法**：`npm run typecheck` がエラーなしで終わり、`TodoApp.tsx` で `<TodoList todos={todos} ... />` の `todos` を `todos={123}` に変えると赤い波線が出ればOK（確かめたら戻す）。

<details>
<summary>解答例</summary>

```tsx
// components/TodoList.tsx
import type { Todo } from '@/lib/todos'
import TodoItem from './TodoItem'

type TodoListProps = {
  todos: Todo[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  // ...（中身はそのまま）
}
```

</details>

### 演習2（基本）：型のおかげで見つかるバグを体験する

次の3つの間違いをわざと入れ、それぞれ `npm run typecheck` がどんなエラーを出すかをメモする（確かめたら戻す）。

1. `TodoItem.tsx` で `onToggle(todo.id)` を `onToggle(todo)` にする
2. `TodoApp.tsx` で `filterTodos(todos, 'actve')` を呼ぶ（絞り込みを作っていない人は `lib/todos.test.ts` の中で呼ぶ）
3. `lib/api.ts` の `return data.map((item) => item.title)` を `item.titel` にする

**確認方法**：3つとも型チェックでエラーになり、メッセージから「何が・どこで」間違っているか読み取れればOK。

<details>
<summary>解説</summary>

1. `Argument of type 'Todo' is not assignable to parameter of type 'string'.`：関数の型（`(id: string) => void`）と違う値を渡している
2. `Argument of type '"actve"' is not assignable to parameter of type 'TodoFilter'.`：文字列リテラル型のおかげで、打ち間違いが見つかる
3. `Property 'titel' does not exist on type 'SampleTodo'. Did you mean 'title'?`：受け取るデータに型を付けたので見つかる

どれも JavaScript のままなら、**実行して画面を触るまで気づけなかった** バグ。

</details>

### 演習3（応用）：Todo に優先度を足す

`Todo` 型に `priority: 'high' | 'normal' | 'low'` を追加する。

**確認方法**：`npm run typecheck` を実行すると、`createTodo` や、テストの `sample` など **priority を書いていない場所が全部エラーとして一覧で出る** ことを確かめる。それらを直して、エラーを0にできればOK。

> 型を変えると、**直す必要がある場所をコンパイラが全部教えてくれる**。JavaScript だと、1か所ずつ探して、見落としたらバグになる。これが「大きなプロジェクトほど TypeScript が欲しくなる」理由。

### 演習4（早く終わった人向け）：localStorage から読んだデータを確かめる

`loadTodos` の `JSON.parse` の結果は `any` なので、壊れたデータや古い形のデータが入っていても `Todo[]` として扱われてしまう。

「本当に `Todo[]` の形か」を確かめる関数 `isTodoArray(value: unknown): value is Todo[]` を `lib/todos.ts` に作り、テストを書く。`loadTodos` で使い、形が違うときは空の配列を返すようにする。

**確認方法**：`[{ id: '1', text: 'a', done: false }]` は `true`、`[{ id: 1 }]` や `'abc'` や `null` は `false` になるテストが通ればOK。

<details>
<summary>ヒント</summary>

- `unknown` は「何が入っているか分からない」型。`any` と違い、確かめるまで使えない
- 戻り値の `value is Todo[]` は **型ガード**。この関数が `true` を返したら、その後 `value` は `Todo[]` として扱われる
- `Array.isArray(value)` と、各要素の `typeof item.id === 'string'` などで確かめる

</details>

##  まとめ

### 今日できるようになったこと

- `allowJs` で JS と TS を混在させ、土台（`lib/`）→ 部品 → テストの順に移行できた
- `type` でデータの形を宣言し、props・state・関数・モックに型を付けられるようになった
- `tsc --noEmit` を CI に組み込み、型のエラーがある PR を自動で止められるようになった

### よくある詰まりポイント

- **`Cannot find module '@/lib/todos'`**：`tsconfig.json` に `paths` を書いたか確認する（`jsconfig.json` を消したので、こちらに書く必要がある）
- **テストは通るのに `typecheck` が落ちる**：Jest は型を確かめない。両方を実行する
- **`mockReturnValue` などが「存在しない」と言われる**：`jest.mocked(関数)` で包む

### 次の一歩

個人制作のアプリも TypeScript で作り直してみよう。新しく作るなら、`create-next-app` から `--js` を外すだけで最初から TS のプロジェクトになる。

##  課題

### 基礎課題（必須）

1. `todo-app` のすべてのファイルを TS に移行し、`typecheck`・`test`・`lint`・`build` を通してマージする
2. 演習2の3つのエラーメッセージを、日本語で意味を書き添えてメモする

### 応用課題（推奨）

3. 演習3（優先度の追加）を完成させ、画面でも優先度を選べるようにする
4. `app/layout.tsx` の `metadata` に `Metadata` 型（`import type { Metadata } from 'next'`）を付け、`title` を数値にするとエラーになることを確かめる

### チャレンジ課題（挑戦）

5. 演習4の型ガードの代わりに、**Zod**（データの形を確かめるライブラリ）で `Todo` の形を定義し、localStorage と JSONPlaceholder の両方のデータを確かめるように書き換える。型ガードを自分で書く場合と比べる
6. `create-next-app`（`--js` なし）で新しい TS のプロジェクトを作り、自動で作られる `tsconfig.json` と今日書いたものの違いを調べる
