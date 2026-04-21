# コマ27｜個人制作③：テスト追加

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 5 |
| 所要時間 | 90分 |
| 前提コマ | コマ26 個人制作②：実装 |
| 次コマ | コマ28 個人制作④：CI/CD適用 |

## 🎯 目標

- 純粋関数に **単体テスト** を付けて全PASSできる
- 主要コンポーネントに **RTL + userEvent** でテストを付けられる
- カバレッジを確認し、重要箇所が抜けていないか判断できる

## 📋 導入（15分）

### 今日のゴール

自分のアプリに「PRしたら自動で動作保証される」仕組みを乗せる。

優先順位：

1. **純粋関数** のテスト（一番書きやすい／費用対効果◎）
2. **主要な画面操作** の結合テスト（フォーム・ボタン）
3. 余裕があれば **異常系・エッジケース** も

> **「全部テストする」は不可能。重要な振る舞いから書く。**

### 書く順番のコツ

1. まずPhase 2 のテストをそのまま真似して、**1本PASSする状態** を作る
2. 1本動いたらリズムがつかめるので、あとは同じパターンで量産
3. 1本も動かない時は、セットアップを疑う（`vite.config.js` / `setupTests.js`）

## 🛠 本題（65分）

以下は **ポモドーロタイマー** を例に進める。自分のアプリに読み替えること。

### 1. セットアップ確認（5分）

```bash
cd ~/workspace/自分のアプリ名
git switch main
git pull origin main
git switch -c feature/add-tests
```

`vite.config.js` に test 設定があるか確認：

```javascript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/setupTests.js',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
  },
},
```

`src/setupTests.js`：

```javascript
import '@testing-library/jest-dom/vitest'
```

ダミーで動くか確認：

```javascript
// src/__smoke__.test.js
import { describe, it, expect } from 'vitest'
describe('smoke', () => {
  it('1 + 1 = 2', () => {
    expect(1 + 1).toBe(2)
  })
})
```

```bash
npm run test -- --run
```

動けばOK。この確認ファイルは後で消す。

### 2. 純粋関数のテスト（20分）

Phase 2 で学んだ手順そのままに。

`src/timerUtils.test.js`：

```javascript
import { describe, it, expect } from 'vitest'
import { formatTime, nextMode, initialSecondsFor } from './timerUtils'

describe('formatTime', () => {
  it('0秒は 00:00', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('1500秒は 25:00', () => {
    expect(formatTime(1500)).toBe('25:00')
  })

  it('59秒は 00:59', () => {
    expect(formatTime(59)).toBe('00:59')
  })

  it('61秒は 01:01', () => {
    expect(formatTime(61)).toBe('01:01')
  })
})

describe('nextMode', () => {
  it('focus の次は break', () => {
    expect(nextMode('focus')).toBe('break')
  })

  it('break の次は focus', () => {
    expect(nextMode('break')).toBe('focus')
  })
})

describe('initialSecondsFor', () => {
  it('focus は 1500秒', () => {
    expect(initialSecondsFor('focus')).toBe(1500)
  })

  it('break は 300秒', () => {
    expect(initialSecondsFor('break')).toBe(300)
  })
})
```

```bash
npm run test -- --run
```

全PASSさせる。

### 3. App コンポーネントの基本表示テスト（15分）

`src/App.test.jsx`：

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App 表示', () => {
  it('初期状態で 25:00 が表示される', () => {
    render(<App />)
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('初期状態は集中モード', () => {
    render(<App />)
    expect(screen.getByText(/集中/)).toBeInTheDocument()
  })

  it('開始ボタンが存在する', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: '開始' })).toBeInTheDocument()
  })

  it('リセットボタンが存在する', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'リセット' })).toBeInTheDocument()
  })
})
```

### 4. userEvent によるクリック操作テスト（15分）

```jsx
// src/App.test.jsx に追加
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

describe('App 操作', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('開始ボタン押下で「停止」表示に変わる', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)

    await user.click(screen.getByRole('button', { name: '開始' }))
    expect(screen.getByRole('button', { name: '停止' })).toBeInTheDocument()
  })

  it('1秒経過で 24:59 になる', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)

    await user.click(screen.getByRole('button', { name: '開始' }))
    vi.advanceTimersByTime(1000)

    expect(await screen.findByText('24:59')).toBeInTheDocument()
  })

  it('リセットボタンで 25:00 に戻る', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)

    await user.click(screen.getByRole('button', { name: '開始' }))
    vi.advanceTimersByTime(3000)
    await user.click(screen.getByRole('button', { name: 'リセット' }))

    expect(screen.getByText('25:00')).toBeInTheDocument()
  })
})
```

> **`vi.useFakeTimers({ shouldAdvanceTime: true })`**：Fake timer を使いつつ、`userEvent` の内部処理で時間が進むのを許可する設定。React 18+ でテスト時のタイマー制御によく使う組み合わせ。

### 5. カバレッジを計測（5分）

```bash
npm run test:coverage
```

表とHTMLを確認。カバレッジが低めなら下記を優先で埋める：

- **純粋関数の異常系**（空文字、マイナス、null 等）
- **if の両分岐**
- **エラーハンドリング**

> **ただし100%を目指さない。重要な振る舞いが押さえてあればOK。**

### 6. スナップショットテストの判断（5分）

スナップショットテスト（`expect(container).toMatchSnapshot()`）は学習的には紹介に留める。

- ✅ UI がほぼ変わらない画面で使うと便利
- ❌ 頻繁に変わる画面では邪魔（毎回スナップショット更新で形骸化）

**この授業では無理に使わない。**

### 7. PR作成 & マージ（5分）

```bash
git add .
git commit -m "test: 純粋関数と主要操作のテストを追加"
git push -u origin feature/add-tests
gh pr create --title "テスト追加" --body "$(cat <<'EOF'
## 変更
- timerUtils の単体テスト
- App の表示・操作テスト

## 確認
- [x] 全テストPASS
- [x] カバレッジ：(%記入)
EOF
)"
```

CI（この時点では次回組む）前のローカル確認：

```bash
npm run lint
npm run test -- --run
npm run test:coverage
```

すべて通ることを確認してマージ。

## ✅ まとめ（10分）

### 今日できたこと

- 純粋関数の単体テスト
- コンポーネントの表示・操作テスト
- カバレッジを指標に弱いところを補強

### よくある詰まりポイント

- **「全部テストしろ」と思い込む**：重要箇所優先で十分
- **タイマー絡みのテストが不安定**：`vi.useFakeTimers` と `advanceTimers` の組み合わせを確認
- **テストで実装変更が必要になる**：テストしにくい＝設計が悪い兆候。純粋関数に切り出す

### 次コマ予告

次回は **CI/CD適用**。これまでのテストをワークフローに乗せ、GitHub Pages または Vercel に自動デプロイされる状態を完成させる。

## 📝 課題

1. **カバレッジ80%以上** を目指してテストを追加する
2. テスト追加で「実装にバグ発見」があれば修正してコミット（`fix:` プレフィックス）
3. README に「テストの実行方法」を1節追加する
