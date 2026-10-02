# コマ2｜JSXとコンポーネント・props

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | コマ1 オリエンテーション・環境構築（create-next-app で最初の一歩） |
| 次コマ | コマ3 stateとイベント・'use client' |

##  目標

- JSX の基本ルール（式の埋め込み、`className`、閉じタグ、親要素は1つ）を説明できる
- 画面の一部を **コンポーネント** として別ファイルに切り出し、`@/components/...` で読み込める
- **props** で値を渡して、同じ部品の中身を差し替えられる

##  導入

### 前回の振り返り

前回作ったプロジェクト `hello-next` を起動しておく。

```powershell
cd ~/workspace/hello-next
npm run dev
```

ブラウザで http://localhost:3000 を開く。`app/page.js` の default export がトップページとして表示されていることを思い出そう。

> 前回のプロジェクトがない人は、次で作り直せる。
>
> ```bash
> mkdir -Force ~/workspace; cd ~/workspace
> npx create-next-app@latest hello-next --js --eslint --app --no-tailwind --no-src-dir --no-react-compiler --import-alias "@/*" --use-npm --yes
> cd hello-next
> npm run dev
> ```

### 今日のゴール

次のような「プロフィールカード」を **1つの部品** として作り、中身だけ変えて3枚並べる。

```text
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ 太郎              │ │ 花子              │ │ 次郎              │
│ 役割：プログラマー │ │ 役割：デザイナー   │ │ 役割：エンジニア   │
│ 趣味：ゲーム       │ │ 趣味：イラスト     │ │ 趣味：自転車       │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### 考えてみよう

> 同じ形のカードを3枚書くとき、HTML を3回コピペするとどうなる？ 「趣味」の表記を「好きなこと」に変えたくなったら？

3か所直すことになり、直し漏れが起きる。React は **部品（コンポーネント）を1回作って、中身（props）だけ変えて何度も使う** のが基本の考え方。

##  本題

### 1. JSX の基本ルール

`app/page.js` を次のように書き換える。

```jsx
// app/page.js
export default function Home() {
  const userName = 'Taro'
  const score = 75

  return (
    <main style={{ padding: '24px' }}>
      <h1>Hello, {userName}!</h1>
      <p>名前は {userName.length} 文字です</p>
      <p>テストの結果：{score >= 60 ? '合格' : '不合格'}</p>
      <p className="note">1 + 2 = {1 + 2}</p>
      <hr />
      {/* JSX の中のコメントはこう書く */}
    </main>
  )
}
```

**覚えるルール：**

| ルール | 例 | 理由 |
|--------|-----|------|
| `{ }` の中に JS の **式** が書ける | `{userName}`、`{1 + 2}` | 変数や計算結果を画面に出すため |
| `if` 文は書けないので **三項演算子** を使う | `{条件 ? A : B}` | `{ }` の中は「値になるもの（式）」だけ |
| `class` ではなく **`className`** | `<p className="note">` | `class` は JS の予約語とぶつかる |
| タグは **必ず閉じる** | `<hr />`、`<br />` | JSX は XML に近いルールで読まれる |
| return するのは **親要素1つ** | 全体を `<main>` や `<>...</>` で囲む | 関数は値を1つしか返せない |
| `style` は **オブジェクト** で書く | `style={{ padding: '24px' }}` | 外側の `{}` が「JS を書くよ」、内側の `{}` がオブジェクト |

> **JSX とは**：JavaScript の中に HTML のような見た目で画面を書ける記法。見た目は HTML だが、中身は JavaScript の関数呼び出しに変換される。だから JS のルールに従う必要がある。

### 2. コンポーネントを別ファイルに切り出す

プロジェクト直下に `components` フォルダを作り、`Greeting.js` を作る。

```powershell
mkdir -Force components
```

```jsx
// components/Greeting.js
export default function Greeting() {
  return <p>こんにちは！</p>
}
```

`app/page.js` から読み込んで使う。

```jsx
// app/page.js
import Greeting from '@/components/Greeting'

export default function Home() {
  return (
    <main style={{ padding: '24px' }}>
      <h1>挨拶テスト</h1>
      <Greeting />
      <Greeting />
      <Greeting />
    </main>
  )
}
```

「こんにちは！」が3回表示されればOK。

- **`export default`**：このファイルから「これを外に出します」という宣言
- **`import Greeting from '...'`**：他のファイルが出したものを受け取る宣言
- **`@/`**：プロジェクト直下を表す近道（`create-next-app` の `--import-alias "@/*"` で設定済み）。どの深さのファイルからでも `@/components/Greeting` と同じ書き方で読み込める

> **なぜ大文字始まり？** `<greeting />` と小文字で書くと、React は「そういう名前の HTML タグ」だと解釈してしまう。自作コンポーネントは **必ず大文字で始める**。
>
> **なぜ `app/` の外に置く？** `app/` の中はフォルダ構成がそのまま URL になる特別な場所。部品は `components/` に分けておくと「ページ」と「部品」の区別がはっきりする。

### 3. props で値を渡す

呼び出し側から名前を渡せるようにする。

```jsx
// components/Greeting.js
export default function Greeting(props) {
  return <p>こんにちは、{props.name}さん！</p>
}
```

```jsx
// app/page.js
import Greeting from '@/components/Greeting'

export default function Home() {
  return (
    <main style={{ padding: '24px' }}>
      <h1>挨拶テスト</h1>
      <Greeting name="太郎" />
      <Greeting name="花子" />
      <Greeting name="次郎" />
    </main>
  )
}
```

> **props（プロップス）とは**：親コンポーネントから子コンポーネントへ渡す値。HTML の属性と同じ感覚で書く。受け取った側では `props.name` のように取り出す。**親 → 子の一方通行** で、子が props を書き換えることはできない。

#### 分割代入で受け取る（実務ではこちらが主流）

```jsx
// components/Greeting.js
export default function Greeting({ name, emoji = '👋' }) {
  return (
    <p>
      {emoji} こんにちは、{name}さん！
    </p>
  )
}
```

- `{ name }` は **分割代入**：`const name = props.name` を短く書いたもの
- `emoji = '👋'` は **デフォルト値**：呼び出し側が `emoji` を渡さなかったときに使われる

#### 文字列以外の値を渡す

```jsx
<Greeting name="太郎" emoji="🎉" />
<Profile age={20} isStudent={true} skills={['HTML', 'CSS']} />
```

文字列は `"..."`、**それ以外（数値・真偽値・配列・オブジェクト）は `{...}`** で渡す。`age="20"` と書くと文字列の `"20"` になるので注意。

### 4. children：タグで挟んだ中身を受け取る

「枠だけ用意して、中身は呼び出し側に任せたい」部品は `children` を使う。

```jsx
// components/Box.js
export default function Box({ title, children }) {
  return (
    <section style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', margin: '8px 0' }}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}
```

```jsx
// app/page.js
import Box from '@/components/Box'
import Greeting from '@/components/Greeting'

export default function Home() {
  return (
    <main style={{ padding: '24px' }}>
      <Box title="挨拶">
        <Greeting name="太郎" />
        <Greeting name="花子" emoji="🌸" />
      </Box>
      <Box title="お知らせ">
        <p>来週は休講です</p>
      </Box>
    </main>
  )
}
```

> **children とは**：`<Box>` と `</Box>` の間に書いたものが、自動で `children` という名前の props として渡される仕組み。コマ6で出てくる `layout.js` もこの仕組みでページを包んでいる。

### 5. このコンポーネントはどこで動いている？

`components/Greeting.js` に `console.log` を1行足してみる。

```jsx
// components/Greeting.js
export default function Greeting({ name, emoji = '👋' }) {
  console.log('Greeting を描画:', name)
  return (
    <p>
      {emoji} こんにちは、{name}さん！
    </p>
  )
}
```

ブラウザの開発者ツール（F12）の Console を見ても、**何も出ない**。代わりに **`npm run dev` を実行しているターミナル** にログが出る。

> **Server Component（サーバーコンポーネント）とは**：Next.js の App Router では、コンポーネントは **何も指定しなければサーバ側（Node.js）で HTML に変換されてからブラウザに送られる**。だからログはターミナルに出る。表示するだけの部品ならこれで十分で、ブラウザに送る JavaScript が少なく済む。
>
> ボタンのクリックなど「ブラウザで動く」ことが必要になったら、次回やる **`'use client'`** を付ける。

確認できたら `console.log` の行は消しておく。

##  演習

### 演習1（基本）：ProfileCard を作って3枚並べる

`components/ProfileCard.js` を作り、`name`・`role`・`hobby` を props で受け取って表示する。`app/page.js` で3人分並べる。

**確認方法**：3枚のカードに、それぞれ違う名前・役割・趣味が表示されればOK。

<details>
<summary>解答例</summary>

```jsx
// components/ProfileCard.js
export default function ProfileCard({ name, role, hobby }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', width: '200px' }}>
      <h3>{name}</h3>
      <p>役割：{role}</p>
      <p>趣味：{hobby}</p>
    </div>
  )
}
```

```jsx
// app/page.js
import ProfileCard from '@/components/ProfileCard'

export default function Home() {
  return (
    <main style={{ display: 'flex', gap: '16px', padding: '24px' }}>
      <ProfileCard name="太郎" role="プログラマー" hobby="ゲーム" />
      <ProfileCard name="花子" role="デザイナー" hobby="イラスト" />
      <ProfileCard name="次郎" role="エンジニア" hobby="自転車" />
    </main>
  )
}
```

</details>

### 演習2（基本）：CSS Modules で見た目を部品に閉じ込める

演習1の `style={{ ... }}` を、`components/ProfileCard.module.css` に移す。

**確認方法**：見た目が演習1と同じ（またはより良く）になっていて、`ProfileCard.js` から `style=` が消えていればOK。

<details>
<summary>解答例</summary>

```css
/* components/ProfileCard.module.css */
.card {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 16px;
  width: 200px;
}

.name {
  margin: 0 0 8px;
}
```

```jsx
// components/ProfileCard.js
import styles from './ProfileCard.module.css'

export default function ProfileCard({ name, role, hobby }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.name}>{name}</h3>
      <p>役割：{role}</p>
      <p>趣味：{hobby}</p>
    </div>
  )
}
```

部品と CSS を同じ場所に置いておくと、「この部品の見た目はどこ？」で迷わない。

</details>

### 演習3（応用）：props を増やして表示を切り替える

`ProfileCard` に次の props を追加する。

- `age`（数値）：「20歳」のように表示する
- `isLeader`（真偽値）：`true` のときだけ名前の横に「★リーダー」と表示する
- `color`（文字列、省略時は `'#ccc'`）：カードの枠線の色になる

```jsx
<ProfileCard name="太郎" role="プログラマー" hobby="ゲーム" age={20} isLeader={true} color="tomato" />
<ProfileCard name="花子" role="デザイナー" hobby="イラスト" age={19} />
```

**確認方法**：太郎のカードだけ「★リーダー」と赤い枠線が付き、花子のカードは灰色の枠線になっていればOK。

<details>
<summary>解答例</summary>

```jsx
// components/ProfileCard.js
import styles from './ProfileCard.module.css'

export default function ProfileCard({ name, role, hobby, age, isLeader = false, color = '#ccc' }) {
  return (
    <div className={styles.card} style={{ borderColor: color }}>
      <h3 className={styles.name}>
        {name}
        {isLeader ? ' ★リーダー' : ''}
      </h3>
      <p>{age}歳</p>
      <p>役割：{role}</p>
      <p>趣味：{hobby}</p>
    </div>
  )
}
```

`age={20}` と `age="20"` の違い（数値か文字列か）にも注意。今回は表示だけなので結果は同じに見えるが、`age + 1` のような計算をすると差が出る。

</details>

### 演習4（早く終わった人向け）：children で「セクション」部品を作る

`components/Section.js` を作り、`title` と `children` を受け取って、見出し付きの区切りを表示する。`app/page.js` を「メンバー紹介」「活動内容」の2セクション構成にする。

**確認方法**：「メンバー紹介」の見出しの下にカード3枚、「活動内容」の見出しの下に自由な文章が表示されればOK。

<details>
<summary>解答例</summary>

```jsx
// components/Section.js
export default function Section({ title, children }) {
  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ borderBottom: '2px solid #333' }}>{title}</h2>
      {children}
    </section>
  )
}
```

```jsx
// app/page.js
import ProfileCard from '@/components/ProfileCard'
import Section from '@/components/Section'

export default function Home() {
  return (
    <main style={{ padding: '24px' }}>
      <Section title="メンバー紹介">
        <div style={{ display: 'flex', gap: '16px' }}>
          <ProfileCard name="太郎" role="プログラマー" hobby="ゲーム" age={20} isLeader={true} color="tomato" />
          <ProfileCard name="花子" role="デザイナー" hobby="イラスト" age={19} />
          <ProfileCard name="次郎" role="エンジニア" hobby="自転車" age={21} />
        </div>
      </Section>
      <Section title="活動内容">
        <p>毎週水曜に集まって、Web アプリを作っています。</p>
      </Section>
    </main>
  )
}
```

</details>

##  まとめ

### 今日できるようになったこと

- JSX のルール（`{}` で式を埋め込む、`className`、閉じタグ、親要素は1つ）を使い分けられるようになった
- コンポーネントを `components/` に切り出し、props で中身を差し替えて再利用できるようになった
- 何も指定しないコンポーネントは **Server Component** としてサーバ側で動くことを確認した

### よくある詰まりポイント

- **`Module not found: Can't resolve '@/components/...'`**：ファイル名の大文字・小文字や拡張子の位置を確認する（`ProfileCard.js` と `profilecard.js` は別物）
- **props が `undefined` になる**：呼び出し側の名前（`<ProfileCard hobby=...>`）と受け取り側の名前（`{ hobby }`）が一致しているか確認する
- **数値を `"20"` で渡してしまう**：文字列以外は `{20}` のように `{}` で渡す

### 次コマ予告

次回は、ボタンを押すと数字が変わる「カウンター」を作る。画面が **変化する** には **state** が必要で、そのためには `'use client'` という1行が鍵になる。

##  課題

### 基礎課題（必須）

1. 演習1〜3を完成させてコミットする

```powershell
git add .
git commit -m "ProfileCard コンポーネントを作成"
```

2. 次の JSX の間違いを3つ見つけて直す

```jsx
export default function Bad() {
  return (
    <h1 class="title">タイトル</h1>
    <input type="text">
  )
}
```

### 応用課題（推奨）

3. `components/Badge.js` を作る。`label` と `type`（`'info'` / `'warning'` / `'error'`）を受け取り、`type` によって背景色が変わる小さなラベルを表示する。`type` を省略したら `'info'` 扱いにする。`ProfileCard` の中で使ってみる
4. 自分の「好きなもの紹介ページ」を、`Section` と自作の部品を組み合わせて作る。**部品の分け方は自分で考える**（どこを部品にしたか、その理由を1〜2行でメモする）

### チャレンジ課題（挑戦）

5. プロフィールの情報を1つのオブジェクトにまとめて渡す書き方を試す。`<ProfileCard user={{ name: '太郎', role: 'プログラマー', hobby: 'ゲーム' }} />` と `<ProfileCard {...taro} />`（スプレッド構文）の2通りで書き、それぞれ受け取り側をどう書けばよいかを比べる
6. `Greeting` に `console.log` を入れたとき、なぜブラウザではなくターミナルに出たのかを、Next.js 公式ドキュメントの「Server Components」のページを読んで自分の言葉で3行にまとめる
