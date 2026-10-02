# 発展2｜Tailwind CSSでUIを整える

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 | 90分 |
| 前提コマ | Phase 2 修了（コマ13 カバレッジとNext.jsのテスト戦略まで） |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- 「ユーティリティファースト」という考え方を説明できる
- Tailwind CSS v4 を Next.js のプロジェクトに導入し、`todo-app` の見た目を整えられる
- 見た目を変えたときに壊れるテストを、「見た目ではなく意味を確かめる」形に直せる

##  導入

### 「動くけど地味」問題

`todo-app` は動く。でも見た目は、ほぼ素の HTML。CSS を書けばよいのだが、

- クラス名を考えるのが大変（`todo-list-item-container`…？）
- どの CSS がどこに効いているのか、規模が大きくなると追えなくなる
- 消してよいか分からない CSS が増えていく

これは現場でも長年の悩みで、その答えの1つが **Tailwind CSS**。

> **Tailwind CSS とは**：`flex`・`p-4`・`text-lg` のような **小さな単機能のクラス（ユーティリティ）を組み合わせて** デザインする CSS フレームワーク。CSS ファイルをほとんど書かず、JSX の `className` にスタイルを書いていく。

### ユーティリティファースト

```jsx
{/* これまで：クラス名を考えて、別ファイルに CSS を書く */}
<button className="delete-button">削除</button>

{/* Tailwind：用意されたクラスをその場で組み合わせる */}
<button className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50">削除</button>
```

最初は「JSX がごちゃごちゃする」と感じるが、**React のコンポーネントと相性がとても良い**。スタイルを使い回したいときは、クラスではなく **コンポーネントを使い回せばよい** から。

> `create-next-app` の質問で「Tailwind CSS を使うか」と聞かれていたのは、これのこと。この授業では `--no-tailwind` で素の CSS から始めた。

##  本題

### 1. Tailwind CSS v4 を入れる

```powershell
cd ~/workspace/todo-app
git switch main
git pull
git switch -c feature/tailwind

npm install -D tailwindcss @tailwindcss/postcss
```

プロジェクト直下に `postcss.config.mjs` を作る。

```js
// postcss.config.mjs
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
```

> **PostCSS とは**：CSS を変換する仕組み。Next.js は CSS を読み込むときに PostCSS を通すので、そこに Tailwind を差し込んでいる。

`app/globals.css` の中身を **全部消して**、次のようにする。

```css
/* app/globals.css */
@import 'tailwindcss';

body {
  @apply bg-gray-100 text-gray-800;
}
```

```powershell
npm run dev
```

見た目が一度 **もっと地味になる**（Tailwind がブラウザの標準のスタイルをリセットするため）。ここから組み立てていく。

> **v3 と v4 の違いに注意**：ネットの古い記事には `tailwind.config.js` を作ったり、`@tailwind base;` と書いたりする手順が載っているが、それは **v3 以前** のやり方。v4 は上の手順だけで動く。記事の日付を確かめるクセをつけよう。

### 2. 1つのボタンから始める

`components/TodoForm.js` の「追加」ボタンにクラスを付ける。

```jsx
<button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700">
  追加
</button>
```

| クラス | 意味 |
|--------|------|
| `rounded-lg` | 角を丸くする（大きめ） |
| `bg-blue-600` | 背景色：青（濃さ 600） |
| `px-4 py-2` | 左右の余白 4、上下の余白 2（1 = 0.25rem = 4px） |
| `font-bold` | 太字 |
| `text-white` | 文字色：白 |
| `hover:bg-blue-700` | **マウスを乗せたときだけ** 少し濃い青 |

> **なぜ `600` や `4` のような決まった数字なの？** 色や余白を **決められた段階** から選ばせることで、ページ全体に統一感が出る。デザイナーがいないチームほど助かる。

VS Code に **Tailwind CSS IntelliSense** 拡張機能を入れると、クラス名の補完と色のプレビューが出て、打ち間違いが減る。

### 3. フォームとリストを整える

```jsx
// components/TodoForm.js（return の中）
<form onSubmit={handleSubmit} className="mb-4 flex gap-2">
  <input
    type="text"
    value={text}
    onChange={(e) => setText(e.target.value)}
    placeholder="やることを入力"
    aria-label="やること"
    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
  />
  <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700">
    追加
  </button>
</form>
```

```jsx
// components/TodoList.js
import TodoItem from './TodoItem'

export default function TodoList({ todos, onToggle, onDelete }) {
  if (todos.length === 0) {
    return <p className="py-6 text-center text-gray-500">やることはありません</p>
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  )
}
```

```jsx
// components/TodoItem.js
export default function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
      <label className={`flex items-center gap-3 ${todo.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
        <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} className="size-5 accent-blue-600" />
        {todo.text}
      </label>
      <button
        onClick={() => onDelete(todo.id)}
        aria-label={`${todo.text}を削除`}
        className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50 hover:text-red-700"
      >
        削除
      </button>
    </li>
  )
}
```

新しく出てきたクラス：

| クラス | 意味 |
|--------|------|
| `flex` / `flex-1` / `gap-2` | 横並び、残りの幅いっぱい、間の余白 |
| `items-center` / `justify-between` | 縦方向の中央ぞろえ、両端に寄せる |
| `space-y-2` | 子要素の **間** にだけ縦の余白 |
| `focus:border-blue-500` | 入力中（フォーカス中）だけ枠を青に |
| `line-through` | 打ち消し線 |

**条件によってスタイルを変える** ときは、コマ4でやったように **三項演算子でクラスの文字列を切り替える**。

### 4. テストが落ちる：見た目ではなく意味を確かめる

```powershell
npm test
```

```text
● 完了済みならチェックがオンで、打ち消し線が付く
    expect(element).toHaveStyle()
    - Expected
    - textDecoration: line-through;
```

コマ10で書いた `TodoItem` のテストが失敗する。打ち消し線を `style={{ textDecoration: ... }}` から Tailwind の `line-through` クラスに変えたので、**style 属性がなくなった** から。jsdom は Tailwind の CSS を読み込まないので、クラスから見た目を計算することもできない。

直し方は2つある。

| 直し方 | 書き方 | 考え方 |
|--------|--------|--------|
| クラスを確かめる | `expect(label).toHaveClass('line-through')` | 手軽。ただしクラス名（見た目の実装）に依存する |
| 意味を確かめる | `expect(checkbox).toBeChecked()` だけにする | 「完了している」ことはチェックボックスの状態で分かる。見た目は変えても壊れない |

ここでは、**完了状態はチェックボックスで確かめ、打ち消し線はクラスで確かめる** ことにする。

```jsx
// components/TodoItem.test.js（変更部分）
expect(screen.getByText('牛乳を買う')).toHaveClass('line-through')
```

```jsx
// 未完了のテスト
expect(screen.getByText('牛乳を買う')).not.toHaveClass('line-through')
```

> **見た目の細部はテストより「目」で確かめる**：色や余白をテストで全部確かめようとすると、デザインを変えるたびにテストを直すことになる（コマ28）。見た目は Vercel のプレビュー URL で人が確かめ、テストは **ユーザーにとっての意味**（チェックされているか、表示されているか）を中心に書く。

```powershell
npm test
```

### 5. ページ全体のレイアウト

```jsx
// app/page.js
import TodoAppClient from '@/components/TodoAppClient'

export default function Home() {
  return (
    <main className="mx-auto mt-6 max-w-xl px-4 md:mt-10">
      <h1 className="mb-6 text-2xl font-bold">TODOアプリ</h1>
      <TodoAppClient />
    </main>
  )
}
```

- **`mx-auto max-w-xl`**：幅を制限して、左右中央に寄せる
- **`mt-6 md:mt-10`**：スマホでは上の余白 6、**画面幅 768px 以上（`md:`）では 10**

Tailwind は **スマホ向けのスタイルを先に書き、広い画面のときだけ `md:`・`lg:` で上書きする**（**モバイルファースト**）。

ヘッダーも整える。コマ6の `.header` や `.nav-link` の CSS は消えたので、クラスで書き直す。

```jsx
// components/Header.js（return の中）
<header className="bg-slate-900 px-4 py-3">
  <div className="mx-auto flex max-w-xl flex-wrap items-center gap-x-6 gap-y-2">
    <span className="font-bold text-white">{appName}</span>
    <nav className="flex gap-4">
      {links.map((link) => {
        const isCurrent = isCurrentPath(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={isCurrent ? 'font-bold text-white' : 'text-slate-300 hover:text-white'}
            aria-current={isCurrent ? 'page' : undefined}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  </div>
</header>
```

ブラウザの開発者ツール（F12）の **デバイスツールバー**（スマホのアイコン）で、スマホの幅でも崩れないことを確かめる。

```powershell
npm run lint
npm test
npm run build
git add .
git commit -m "style: Tailwind CSSで見た目を整える"
git push -u origin feature/tailwind
gh pr create --fill
```

**Vercel のプレビュー URL** で、PC とスマホの両方で見た目を確かめてからマージする。

##  演習

### 演習1（基本）：残りの部品を整える

`TodoApp.js` の「残り ○ 件」と「すべて削除」ボタン、`SampleLoader.js`、`Footer.js`、`app/about/page.js` にクラスを付けて、全体の見た目をそろえる。

**確認方法**：どのページも、素の HTML っぽさがなくなっていればOK。`npm test` も通ること。

<details>
<summary>例：残り件数とすべて削除</summary>

```jsx
<div className="mt-4 flex items-center justify-between text-sm">
  <p className="text-gray-600">残り {remaining} 件</p>
  <button
    onClick={clearAll}
    disabled={todos.length === 0}
    className="rounded-lg border border-red-300 px-3 py-1 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
  >
    すべて削除
  </button>
</div>
```

`disabled:` は、ボタンが押せないときだけ効くスタイル。

</details>

### 演習2（基本）：使わなくなった CSS を片付ける

`app/globals.css` や `*.module.css` に、使われなくなったクラスが残っていないか探して消す。

**確認方法**：`Get-ChildItem -Recurse -File app, components | Select-String 'className="(header|nav-link|container)'` で古いクラス名が見つからず、画面の見た目も崩れていなければOK。

> Tailwind のクラスは、**使われているものだけ** がビルド後の CSS に含まれる。JSX から消せばスタイルも消えるので、「消してよいか分からない CSS」が生まれにくい。

### 演習3（応用）：ボタンをコンポーネントにする

同じクラスの組み合わせを何度も書いているボタンを `components/Button.js` にまとめる。`variant` の props で「青（`primary`）」と「赤い枠（`danger`）」を切り替えられるようにし、それ以外の props（`onClick`・`disabled`・`type` など）はそのまま `<button>` に渡す。

**確認方法**：「追加」と「すべて削除」が `Button` で書かれ、見た目が変わらず、`npm test` が通ればOK。

<details>
<summary>解答例</summary>

```jsx
// components/Button.js
const variants = {
  primary: 'bg-blue-600 font-bold text-white hover:bg-blue-700',
  danger: 'border border-red-300 text-red-600 hover:bg-red-50',
}

export default function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
```

```jsx
<Button type="submit">追加</Button>
<Button variant="danger" onClick={clearAll} disabled={todos.length === 0}>
  すべて削除
</Button>
```

`...props` は **残りの props をまとめて受け取る**（残余引数）書き方で、`{...props}` でそのまま渡している。`children` もこの中に入っている。

</details>

### 演習4（早く終わった人向け）：ダークモード

主な要素に `dark:` のクラス（例：`bg-white dark:bg-slate-800`）を付け、OS のダークモードに合わせて色が変わるようにする。

**確認方法**：開発者ツールの「Rendering」タブ → **Emulate CSS media feature prefers-color-scheme** を `dark` にすると、画面が暗い配色になればOK。

##  まとめ

### 今日できるようになったこと

- Tailwind CSS v4 を `@tailwindcss/postcss` で Next.js に導入できた
- ユーティリティクラスと `hover:`・`md:`・`disabled:` などで、状態や画面幅ごとのスタイルを書けるようになった
- 見た目の変更で壊れたテストを、「意味を確かめる」形に直せるようになった

### よくある詰まりポイント

- **クラスを書いても効かない**：クラス名の打ち間違い（`bg-blue600` など）が一番多い。IntelliSense 拡張機能を入れる。`postcss.config.mjs` がプロジェクト直下にあるかも確認する
- **クラスを文字列の組み立てで作ると効かない**：`` `bg-${color}-500` `` のように **部品に分けた書き方** は、Tailwind がクラスを見つけられない。`'bg-red-500'` のように完全な名前で書く
- **古い記事の手順と混ざる**：`tailwind.config.js` や `@tailwind base;` が出てくる記事は v3 のもの

### 次の一歩

個人制作のアプリの見た目を Tailwind で作り直すと、発表の印象が大きく変わる。新しいプロジェクトなら、`create-next-app` で `--no-tailwind` を付けなければ最初から Tailwind 入りになる。

##  課題

### 基礎課題（必須）

1. `todo-app` 全体を Tailwind で整え、変更前後のスクリーンショットを PR に貼ってマージする
2. スマホの幅（375px）と PC の幅（1280px）の両方で崩れないことを確かめ、`md:` を1か所以上使う

### 応用課題（推奨）

3. 演習3の `Button` コンポーネントにテストを書く（`variant="danger"` のときに押せること、`disabled` のときに押せないこと）。クラス名ではなく **振る舞い** を確かめる
4. 完了した TODO の行全体の背景色を変える（`bg-green-50` など）

### チャレンジ課題（挑戦）

5. 演習4のダークモードに、ボタンで切り替える機能を足す（Tailwind v4 のドキュメントで `@custom-variant dark` を調べる）
6. 同じ画面を「CSS Modules で書いた場合」と「Tailwind で書いた場合」で比べ、良い点・悪い点を3つずつまとめる
