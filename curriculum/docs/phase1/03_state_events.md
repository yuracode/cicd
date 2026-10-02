# コマ3｜stateとイベント・'use client'

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | コマ2 JSXとコンポーネント・props |
| 次コマ | コマ4 リストと条件付き表示 |

##  目標

- 画面を変化させるには **state**（`useState`）が必要な理由を説明できる
- `onClick` / `onChange` でイベントを受け取り、state を更新できる
- `'use client'` を付けるべきコンポーネントと、付けなくてよいコンポーネントを見分けられる

##  導入

### 前回の振り返り

```powershell
cd ~/workspace/hello-next
npm run dev
```

前回は props で値を渡して、同じ部品を中身を変えて並べた。ただし、あの画面は **一度表示したら変わらない**。

> 前回のプロジェクトがない人は、次で作り直せる。
>
> ```bash
> mkdir -p ~/workspace && cd ~/workspace
> npx create-next-app@latest hello-next --js --eslint --app --no-tailwind --no-src-dir --no-react-compiler --import-alias "@/*" --use-npm --yes
> cd hello-next && mkdir -p components
> npm run dev
> ```

### 今日のゴール

- ボタンを押すと数字が増える / 減る **カウンター**
- 入力した文字がその場で画面に反映される **入力欄**

を作る。どちらも「ユーザーの操作で画面が変わる」例。

### 考えてみよう

> 変数 `count` を用意して、ボタンが押されたら `count = count + 1` すれば、画面の数字も増えるだろうか？

答えは **増えない**。React は「state が更新された」と知らされたときだけ画面を描き直す。普通の変数を書き換えても React は気づかない。今日はこの仕組みを体験する。

##  本題

### 1. まずは失敗してみる：'use client' なしで useState

`components/Counter.js` を作る。

```jsx
// components/Counter.js
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>現在のカウント：{count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  )
}
```

```jsx
// app/page.js
import Counter from '@/components/Counter'

export default function Home() {
  return (
    <main style={{ padding: '24px' }}>
      <h1>カウンター</h1>
      <Counter />
    </main>
  )
}
```

ブラウザにエラーが出る。

```text
You're importing a module that depends on `useState` into a React Server Component module.
This API is only available in Client Components.
To fix, mark the file (or its parent) with the `"use client"` directive.
```

前回確認したとおり、Next.js のコンポーネントは **何も指定しないとサーバ側で動く（Server Component）**。サーバは HTML を1回作って送るだけなので、「クリックされたら数字を変える」ことはできない。エラーメッセージにも直し方が書いてある。

### 2. 'use client' を付ける

ファイルの **1行目** に `'use client'` を追加する。

```jsx
// components/Counter.js
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>現在のカウント：{count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  )
}
```

ボタンを押して数字が増えればOK。

> **`'use client'` とは**：「このファイルのコンポーネントは **ブラウザでも動かす**（Client Component にする）」という宣言。ブラウザにこの部品の JavaScript が送られ、クリックなどに反応できるようになる。必ずファイルの先頭（import より上）に書く。

### 3. useState の読み方

```jsx
const [count, setCount] = useState(0)
```

| 部分 | 意味 |
|------|------|
| `useState(0)` | 「初期値 0 の state を1つください」 |
| `count` | 今の値 |
| `setCount` | 値を更新する関数。呼ぶと **React が画面を描き直す** |
| `[a, b] = ...` | 配列の **分割代入**。`useState` は `[今の値, 更新関数]` の2つ組を返す |

名前は自由だが、`[xxx, setXxx]` とそろえるのがお約束。

**重要ルール：state は必ず更新関数で変える。**

```jsx
count = count + 1      // ✕ 画面は変わらない（そもそも const なのでエラー）
setCount(count + 1)    // ○ React に「変わったよ」と伝わる
```

### 4. イベントの書き方

ボタンを増やして、処理を関数に分ける。

```jsx
// components/Counter.js
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  function handleIncrement() {
    setCount(count + 1)
  }

  function handleDecrement() {
    setCount(count - 1)
  }

  return (
    <div>
      <p>現在のカウント：{count}</p>
      <button onClick={handleIncrement}>+1</button>
      <button onClick={handleDecrement}>-1</button>
      <button onClick={() => setCount(0)}>リセット</button>
    </div>
  )
}
```

`onClick` に渡すのは **関数そのもの**。

```jsx
<button onClick={handleIncrement}>      // ○ クリックされたら呼んでね
<button onClick={() => setCount(0)}>    // ○ アロー関数で包んでも OK
<button onClick={handleIncrement()}>    // ✕ 描画した瞬間に呼ばれてしまう
```

> **アロー関数のおさらい**：`() => setCount(0)` は `function () { return setCount(0) }` の短い書き方。引数を渡したいときはアロー関数で包む。

### 5. 連続で更新するときの落とし穴

「+2」ボタンを次のように作ると、どうなるか試す。

```jsx
<button
  onClick={() => {
    setCount(count + 1)
    setCount(count + 1)
  }}
>
  +2?
</button>
```

押しても **1しか増えない**。1回のクリックの中では `count` は「押した時点の値」のまま固定されているので、2回とも `0 + 1` を設定しているだけになる。

前の値をもとに更新したいときは、**関数を渡す** 書き方を使う。

```jsx
<button
  onClick={() => {
    setCount((prev) => prev + 1)
    setCount((prev) => prev + 1)
  }}
>
  +2
</button>
```

`prev` には「直前に更新された最新の値」が入るので、ちゃんと2増える。**前の値から計算するときは `(prev) => ...` の形が安全**、と覚えておく。

### 6. 入力欄と state をつなぐ

`components/NameInput.js` を作る。

```jsx
// components/NameInput.js
'use client'

import { useState } from 'react'

export default function NameInput() {
  const [name, setName] = useState('')

  return (
    <div>
      <label>
        名前：
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <p>こんにちは、{name}さん！（{name.length}文字）</p>
    </div>
  )
}
```

`app/page.js` に `<NameInput />` を追加して、文字を打つたびに表示が変わることを確認する。

- `onChange`：入力欄の中身が変わるたびに呼ばれる
- `e`（イベントオブジェクト）：何が起きたかの情報。`e.target` は操作された要素（ここでは `<input>`）、`e.target.value` はその中身の文字列
- `value={name}`：入力欄の中身を **state と常に一致させる**。これを **制御されたコンポーネント** と呼び、フォームを扱うときの基本形になる（コマ5の TODO アプリで使う）

### 7. Server Component と Client Component を組み合わせる

`app/page.js` には `'use client'` を付けていない。それでも中で `Counter` を使えるのは、**Server Component の中に Client Component を置くのは OK** だから。

```jsx
// app/page.js（Server Component のまま）
import Counter from '@/components/Counter'
import NameInput from '@/components/NameInput'

export default function Home() {
  return (
    <main style={{ padding: '24px' }}>
      <h1>state の練習</h1>
      <Counter />
      <Counter />
      <NameInput />
    </main>
  )
}
```

`Counter` を2つ並べると、**それぞれ別々に数字を持つ**。state は部品1つ1つの中に閉じ込められている。

`'use client'` を付けるかどうかの目安：

| こんなとき | どうする |
|------------|---------|
| 表示するだけ（props を受け取って並べるだけ） | 付けない（Server Component） |
| `useState` などのフックを使う | **付ける** |
| `onClick` / `onChange` などのイベントを使う | **付ける** |

`'use client'` は **必要な部品だけ** に付けるのがコツ。ページ全体に付けると、ブラウザに送る JavaScript が増えて重くなる。

##  演習

### 演習1（基本）：Counter を props でカスタマイズする

`Counter` が次の props を受け取れるようにする。

- `initialCount`：初期値（省略時は `0`）
- `step`：1回のクリックで増減する量（省略時は `1`）

リセットボタンは `initialCount` に戻すようにする。

```jsx
<Counter />
<Counter initialCount={100} step={10} />
```

**確認方法**：1つ目は 0 から 1 ずつ、2つ目は 100 から 10 ずつ増減し、リセットでそれぞれの初期値に戻ればOK。

<details>
<summary>解答例</summary>

```jsx
// components/Counter.js
'use client'

import { useState } from 'react'

export default function Counter({ initialCount = 0, step = 1 }) {
  const [count, setCount] = useState(initialCount)

  return (
    <div>
      <p>現在のカウント：{count}</p>
      <button onClick={() => setCount((prev) => prev + step)}>+{step}</button>
      <button onClick={() => setCount((prev) => prev - step)}>-{step}</button>
      <button onClick={() => setCount(initialCount)}>リセット</button>
    </div>
  )
}
```

Server Component（`app/page.js`）から Client Component に props で値を渡せることも確認できる。

</details>

### 演習2（基本）：いいねボタン

`components/LikeButton.js` を作る。

- 最初は「♡ いいね 0」と表示
- 押すと「♥ いいね 1」になり、もう一度押すと「♡ いいね 0」に戻る（オン / オフの切り替え）

**確認方法**：押すたびにハートの形と数字が交互に切り替わればOK。

<details>
<summary>解答例</summary>

```jsx
// components/LikeButton.js
'use client'

import { useState } from 'react'

export default function LikeButton() {
  const [liked, setLiked] = useState(false)

  return (
    <button onClick={() => setLiked((prev) => !prev)}>
      {liked ? '♥' : '♡'} いいね {liked ? 1 : 0}
    </button>
  )
}
```

数字を別の state にしなくても、`liked` から計算できる。**state は最小限にして、他の値はそこから計算する** のが React のコツ。

</details>

### 演習3（応用）：入力チェック付きのフォーム

`components/SignupForm.js` を作る。

- 入力欄が2つ：「ニックネーム」と「ひとこと」
- ニックネームが空のときは「ニックネームを入力してください」と赤字で表示
- ひとことは 30 文字まで。入力中の文字数を「12 / 30」のように表示し、30 を超えたら数字を赤くする
- 入力内容をリアルタイムで「プレビュー」欄に表示する

**確認方法**：何も入力していないと赤字のメッセージが出て、ひとことを31文字以上打つと数字が赤くなればOK。

<details>
<summary>解答例</summary>

```jsx
// components/SignupForm.js
'use client'

import { useState } from 'react'

const MAX_LENGTH = 30

export default function SignupForm() {
  const [nickname, setNickname] = useState('')
  const [message, setMessage] = useState('')

  const isOver = message.length > MAX_LENGTH

  return (
    <div>
      <div>
        <label>
          ニックネーム：
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </label>
        {nickname === '' ? <p style={{ color: 'red' }}>ニックネームを入力してください</p> : null}
      </div>
      <div>
        <label>
          ひとこと：
          <input value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <span style={{ color: isOver ? 'red' : 'inherit' }}>
          {message.length} / {MAX_LENGTH}
        </span>
      </div>
      <h3>プレビュー</h3>
      <p>
        {nickname}：{message}
      </p>
    </div>
  )
}
```

`isOver` のように「state から計算できる値」は、state にせず普通の変数で持つ。

</details>

### 演習4（早く終わった人向け）：上限・下限付きカウンター

演習1の `Counter` に `min` と `max` の props を追加する。

- 範囲外にはならない
- 限界に達したらボタンを押せなくする（`<button disabled={...}>`）
- `max` に達したら「上限です」と表示する

```jsx
<Counter initialCount={5} min={0} max={10} />
```

**確認方法**：0 で「-1」が、10 で「+1」がグレーアウトし、10 のときに「上限です」と表示されればOK。

<details>
<summary>解答例</summary>

```jsx
// components/Counter.js
'use client'

import { useState } from 'react'

export default function Counter({ initialCount = 0, step = 1, min = -Infinity, max = Infinity }) {
  const [count, setCount] = useState(initialCount)

  return (
    <div>
      <p>現在のカウント：{count}</p>
      <button disabled={count + step > max} onClick={() => setCount((prev) => prev + step)}>
        +{step}
      </button>
      <button disabled={count - step < min} onClick={() => setCount((prev) => prev - step)}>
        -{step}
      </button>
      <button onClick={() => setCount(initialCount)}>リセット</button>
      {count === max ? <p>上限です</p> : null}
    </div>
  )
}
```

`min` / `max` を省略したときに制限がかからないよう、デフォルト値に `-Infinity` / `Infinity` を使っている。

</details>

##  まとめ

### 今日できるようになったこと

- `useState` で state を持ち、更新関数で変えると画面が描き直されることを理解した
- `onClick` / `onChange` でユーザーの操作を受け取れるようになった
- state やイベントを使う部品にだけ `'use client'` を付ける、という使い分けを覚えた

### よくある詰まりポイント

- **`useState ... only available in Client Components` エラー**：そのファイルの1行目に `'use client'` を書く。import より下に書くと効かない
- **`onClick={handleClick()}` と書いてしまう**：描画のたびに実行され、state 更新と描画が無限に繰り返されることもある。`onClick={handleClick}` か `onClick={() => handleClick()}` と書く
- **入力欄に文字が打てない**：`value={name}` だけ書いて `onChange` を書き忘れている。`value` を state とつなぐなら、`onChange` で state を更新する処理も必ずセットで書く

### 次コマ予告

次回は **配列の state** を扱う。`map` でリストを表示し、条件によって表示を切り替える方法を学ぶ。これが TODO アプリの土台になる。

##  課題

### 基礎課題（必須）

1. 演習1〜3を完成させてコミットする

```powershell
git add .
git commit -m "state とイベントの練習"
```

2. 次のコードは「押すたびに3増える」つもりで書いたが、1しか増えない。理由を説明し、正しく直す

```jsx
<button
  onClick={() => {
    setCount(count + 1)
    setCount(count + 1)
    setCount(count + 1)
  }}
>
  +3
</button>
```

### 応用課題（推奨）

3. **信号機コンポーネント** を作る。「次へ」ボタンを押すたびに 青 → 黄 → 赤 → 青… と色が変わる丸を表示する。state に何を持つか（色の名前？ 番号？）は自分で決め、そう決めた理由を1行でメモする
4. **温度変換フォーム** を作る。摂氏の入力欄に数字を打つと、華氏（`摂氏 × 9 / 5 + 32`）がリアルタイムで表示される。数字以外が入力されたら「数字を入力してください」と表示する（ヒント：`Number(...)` と `Number.isNaN(...)`）

### チャレンジ課題（挑戦）

5. `app/page.js` の先頭に `'use client'` を付けた場合と付けない場合で、ブラウザの開発者ツール（F12）の Network タブに読み込まれる JavaScript のサイズがどう変わるかを `npm run build` → `npm run start` の状態で比べる。結果から「`'use client'` は必要な部品だけに付ける」理由を説明する
6. 背景色を切り替える **テーマ切り替えボタン** を作る（ライト / ダーク）。ボタンは Client Component にし、表示するカードや文章は Server Component のまま残すにはどう分ければよいか考えて実装する（ヒント：コマ2の `children`）
