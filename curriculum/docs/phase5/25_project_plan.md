# コマ25｜個人制作①：企画・設計

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 5 |
| 所要時間 | 90分 |
| 前提コマ | コマ24 チーム開発シミュレーション |
| 次コマ | コマ26 個人制作②：実装 |

## 🎯 目標

- 自分が作りたいアプリを1案に絞り、READMEに企画書を書ける
- 画面ラフとコンポーネント構成を紙（または図ツール）で設計できる
- リポジトリを作成し、最小構成（Vite + React + テスト + CI の雛形）をpushできる

## 📋 導入（15分）

### Phase 5 の全体像

残り6コマで **自分だけのアプリ** を、これまで学んだ CI/CD パイプラインに乗せて公開・発表する。

| コマ | 内容 |
|-----|------|
| 25 | 企画・設計（今回） |
| 26 | 実装（機能を8割まで） |
| 27 | テスト追加 |
| 28 | CI/CD適用 |
| 29 | 発表準備（README・スライド） |
| 30 | 最終発表・振り返り |

### 「立派なアプリ」を作る必要はない

**評価されるポイント：**

- 自分の手で構想から公開まで一気通貫できたか
- 適切にテストを書き、CIを回せているか
- 発表で自分の言葉で説明できるか

**→ シンプルなアプリで十分。複雑さは不要。**

### 今日のゴール

1. 1案に絞る（3案から選ぶ）
2. READMEに企画書を書く
3. 画面ラフとコンポーネント構成を作る
4. GitHub にリポジトリを立てる

## 🛠 本題（65分）

### 1. アイデア3案を持ち寄り、1案に絞る（10分）

前回の課題で3案考えてきたはず。絞る基準：

- **6コマ（実質4コマ分が実装時間）で終わる規模か？**
- **テスト書きやすいか？** （表示・入力・計算の要素が多い方が◎）
- **自分がモチベーション保てるか？** （興味があるテーマか）

**おすすめの規模感：**

- ✅ 単機能でちゃんと動く（例：重さ換算ツール、タイマー、単語帳）
- ⭕ シンプルなリストアプリ（例：読書ログ、買い物メモ、筋トレ記録）
- ⚠️ マルチページ（ログイン、別画面に遷移…）は重め
- ❌ SNS、チャットなど通信が必要なものは今回は避ける

**サンプルアイデア：**

| アプリ | ポイント |
|-------|---------|
| **ポモドーロタイマー** | useEffect・タイマーモックの勉強に◎ |
| **英単語カード** | 配列操作・フィルタの練習 |
| **家計簿（1日単位）** | 入力・計算・localStorage |
| **習慣トラッカー** | チェックボックスと履歴 |
| **体重グラフ** | 数値入力＋簡単な集計 |
| **単位換算ツール** | 純粋関数のテストしやすさ◎ |

### 2. 企画書（README）の雛形を書く（15分）

プロジェクトフォルダ作成：

```bash
cd ~/workspace
# アプリ名を決める（例：pomodoro-app）
mkdir my-app-plan
cd my-app-plan
```

`README.md` を作成：

```markdown
# アプリ名

## 🎯 何ができるアプリか

1〜2行で説明。
（例：ポモドーロ・テクニック用のタイマーアプリ。25分集中＋5分休憩を自動で繰り返す。）

## 👤 想定ユーザー

- どんな人が使うか
- どんな時に使うか

## ✨ 主な機能

- [ ] 機能1：〜
- [ ] 機能2：〜
- [ ] 機能3：〜
- [ ] （余裕があれば）機能4：〜

## 🛠 技術スタック

- React 19 / Vite
- Vitest / React Testing Library
- ESLint / Prettier
- GitHub Actions（CI/CD）
- Vercel or GitHub Pages

## 📱 画面イメージ

（ラフ画像を貼るか、箇条書きで画面を説明）

## 📅 スケジュール（6コマ）

- コマ25：企画・設計（今回）
- コマ26：実装（機能の8割）
- コマ27：テスト追加
- コマ28：CI/CD適用
- コマ29：発表準備
- コマ30：発表
```

**書く時のコツ：**

- 「**触って動く完成像**」が頭に浮かぶくらい具体的に
- 「機能1：タイマー機能」より「機能1：開始/停止/リセットボタン付き25分タイマー」
- 未確定の部分は「？」を残してOK（次回までに決めれば良い）

### 3. 画面ラフを描く（15分）

紙でも Figma でも Excalidraw でも何でも良い。目的は **必要なUIパーツを洗い出す** こと。

**Excalidraw（手書き風ホワイトボード、無料）：** https://excalidraw.com/

**ラフの例（ポモドーロタイマー）：**

```
┌─────────────────────┐
│  🍅 Pomodoro         │
│                      │
│      25:00           │ ← 大きな時刻表示
│                      │
│  [開始] [停止] [リセット]│
│                      │
│  完了サイクル：3        │
└─────────────────────┘
```

**このラフから部品を洗い出す：**

- `Timer`（時計表示）
- `Controls`（ボタン群）
- `CycleCount`（完了数）
- `App`（全体・state 保持）

### 4. コンポーネント構成図を書く（10分）

```
App
 ├─ Timer        （props: seconds）
 ├─ Controls     （props: onStart, onStop, onReset, isRunning）
 └─ CycleCount   （props: count）
```

**stateはどこに持つ？**

- `seconds`, `isRunning`, `cycleCount` は **App** に集約
- 下位コンポーネントは表示と通知（onClick）だけ

→ Phase 1 で学んだ「state の持ち上げ」パターン。

### 5. ロジック（純粋関数）に切り出せるものを洗い出す（5分）

テストしやすくするため、**App の外に出せる計算** を挙げておく。

ポモドーロの例：

- `formatTime(seconds)` → `'25:00'` に整形
- `nextMode(currentMode)` → `'focus'` / `'break'` を切り替え
- `initialSecondsFor(mode)` → `focus: 1500`, `break: 300`

これらは Phase 2 で学んだ **純粋関数のテスト** にぴったり。

### 6. リポジトリを立てる（10分）

名前を決める（kebab-case 推奨：`pomodoro-app`, `habit-tracker` など）

```bash
cd ~/workspace
npm create vite@latest 自分のアプリ名 -- --template react
cd 自分のアプリ名
npm install
```

前回までに作ったTODOアプリの設定を参考にする：

- `package.json`（scripts: dev/build/test/lint/format…）
- `eslint.config.js` + `.prettierrc`
- Vitest セットアップ（`vite.config.js`, `setupTests.js`）
- `.gitignore`

TODOアプリから必要なファイルをコピーするのが早い：

```bash
cp ~/workspace/todo-app/vite.config.js .
cp ~/workspace/todo-app/.prettierrc .
cp ~/workspace/todo-app/.prettierignore .
cp ~/workspace/todo-app/src/setupTests.js src/
```

依存をまとめてインストール：

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event jsdom \
  prettier eslint-config-prettier
```

企画書のREADMEも配置：

```bash
cp ../my-app-plan/README.md .
```

初期コミット & push：

```bash
git init
git branch -M main
git add .
git commit -m "feat: 初期構成"
gh repo create 自分のアプリ名 --public --source=. --remote=origin --push
```

> Phase 4 で設定したブランチ保護・CODEOWNERS なども後で追加する。まずは動く状態を作る。

## ✅ まとめ（10分）

### 今日できたこと

- 作るアプリが決まった
- 企画書（README）が書けた
- 画面ラフ・コンポーネント構成が設計できた
- リポジトリが立った

### よくある詰まりポイント

- **何を作るか決まらない** → 「必要ではないが自分が使ってみたい小物」が一番続く
- **機能を盛りすぎる** → 4コマで作り切れるラインに絞る
- **「TypeScript にしたい」** → この授業では JS。それでも発表までに動くものが優先

### 次コマ予告

次回は実装。今日決めたコンポーネント構成に沿って、**機能の8割** を作る。テストは次々回。

## 📝 課題

1. README の空欄（機能リスト、画面イメージ）を埋めて push
2. 構想した機能を **1つだけ** 実装してみる（画面に何か出るところまで）
3. 企画書に不明点があったら、事前に講師に相談
