# コマ4｜リストと条件付き表示

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | コマ3 stateとイベント・'use client' |
| 次コマ | コマ5 TODOアプリ実装①（追加・完了・削除） |

##  目標

- 配列を `map` で画面に並べ、`key` を正しく付けられる
- `&&`・三項演算子・早期 return で、条件によって表示を切り替えられる
- 配列の state を **新しい配列を作って** 更新できる（追加・削除・変更）

##  導入

### 前回の振り返り

```powershell
cd ~/workspace/hello-next
npm run dev
```

前回は `useState` で数値や文字列を state にした。実際のアプリで扱うデータは **一覧（配列）** がほとんど。TODO、商品、投稿、メッセージ…どれも配列。

> 前回のプロジェクトがない人は、次で作り直せる。
>
> ```bash
> mkdir -p ~/workspace && cd ~/workspace
> npx create-next-app@latest hello-next --js --eslint --app --no-tailwind --no-src-dir --no-react-compiler --import-alias "@/*" --use-npm --yes
> cd hello-next && mkdir -p components
> npm run dev
> ```

### 今日作るもの

学食のメニュー表。

```text
学食メニュー   [すべて] [ごはん] [麺] [デザート]
─────────────────────────────────────────
カレーライス      450円  [注文に追加]
ラーメン          500円  [注文に追加]
ソフトクリーム    200円  売り切れ
─────────────────────────────────────────
注文：カレーライス × 1  [取り消し]
合計：450円
```

- **表示**：配列を並べる、売り切れなら表示を変える
- **絞り込み**：カテゴリのボタンで表示を切り替える
- **注文**：配列の state に追加・削除する

##  本題

### 1. 配列を map で並べる

まずは Server Component のまま、表示だけ作る。

```jsx
// app/page.js
const fruits = ['りんご', 'バナナ', 'みかん']

export default function Home() {
  return (
    <main style={{ padding: '24px' }}>
      <h1>果物</h1>
      <ul>
        {fruits.map((fruit) => (
          <li key={fruit}>{fruit}</li>
        ))}
      </ul>
    </main>
  )
}
```

> **`map` のおさらい**：配列の要素1つずつに関数を適用して、**新しい配列** を作るメソッド。`[1, 2, 3].map((n) => n * 2)` は `[2, 4, 6]` になる。JSX では「データの配列」を「`<li>` の配列」に変換するのに使う。

#### key を付ける理由

`key` を消すと、ターミナルとブラウザのコンソールに警告が出る。

```text
Each child in a list should have a unique "key" prop.
```

React は、並び替えや削除が起きたときに「どの `<li>` がどのデータか」を `key` で見分ける。`key` には **その要素を一意に表す値**（ID など）を使う。

| key に使う値 | 評価 |
|-------------|------|
| データの `id` | ◎ 一番よい |
| 重複しない文字列（名前など） | ○ 重複しないと保証できるなら |
| 配列の番号（`index`） | △ 追加・削除・並び替えがあるとずれる |

### 2. オブジェクトの配列を部品で並べる

メニューのデータを `data/menu.js` に分けて置く。

```powershell
mkdir -Force data
```

```jsx
// data/menu.js
export const menu = [
  { id: 1, name: 'カレーライス', price: 450, category: 'rice', soldOut: false },
  { id: 2, name: '親子丼', price: 480, category: 'rice', soldOut: false },
  { id: 3, name: 'ラーメン', price: 500, category: 'noodle', soldOut: false },
  { id: 4, name: 'きつねうどん', price: 380, category: 'noodle', soldOut: true },
  { id: 5, name: 'ソフトクリーム', price: 200, category: 'dessert', soldOut: true },
  { id: 6, name: 'プリン', price: 150, category: 'dessert', soldOut: false },
]
```

1品を表示する部品を作る。

```jsx
// components/MenuItem.js
export default function MenuItem({ item }) {
  return (
    <li style={{ padding: '4px 0' }}>
      {item.name} {item.price}円
      {item.soldOut && <span style={{ color: 'gray', marginLeft: '8px' }}>売り切れ</span>}
    </li>
  )
}
```

```jsx
// app/page.js
import MenuItem from '@/components/MenuItem'
import { menu } from '@/data/menu'

export default function Home() {
  return (
    <main style={{ padding: '24px' }}>
      <h1>学食メニュー</h1>
      <ul>
        {menu.map((item) => (
          <MenuItem key={item.id} item={item} />
        ))}
      </ul>
    </main>
  )
}
```

`key` は **map の中で一番外側に書く要素**（ここでは `<MenuItem>`）に付ける。`MenuItem` の中の `<li>` に付けても意味がない。

> **名前付き export**：`export const menu = ...` のように `default` を付けずに export したものは、`import { menu } from ...` と **`{ }` で名前を指定して** 読み込む。1ファイルから複数のものを出したいときに使う。

### 3. 条件付き表示の3つの書き方

| 書き方 | 使いどころ | 例 |
|--------|-----------|-----|
| `条件 && <要素>` | 条件を満たすときだけ出す | `{item.soldOut && <span>売り切れ</span>}` |
| `条件 ? <A> : <B>` | どちらか一方を出す | `{item.soldOut ? <span>売り切れ</span> : <button>注文</button>}` |
| 早期 return | 条件によって部品全体を切り替える | `if (items.length === 0) return <p>ありません</p>` |

`&&` には1つ落とし穴がある。

```jsx
const count = 0
return <p>{count && '件あります'}</p>   // 画面に「0」と表示されてしまう
```

`0 && ...` は `0` を返し、React は数値の `0` をそのまま表示する。数値で判定するときは `count > 0 && ...` のように **必ず true / false になる式** にする。

### 4. カテゴリで絞り込む（Client Component）

ボタンで表示を切り替えるには state が要るので、メニュー表を Client Component にする。

```jsx
// components/MenuBoard.js
'use client'

import { useState } from 'react'
import MenuItem from './MenuItem'

const categories = [
  { value: 'all', label: 'すべて' },
  { value: 'rice', label: 'ごはん' },
  { value: 'noodle', label: '麺' },
  { value: 'dessert', label: 'デザート' },
]

export default function MenuBoard({ items }) {
  const [category, setCategory] = useState('all')

  const visibleItems = category === 'all' ? items : items.filter((item) => item.category === category)

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            style={{ fontWeight: category === c.value ? 'bold' : 'normal' }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {visibleItems.length === 0 ? (
        <p>該当するメニューはありません</p>
      ) : (
        <ul>
          {visibleItems.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}
```

```jsx
// app/page.js
import MenuBoard from '@/components/MenuBoard'
import { menu } from '@/data/menu'

export default function Home() {
  return (
    <main style={{ padding: '24px' }}>
      <h1>学食メニュー</h1>
      <MenuBoard items={menu} />
    </main>
  )
}
```

ポイントは2つ。

- **state に持つのは「選ばれたカテゴリ」だけ**。絞り込んだ結果 `visibleItems` は、`items` と `category` から毎回 **計算** する。絞り込み結果まで state にすると、2つの state を同時に正しく更新する必要が出てきてバグの元になる
- **`filter`** は条件に合う要素だけを集めた **新しい配列** を返す。元の `items` は変わらない

> `MenuItem.js` には `'use client'` が付いていないが、Client Component（`MenuBoard`）から import された部品は **自動的に Client Component として扱われる**。`'use client'` は「ここから先はブラウザ側」という境界線に1つ書けばよい。

### 5. 配列の state を更新する：追加と削除

注文リストを作る。`MenuBoard` に注文の state を追加する。

```jsx
// components/MenuBoard.js（変更部分のみ抜粋）
export default function MenuBoard({ items }) {
  const [category, setCategory] = useState('all')
  const [orders, setOrders] = useState([])

  function addOrder(item) {
    const newOrder = { orderId: Date.now(), name: item.name, price: item.price }
    setOrders([...orders, newOrder])
  }

  function removeOrder(orderId) {
    setOrders(orders.filter((order) => order.orderId !== orderId))
  }

  const visibleItems = category === 'all' ? items : items.filter((item) => item.category === category)

  return (
    <div>
      {/* カテゴリボタンは同じ */}
      <ul>
        {visibleItems.map((item) => (
          <MenuItem key={item.id} item={item} onAdd={addOrder} />
        ))}
      </ul>

      <h2>注文</h2>
      {orders.length === 0 && <p>まだ注文はありません</p>}
      <ul>
        {orders.map((order) => (
          <li key={order.orderId}>
            {order.name} {order.price}円
            <button onClick={() => removeOrder(order.orderId)}>取り消し</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

`MenuItem` に「注文に追加」ボタンを付ける。売り切れのときはボタンの代わりに「売り切れ」を出す。

```jsx
// components/MenuItem.js
export default function MenuItem({ item, onAdd }) {
  return (
    <li style={{ padding: '4px 0' }}>
      {item.name} {item.price}円
      {item.soldOut ? (
        <span style={{ color: 'gray', marginLeft: '8px' }}>売り切れ</span>
      ) : (
        <button onClick={() => onAdd(item)} style={{ marginLeft: '8px' }}>
          注文に追加
        </button>
      )}
    </li>
  )
}
```

> **関数を props で渡す**：`onAdd={addOrder}` で「注文を追加する関数」を子に渡している。子は `onAdd(item)` と呼ぶだけで、実際に state を変えるのは親。**state を持つ親が「変え方」も管理し、子には呼び出し口だけ渡す** のが React の基本パターン。

#### なぜ push ではダメなのか

```jsx
orders.push(newOrder)   // ✕ 元の配列を直接書き換える
setOrders(orders)       //    同じ配列を渡しても React は「変わっていない」と判断する

setOrders([...orders, newOrder])   // ○ 新しい配列を作って渡す
```

React は「前の state と新しい state が **同じもの（同じ配列）** か」で変更を判断する。中身を書き換えても配列そのものが同じなら、画面は更新されない。**配列やオブジェクトの state は、書き換えずに新しく作る**（**イミュータブル** な更新）。

| やりたいこと | 書き方 |
|-------------|--------|
| 末尾に追加 | `[...arr, newItem]` |
| 削除 | `arr.filter((x) => x.id !== id)` |
| 1件だけ変更 | `arr.map((x) => (x.id === id ? { ...x, done: true } : x))` |

> **スプレッド構文 `...` のおさらい**：`[...arr]` は配列の中身を展開して新しい配列にコピーする。`{ ...obj, done: true }` はオブジェクトをコピーして `done` だけ上書きする。

##  演習

### 演習1（基本）：合計金額と件数を表示する

注文リストの下に「合計：○○円（○品）」を表示する。注文が0件なら合計の行は表示しない。

**確認方法**：カレーライスとプリンを注文すると「合計：600円（2品）」、全部取り消すと合計の行が消えればOK。

<details>
<summary>解答例</summary>

```jsx
// components/MenuBoard.js（return の前に追加）
const total = orders.reduce((sum, order) => sum + order.price, 0)
```

```jsx
// components/MenuBoard.js（注文リストの <ul> の下に追加）
{orders.length > 0 && (
  <p>
    合計：{total}円（{orders.length}品）
  </p>
)}
```

`reduce` は配列を1つの値にまとめるメソッド。`sum` に前回までの合計、`order` に今の要素が入り、最後の `0` が初期値。合計金額も **state にせず計算で出す**。

</details>

### 演習2（基本）：おすすめ表示と価格表示の切り替え

`MenuItem` を次のように変える。

- 価格が 450 円以上のメニューには名前の前に「★」を付ける
- 売り切れのメニューは名前を灰色にし、打ち消し線（`textDecoration: 'line-through'`）を引く

**確認方法**：カレーライス・親子丼・ラーメンに★が付き、きつねうどんとソフトクリームが灰色の打ち消し線になればOK。

<details>
<summary>解答例</summary>

```jsx
// components/MenuItem.js
export default function MenuItem({ item, onAdd }) {
  const nameStyle = item.soldOut ? { color: 'gray', textDecoration: 'line-through' } : {}

  return (
    <li style={{ padding: '4px 0' }}>
      <span style={nameStyle}>
        {item.price >= 450 && '★'}
        {item.name}
      </span>{' '}
      {item.price}円
      {item.soldOut ? (
        <span style={{ color: 'gray', marginLeft: '8px' }}>売り切れ</span>
      ) : (
        <button onClick={() => onAdd(item)} style={{ marginLeft: '8px' }}>
          注文に追加
        </button>
      )}
    </li>
  )
}
```

`{' '}` は JSX で半角スペースを明示的に入れる書き方。

</details>

### 演習3（応用）：同じメニューは数量でまとめる

同じメニューを2回注文したとき、2行にならず「カレーライス × 2」とまとめて表示されるようにする。「−」ボタンで数量を1減らし、0になったら注文から消す。

**確認方法**：カレーライスを3回押すと「カレーライス × 3」の1行になり、「−」を3回押すと行が消え、合計金額も正しく変わればOK。

<details>
<summary>ヒントと解答例</summary>

注文の state を `{ id, name, price, quantity }` の形にし、**すでにあるか** で処理を分ける。

```jsx
function addOrder(item) {
  const exists = orders.some((order) => order.id === item.id)
  if (exists) {
    setOrders(orders.map((order) => (order.id === item.id ? { ...order, quantity: order.quantity + 1 } : order)))
  } else {
    setOrders([...orders, { id: item.id, name: item.name, price: item.price, quantity: 1 }])
  }
}

function decreaseOrder(id) {
  setOrders(
    orders
      .map((order) => (order.id === id ? { ...order, quantity: order.quantity - 1 } : order))
      .filter((order) => order.quantity > 0),
  )
}

const total = orders.reduce((sum, order) => sum + order.price * order.quantity, 0)
```

```jsx
{orders.map((order) => (
  <li key={order.id}>
    {order.name} × {order.quantity}
    <button onClick={() => decreaseOrder(order.id)}>−</button>
  </li>
))}
```

`map` で1件だけ変えて、`filter` で0件のものを消す。**変更も削除も「新しい配列を作る」** で統一できている。

</details>

### 演習4（早く終わった人向け）：並び替えボタン

「安い順」「高い順」「登録順」の並び替えボタンを追加する。カテゴリの絞り込みと組み合わせても正しく動くようにする。

**確認方法**：「麺」を選んで「高い順」にすると、ラーメン → きつねうどんの順に並べばOK。

<details>
<summary>ヒント</summary>

- state に `sortOrder`（`'default'` / `'asc'` / `'desc'`）を持つ
- `visibleItems` を作ったあと、`toSorted` で並び替えた **新しい配列** を作る

```jsx
const sortedItems =
  sortOrder === 'asc'
    ? visibleItems.toSorted((a, b) => a.price - b.price)
    : sortOrder === 'desc'
      ? visibleItems.toSorted((a, b) => b.price - a.price)
      : visibleItems
```

`sort` は元の配列を書き換えてしまうので、props で受け取った配列には使わない。`toSorted` は並び替えた **コピー** を返す。

</details>

##  まとめ

### 今日できるようになったこと

- `map` と `key` で配列を画面に並べられるようになった
- `&&`・三項演算子・早期 return で表示を切り替えられるようになった
- 配列の state を `[...arr, x]`・`filter`・`map` で **新しく作って** 更新できるようになった

### よくある詰まりポイント

- **`Each child in a list should have a unique "key" prop`**：map の一番外側の要素に `key` を付ける。値が重複していないかも確認する
- **画面に `0` が出る**：`{count && ...}` と書いている。`{count > 0 && ...}` にする
- **追加したのに画面が変わらない**：`push` / `splice` / `sort` で元の配列を書き換えている。新しい配列を作って set する

### 次コマ予告

次回から新しいプロジェクト `todo-app` を作り、今日の「配列の state」を使って TODO アプリを組み立てる。このアプリを Phase 2 以降でテストし、自動デプロイまで育てていく。

##  課題

### 基礎課題（必須）

1. 演習1・2を完成させてコミットする

```powershell
git add .
git commit -m "学食メニューでリストと条件表示を練習"
```

2. 次の配列操作が、それぞれ「元の配列を書き換える」か「新しい配列を返す」かを調べて表にする：`push` / `pop` / `splice` / `sort` / `reverse` / `map` / `filter` / `concat` / `slice` / `toSorted` / `toReversed`

### 応用課題（推奨）

3. メニューに **検索欄** を付ける。入力した文字を名前に含むメニューだけを表示する（ヒント：`item.name.includes(keyword)`）。カテゴリの絞り込みと同時に効くようにする
4. `data/menu.js` に `allergens: ['卵', '乳']` のようなアレルギー情報を追加し、「卵を含まないものだけ表示」のチェックボックスを作る。**どの state を持ち、何を計算で出すか** を先にメモしてから実装する

### チャレンジ課題（挑戦）

5. 演習4の並び替えで、`toSorted` の代わりに `sort` を使うとどんな問題が起きるか実験する。props で受け取った配列を `sort` した場合に、カテゴリを切り替えたときの表示がどう変わるかを観察して説明する
6. 注文の state を配列ではなく `{ 1: 2, 3: 1 }`（キーがメニューの id、値が数量）というオブジェクトで持つ設計に変えてみる。演習3の配列版と比べて、追加・削除・合計の計算がどう変わるか、どちらが書きやすいかを考察する
