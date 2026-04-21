# コマ28｜個人制作④：CI/CD適用

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 5 |
| 所要時間 | 90分 |
| 前提コマ | コマ27 個人制作③：テスト追加 |
| 次コマ | コマ29 発表準備（README・スライド） |

## 🎯 目標

- `.github/workflows/ci.yml` を配置し、PR/push時にLint・テストが自動実行される
- Vercel または GitHub Pages に自動デプロイされる本番URLを公開できる
- ブランチ保護・バッジ・公開URLを README に仕上げる

## 📋 導入（15分）

### 今日のゴール

これまで個人制作に集中してきたが、今日で **自動化** を被せる。

**最終形のPRフロー：**

```
feature/xxx に push
  ↓
PR作成
  ↓
CI（Lint, Test）が自動実行
  ↓
Vercel プレビューURL発行
  ↓
動作確認 → レビュー承認
  ↓
main にマージ
  ↓
本番自動デプロイ
```

### 進め方

Phase 3〜4 の内容を **自分のプロジェクトに適用** するだけ。新しいことは少ない。

## 🛠 本題（65分）

### 1. CI ワークフローを配置（15分）

```bash
cd ~/workspace/自分のアプリ名
git switch main
git pull origin main
git switch -c chore/ci-cd
mkdir -p .github/workflows
```

`.github/workflows/ci.yml`：

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --run
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

### 2. デプロイ先を選ぶ（10分）

コマ19の比較表を見て、自分の好みで選ぶ：

- **Vercel**：楽・PRプレビュー便利
- **GitHub Pages**：自分で書く達成感、学びが多い

両方やっても良いが、発表用には1つに絞っても十分。

**Vercel を選ぶ場合：**

1. Vercel ダッシュボードから New Project でこのリポジトリをImport
2. Framework Preset: Vite
3. 環境変数が必要なら Settings で追加
4. Deploy

**GitHub Pages を選ぶ場合：**

`vite.config.js` に base 設定：

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/リポジトリ名/',
  test: { /* ... */ },
})
```

`.github/workflows/deploy-ghpages.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: 'pages'
  cancel-in-progress: true

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --run
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

GitHub側で **Settings → Pages → Source: GitHub Actions** を選択。
リポジトリが private なら **public** に変更。

### 3. ブランチ保護を有効化（10分）

コマ17の復習。

**Settings → Rules → Rulesets → New branch ruleset**

- Name: `main-protection`
- Enforcement: Active
- Target: Include default branch
- Rules:
  - ✅ Restrict deletions
  - ✅ Require a pull request before merging（Required approvals: 0 でもOK・1人作業なら）
  - ✅ Require status checks to pass（Add: `lint`, `test`, `build`）
  - ✅ Block force pushes

Create で確定。

### 4. CODEOWNERS（5分）

`.github/CODEOWNERS`：

```
* @自分のGitHubユーザー名
```

### 5. README をCI/CD込みで仕上げる（15分）

`README.md` を完成形に：

```markdown
# アプリ名

（1〜2行の説明）

[![CI](https://github.com/ユーザー名/アプリ名/actions/workflows/ci.yml/badge.svg)](https://github.com/ユーザー名/アプリ名/actions/workflows/ci.yml)

## 🌐 公開URL

https://your-app.vercel.app/

## 📸 スクリーンショット

![screenshot](./docs/screenshot.png)

## ✨ 機能

- 機能1
- 機能2
- 機能3

## 🛠 技術スタック

- React 19 / Vite
- Vitest / React Testing Library
- ESLint / Prettier
- GitHub Actions（CI/CD）
- Vercel（デプロイ）

## 🚀 開発

\`\`\`bash
npm install
npm run dev
npm run test
npm run lint
npm run build
\`\`\`

## 🔄 CI/CD パイプライン

\`\`\`
PR / push
  ├─ Lint（ESLint + Prettier）
  └─ Test（Vitest + Coverage）
       └─ Build
             └─ Deploy（main のみ）
\`\`\`

- PR時：Lint・Test 必須パス、Vercel プレビュー発行
- main マージ時：本番自動デプロイ

## 📄 ライセンス

MIT
```

**スクリーンショットを撮る：**

```bash
# Vite 開発サーバで動かして
npm run dev
```

Windows側でアプリ画面のスクリーンショット（`Win + Shift + S`）を撮り、`docs/screenshot.png` として保存。

```bash
mkdir -p docs
# スクリーンショットをそこにコピー
```

### 6. 最終push & 動作確認（10分）

```bash
git add .
git commit -m "ci: CI/CDパイプライン全体を導入"
git push -u origin chore/ci-cd
gh pr create --title "CI/CD 完成" --body "$(cat <<'EOF'
## 変更
- CI ワークフロー（lint, test, build）
- Deploy ワークフロー（Vercel 連携 or GitHub Pages）
- ブランチ保護
- CODEOWNERS
- README 仕上げ

## 動作確認
- [x] PR でCI緑
- [x] 本番URL表示
EOF
)"
```

PRのChecks が全て緑になることを確認。
**Vercel のプレビューURL** が付くことも確認。
マージ → mainの本番URLで動作確認。

## ✅ まとめ（10分）

### 今日の達成

- PR → Lint/Test/Build → プレビュー → マージ → 本番 の全自動化
- README にバッジ・公開URLを掲載
- ブランチ保護で品質ゲート

### よくある詰まりポイント

- **base設定で真っ白（GitHub Pages）** → リポジトリ名と合っているか
- **Secrets未設定でビルド失敗** → 環境変数は Vercel / GitHub 両方に登録が必要
- **ブランチ保護が強すぎて自分でマージできない** → 1人作業なら Required approvals を 0 に

### 次コマ予告

次回は **発表準備**。README と発表スライドを仕上げ、3分で自分のプロジェクトを説明できる状態にする。

## 📝 課題

1. 公開URLを友人・家族・SNS で共有してフィードバックをもらう
2. フィードバックで出た軽微な修正（見た目、誤字等）があれば PR で対応
3. 次回までに発表原稿（何を話すか箇条書き）を考えてくる
