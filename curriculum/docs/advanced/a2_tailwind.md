# 発展2｜Tailwind CSSでUIを整える

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 |  |
| 前提コマ | Phase 1 修了（コマ5 TODOアプリ実装②まで） |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- ユーティリティファーストという考え方を説明できる
- Tailwind CSS v4 をViteプロジェクトに導入できる
- TODOアプリの見た目を、CSSファイルをほぼ書かずに整えられる

##  導入

### 「動くけどダサい」問題

TODOアプリは動く。でも見た目は素のHTMLに近い。CSSを書けばいいのだが、

- クラス名を考えるのが大変（`todo-list-item-container-wrapper`...？）
- どのCSSがどこに効いているのか、規模が大きくなると追えなくなる
- 消していいCSSか分からず、誰も消せない「CSSの墓場」ができる

これは現場でも長年の課題で、その解答のひとつが **Tailwind CSS**。

> **Tailwind CSSとは**：`flex` `p-4` `text-lg` のような **小さな単機能クラス（ユーティリティ）を組み合わせて** デザインするCSSフレームワーク。CSSファイルをほぼ書かず、HTML（JSX）側にスタイルを書いていく。

### ユーティリティファーストの考え方

```jsx
{/* 従来：クラス名を発明して、別ファイルにCSSを書く */}
<button className="delete-button">削除</button>

{/* Tailwind：用意されたクラスをその場で組み合わせる */}
<button className="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600">削除</button>
```

最初は「HTMLが汚れる」と感じるが、**コンポーネントと相性が抜群**。Reactではスタイルの再利用は「クラスの再利用」ではなく「コンポーネントの再利用」で実現できるからだ。

##  本題

### 1. 導入（Tailwind v4 + Vite）

```bash
cd ~/workspace/todo-app
npm install tailwindcss @tailwindcss/vite
```

`vite.config.js` にプラグインを追加する。

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`src/index.css` の中身を **全部消して** 1行にする。

```css
@import "tailwindcss";
```

```bash
npm run dev -- --host
```

> **注意（v3とv4の違い）**：ネット上の古いチュートリアルには `tailwind.config.js` や `postcss.config.js` を作る手順が載っているが、それは **v3以前** のやり方。2025年リリースのv4では上記だけで動く。「記事の日付を確認する」癖はここでも大事。

素のHTMLっぽさが消えたら導入成功（Tailwindはブラウザのデフォルトスタイルをリセットするため、一時的に「地味」になる。ここから組み立てていく）。

### 2. まず1つの要素を装飾してみる

追加ボタンから始める。

```jsx
<button
  onClick={addTodo}
  className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
>
  追加
</button>
```

クラス名の読み方：

| クラス | 意味 |
|-------|------|
| `rounded` | 角丸 |
| `bg-blue-500` | 背景色（青・濃さ500） |
| `px-4 py-2` | 左右パディング4・上下2（1 = 0.25rem = 4px） |
| `text-white` | 文字色 |
| `hover:bg-blue-600` | **ホバー時だけ** 少し濃い青 |

> **なぜ数値が `500` や `4` なのか**：Tailwindは色や余白を **決められた段階（スケール）** から選ばせる。自由な値を禁止することで、ページ全体の色・余白に統一感が生まれる。デザイナーがいないチームほど恩恵が大きい。

### 3. TODOアプリ全体をレイアウトする

`App.jsx` の構造にクラスを足していく。

```jsx
function App() {
  // ...state等はそのまま...

  return (
    <div className="mx-auto mt-10 max-w-md rounded-lg bg-white p-6 shadow-md">
      <h1 className="mb-4 text-2xl font-bold text-gray-800">TODOアプリ</h1>

      <div className="mb-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          placeholder="やることを入力"
        />
        <button
          onClick={addTodo}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          追加
        </button>
      </div>

      <ul className="space-y-2">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center justify-between rounded bg-gray-50 px-3 py-2"
          >
            <span className={todo.done ? 'text-gray-400 line-through' : ''}>
              {todo.text}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

新出クラスの要点：

- **`mx-auto max-w-md`**：幅を制限して中央寄せ。カード型レイアウトの定番
- **`flex gap-2` / `flex-1`**：コマ3で学んだ「横並び＋残り幅いっぱい」がクラス2つで済む
- **`space-y-2`**：子要素の **間** にだけ縦の余白。リストで多用する
- **`line-through`**：完了済みTODOに取り消し線。**条件付きスタイルは三項演算子でクラス文字列を切り替える** のがReact + Tailwindの基本形

背景もつけたい場合は `index.css` に追記：

```css
@import "tailwindcss";

body {
  background-color: #f3f4f6;
}
```

### 4. レスポンシブ対応

Tailwindは **プレフィックスを付けるだけ** で画面幅ごとのスタイルを書ける。

```jsx
<div className="mx-auto mt-4 max-w-full p-4 md:mt-10 md:max-w-md md:p-6">
```

- プレフィックスなし（`mt-4`）＝ **スマホを含む全サイズ** に適用
- **`md:`**（`md:mt-10`）＝ 画面幅768px以上のときだけ上書き

> **モバイルファーストとは**：まずスマホ向けを書き、広い画面のときだけ `md:` `lg:` で上書きしていく設計。Tailwindはこの方式を前提にしている。

ブラウザの開発者ツール（F12 → デバイスツールバー）でスマホ幅にして確認する。

### 5. 繰り返しはコンポーネントで消す

同じクラスの羅列を何度も書きたくなったら、CSSではなく **コンポーネント化** で解決する。

```jsx
// src/Button.jsx
function Button({ children, ...props }) {
  return (
    <button
      className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
```

コマ3の「コンポーネント設計」がスタイルの再利用にもそのまま効く、というのがReact + Tailwindの気持ちよさ。

##  まとめ

### 今日できるようになったこと

- Tailwind v4 をViteに導入し、ユーティリティクラスでUIを組める
- `hover:` `md:` などのプレフィックスで状態・画面幅ごとのスタイルを書ける
- スタイルの再利用をコンポーネント化で実現できる

### よくある詰まりポイント

- **クラスを書いても効かない**：クラス名のタイポが最多（`bg-blue-500` を `bg-blue500` 等）。エディタに **Tailwind CSS IntelliSense** 拡張を入れると補完と色プレビューが出て激減する
- **古い記事の手順と混ざる**：`tailwind.config.js` が必要と書いてある記事はv3。v4では原則不要

### 次の一歩

個人制作アプリ（Phase 5）のUIをTailwindで作り直すと発表映えする。ダークモード対応（チャレンジ課題）まで行くと完成度が一段上がる。

##  課題

### 基礎課題（必須）

1. TODOアプリの全要素にTailwindでスタイルを当て、ビフォー・アフターのスクリーンショットを撮る
2. ブランチを切って作業し、PRを作ってマージする（CIが通ることも確認）

### 応用課題（推奨）

3. **完了/未完了の切り替えチェックボックス** にもスタイルを当て、完了時は行全体の背景色も変える（`bg-green-50` など）
4. スマホ幅（375px）とPC幅（1280px）の両方でレイアウトが破綻しないことを確認し、`md:` を最低1箇所使う

### チャレンジ課題（挑戦）

5. **ダークモード対応**：`dark:` プレフィックス（例：`bg-white dark:bg-gray-800`）を主要な要素に追加する。OSのダークモード設定を切り替えて動作確認する
6. ボタンを `Button.jsx` に切り出し、`variant` propで「青（通常）／赤（危険）」を出し分けられるようにする。コマ3のコンポーネント設計の復習
