# コマ12｜カバレッジ計測

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 2 |
| 所要時間 | 90分 |
| 前提コマ | コマ11 モック・非同期テスト |
| 次コマ | コマ13 GitHub Actions概要・YAML構文 |

##  目標

- **カバレッジ** の4種類（Statements / Branches / Functions / Lines）を区別できる
- Vitest でカバレッジを計測し、HTMLレポートを読める
- カバレッジ100%を盲信せず、「何をテストすべきか」を自分で判断できる

##  導入（15分）

### 前回の振り返り

モックと非同期テストまでできるようになった。ここで疑問：

> 「書いたテスト、**どれくらいのコードを通過している** んだろう？」

書き漏れがあっても気付けない。そこで使うのがカバレッジ計測ツール。

### カバレッジとは

**カバレッジ（coverage）** ＝ テスト実行時に、**プロダクションコードのどの行・分岐が実行されたか** の割合。

- 高い＝よくテストされている（可能性が高い）
- 低い＝テスト漏れ（確実）
- **「100% だから完璧」は成り立たない**（実行したからといって検証しているとは限らない）

### 今日のゴール

Vitestで自分のプロジェクトのカバレッジを計測し、HTMLレポートを読み、「弱い部分」を補強するテストを1〜2本追加する。

##  本題（65分）

### 1. カバレッジの4指標（10分）

| 指標 | 意味 |
|------|------|
| **Statements（命令）** | 全命令のうち何％が実行されたか |
| **Branches（分岐）** | `if` / `? :` / `&&` の各分岐を両方通ったか |
| **Functions（関数）** | 定義した関数のうち呼ばれたのは何％か |
| **Lines（行）** | 全行のうち実行された行数 |

**一番厳しい指標は Branches**。下の例：

```javascript
function classify(n) {
  if (n > 0) return 'plus'
  if (n < 0) return 'minus'
  return 'zero'
}
```

テストが `classify(1)` だけだと：

- Statements: 50%（return 'plus' だけ通った）
- Branches: 33%（3分岐のうち1つ）
- Functions: 100%（呼ばれている）
- Lines: 50%

→ Statements/Lines/Functionsが高くてもBranchesが低ければ「抜け漏れ」を示す。

### 2. Vitestのカバレッジ準備（10分）

Vitestはカバレッジ用のパッケージを別途インストール。

```bash
cd ~/workspace/todo-app
npm install -D @vitest/coverage-v8
```

`package.json` の scripts に追加：

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

> **`vitest run`**（watchせず1回だけ実行）+ `--coverage`（計測付き）のセット。

`vite.config.js` の `test` セクションを拡張：

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/setupTests.js',
        'src/main.jsx',
      ],
    },
  },
})
```

> **`reporter`**：
> - `text` → コマンドラインに表形式で出力
> - `html` → `coverage/index.html` にグラフィカルなレポート
> - `json`, `lcov` もよく使う（Phase 3 で CI から使う）

### 3. カバレッジ計測を実行（10分）

```bash
npm run test:coverage
```

コマンドライン末尾に表が出る：

```
 % Coverage report from v8
---------------|---------|----------|---------|---------|-------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-------------------
All files      |   85.2  |   78.5   |   90.0  |  85.2   |
 App.jsx       |   72.3  |   60.0   |   80.0  |  72.3   | 22-27, 35
 TodoForm.jsx  |  100.0  |  100.0   |  100.0  | 100.0   |
 ...
```

HTMLレポートも開く：

```bash
# ブラウザで開く（WSL2から）
explorer.exe coverage/index.html
```

（`explorer.exe` はWSL→Windowsのファイルを開くコマンド）

### 4. HTMLレポートの読み方（10分）

HTMLレポートの便利さ：

- ファイル単位の色分け一覧
- クリックで該当ファイルを開くと **通っていない行が赤く** 表示される
- `if` の片方だけ通ったケースは黄色

**読み解きポイント：**

- 赤い行が多い＝テスト漏れエリア
- 短い if がずっと黄色＝エッジケースが検証できていない
- 小さいファイルは手を抜かず全通すのがおすすめ（全体スコアの下支え）

### 5. カバレッジを埋める実践（15分）

HTMLで弱いファイルを選んで、テストを1〜2本追加する。

**例：`todoUtils.js` に未網羅の分岐があった場合**

```javascript
// 仮にこんな関数だったとする
export function formatTodo(todo) {
  if (!todo) return ''
  return todo.completed ? ` ${todo.text}` : `⬜ ${todo.text}`
}
```

`completed: true` のテストはあるが `false` のテストが無い、などありがち。

```javascript
// src/todoUtils.test.js に追加
describe('formatTodo', () => {
  it('null なら空文字', () => {
    expect(formatTodo(null)).toBe('')
  })

  it('completed: true なら  プレフィックス', () => {
    expect(formatTodo({ text: 'A', completed: true })).toBe(' A')
  })

  it('completed: false なら ⬜ プレフィックス', () => {
    expect(formatTodo({ text: 'B', completed: false })).toBe('⬜ B')
  })
})
```

再計測：

```bash
npm run test:coverage
```

Branches が上がっていればOK。

### 6. 「100%病」に陥らない考え方（5分）

**よくある失敗：**

- 「100% を目指す」と言われて、テストしづらい箇所を無理矢理テストする
- その結果、**テストコードのメンテが破綻**して結局消される
- または、**呼ぶだけのテスト**（振る舞いを検証しない）を量産

**現場で妥当なライン：**

- ビジネスロジック（純粋関数）：**90%以上** を目指す
- UIコンポーネント：**70〜80%** で十分
- 外部ライブラリ呼び出しのラッパーだけのファイル：カバレッジから除外でOK

**しきい値を強制することもできる：**

```javascript
// vite.config.js の test.coverage に追加
coverage: {
  // ...
  thresholds: {
    lines: 80,
    branches: 70,
    functions: 80,
    statements: 80,
  },
}
```

しきい値を下回ると `npm run test:coverage` がFAIL扱いになる。CI（Phase 3）で威力を発揮する。

### 7. .gitignore に追加（5分）

カバレッジ出力ディレクトリはコミットしない：

```
# .gitignore に追加
coverage/
```

```bash
git status
# coverage/ が ignoreされていればOK
```

##  まとめ（10分）

### 今日できるようになったこと

- Vitestでカバレッジを計測できる
- 4指標（Statements/Branches/Functions/Lines）の違いが説明できる
- HTMLレポートから弱いファイルを特定し、テストで補強できる

### よくある詰まりポイント

- **`coverage/` を誤ってコミット**：`.gitignore` を忘れずに
- **`include` / `exclude` が適切でない**：テストファイル自体が計測対象になると数字が狂う
- **100%に固執してテストコードが汚れる**：Branchesが低い箇所だけピンポイントに足す

### Phase 2 の総括

これで Phase 2（テスト編）完了。次からは **GitHub Actions** に入る。「PR時に自動でテスト・カバレッジを走らせる」を実現していく。

### 次コマ予告

Phase 3 スタート。GitHub Actions が「何者なのか」から始めて、YAMLの基本を学ぶ。まだワークフローは書かない準備コマ。

##  課題

### 基礎課題（必須）

1. `npm run test:coverage` を実行し、自分のプロジェクトで **Branches が80%未満** のファイルを1つ特定する
2. そのファイルにテストを追加し、80%以上まで上げる
3. Phase 2 でここまでに学んだ内容を、README.mdに「このプロジェクトは〜でテストされている」の1段落にまとめる（3〜5行）

### 応用課題（推奨）

4. `vite.config.js` にカバレッジの **閾値（thresholds）** を設定し、80%未満で `npm run test:coverage` が失敗するようにする：

```js
test: {
  coverage: {
    thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
  },
},
```

→ CIに乗せた時に **「テストが足りないPRは通らない」** という品質ゲートを作る第一歩。

5. 自分のファイル一覧を眺めて、**「このファイルは80%目指すべき／このファイルは無理に書かなくていい」** と **1ファイルずつ判断** してメモにする。例：`utils.js` は100%目指す、`main.jsx` はエントリポイントだけなので対象外、等。**判断理由も添える**

> **狙い：** 「全部80%」と脳死で書くのではなく、**どこに労力をかけるべきかを自分で決める** 練習。

### チャレンジ課題（挑戦）

6. **「カバレッジが100%なのにバグが入り込める」例** を自分で作ってみる。例えば次のコード：

```js
export function divide(a, b) {
  return a / b   // b=0 のテストがない → 100%カバレッジでも NaN/Infinity バグを見逃す
}
```

→ 「全分岐を通過している＝正しい」ではないことを示す反例を1つ作って、テストに追加する。**「カバレッジは必要条件、十分条件ではない」** を体感する

7. **Mutation Testing**（ミューテーション／変異テスト）という概念を調べ、通常のカバレッジ指標と何が違うのかを1〜2行でまとめる（ツール：`stryker-mutator`。実装は任意）
