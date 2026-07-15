# 発展1｜TypeScript化（TODOアプリをJSからTSへ移行する）

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 |  |
| 前提コマ | Phase 1 修了（コマ5 TODOアプリ実装②まで） |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- TypeScriptが「何を解決する道具」なのかを自分の言葉で説明できる
- 既存のReactアプリ（JavaScript）を段階的にTypeScriptへ移行できる
- `tsc --noEmit` による型チェックをローカルとCIで実行できる

##  導入

### なぜTypeScriptか

コマ25で「TypeScriptにしたい」という声への答えは「まずはJSで動くものを」だった。動くものが完成した今が、TS化に挑戦するベストタイミング。

JavaScriptで開発しているとき、こういうバグを経験しなかっただろうか。

- `todo.text` と書くべきところを `todo.title` と書いてしまい、画面に何も出ない
- 関数に渡す引数の順番を間違えて、実行するまで気づかない

TypeScriptは **「値の形（型）」をコードに書いておくことで、実行する前にエディタとコンパイラが間違いを教えてくれる** 仕組み。大規模開発の現場ではほぼ標準になっている。

> **TypeScript（TS）とは**：JavaScriptに型注釈を追加した言語。ブラウザはTSを直接実行できないので、最終的にはJSに変換（トランスパイル）されて動く。

### 移行のゴール

コマ4〜5で作った `todo-app` を丸ごとTS化する。**一気に書き直すのではなく、1ファイルずつ移行できる** のがTSの良いところ。実務でも「JSプロジェクトの段階的TS化」はよくある仕事。

##  本題

### 1. 必要なパッケージの導入

```bash
cd ~/workspace/todo-app
npm install -D typescript @types/react @types/react-dom
```

> **`@types/〜` とは**：型情報だけが入ったパッケージ。Reactは本体がJSで書かれているので、TSから使うための「型の辞書」を別途入れる。

### 2. tsconfig.json の作成

プロジェクト直下に `tsconfig.json` を作る。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "allowJs": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true
  },
  "include": ["src"]
}
```

ポイントは3つ。

- **`strict: true`**：型チェックを最も厳しくする。最初から厳しくした方が結局ラク
- **`allowJs: true`**：JSファイルとTSファイルの共存を許す。これが「1ファイルずつ移行」を可能にする
- **`noEmit: true`**：tscは型チェックだけ行い、JSへの変換はViteに任せる

> **なぜ変換をViteに任せるか**：Viteは内部で高速なトランスパイラ（esbuild）を使ってTSをJSに変換する。ただし **Viteは型チェックをしない**。だから型チェック専用に `tsc --noEmit` を別で走らせる。この分担は実務でも一般的。

### 3. エントリポイントの移行

まず `src/main.jsx` を `src/main.tsx` にリネームする。

```bash
mv src/main.jsx src/main.tsx
```

`index.html` の読み込みパスも合わせて変更する。

```html
<script type="module" src="/src/main.tsx"></script>
```

`main.tsx` の中身はほぼそのまま動くが、1箇所だけ型エラーが出る。

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

> **末尾の `!` とは**：`getElementById` は「見つからないかもしれない（null）」型を返す。`!` は「nullではないと保証する」という開発者の宣言。`index.html` に `#root` が必ずあるので、ここでは使ってよい。

開発サーバで動作確認：

```bash
npm run dev -- --host
```

### 4. 型の定義とApp.tsxの移行

`src/App.jsx` を `src/App.tsx` にリネームし、TODOの「形」を型として宣言する。

```tsx
// src/App.tsx（抜粋）
import { useState } from 'react'

type Todo = {
  id: number
  text: string
  done: boolean
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [text, setText] = useState('')

  const addTodo = () => {
    if (!text.trim()) return
    const newTodo: Todo = { id: Date.now(), text, done: false }
    setTodos([...todos, newTodo])
    setText('')
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  // ...（JSX部分はほぼそのまま）
}

export default App
```

- **`type Todo = {...}`**：TODO1件の形を宣言。以後 `todo.title` のような打ち間違いは **保存した瞬間にエディタが赤線** で教えてくれる
- **`useState<Todo[]>([])`**：`useState([])` だけだと「空配列（中身不明）」になる。`<Todo[]>` で「Todoの配列」と明示する

### 5. propsとイベントの型付け

子コンポーネントに切り出している場合は、propsに型を付ける。

```tsx
// src/TodoItem.tsx
type TodoItemProps = {
  todo: Todo
  onDelete: (id: number) => void
}

function TodoItem({ todo, onDelete }: TodoItemProps) {
  return (
    <li>
      {todo.text}
      <button onClick={() => onDelete(todo.id)}>削除</button>
    </li>
  )
}
```

入力イベントの型はこう書く。

```tsx
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setText(e.target.value)
}
```

> **型が分からないときのコツ**：JSX側で `onChange={(e) => ...}` とインラインで書き、`e` にマウスカーソルを乗せると、エディタが正しい型を表示してくれる。それをコピーすればよい。

### 6. 型チェックをコマンド化してCIに組み込む

`package.json` の scripts に追加：

```json
"typecheck": "tsc --noEmit"
```

```bash
npm run typecheck
```

エラーが0になるまで直す。直ったら、Phase 3で作った `ci.yml` にステップを追加する。

```yaml
      - name: Type check
        run: npm run typecheck
```

これで「型エラーが残ったままのPRはマージできない」状態になる。lint・testに続く **3つ目の自動チェック** が手に入った。

##  まとめ

### 今日できるようになったこと

- 既存のJSプロジェクトを、動かしたまま1ファイルずつTS化できる
- `type` でデータの形を宣言し、propsやstateに型を付けられる
- `tsc --noEmit` をCIに組み込み、型エラーを自動検出できる

### よくある詰まりポイント

- **リネーム後に画面が真っ白**：`index.html` のscriptパスが `.jsx` のまま。ブラウザのコンソールに404が出ていないか確認
- **`strict` のエラーが大量に出る**：慌てなくてよい。ほとんどは「nullかもしれない」警告。1個ずつ潰すこと自体が最高の練習になる

### 次の一歩

テストファイル（`.test.jsx`）のTS化は発展3（MSW）や発展4（Playwright）と組み合わせると効果的。個人制作アプリのTS化に挑戦するのもよい。

##  課題

### 基礎課題（必須）

1. `todo-app` の `src` 以下すべてのファイルを `.tsx` / `.ts` に移行し、`npm run typecheck` をエラー0で通す
2. CIに `typecheck` ステップを追加したPRを作り、Actionsが緑になることを確認してマージする

### 応用課題（推奨）

3. `Todo` 型に `priority: 'high' | 'normal' | 'low'` を追加する。**文字列リテラル型**（決まった文字列しか入らない型）の便利さを体感する
4. わざと `todo.text` を `todo.txt` に書き換えて `npm run typecheck` を実行し、**JSなら実行するまで気づけなかったバグが、実行前に検出される** ことを確認する（確認後は元に戻す）

### チャレンジ課題（挑戦）

5. `localStorage` から読み込んだJSONは型情報が失われる（`any` になる）。読み込み時に「本当にTodo[]の形か」を検証する関数 `isTodoArray(value: unknown): value is Todo[]` を書いてみる（ヒント：**型ガード** で検索）
6. 新規プロジェクトを `npm create vite@latest sample-ts -- --template react-ts` で作り、公式テンプレートのtsconfigが今日書いたものとどう違うかを1〜2行でまとめる
