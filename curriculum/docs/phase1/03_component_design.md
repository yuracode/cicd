# コマ3｜コンポーネント設計

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | コマ2 コンポーネント・props・state基礎 |
| 次コマ | コマ4 TODOアプリ実装①（追加・表示・削除） |

##  目標

- UIを見て「どこでコンポーネントを切ると良いか」を判断できる
- 親子関係のあるコンポーネントで props を設計できる
- **state の持ち上げ（Lifting State Up）** の考え方を説明できる

##  導入（15分）

### 前回の振り返り

`Counter` と `Greeting` を作った。これは **独立して使える小さな部品** の例。

### 今日のテーマ：「部品の切り分け方」

ReactはUIを部品に分けて組み立てるが、**「どこで切るか」** には設計の考え方がある。

### 問いかけ

> 「プロフィールカードを3枚並べるとしたら、何を部品にする？」

次の画面を想像してほしい：

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ [画像] 太郎      │  │ [画像] 花子      │  │ [画像] 次郎      │
│ プログラマー      │  │ デザイナー       │  │ エンジニア      │
│ [フォローボタン]  │  │ [フォローボタン]  │  │ [フォローボタン]  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

この画面で「コンポーネントにしたいもの」を隣の人と30秒で話し合う。

##  本題（65分）

### 1. 部品を切り分ける3つの観点（10分）

**観点1：繰り返し出るものは部品にする**
→ プロフィールカード1枚を `UserCard` という部品にする

**観点2：見た目・役割が独立しているものは切る**
→ カード内のアバター、ボタンは更に `Avatar`, `FollowButton` に切れる

**観点3：切りすぎも良くない**
→ テキスト1行ごとに部品化すると逆に読みにくい。**「バラしたくなったら切る」** で十分

### 2. UserCard を作る（20分）

```jsx
// src/UserCard.jsx
function UserCard({ name, role, imageUrl }) {
  return (
    <div className="user-card">
      <img src={imageUrl} alt={name} width="80" />
      <h3>{name}</h3>
      <p>{role}</p>
      <button>フォロー</button>
    </div>
  )
}

export default UserCard
```

```jsx
// src/App.jsx
import UserCard from './UserCard'

const users = [
  { id: 1, name: '太郎', role: 'プログラマー', imageUrl: 'https://placehold.jp/80x80.png?text=T' },
  { id: 2, name: '花子', role: 'デザイナー',   imageUrl: 'https://placehold.jp/80x80.png?text=H' },
  { id: 3, name: '次郎', role: 'エンジニア',   imageUrl: 'https://placehold.jp/80x80.png?text=J' },
]

function App() {
  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      {users.map((user) => (
        <UserCard
          key={user.id}
          name={user.name}
          role={user.role}
          imageUrl={user.imageUrl}
        />
      ))}
    </div>
  )
}

export default App
```

> **`map()` と `key`**：配列を `<要素>` の配列に変換して画面に並べるのがReactの定番パターン。`key` は「どの要素がどれか」を識別するための印。**配列を並べるときは必ず `key` を付ける**（idが理想）。

### 3. 更に部品を切る：Avatar と FollowButton（15分）

カード内で独立している部分を更に切り出す。

```jsx
// src/Avatar.jsx
function Avatar({ src, alt, size = 80 }) {
  return <img src={src} alt={alt} width={size} style={{ borderRadius: '50%' }} />
}

export default Avatar
```

> `size = 80` は **デフォルト値**。呼び出し側で `size` を渡さなければ80が使われる。

```jsx
// src/FollowButton.jsx
import { useState } from 'react'

function FollowButton() {
  const [isFollowing, setIsFollowing] = useState(false)

  return (
    <button onClick={() => setIsFollowing(!isFollowing)}>
      {isFollowing ? 'フォロー中' : 'フォロー'}
    </button>
  )
}

export default FollowButton
```

`UserCard` を書き直す：

```jsx
// src/UserCard.jsx
import Avatar from './Avatar'
import FollowButton from './FollowButton'

function UserCard({ name, role, imageUrl }) {
  return (
    <div className="user-card">
      <Avatar src={imageUrl} alt={name} />
      <h3>{name}</h3>
      <p>{role}</p>
      <FollowButton />
    </div>
  )
}

export default UserCard
```

動かしてフォローボタンを押してみる。カードごとに独立してトグルできる。

### 4. state の持ち上げ（Lifting State Up）（20分）

いま `FollowButton` の `isFollowing` は **ボタン自身** が持っている。

ここで新しい要件：

> 「画面上部に『フォロー中：2人』と合計を表示したい」

合計を出すには、**どのユーザーがフォロー中か** を親（`App` など）が知っている必要がある。子の中に閉じた状態のままでは不可能。

→ **state を親に持ち上げる**

```jsx
// src/App.jsx
import { useState } from 'react'
import UserCard from './UserCard'

const users = [
  { id: 1, name: '太郎', role: 'プログラマー', imageUrl: 'https://placehold.jp/80x80.png?text=T' },
  { id: 2, name: '花子', role: 'デザイナー',   imageUrl: 'https://placehold.jp/80x80.png?text=H' },
  { id: 3, name: '次郎', role: 'エンジニア',   imageUrl: 'https://placehold.jp/80x80.png?text=J' },
]

function App() {
  const [followingIds, setFollowingIds] = useState([])

  const toggleFollow = (id) => {
    setFollowingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div>
      <p>フォロー中：{followingIds.length}人</p>
      <div style={{ display: 'flex', gap: '16px' }}>
        {users.map((user) => (
          <UserCard
            key={user.id}
            name={user.name}
            role={user.role}
            imageUrl={user.imageUrl}
            isFollowing={followingIds.includes(user.id)}
            onToggleFollow={() => toggleFollow(user.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default App
```

```jsx
// src/UserCard.jsx
import Avatar from './Avatar'
import FollowButton from './FollowButton'

function UserCard({ name, role, imageUrl, isFollowing, onToggleFollow }) {
  return (
    <div className="user-card">
      <Avatar src={imageUrl} alt={name} />
      <h3>{name}</h3>
      <p>{role}</p>
      <FollowButton isFollowing={isFollowing} onClick={onToggleFollow} />
    </div>
  )
}

export default UserCard
```

```jsx
// src/FollowButton.jsx
function FollowButton({ isFollowing, onClick }) {
  return (
    <button onClick={onClick}>
      {isFollowing ? 'フォロー中' : 'フォロー'}
    </button>
  )
}

export default FollowButton
```

> **state の持ち上げのポイント**：
> - 複数の子コンポーネントで共有が必要な state は **共通の親に移す**
> - 親は「現在の値」を props で子に渡し、「変更してほしい関数」も props で渡す
> - 子は関数を呼ぶだけで、値の管理はしない

**メリット：** 「フォロー中の合計」も「フォロー中かどうか」も1箇所の state から導ける。**state は1箇所に集約する** が基本。

##  まとめ（10分）

### 今日できるようになったこと

- UIを見てコンポーネントの切り分け方針が立てられる
- props を使って親→子に値・関数を渡せる
- state を親に持ち上げて、複数の子で共有する設計ができる

### よくある詰まりポイント

- **`key` を忘れる**：警告が出るだけで動いてしまうが、必ず付ける
- **state を直接書き換える**：`followingIds.push(id)` ではなく `setFollowingIds([...prev, id])` のように新しい配列を作って渡す

### 次コマ予告

次回からはTODOアプリを2コマかけて作る。今日学んだ「state を親に持つ」「配列を map で表示」がフル活用される。

##  課題

### 基礎課題（必須）

1. `UserCard` に `isAdmin` という props を追加し、true の時だけ名前の横に「管理者」バッジを表示する
2. `App` のユーザー配列にもう1人追加して、4人表示になることを確認する

### 応用課題（推奨）

3. `UserCard` をクリックすると **その人が「選択中」になる** 機能を追加する。選択中のカードだけ枠線を青くする。**選択状態（`selectedId`）は親（`App`）で管理** すること（state 持ち上げの練習）
4. フォロー数に応じて **ランクバッジ** を出す：10人未満なら表示なし、10人以上は「Bronze」、50人以上は「Silver」、100人以上は「Gold」。判定ロジックを **小さなコンポーネント `<RankBadge count={...} />`** として切り出す

> **狙い：** 「どこまでを1つのコンポーネントにするか」の判断を自分で下す練習。切り出す/切り出さないの判断基準を言語化してみる。

### チャレンジ課題（挑戦）

5. **タブ切り替えUI** を作る：「全員」「管理者のみ」「フォロー中のみ」の3タブで表示を切り替える。タブ状態は親で管理し、フィルタロジックも親で完結させる。子（`UserCard`）は今まで通り表示に専念させる
6. `UserCard` の見た目を **3パターンのバリアント** （`variant="compact"` / `"default"` / `"detailed"`）で切り替えられるようにする。propsで受け取ったvariantに応じて表示項目や余白を変える。**どの情報を省略して／強調するか** を自分で考えるのが本質
