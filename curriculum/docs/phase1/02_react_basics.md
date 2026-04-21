# コマ2｜コンポーネント・props・state基礎

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | コマ1 オリエンテーション・環境構築 |
| 次コマ | コマ3 コンポーネント設計 |

##  目標

- JSXの基本ルール（大文字始まり、`className`、式埋め込み）を説明できる
- 関数コンポーネントを定義し、**props** で値を受け渡せる
- **useState** を使ってクリックで数値が変わるカウンターを作れる

##  導入（15分）

### 前回の振り返り

前回作ったプロジェクト `hello-react` を起動する。

```bash
cd ~/workspace/hello-react
npm run dev
```

### 今日のゴール：「挨拶コンポーネント」と「カウンター」

授業終了時には、

- `<Greeting name="太郎" />` のように名前を渡すと挨拶が表示されるコンポーネント
- ボタンを押すと数字が増える / 減るカウンター

が自分の手で書けるようになる。

### 問いかけ

> 「同じような見た目が3回出てくるとき、どう書くと楽？」

HTMLを3回コピペすると修正が大変。Reactは **部品（コンポーネント）** に分けて再利用するのが基本思想。

##  本題（65分）

### 1. JSXの基本ルール（10分）

`src/App.jsx` を開いて書き直す。

```jsx
function App() {
  const userName = 'Taro'
  const now = new Date()

  return (
    <div>
      <h1>Hello, {userName}!</h1>
      <p>今は {now.toLocaleTimeString()} です</p>
      <p className="note">class ではなく className を使う</p>
    </div>
  )
}

export default App
```

**覚えること：**

- **`{ }`** の中にはJavaScriptの式が書ける（変数、関数呼び出しなど）
- HTMLの `class=` は **`className=`** に変わる（JSの `class` 予約語とぶつかるため）
- **タグは必ず閉じる**：`<img />` のように末尾にスラッシュが必要
- 複数要素を返すときは `<div>` などで囲む（または空タグ `<>...</>`）

### 2. コンポーネントを分ける（15分）

`src/` に新規ファイル `Greeting.jsx` を作成する。

```jsx
// src/Greeting.jsx
function Greeting() {
  return <p>こんにちは！</p>
}

export default Greeting
```

`App.jsx` から呼び出す。

```jsx
// src/App.jsx
import Greeting from './Greeting'

function App() {
  return (
    <div>
      <h1>挨拶テスト</h1>
      <Greeting />
      <Greeting />
      <Greeting />
    </div>
  )
}

export default App
```

ブラウザで「こんにちは！」が3回出ればOK。

> **なぜ大文字始まり？** JSXは `<greeting />` と書くとただのHTMLタグ扱いになってしまう。自作コンポーネントは **必ず大文字で始める** ルール。

### 3. props で値を渡す（15分）

同じ「こんにちは」だけでは面白くないので、呼び出し側から名前を渡せるようにする。

```jsx
// src/Greeting.jsx
function Greeting(props) {
  return <p>こんにちは、{props.name}さん！</p>
}

export default Greeting
```

```jsx
// src/App.jsx
import Greeting from './Greeting'

function App() {
  return (
    <div>
      <h1>挨拶テスト</h1>
      <Greeting name="太郎" />
      <Greeting name="花子" />
      <Greeting name="次郎" />
    </div>
  )
}

export default App
```

> **props（プロップス）とは**：親コンポーネントから子コンポーネントに渡す値。HTMLの属性のような感覚で書く。親から子の一方通行で、子から親の書き換えはできない。

**分割代入で書くとスッキリ：**

```jsx
function Greeting({ name }) {
  return <p>こんにちは、{name}さん！</p>
}
```

実務ではこっちの書き方が多い。

### 4. useState でカウンター（20分）

`src/Counter.jsx` を新規作成。

```jsx
// src/Counter.jsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>現在のカウント：{count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(count - 1)}>-1</button>
      <button onClick={() => setCount(0)}>リセット</button>
    </div>
  )
}

export default Counter
```

```jsx
// src/App.jsx
import Greeting from './Greeting'
import Counter from './Counter'

function App() {
  return (
    <div>
      <Greeting name="太郎" />
      <Counter />
    </div>
  )
}

export default App
```

動かしてボタンを押してみる。数字が変わればOK。

> **useState（ユーステート）とは**：コンポーネントに「状態」を持たせる仕組み。`const [値, 値を更新する関数] = useState(初期値)` の形で使う。
>
> **重要ルール：state は必ず更新関数経由で変える**。`count = count + 1` のように直接代入しても画面は再描画されない。必ず `setCount(...)` を呼ぶこと。

### 5. ちょっと応用：2つのカウンターは独立する（5分）

```jsx
function App() {
  return (
    <div>
      <Counter />
      <Counter />
    </div>
  )
}
```

2つ並べると、それぞれが別々に数字を持つ。これが **「コンポーネントは state を内側に閉じ込める」** という考え方。

##  まとめ（10分）

### 今日できるようになったこと

- 関数コンポーネントを作り、props で値を受け渡せるようになった
- useState で状態を持ち、イベントで更新できるようになった

### よくある詰まりポイント

- **`setCount` を呼び忘れて画面が更新されない**：state は直接書き換え不可
- **`onClick={handleClick()}`** と書いてしまう（即時実行される）：正しくは **`onClick={handleClick}`** または **`onClick={() => handleClick()}`**
- **コンポーネント名が小文字**：必ず大文字始まりにする

### 次コマ予告

次回は「どう部品に分けるか」のコンポーネント設計の考え方を学ぶ。プロフィールカードを題材に、親子関係・propsの設計を練習する。

##  課題

### 基礎課題（必須）

1. `Counter` を改造して、**1回のクリックで +10 される** ボタンを追加する
2. `Counter` に props で `initialCount`（初期値）を渡せるようにする

```jsx
<Counter initialCount={100} />
```

### 応用課題（推奨）

3. `Counter` に **「リセット」ボタン** を追加して、初期値（`initialCount`）に戻せるようにする
4. `Counter` に props で `min` と `max` を渡せるようにし、**範囲外の操作は無効化** する。例えば `min=0` なら0以下にはならない。UIも工夫して、限界に達したらボタンをグレーアウト（`disabled` 属性）にする

```jsx
<Counter initialCount={5} min={0} max={10} />
```

> **狙い：** 「propsで振る舞いをカスタマイズ可能なコンポーネント」を自分で設計する経験。ボタンの見た目も自分で工夫して決める。

### チャレンジ課題（挑戦）

5. カウンターの数字が **10の倍数** になった瞬間、背景色を変える仕掛けを作る（10未満はグレー、10〜19はピンク、20〜29は水色、…）。**条件の判定ロジックは自分で設計** する（ヒント：`count % 10` と `Math.floor(count / 10)`）
6. **複数のカウンターを一覧で管理** する親コンポーネントを作る。追加ボタンで新しいカウンターが増え、各カウンターは独立してカウントできる。ヒント：state に配列を持ち、`map` で描画する（次コマで深掘りする内容の先取り）
