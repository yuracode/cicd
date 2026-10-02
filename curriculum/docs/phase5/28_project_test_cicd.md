# コマ28｜個人制作③：テストとCI/CDの仕上げ

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 5 |
| 所要時間 | 90分 |
| 前提コマ | コマ27 個人制作②：実装 |
| 次コマ | コマ29 発表準備 |

##  目標

- 自分のアプリで「壊れたら困る順」にテストを足し、カバレッジの基準を決めて CI に組み込める
- `jest.useFakeTimers()` で、時間のかかる処理（タイマーなど）を一瞬でテストできる
- README・CI/CD・ルールセット・公開 URL をそろえ、`v1.0.0` としてリリースできる

##  導入

### 前回の振り返り

前回は MVP を実装して公開した。今日は **守りを固めて、完成品として仕上げる**。

### 今日のチェックリスト

最後に次がすべてそろっている状態を目指す。

- [ ] `lib/` のロジックにテストがあり、カバレッジが基準以上
- [ ] 主な操作の流れに結合テストがある
- [ ] CI（lint / test / build）と、Pages / Vercel への自動公開が動いている
- [ ] `main` にルールセットがかかっている
- [ ] README に、公開 URL・スクリーンショット・機能・技術・開発方法・CI/CD の説明がある
- [ ] `v1.0.0` のリリースがある

### テストを書く順番

時間は限られているので、**壊れたら困る順・見つけにくい順** に書く。

| 順番 | 対象 | 理由 |
|------|------|------|
| 1 | `lib/` のロジック | 間違っていても画面では気づきにくい。テストが一番書きやすい |
| 2 | 主な操作の流れ（結合テスト） | 「このアプリの一番大事な使い方」が壊れていないことを保証する |
| 3 | 端のケース（空・0件・上限・エラー） | 手で試すのを忘れがち |
| 4 | 見た目の細かいところ | 変わりやすく、テストの手間に見合わないことが多い（プレビューで人が見る） |

##  本題

### 1. 今のカバレッジを測る

```powershell
cd ~/workspace/pomodoro
git switch main
git pull
git switch -c test/strengthen
npm run test:coverage
```

表を見て、**0% や低いファイル** と、**`Uncovered Line #s`** を確かめる（コマ13）。HTML レポートも開く。

```powershell
start coverage/lcov-report/index.html
```

### 2. タイマーのテスト：偽物の時計を使う

タイマーのテストで本当に25分待つわけにはいかない。Jest の **偽物の時計（フェイクタイマー）** を使うと、時間を一瞬で進められる。

```jsx
// components/Timer.test.js
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Timer from './Timer'

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

test('スタートすると1秒ごとに減る', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  render(<Timer />)

  await user.click(screen.getByRole('button', { name: 'スタート' }))
  act(() => {
    jest.advanceTimersByTime(3000)
  })

  expect(screen.getByLabelText('残り時間')).toHaveTextContent('24:57')
})

test('25分たつと休憩になり、完了回数が増える', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  render(<Timer />)

  await user.click(screen.getByRole('button', { name: 'スタート' }))
  act(() => {
    jest.advanceTimersByTime(25 * 60 * 1000)
  })

  expect(screen.getByText('休憩中')).toBeInTheDocument()
  expect(screen.getByLabelText('残り時間')).toHaveTextContent('05:00')
  expect(screen.getByText('完了した作業：1 回')).toBeInTheDocument()
})
```

| 部分 | 意味 |
|------|------|
| `jest.useFakeTimers()` | `setInterval` や `setTimeout` を、Jest が操作できる偽物の時計に置き換える |
| `jest.advanceTimersByTime(3000)` | 時計を3000ミリ秒（3秒）進める。その間に動くはずだった `setInterval` がすべて実行される |
| `act(() => { ... })` | 「この中で state が変わるので、終わったら画面を更新してから次に進んで」と React に伝える。RTL の `user.click` などは自動で包んでくれるが、時計を進めるときは自分で包む |
| `userEvent.setup({ advanceTimers: ... })` | user-event も内部で少し待つ処理をするので、偽物の時計を使うことを教えておく |
| `jest.useRealTimers()` | 次のテストのために本物の時計に戻す |

> **自分のアプリにタイマーがない場合**：ボタンを押してから数秒後に何かが起きる処理（`setTimeout` でメッセージを消すなど）があれば同じ方法でテストできる。なければ、この節は読むだけでよい。

```powershell
npm test
```

一時停止のテストも書いてみる（演習1）。

### 3. 主な操作の流れを結合テストにする

**「このアプリの一番大事な使い方」を1つ選び**、最初から最後まで操作するテストを書く。

ポモドーロタイマーなら「スタート → 25分 → 休憩 → 5分 → 作業に戻り、完了回数は1のまま」。

```jsx
// components/Timer.test.js（追加）
test('作業 → 休憩 → 作業と1周する', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  render(<Timer />)

  await user.click(screen.getByRole('button', { name: 'スタート' }))
  act(() => {
    jest.advanceTimersByTime((25 + 5) * 60 * 1000)
  })

  expect(screen.getByText('作業中')).toBeInTheDocument()
  expect(screen.getByLabelText('残り時間')).toHaveTextContent('25:00')
  expect(screen.getByText('完了した作業：1 回')).toBeInTheDocument()
})
```

自分のアプリでは、たとえば：

| アプリ | 主な操作の流れ |
|--------|--------------|
| 割り勘計算 | 金額と人数を入力 → 1人あたりが表示される → 端数の扱いを変える → 表示が変わる |
| 単語帳 | 単語を2つ登録 → 出題 → 正解を選ぶ → 正答率が 100% になる |
| 家計簿 | 支出を3件登録 → カテゴリの合計が正しい → 1件削除 → 合計が減る |

### 4. カバレッジの基準を決める

テストが増えたら、`jest.config.mjs` に基準を入れる（コマ13）。

```js
// jest.config.mjs（config に追加）
  collectCoverageFrom: ['app/**/*.js', 'components/**/*.js', 'lib/**/*.js', '!**/*.test.js'],
  coverageThreshold: {
    global: {
      lines: 80,
    },
    './lib/': {
      lines: 100,
      branches: 100,
    },
  },
```

数字は **今のカバレッジを見て決める**。`lib/` を 100% にするのは、ロジックはテストしやすく、しかも一番大事だから。

```powershell
npm run test:coverage
npm run lint
npm run build
git add .
git commit -m "test: タイマーの動作テストとカバレッジの基準を追加"
git push -u origin test/strengthen
gh pr create --fill
gh pr checks --watch
gh pr merge --merge --delete-branch
```

### 5. CI/CD の最終チェック

```powershell
git switch main
git pull
gh run list --limit 5
gh api "repos/{owner}/{repo}/rulesets" --jq '.[].name'
```

次を1つずつ確かめる。

| 確認すること | どこで |
|-------------|-------|
| `main` への push で、lint / test / build → pages-build → pages-deploy が緑 | Actions タブ |
| Pages の URL で最新版が動いている | ブラウザ |
| Vercel の本番 URL で最新版が動いている | ブラウザ |
| PR ではプレビュー URL が作られる | 直近の PR |
| `main` に直接 push できない | コマ18の手順で試す（試したら `git reset --hard origin/main`） |

### 6. README を完成させる

README は、**このリポジトリを初めて見た人が、何のアプリで、どう動かせて、どう作られているかを分かる** ように書く。発表のときにも見せる。

````markdown
# ポモドーロタイマー

[![CI/CD](https://github.com/ユーザー名/pomodoro/actions/workflows/ci.yml/badge.svg)](https://github.com/ユーザー名/pomodoro/actions/workflows/ci.yml)

25分の作業と5分の休憩をくり返して、集中を助けるタイマーです。

## 公開URL

- Vercel：https://pomodoro-xxxx.vercel.app
- GitHub Pages：https://ユーザー名.github.io/pomodoro/

## スクリーンショット

![作業中の画面](docs/screenshot.png)

## 機能

- 25分のカウントダウン（スタート / 一時停止 / リセット）
- 25分たつと5分の休憩に自動で切り替え
- 完了した作業の回数を表示

## 技術

| 分類 | 使ったもの |
|------|-----------|
| フレームワーク | Next.js 16（App Router）/ React 19 |
| テスト | Jest / React Testing Library（テスト ○ 件、カバレッジ ○ %） |
| CI/CD | GitHub Actions（lint・test・build → GitHub Pages へ自動デプロイ）、Vercel |

## 開発

```powershell
npm install
npm run dev          # http://localhost:3000
npm test             # テスト
npm run test:coverage
```

## CI/CD

```text
PR → lint / test（同時）→ build → （main のみ）Pages 向けビルド → Pages へデプロイ
PR → Vercel のプレビュー、main → Vercel の本番
```

`main` はルールセットで保護しており、PR と CI の成功が必須です。

## 工夫したところ

- タイマーの計算を `lib/pomodoro.js` に切り出し、テストで 100% カバーしている
- ...
````

スクリーンショットは、Windows の `Win + Shift + S` で撮り、`docs/screenshot.png` として保存する。

```powershell
mkdir -Force docs
Copy-Item ~/Pictures/Screenshots/<ファイル名>.png docs/screenshot.png
```

PR でマージする。

### 7. v1.0.0 としてリリースする

```powershell
git switch main
git pull
gh release create v1.0.0 --generate-notes --title "v1.0.0 最初の完成版"
```

リポジトリの **Releases** に v1.0.0 ができ、これまでの PR の一覧がまとめられていれば完成。

##  演習

### 演習1（基本）：一時停止とリセットのテスト

（ポモドーロタイマーの例。自分のアプリでは、**主な操作のうち、まだテストがないもの** に置き換える）

次の2つのテストを追加する。

- スタート → 3秒 → 一時停止 → さらに10秒たっても、`24:57` のまま
- スタート → 3秒 → リセット → `25:00` に戻り、ボタンが「スタート」になる

**確認方法**：2つのテストが PASS し、`Timer.js` のクリーンアップ（`return () => clearInterval(id)`）を消すと1つ目が FAIL になればOK（確かめたら戻す）。

<details>
<summary>解答例</summary>

```jsx
test('一時停止すると止まる', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  render(<Timer />)

  await user.click(screen.getByRole('button', { name: 'スタート' }))
  act(() => {
    jest.advanceTimersByTime(3000)
  })
  await user.click(screen.getByRole('button', { name: '一時停止' }))
  act(() => {
    jest.advanceTimersByTime(10000)
  })

  expect(screen.getByLabelText('残り時間')).toHaveTextContent('24:57')
})

test('リセットで最初に戻る', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  render(<Timer />)

  await user.click(screen.getByRole('button', { name: 'スタート' }))
  act(() => {
    jest.advanceTimersByTime(3000)
  })
  await user.click(screen.getByRole('button', { name: 'リセット' }))

  expect(screen.getByLabelText('残り時間')).toHaveTextContent('25:00')
  expect(screen.getByRole('button', { name: 'スタート' })).toBeInTheDocument()
})
```

</details>

### 演習2（基本）：端のケースを3つテストする

自分のアプリについて、「空・0件・上限・不正な入力・エラー」などの **端のケース** を3つ挙げ、テストを書く。

**確認方法**：3つのテストが PASS し、それぞれ「なぜそのケースが大事か」を1行で説明できればOK。

### 演習3（応用）：テストの質を確かめる

コマ13の演習4（ミューテーションテスト）を、自分のアプリで行う。`lib/` の関数に **わざとバグを3つ** 入れ（`<` と `<=` を入れ替える、`!` を消す、など）、それぞれテストが失敗するかを確かめる。

**確認方法**：3つとも少なくとも1つのテストが FAIL すればOK。PASS のままのものがあれば、それを見つけるテストを追加する。

### 演習4（早く終わった人向け）：アクセシビリティをチェックする

Chrome の開発者ツールの **Lighthouse** タブで、公開 URL の **Accessibility** のスコアを測る。指摘された項目を1つ以上直し、PR でマージする。

**確認方法**：直す前と後で、スコアが上がっていればOK。

> RTL の `getByRole` でテストを書いてきたので、ボタンや入力欄の名前はすでに付いているはず。色のコントラストや、画像の `alt` などがよく指摘される。

##  まとめ

### 今日の達成

- 壊れたら困る順（ロジック → 主な流れ → 端のケース）にテストを足し、カバレッジの基準を CI に組み込んだ
- フェイクタイマーで、時間のかかる処理を一瞬でテストできるようになった
- README・CI/CD・ルールセット・公開 URL をそろえ、v1.0.0 をリリースした

### よくある詰まりポイント

- **フェイクタイマーのテストで時間が進まない**：`jest.useFakeTimers()` を `render` より前に呼んでいるか、`advanceTimersByTime` を `act` で包んでいるか確認する
- **user-event の操作が終わらない（タイムアウトする）**：フェイクタイマーを使うときは `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })` にする
- **カバレッジの基準で CI が落ちる**：基準を下げる前に、テストのないロジックがないか確認する。本当に不要なファイルなら `collectCoverageFrom` から外す

### 次コマ予告

次回は発表の準備。アプリのデモと、「どう作り・どう守り・どう届けているか」を5分で伝えるスライドと原稿を作り、リハーサルをする。

##  課題

### 基礎課題（必須）

1. 本題のチェックリスト（導入）をすべて満たす
2. 演習1・2を、自分のアプリに合った形で完成させる

### 応用課題（推奨）

3. 演習3を行い、見つかったテストの抜けを埋める
4. README の「工夫したところ」を3つ以上書く。**なぜそうしたか** を必ず添える

### チャレンジ課題（挑戦）

5. 発展編の Playwright（a4）を参考に、公開 URL を開いて主な操作をする E2E テストを1つ書き、CI に組み込む
6. Dependabot（発展編 a5）を設定し、依存パッケージの更新 PR が自動で作られるようにする。CI が通ればそのままマージしてよいかを判断する基準を考える
