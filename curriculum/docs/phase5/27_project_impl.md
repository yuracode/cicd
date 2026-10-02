# コマ27｜個人制作②：実装

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 5 |
| 所要時間 | 90分 |
| 前提コマ | コマ26 個人制作①：企画・設計と土台づくり |
| 次コマ | コマ28 個人制作③：テストとCI/CDの仕上げ |

##  目標

- Issue を1つずつ「ブランチ → 実装 → テスト → PR → CI → マージ → 自動公開」の流れで片付けられる
- ロジックはテストを先に書き、画面は動く状態を保ちながら少しずつ作れる
- `useEffect` の後片付け（クリーンアップ）など、タイマーや外部とのやり取りを正しく書ける

##  導入

### 前回の振り返り

前回、企画書と MVP の Issue を作り、空のアプリを CI/CD で公開した。今日はその Issue を片付けて、**MVP を完成させる**。

### 今日の進め方

**1 Issue = 1 ブランチ = 1 PR** のリズムで進める。

```text
Issue を選ぶ
  → ブランチを切る
  → （ロジックなら）テストを書く → 実装 → テストが通る
  → （画面なら）少し作る → ブラウザで確かめる → また少し作る
  → lint / test / build を手元で確かめる
  → PR → CI 緑 → マージ → 公開 URL で確かめる
  → Issue が閉じる
```

このコマでは、例としてポモドーロタイマーの実装を順に示す。**自分のアプリに置き換えながら** 進めること。

### MVP を最優先にする

- 見た目は最後。**まず動く** ことを優先する
- 詰まったら、15分考えて進まなければ **先生や周りに聞く**、または **その機能を後回しにする**
- 「追加機能」には、MVP が全部マージされるまで手を付けない

##  本題

### 1. 作業の準備：ターミナルを2つ開く

```powershell
# ターミナル1：開発サーバ
cd ~/workspace/pomodoro
git switch main
git pull
npm run dev
```

```powershell
# ターミナル2：テストのウォッチモード
cd ~/workspace/pomodoro
npm run test:watch
```

VS Code の画面、ブラウザ、2つのターミナルが見える状態で作業する。保存するたびに **画面とテストの両方** がすぐに更新される。

### 2. Issue 1：ロジックをテストから作る

```powershell
git switch -c feature/pomodoro-logic
```

タイマーの「1秒たったら次はどうなるか」を、**画面と切り離した純粋関数** にする。状態は `{ mode, remaining, completed }` の1つのオブジェクトで表す。

テストを先に書く（テストはウォッチモードで赤くなる）。

```js
// lib/pomodoro.test.js（import を書き換えて、下を追加）
import { DURATIONS, formatTime, nextMode, tick } from './pomodoro'

test('nextMode は作業と休憩を交互にする', () => {
  expect(nextMode('work')).toBe('break')
  expect(nextMode('break')).toBe('work')
})

describe('tick', () => {
  test('1秒減る', () => {
    expect(tick({ mode: 'work', remaining: 100, completed: 0 })).toEqual({ mode: 'work', remaining: 99, completed: 0 })
  })

  test('作業の最後の1秒で休憩に切り替わり、完了回数が増える', () => {
    expect(tick({ mode: 'work', remaining: 1, completed: 2 })).toEqual({ mode: 'break', remaining: 300, completed: 3 })
  })

  test('休憩の最後の1秒で作業に戻り、完了回数は変わらない', () => {
    expect(tick({ mode: 'break', remaining: 1, completed: 3 })).toEqual({ mode: 'work', remaining: 1500, completed: 3 })
  })

  test('元のオブジェクトは書き換えない', () => {
    const timer = { mode: 'work', remaining: 100, completed: 0 }
    tick(timer)
    expect(timer.remaining).toBe(100)
  })
})
```

実装してテストを緑にする。

```js
// lib/pomodoro.js（formatTime の上下に追加）
export const DURATIONS = {
  work: 25 * 60,
  break: 5 * 60,
}

export const INITIAL_TIMER = {
  mode: 'work',
  remaining: DURATIONS.work,
  completed: 0,
}

export function nextMode(mode) {
  return mode === 'work' ? 'break' : 'work'
}

export function tick(timer) {
  if (timer.remaining > 1) {
    return { ...timer, remaining: timer.remaining - 1 }
  }
  const next = nextMode(timer.mode)
  return {
    mode: next,
    remaining: DURATIONS[next],
    completed: timer.mode === 'work' ? timer.completed + 1 : timer.completed,
  }
}
```

> **なぜ `remaining > 1` なの？** 残り1秒のときに `tick` すると、0:00 を表示せずにそのまま次のモードの最初（5:00 など）に切り替える。0:00 を一瞬見せたいかどうかは **仕様の決め事**。決めたことはテストに書いておくと、あとで迷わない。

```powershell
npm run lint; npm test; npm run build   # 3つとも成功（赤いエラーが出ない）のを確かめてから次へ
git add .
git commit -m "feat: タイマーの状態を進める tick を追加"
git push -u origin feature/pomodoro-logic
gh pr create --title "タイマーのロジック" --body "Closes #1"
gh pr checks --watch
gh pr merge --merge --delete-branch
git switch main
git pull
```

### 3. Issue 2：表示して、カウントダウンを動かす

```powershell
git switch -c feature/countdown
```

まず **表示だけ**。

```jsx
// components/Timer.js
'use client'

import { useState } from 'react'
import { INITIAL_TIMER, formatTime } from '@/lib/pomodoro'

export default function Timer() {
  const [timer, setTimer] = useState(INITIAL_TIMER)

  return (
    <div>
      <p aria-label="残り時間">{formatTime(timer.remaining)}</p>
    </div>
  )
}
```

```jsx
// app/page.js
import Timer from '@/components/Timer'

export default function Home() {
  return (
    <main className="container">
      <h1>ポモドーロタイマー</h1>
      <Timer />
    </main>
  )
}
```

`25:00` と表示されたら、次に **1秒ごとに `tick` を呼ぶ** 仕組みを足す。

```jsx
// components/Timer.js
'use client'

import { useEffect, useState } from 'react'
import { INITIAL_TIMER, formatTime, tick } from '@/lib/pomodoro'

export default function Timer() {
  const [timer, setTimer] = useState(INITIAL_TIMER)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning) return

    const id = setInterval(() => {
      setTimer((prev) => tick(prev))
    }, 1000)

    return () => clearInterval(id)
  }, [isRunning])

  return (
    <div>
      <p aria-label="残り時間">{formatTime(timer.remaining)}</p>
      <button onClick={() => setIsRunning((prev) => !prev)}>{isRunning ? '一時停止' : 'スタート'}</button>
    </div>
  )
}
```

| 部分 | 意味 |
|------|------|
| `setInterval(関数, 1000)` | 1000ミリ秒（1秒）ごとに関数を実行し続ける。戻り値は止めるための ID |
| `return () => clearInterval(id)` | **クリーンアップ関数**。この effect が終わるとき（`isRunning` が変わったとき・部品が消えるとき）に呼ばれ、タイマーを止める |
| `setTimer((prev) => tick(prev))` | 前の状態から次の状態を計算するので、関数を渡す形（コマ3）。**どう変わるかは全部 `tick` に任せている** |
| `[isRunning]` | スタート / 一時停止が切り替わるたびに、effect を作り直す |

> **クリーンアップを書かないと？** 一時停止してもタイマーが止まらず、スタートを押すたびにタイマーが増えて、1秒に2つ、3つと減るようになる。`setInterval`・イベントの登録・通信など「始めたら止める必要があるもの」は、**必ずクリーンアップで止める**。

ブラウザで、スタート → 数秒待つ → 一時停止 → 止まる、を確かめる。

```powershell
npm run lint; npm test; npm run build
git add .
git commit -m "feat: カウントダウンとスタート・一時停止"
git push -u origin feature/countdown
gh pr create --title "カウントダウンとスタート・一時停止" --body "Closes #2"
gh pr checks --watch
```

**Vercel のプレビュー URL** でも動きを確かめてからマージする。

### 4. Issue 3・4：リセットと、休憩への切り替え

```powershell
git switch main
git pull
git switch -c feature/mode-switch
```

休憩への切り替えと完了回数は、**もう `tick` がやってくれている**。画面に表示して、リセットボタンを足すだけでよい。

```jsx
// components/Timer.js
'use client'

import { useEffect, useState } from 'react'
import { INITIAL_TIMER, formatTime, tick } from '@/lib/pomodoro'

export default function Timer() {
  const [timer, setTimer] = useState(INITIAL_TIMER)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning) return

    const id = setInterval(() => {
      setTimer((prev) => tick(prev))
    }, 1000)

    return () => clearInterval(id)
  }, [isRunning])

  function reset() {
    setIsRunning(false)
    setTimer(INITIAL_TIMER)
  }

  return (
    <div>
      <p>{timer.mode === 'work' ? '作業中' : '休憩中'}</p>
      <p aria-label="残り時間">{formatTime(timer.remaining)}</p>
      <button onClick={() => setIsRunning((prev) => !prev)}>{isRunning ? '一時停止' : 'スタート'}</button>
      <button onClick={reset}>リセット</button>
      <p>完了した作業：{timer.completed} 回</p>
    </div>
  )
}
```

> **なぜ state を1つのオブジェクトにまとめたの？** `mode`・`remaining`・`completed` は、残りが0になった瞬間に **3つ同時に** 変わる。別々の state にすると「`remaining` が0になったのを見て、`mode` と `completed` を変える」処理を画面の部品に書くことになり、`useEffect` で書くと ESLint の `react-hooks/set-state-in-effect` にも引っかかる（コマ6）。**一緒に変わる値は1つにまとめ、変わり方は純粋関数に任せる** と、部品はシンプルなまま、難しいところはテストで守れる。

動作確認：25分待つのは大変なので、**確認するときだけ** `lib/pomodoro.js` の `DURATIONS.work` を `5`（5秒）に変える。確認したら必ず戻す（テストが教えてくれる）。

```powershell
npm run lint; npm test; npm run build
git add .
git commit -m "feat: リセットと休憩への自動切り替え、完了回数の表示"
git push -u origin feature/mode-switch
gh pr create --title "リセットと休憩への切り替え" --body "Closes #3
Closes #4"
gh pr checks --watch
gh pr merge --merge --delete-branch
```

### 5. 進み具合を確かめる

MVP の Issue がどこまで閉じたかを確かめる。

```powershell
gh issue list
gh issue list --state closed
```

README の MVP のチェックボックスも `- [x]` に更新する（PR で）。

**MVP が全部マージされ、公開 URL で動いていれば、今日のゴールは達成**。時間が余ったら「追加機能」の Issue に進む。

##  演習

### 演習1（基本）：自分のアプリの MVP を進める

本題の流れで、自分のアプリの MVP の Issue を片付ける。**1つ PR をマージするごとに、公開 URL で動作を確かめる**。

**確認方法**：MVP の Issue が半分以上 Closed になり、それぞれに対応するマージ済みの PR があればOK。

### 演習2（基本）：タブのタイトルに残り時間を出す

（ポモドーロタイマーの例。自分のアプリでは「ブラウザのタブのタイトルに、アプリの状態を出す」に置き換える）

ブラウザのタブのタイトルを「24:57 作業中」のように、残り時間に合わせて変える。

**確認方法**：別のタブを見ていても、タイマーのタブのタイトルで残り時間が分かればOK。

<details>
<summary>解答例</summary>

```jsx
// components/Timer.js（useEffect をもう1つ追加）
useEffect(() => {
  document.title = `${formatTime(timer.remaining)} ${timer.mode === 'work' ? '作業中' : '休憩中'}`
}, [timer])
```

`document.title` は React の外（ブラウザ）にあるもの。**React の外の世界を state に合わせる** のが `useEffect` の本来の使い方（コマ6の localStorage への保存と同じ）。

</details>

### 演習3（応用）：完了回数を保存する

完了回数を localStorage に保存し、再読み込みしても消えないようにする。

**確認方法**：完了回数が 1 以上の状態で再読み込みしても、回数が残っていればOK。`npm run build` も通ること。

<details>
<summary>ヒント</summary>

コマ6と同じ手順になる。

- `useState(loadCompleted)` のように、初期値を関数で渡して localStorage から読む
- `useEffect(() => { localStorage.setItem(...) }, [timer.completed])` で保存する（初期値は `{ ...INITIAL_TIMER, completed: 保存されていた回数 }`）
- `Timer` を `dynamic(() => import('./Timer'), { ssr: false })` のラッパー経由で読み込む（サーバには localStorage がない）

</details>

### 演習4（早く終わった人向け）：作業時間を変えられるようにする

作業時間と休憩時間を、画面から選べるようにする（例：25分 / 50分）。

**確認方法**：50分を選んでリセットすると 50:00 から始まればOK。**選べる時間を計算するロジックがあれば `lib/` に切り出してテストを書く**。

##  まとめ

### 今日できたこと

- 1 Issue = 1 ブランチ = 1 PR のリズムで、MVP を少しずつ完成させた
- ロジックはテストから、画面は動く状態を保ちながら作った
- 状態の変化を純粋関数（`tick`）にまとめ、`setInterval` と `useEffect` のクリーンアップでタイマーを正しく動かし・止められるようになった

### よくある詰まりポイント

- **タイマーがだんだん速くなる**：`useEffect` のクリーンアップ（`return () => clearInterval(id)`）を書き忘れている
- **`useEffect` の中で set 関数を呼んで ESLint のエラーになる**：「state が変わったら別の state を変える」処理を effect に書いていないか確認する。一緒に変わる値は1つの state にまとめ、次の状態を計算する純粋関数（`tick` のようなもの）に任せる
- **PR が大きくなりすぎる**：1つの PR で複数の Issue をまとめすぎない。レビューも、失敗したときの原因探しも大変になる

### 次コマ予告

次回は、動くようになったアプリに **テストを足して守りを固め**、カバレッジの基準・README・CI/CD の仕上げを行う。タイマーのように **時間がかかる処理のテスト** の書き方も学ぶ。

##  課題

### 基礎課題（必須）

1. MVP の Issue をすべてマージし、公開 URL で MVP が動く状態にする
2. README の MVP のチェックボックスを、完成したものから `[x]` にする

### 応用課題（推奨）

3. 演習2・3を、自分のアプリに合った形で取り入れる
4. 追加機能の Issue を1つ選び、本題と同じ流れでマージする

### チャレンジ課題（挑戦）

5. 自分のアプリで `useEffect` を使っている場所をすべて探し、それぞれ「React の外の何と同期しているか」を説明する。説明できないものは、`useEffect` を使わずに書けないか考える（React 公式ドキュメント「You Might Not Need an Effect」）
6. 画面の見た目を整える。CSS Modules か、発展編の Tailwind CSS を使ってみる。**見た目の変更だけの PR** として出し、プレビュー URL で確かめてからマージする
