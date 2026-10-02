# コマ26｜個人制作①：企画・設計と土台づくり

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 5 |
| 所要時間 | 90分 |
| 前提コマ | コマ25 チーム開発シミュレーション |
| 次コマ | コマ27 個人制作②：実装 |

##  目標

- 5コマで作りきれる大きさのアプリを企画し、「最低限の機能（MVP）」と「やらないこと」を決められる
- 画面・部品・state の置き場所・テストするロジックを、作る前に設計できる
- 新しいリポジトリに Jest・CI/CD・ルールセット・デプロイの土台を用意し、**中身が空の状態で公開まで** 通せる

##  導入

### Phase 5 の全体像

ここからは、**自分で決めたアプリ** に、30コマで学んだことを全部詰め込む。

| コマ | 内容 | 終わったときの状態 |
|------|------|-----------------|
| 26 | 企画・設計と土台づくり（今回） | 企画書（README）と、空のアプリが CI/CD で公開されている |
| 27 | 実装 | MVP が動いて公開されている |
| 28 | テストと CI/CD の仕上げ | テスト・カバレッジ・README がそろっている |
| 29 | 発表準備 | スライドと発表原稿ができている |
| 30 | 最終発表・ふりかえり | 発表して、次に学ぶことが決まっている |

### 評価される（発表で見せる）ポイント

| 観点 | 見られること |
|------|------------|
| 動く | 公開 URL で、主な機能が実際に使える |
| 守られている | ロジックと操作にテストがあり、CI で自動で確かめている |
| 自動で届く | PR → CI → マージ → 自動公開の流れができている |
| 説明できる | なぜその設計・その公開先にしたかを、自分の言葉で話せる |

**すごいアプリである必要はない**。小さくても「動く・守られている・自動で届く・説明できる」がそろっていることのほうが大事。

### 今日のゴール

1. 何を作るか決める（企画）
2. どう作るか決める（設計）
3. **中身が空のまま、公開までの道を先に通す**（土台づくり）

3 を最初にやるのは、最終日に「デプロイがうまくいかない」と慌てないため。**最初に公開までの道を通しておけば、あとは毎回同じ流れで機能を足すだけ** になる。

##  本題

### 1. アイデアを3つ出して、1つに絞る

まず、作りたいものを **3つ** 書き出す。

| 例 | どんなアプリか |
|----|--------------|
| ポモドーロタイマー | 25分作業・5分休憩をくり返すタイマー。完了回数を記録する |
| 割り勘計算 | 金額と人数を入れると1人あたりを計算。端数の扱いを選べる |
| 単語帳 | 単語と意味を登録して、ランダムに出題する。正答率を記録する |
| 時間割 | 自分の時間割を登録して、今日の授業を表示する |
| 家計簿 | 支出を登録して、カテゴリごとの合計を表示する |

次の基準で1つに絞る。

| 基準 | 理由 |
|------|------|
| **3コマ分の作業（約4〜5時間）で MVP が動く** | 残りはテスト・仕上げ・発表準備に使う |
| **計算や判定のロジックがある** | `lib/` の純粋関数にしてテストを書ける（見た目だけのアプリはテストが書きにくい） |
| **静的ホスティングでも動く** か、サーバが必要なら Vercel で動く | コマ20の判断を使う。データは localStorage に保存すれば、サーバがなくても作れる |
| **自分が使いたい** | 最後まで作りきる力になる |

### 2. 企画書を README に書く

以降、このコマではポモドーロタイマーを例にする。自分のアプリに置き換えて書くこと。

```markdown
# ポモドーロタイマー

## 何ができるか
25分の作業と5分の休憩をくり返すタイマー。完了した作業の回数を記録する。

## 誰のためのアプリか
課題や勉強に集中したいけれど、つい休憩を取りすぎてしまう学生。

## 機能

### MVP（これだけは必ず作る）
- [ ] 25分のカウントダウン（スタート / 一時停止 / リセット）
- [ ] 25分たったら5分の休憩に自動で切り替わる
- [ ] 完了した作業の回数を表示する

### 追加機能（時間があれば）
- [ ] 完了回数を localStorage に保存する
- [ ] 作業時間・休憩時間を変えられる
- [ ] 終了時に音を鳴らす

### やらないこと
- ログイン、複数人での共有、スマホアプリ化

## 技術
- Next.js（App Router）/ React / Jest + React Testing Library
- GitHub Actions（CI/CD）/ Vercel・GitHub Pages

## 公開先
- GitHub Pages と Vercel（データは localStorage のみで、サーバは不要なため）
```

> **「やらないこと」を書くのが一番大事**。締め切りのある開発では、機能を増やす判断より **削る判断** のほうが難しい。最初に決めておくと迷わない。

### 3. 画面と部品を設計する

紙か、テキストで画面のラフを描く。

```text
┌────────────────────────────┐
│ ポモドーロタイマー           │  ← Header
├────────────────────────────┤
│        作業中               │
│        24:57               │  ← Timer（'use client'：state を持つ）
│   [一時停止] [リセット]      │
│   完了した作業：2 回         │
└────────────────────────────┘
```

部品と state の置き場所を決める（コマ5と同じ考え方）。

| 部品 | Server / Client | state |
|------|----------------|-------|
| `app/page.js` | Server | なし |
| `Timer` | Client | `timer`（`mode`：作業 / 休憩、`remaining`：残り秒、`completed`：完了回数 をまとめたオブジェクト）、`isRunning` |

### 4. テストするロジックを先に洗い出す

**「画面の外に出せる計算」** を探し、`lib/` の関数と、そのテストケースを書き出す。

| 関数 | 入力 → 出力 | テストケース |
|------|-----------|------------|
| `formatTime(秒)` | `1500` → `'25:00'` | 0秒、59秒、60秒、1500秒 |
| `nextMode(mode)` | `'work'` → `'break'` | work → break、break → work |
| `tick(timer)` | 1秒進めた次の状態を返す | 普通に1秒減る、作業の最後の1秒で休憩へ（完了 +1）、休憩の最後の1秒で作業へ |

> 「1秒たったら次の状態はどうなるか」を `tick` という **純粋関数** にまとめておくと、画面の部品は「1秒ごとに `tick` を呼ぶだけ」になり、切り替えの複雑なところを全部テストで確かめられる。

> ロジックを思いつかないときは、「数字の計算」「条件による分かれ道」「文字の整形」「並び替え・絞り込み」を探す。どのアプリにもだいたいある。

### 5. 土台を作る：プロジェクトとテスト

```powershell
cd ~/workspace
npx create-next-app@latest pomodoro --js --eslint --app --no-tailwind --no-src-dir --no-react-compiler --import-alias "@/*" --use-npm --yes
cd pomodoro
mkdir -Force components, lib
rm app/page.module.css
```

`todo-app` で作った設定をコピーして使い回す。

```powershell
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event prettier
Copy-Item ../todo-app/jest.config.mjs, ../todo-app/jest.setup.js, ../todo-app/.prettierrc, ../todo-app/.prettierignore .
npm pkg set scripts.test="jest" scripts.test:watch="jest --watch" scripts.test:coverage="jest --coverage" scripts.lint="eslint --max-warnings=0" scripts.format="prettier --write ." scripts.format:check="prettier --check ."
```

`eslint.config.mjs` の `globalIgnores` に `"coverage/**"` を足す（コマ13）。

`app/page.js` と `app/layout.js` を最小にする（コマ5と同じ手順）。そして、**最初のテストを1つ** 書く。

```js
// lib/pomodoro.js
export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
```

```js
// lib/pomodoro.test.js
import { formatTime } from './pomodoro'

test.each([
  [0, '00:00'],
  [59, '00:59'],
  [60, '01:00'],
  [1500, '25:00'],
])('%i 秒は %s', (seconds, expected) => {
  expect(formatTime(seconds)).toBe(expected)
})
```

> **`padStart(2, '0')`**：文字列が2文字になるまで、左に `'0'` を詰める。`'5'` → `'05'`。

```powershell
npm run format
npm run lint
npm test
npm run build
```

> `jest.config.mjs` の `coverageThreshold` は、まだコードが少ないので **いったん消しておく**（コマ28で設定し直す）。

### 6. 土台を作る：CI/CD とルールセット

`todo-app` のワークフローと Pages の設定をコピーする。

```powershell
mkdir -Force .github/workflows
cp ../todo-app/.github/workflows/ci.yml .github/workflows/
cp ../todo-app/next.config.mjs .
```

`next.config.mjs` の `basePath` を **新しいリポジトリ名** に変える。

```js
  basePath: isGithubPages ? '/pomodoro' : '',
```

GitHub にリポジトリを作って push する。

```powershell
git add .
git commit -m "chore: プロジェクトの土台（テスト・CI/CD）を用意"
gh repo create pomodoro --public --source=. --remote=origin --push
```

GitHub で次を設定する（それぞれ、以前のコマの手順と同じ）。

| 設定 | 参照 |
|------|------|
| Settings → Pages → Source を **GitHub Actions** | コマ22 |
| Settings → Rules → Rulesets で `protect-main`（PR 必須・`lint` / `test` / `build` 必須・承認 0） | コマ18 |
| Vercel で新しいプロジェクトとしてインポート | コマ21 |

> ルールセットの必須チェックは、CI が一度動いたあとでないと選べない。push 後に Actions で CI が動いたのを確かめてから設定する。

### 7. 空のアプリが公開されたことを確かめる

```powershell
gh run list --limit 3
```

- GitHub Pages：`https://ユーザー名.github.io/pomodoro/`
- Vercel：`https://pomodoro-xxxx.vercel.app`

両方で、最小の `app/page.js` の内容（見出しだけ）が表示されればOK。**まだ何もないアプリだが、公開までの道はもう通っている**。

README の先頭に公開 URL を書き、企画書（本題2）と合わせて PR でマージする。

```powershell
git switch -c docs/plan
# README.md に企画書と公開URLを書く
git add README.md
git commit -m "docs: 企画書と公開URLを追加"
git push -u origin docs/plan
gh pr create --fill
gh pr checks --watch
gh pr merge --merge --delete-branch
```

##  演習

### 演習1（基本）：企画書を見せ合って質問する

隣の人と企画書（README）を見せ合い、相手に次の3つを質問する。質問されたことで企画書を直す。

1. MVP の機能のうち、一番難しそうなのはどれ？ どう作る予定？
2. 「やらないこと」に入れたほうがいい機能はない？
3. テストするロジック（`lib/` の関数）は何？

**確認方法**：質問を受けて、README の MVP か「やらないこと」を1か所以上直せればOK。

### 演習2（基本）：MVP の機能を Issue に分ける

MVP の機能を、**1つが 30〜60 分で終わる大きさ** の Issue に分けて登録する。

```powershell
gh issue create --title "25分のカウントダウンを表示する" --body "スタートを押すと1秒ずつ減る。一時停止・リセットができる。"
```

**確認方法**：MVP の機能がすべて Issue になり、1つの Issue が「1回の PR」で終わる大きさになっていればOK。

<details>
<summary>分け方の例（ポモドーロタイマー）</summary>

1. `formatTime`・`nextMode`・`tick` を作ってテストする（`lib/`）
2. 25:00 を表示し、スタート / 一時停止でカウントダウンする
3. リセットボタン
4. 0 になったら休憩に切り替わり、完了回数が増える
5. 見た目を整える

「ロジック → 表示 → 操作 → つなぎ込み → 見た目」の順にすると、毎回動く状態を保ったまま進められる。

</details>

### 演習3（応用）：部品と state の表を完成させる

本題3の表を、自分のアプリについて完成させる。次の点も書き足す。

- 各部品が受け取る **props** と、親に知らせる **関数**（`onAdd` など）
- localStorage に保存するもの（あれば）と、そのキー名
- `usePathname` など Next.js の機能を使う部品（テストでモックが必要になる）

**確認方法**：表を見れば、どの部品から作ればよいか、どこにテストが必要かが分かる状態になっていればOK。

### 演習4（早く終わった人向け）：2つ目のロジックをテストから作る

`lib/` に入れる2つ目の関数を、**テストを先に書いてから** 作り、PR でマージする。

**確認方法**：PR の CI が緑で、`lib/○○.test.js` にテストが増えていればOK。

##  まとめ

### 今日できたこと

- アイデアを基準で絞り、MVP と「やらないこと」を決めた企画書を README に書いた
- 画面・部品・state の置き場所・テストするロジックを設計した
- 新しいリポジトリに、テスト・CI/CD・ルールセット・Pages・Vercel の土台を用意し、空のアプリを公開した

### よくある詰まりポイント

- **Pages で真っ白**：`next.config.mjs` の `basePath` を新しいリポジトリ名に変えたか確認する（コピーしたままだと `/todo-app` になっている）
- **CI の `test` が「テストがない」と失敗する**：`No tests found` で失敗する。最初のテストを1つ書いてから push する
- **やりたいことが多すぎて決まらない**：MVP は「それがないとアプリと呼べない機能」だけにする。それ以外は全部「追加機能」に回す

### 次コマ予告

次回は実装。Issue を1つずつ「ブランチ → 実装 → テスト → PR → CI → マージ → 自動公開」の流れで片付け、MVP を完成させる。

##  課題

### 基礎課題（必須）

1. 企画書（README）と、空のアプリの公開（Pages と Vercel のどちらか、または両方）を完了させる
2. 演習2の Issue 登録を完了させる

### 応用課題（推奨）

3. 画面のラフを、紙に描いたものの写真か、Figma などのツールで作り、README に画像として貼る
4. 次回までに、Issue の1つ目（ロジックの関数とテスト）を終わらせておく

### チャレンジ課題（挑戦）

5. 自分のアプリに似た既存のアプリを2つ調べ、「真似したい点」と「自分のアプリの違い（売り）」を README に書く
6. MVP の各 Issue に、作業時間の見積もり（例：45分）を書いておく。実装が終わったら実際にかかった時間を書き足し、見積もりとのずれを次回以降の計画に活かす
