# コマ26｜個人制作②：実装

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 5 |
| 所要時間 | 90分 |
| 前提コマ | コマ25 個人制作①：企画・設計 |
| 次コマ | コマ27 個人制作③：テスト追加 |

##  目標

- 企画書の機能を **8割以上** 実装し、ブラウザで動く状態にできる
- 機能ごとにブランチを切って小さく PR できている
- コードはPhase 1〜2 で学んだ「state の持ち上げ」「純粋関数の切り出し」を守る

##  導入（15分）

### 今日のゴール

**「動くものを優先」**。まず全体が見える状態を作る。細かい見た目・バグは次回以降で磨く。

### 今日の進め方

1. 実装順を決める（MVP → 追加機能）
2. 機能ごとにブランチ → 実装 → push → PR → マージ を繰り返す
3. **1機能30分目安** で区切る

### MVP とは

**MVP（Minimum Viable Product）** ＝「使える最小限の形」。機能の90%を削っても本体が成立する最小単位から作る。

**ポモドーロの例：**

- MVP：**カウントダウンが動き、0で止まる**
- その上で：開始・停止・リセットボタン
- さらに：作業→休憩のモード切替
- 装飾：完了音、通知、スタイル

### 心構え

- **詰まったら別の機能に飛ぶ**：全体進捗を優先
- **動いたら小さくコミット**：1機能1コミットが理想
- **完璧を目指さない**：発表までに触れる状態が最優先

##  本題（65分）

以下は **ポモドーロタイマー** を例に進めるが、自分のアプリに読み替えること。

### 1. ルーティン：開発サーバ・テストwatch立ち上げ（5分）

```bash
cd ~/workspace/自分のアプリ名
git switch main
git pull origin main
npm run dev
```

別ターミナルで：

```bash
npm run test   # watchモード
```

> 実装中もテストが通るか常に見える状態にしておく。

### 2. MVP：カウントダウンが動く（15分）

ブランチ切る：

```bash
git switch -c feature/timer-mvp
```

まず純粋関数を書く：

```javascript
// src/timerUtils.js
export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const s = (totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
```

コンポーネント：

```jsx
// src/App.jsx
import { useState, useEffect } from 'react'
import { formatTime } from './timerUtils'

function App() {
  const [seconds, setSeconds] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning) return
    if (seconds <= 0) {
      setIsRunning(false)
      return
    }
    const id = setInterval(() => {
      setSeconds((s) => s - 1)
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, seconds])

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h1> Pomodoro</h1>
      <p style={{ fontSize: '64px', fontFamily: 'monospace' }}>
        {formatTime(seconds)}
      </p>
      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? '停止' : '開始'}
      </button>
    </div>
  )
}

export default App
```

ブラウザで `開始` を押す → 1秒ずつ減っていけばOK。

コミット：

```bash
git add .
git commit -m "feat: カウントダウンタイマーのMVP実装"
git push -u origin feature/timer-mvp
gh pr create --title "タイマーMVP" --body "25分カウントダウン"
# CI緑を待ってマージ
gh pr merge --squash --delete-branch
git switch main
git pull origin main
```

### 3. リセット機能（10分）

```bash
git switch -c feature/reset
```

```jsx
const handleReset = () => {
  setIsRunning(false)
  setSeconds(25 * 60)
}

// ボタン追加
<button onClick={handleReset}>リセット</button>
```

```bash
git add .
git commit -m "feat: リセットボタン追加"
git push -u origin feature/reset
gh pr create --title "リセット機能" --body "開始前の状態に戻す"
gh pr merge --squash --delete-branch
git switch main && git pull
```

### 4. モード切替：作業→休憩（15分）

純粋関数追加：

```javascript
// src/timerUtils.js に追加
export function nextMode(current) {
  return current === 'focus' ? 'break' : 'focus'
}

export function initialSecondsFor(mode) {
  return mode === 'focus' ? 25 * 60 : 5 * 60
}
```

App.jsx を更新：

```jsx
// src/App.jsx
import { useState, useEffect } from 'react'
import { formatTime, nextMode, initialSecondsFor } from './timerUtils'

function App() {
  const [mode, setMode] = useState('focus')
  const [seconds, setSeconds] = useState(initialSecondsFor('focus'))
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning) return
    if (seconds <= 0) {
      const newMode = nextMode(mode)
      setMode(newMode)
      setSeconds(initialSecondsFor(newMode))
      return
    }
    const id = setInterval(() => {
      setSeconds((s) => s - 1)
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, seconds, mode])

  const handleReset = () => {
    setIsRunning(false)
    setMode('focus')
    setSeconds(initialSecondsFor('focus'))
  }

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h1> Pomodoro</h1>
      <p>モード：{mode === 'focus' ? '集中' : '休憩'}</p>
      <p style={{ fontSize: '64px', fontFamily: 'monospace' }}>
        {formatTime(seconds)}
      </p>
      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? '停止' : '開始'}
      </button>
      <button onClick={handleReset}>リセット</button>
    </div>
  )
}

export default App
```

コミット＆PR＆マージ。

### 5. 完了サイクルのカウント（10分）

```jsx
const [cycleCount, setCycleCount] = useState(0)

// useEffect 内の切替時に追加
if (seconds <= 0) {
  const newMode = nextMode(mode)
  if (newMode === 'break') {
    setCycleCount((c) => c + 1)  // focus が終わったらカウント
  }
  setMode(newMode)
  setSeconds(initialSecondsFor(newMode))
  return
}

// 表示追加
<p>完了サイクル：{cycleCount}</p>
```

### 6. スタイルを整える（5分）

深追いしない。CSSファイル1つくらいに収める：

```css
/* src/App.css */
.app {
  max-width: 480px;
  margin: 40px auto;
  text-align: center;
  font-family: system-ui, sans-serif;
}

.time {
  font-size: 72px;
  font-weight: bold;
  color: #c94141;
  margin: 24px 0;
}

button {
  padding: 12px 24px;
  margin: 0 6px;
  border-radius: 6px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
}
```

`App.jsx` の最上部で `import './App.css'` を追加して、要素に `className` を当てる。

### 7. 学生ごとの進捗を講師がチェック（5分）

このタイミングで講師と1〜2分ずつ話す：

- 機能何割まで実装済みか
- 詰まりポイント
- 純粋関数として切り出せそうなロジックがあるか（次回のテスト作業に繋がる）

##  まとめ（10分）

### 今日できたこと

- MVPから機能を段階的に積み上げた
- 機能ごとに小さくPRしてマージ
- 純粋関数に切り出せるロジックを意識できた

### よくある詰まりポイント

- **機能を盛りすぎて1機能が終わらない**：30分で区切る
- **PRが巨大化**：1機能＝1PRの原則を守る
- **useEffect の依存配列忘れ／無限ループ**：Phase 1 の復習

### 次コマ予告

次回は **テスト追加**。今日書いた純粋関数と主要コンポーネントにテストを付けて、CIで緑になる状態を目指す。

##  課題

### 基礎課題（必須）

1. 宿題として機能を **あと1〜2個追加** する（音を鳴らす・通知・スキップボタンなど任意）
2. 発表で「推したい機能」を1つ決めて、その動作確認手順をメモしておく
3. 気に入ったUIが既存アプリにあれば参考にして真似する（学習段階では模倣もOK）

### 応用課題（推奨）

4. **自分のコードをセルフレビュー**：自分のPRのFiles changedタブを開き、**他人のコードだと思って** 3つ指摘を書き出す。例：
   - この関数は長すぎる → 分割したい
   - この変数名は意味が分かりにくい → リネームしたい
   - ここのロジックは App.jsx ではなく utils.js に出すべき

→ **時間を空けてから見る** とよりよい（コマ28の直前に見返すと自然に気になる）。

5. **次回のテストに備えて、純粋関数を2つ以上に切り出す**：`utils.js` や `helpers.js` に「入出力が決まるロジック」をまとめる。副作用（state更新、fetch）とは分離する

6. **コミットメッセージの質を見返す**：自分のコミット履歴（`git log --oneline`）を眺めて、**6ヶ月後の自分が読んで分かるか** を確認。分かりにくいものが2つ以上あれば、書き方の基準を見直す

> **狙い：** 「動いた」だけで終わらせない。**読める・説明できるコード** まで磨く。

### チャレンジ課題（挑戦）

7. **1機能を完全に独立したコンポーネント化** して、将来別アプリでも使い回せる形にする。例：
   - Pomodoro の「進捗バー」→ `<ProgressBar value={} max={} color={} />`
   - メモアプリの「日付ピッカー」→ `<DatePicker value={} onChange={} />`

propsで振る舞いをカスタマイズできるように設計する。「1箇所でしか使わない」と思っても独立させておくと、**テストしやすい＆将来に効く**。

8. **自分で「このアプリを壊してみる」** 操作テストを5パターン以上考えて実行：
   - 超高速連打
   - 入力最大文字数
   - 画面リロードの連打
   - 別タブを開いて同時操作

→ エッジケースを見つけて、次回のテストで守る候補を作る
