# コマ15｜CI：Lintの自動化

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 | 90分 |
| 前提コマ | コマ14 初めてのワークフロー |
| 次コマ | コマ16 CI：テストの自動化 |

##  目標

- ESLint と Prettier の役割の違いを説明できる
- ローカルで `npm run lint` が動く状態にできる
- GitHub Actions で PR 時に Lint を自動実行できる

##  導入（15分）

### 前回の振り返り

Actions が動くようになった。今日からは実用のCI構築。

### Lint とは

**Lint**（リント）＝ コードを静的に解析して **書き方のルール違反** を検出するツール。

身近な例：

- `const` で宣言した変数に再代入してる（バグ）
- import したのに使われていない（不要コード）
- `==` を使っている（`===` が推奨）

### ESLint と Prettier の違い

| | ESLint | Prettier |
|--|--------|----------|
| 役割 | **コード品質**のチェック | **見た目**の整形 |
| 例 | 「未使用変数がある」 | 「セミコロン統一」「行の長さ」 |
| 性質 | ルールで検出／一部自動修正 | 完全自動整形 |

**両方使うのが一般的**。ESLintがバグ寄り、Prettierが見た目寄り、と役割分担。

### Vite + React の ESLint 事情

`npm create vite` で React テンプレを作ると、**デフォルトで ESLint 設定済み**。`eslint.config.js` がプロジェクト直下にある。今回はそれを活用しつつ Prettier を追加する。

##  本題（65分）

### 1. 既存のESLint設定を確認（10分）

```bash
cd ~/workspace/todo-app
git switch main
git pull origin main
git switch -c feature/ci-lint

# 設定ファイル確認
cat eslint.config.js
cat package.json
```

`package.json` の scripts に `lint` がすでにあるはず：

```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

早速ローカルで走らせてみる：

```bash
npm run lint
```

何も出なければ綺麗な状態。もし警告が出たら修正する。

### 2. Prettier を追加（15分）

```bash
npm install -D prettier eslint-config-prettier
```

**役割：**

- `prettier`：整形ツール本体
- `eslint-config-prettier`：ESLintと衝突するルールを無効化する設定

プロジェクト直下に `.prettierrc` を作成：

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

> **設定の意味：**
> - `semi: false`：行末にセミコロンなし（Standard寄りの流儀）
> - `singleQuote: true`：文字列はシングルクォート
> - `printWidth: 100`：1行最大100文字目安
> - `trailingComma: 'es5'`：配列末尾にカンマ

`.prettierignore` を作成（整形対象から外すもの）：

```
node_modules
dist
coverage
.github
```

`package.json` の scripts に追加：

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

> **`--write`**：自動で修正
> **`--check`**：CIで違反を検出するだけ（修正しない）。CIでは `--check` を使う

ESLintとPrettierの衝突を避けるため、`eslint.config.js` の末尾に追加：

```javascript
// eslint.config.js（抜粋）
import prettierConfig from 'eslint-config-prettier'

export default [
  // ... 既存設定 ...
  prettierConfig,  // 最後に置くのがポイント
]
```

動作確認：

```bash
npm run format
npm run lint
npm run format:check
```

### 3. わざと違反を作って検知させる（10分）

`src/App.jsx` をわざと汚す：

```jsx
function App() {
    const    unused    =   123    // インデントバラバラ、未使用変数
    return <div>TODO</div>
}
```

```bash
npm run lint
# => unused is defined but never used のエラー
npm run format:check
# => 整形ルール違反
```

自動整形：

```bash
npm run format
```

未使用変数は ESLint 単独では自動削除しないので手で消す。

### 4. Lintワークフローを作る（15分）

`.github/workflows/lint.yml` を新規作成：

```yaml
name: Lint

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: コードをチェックアウト
        uses: actions/checkout@v4

      - name: Node.js をセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: 依存インストール
        run: npm ci

      - name: ESLint 実行
        run: npm run lint

      - name: Prettier チェック
        run: npm run format:check
```

**重要ポイント：**

- **`npm ci`**：`package-lock.json` 通りに確定インストール。`npm install` よりCIで安定
- **`cache: 'npm'`**：Node.jsセットアップ時に `node_modules` 相当をキャッシュ。2回目以降高速化
- **`node-version: '24'`**：ローカルと合わせる（Node 24）

### 5. push してCIを確認（10分）

```bash
git add .
git commit -m "ci: Lint ワークフローと Prettier を追加"
git push -u origin feature/ci-lint
gh pr create --title "CI で Lint を自動実行" --body "$(cat <<'EOF'
## 変更
- Prettier を追加
- `.github/workflows/lint.yml` で PR 時に ESLint + Prettier check

## 確認項目
- [x] ローカルで `npm run lint` が通る
- [x] ローカルで `npm run format:check` が通る
EOF
)"
```

PR画面で「Checks」が緑になるか確認。

### 6. わざと壊したPRで赤を見る（5分）

別ブランチで：

```bash
git switch -c feature/try-break-lint
```

`src/App.jsx` をわざとフォーマット崩れに：

```jsx
function App(){return <div>Hi</div>}
```

push→PR作成。**Checks が赤くなる** ことを確認。ログに「prettier check failed」と出る。

PR は閉じて（マージしない）ブランチ削除：

```bash
gh pr close 番号
git switch main
git branch -D feature/try-break-lint
```

### 7. 仕上げとマージ（5分）

最初のPR（`feature/ci-lint`）をマージして完了。

```bash
# 元のPRをマージ
gh pr merge 番号 --squash --delete-branch
git switch main
git pull origin main
```

> **`--squash`**：複数コミットを1つにまとめてマージ（履歴がきれい）

##  まとめ（10分）

### 今日できるようになったこと

- ESLint（バグ寄り）と Prettier（見た目寄り）の役割分担が分かった
- `npm run lint` / `npm run format` をローカルで回せる
- CI で PR の時に自動でチェックが走るようになった

### よくある詰まりポイント

- **ESLintとPrettierの衝突**：`eslint-config-prettier` を **最後に** import する
- **キャッシュが効かない**：`package-lock.json` がリポジトリに含まれているか確認
- **`npm ci` が失敗**：`package-lock.json` と `package.json` の不整合。ローカルで `npm install` してコミット

### 次コマ予告

次回はテストもCIで回す。`npm run test` と `npm run test:coverage` をワークフローに追加し、カバレッジをPRコメントに出すところまでやる。

##  課題

### 基礎課題（必須）

1. `.editorconfig` を作成し、エディタ間でインデント等を統一する（2スペース、UTF-8、改行LF）
2. `npm run format` を main ブランチ全体に適用し、差分を1本のPRとしてマージする（コミットメッセージは `chore:` で）

### 応用課題（推奨）

3. **pre-commit フック** を `husky` で導入し、コミット時に自動で `npm run lint` が走るようにする：

```bash
npm install -D husky
npx husky init
echo "npm run lint" > .husky/pre-commit
```

→ わざとlint違反を含むコミットを試して、ブロックされることを確認する。

4. ESLintのルールをカスタマイズする。例えば **`no-console`** を `warn` で有効化して、`console.log` が残っていたらCIで警告が出る状態にする。本番コードに `console.log` が残りがちな問題を仕組みで防ぐ

> **狙い：** 「人の注意力」ではなく「仕組み」でコード品質を担保する。レビューで言わなくても済むことを増やす。

### チャレンジ課題（挑戦）

5. **ESLintエラーを PR の Files changed タブに直接表示** する：

```yaml
- run: npx eslint . --format=@microsoft/eslint-formatter-sarif --output-file=eslint-results.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: eslint-results.sarif
```

または簡易版：

```yaml
- run: npm run lint -- --format=github
```

→ どちらも違反箇所にアノテーションが付き、レビュワーが一目で分かる状態になる

6. **Prettierと ESLint の役割分担の境界線** を自分の言葉で1〜2行にまとめる。両者が衝突する具体例を1つ示す（例：`arrow-parens`）
