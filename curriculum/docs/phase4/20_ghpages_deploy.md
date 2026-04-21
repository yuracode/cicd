# コマ20｜GitHub Pagesへの自動デプロイ

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 4 |
| 所要時間 | 90分 |
| 前提コマ | コマ19 デプロイ先選定 |
| 次コマ | コマ21 Vercel連携・プレビューデプロイ |

##  目標

- Vite の `base` 設定を変更し、サブディレクトリURLでビルドできる
- GitHub Pages にデプロイするワークフローを書ける
- main への push をトリガーに自動で本番URLが更新される状態にできる

##  導入（15分）

### 前回の振り返り

GitHub Pages と Vercel の違いを比較した。今日は GitHub Pages を自分でセットアップ。

### 今日のゴール

1. Viteの `base` を設定
2. GitHub Actionsで自動デプロイワークフローを作成
3. main にマージ → 数分後に公開URLで見られる状態

### URL のイメージ

**リポジトリ名が `todo-app` の場合：**

```
https://ユーザー名.github.io/todo-app/
```

##  本題（65分）

### 1. リポジトリを public に（5分）

GitHub Pages は **Free プランで public リポジトリのみ**（Pro/Team/Enterpriseなら private も可）。

```bash
cd ~/workspace/todo-app
gh repo edit --visibility public
```

プロンプトで `y` を押して確定。

### 2. Vite の base 設定（10分）

ルート（`/`）ではなく `/todo-app/` に配信されるので、静的アセットのパスを合わせる。

`vite.config.js` を編集：

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/todo-app/',  // ← リポジトリ名を指定
  test: {
    // ... 既存のtest設定 ...
  },
})
```

> **`base` を間違えると**：CSSや画像が404で読み込めず真っ白な画面になる典型。

ローカルでビルド確認：

```bash
git switch main
git pull origin main
git switch -c feature/gh-pages-deploy

npm run build
npm run preview
```

`http://localhost:4173/todo-app/` で表示されればOK。

### 3. GitHub Pages の公開設定（10分）

GitHub側での設定：

```bash
gh repo view --web
```

**Settings → Pages**

- **Source：** `GitHub Actions` を選択

> **旧来の方法「`gh-pages` ブランチから配信」はレガシー**。最近は GitHub Actions 経由が推奨。

### 4. デプロイワークフローを作る（20分）

`.github/workflows/deploy-ghpages.yml` を新規作成：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

# 同時実行制御：多重デプロイを防ぐ
concurrency:
  group: 'pages'
  cancel-in-progress: true

# 必要な権限（GitHub Actionsからページを書き換えるため）
permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: チェックアウト
        uses: actions/checkout@v4

      - name: Node.js 24 をセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: 依存インストール
        run: npm ci

      - name: ビルド
        run: npm run build

      - name: Pages 用にアップロード
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: GitHub Pages にデプロイ
        id: deployment
        uses: actions/deploy-pages@v4
```

> **ワークフロー解説：**
>
> - **`concurrency`**：同じグループ（pages）のジョブが重複したら前のをキャンセル。速く・無駄なくデプロイできる
> - **`permissions`**：Pagesへの書き込みに必要。忘れると403で失敗
> - **`actions/upload-pages-artifact`**：`dist/` をGitHub Pages用にパック
> - **`actions/deploy-pages`**：実際の公開。成功すると `page_url` を出力

### 5. テスト通過を前提にする（CIとの連携）（10分）

「テストが通らない限りデプロイしない」ほうが安全。`build` ジョブの中でテストも走らせる：

```yaml
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - name: テスト実行
        run: npm run test -- --run
      - name: ビルド
        run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
```

### 6. push してデプロイ体験（10分）

```bash
git add .
git commit -m "ci: GitHub Pages への自動デプロイを追加"
git push -u origin feature/gh-pages-deploy
gh pr create --title "GitHub Pages 自動デプロイ" --body "main マージ時に本番公開"
```

**ポイント：** PR時点ではデプロイは走らない（`on: push: branches: [main]` のため）。mainにマージした瞬間に発火する。

CI（lint/test）が緑になったらマージ：

```bash
gh pr merge --squash --delete-branch
git switch main
git pull origin main
```

Actionsタブで **Deploy to GitHub Pages** が実行中になる。

完了後、**環境 → github-pages** に公開URLが表示される：

```
https://ユーザー名.github.io/todo-app/
```

ブラウザで開いてTODOアプリが動けば成功。

### 7. 本番で localStorage が効くか確認（5分）

- TODOを追加 → リロード → 残るか
- ブラウザの開発者ツールで Network タブを見て、`/todo-app/assets/...` が全部200で読めているか

404が出ていたら `base` 設定を見直す。

### 8. トラブルシュートのコツ（5分）

| 症状 | 原因 |
|------|------|
| 真っ白画面 | `base` 設定が違う / `/` と `/todo-app/` の不整合 |
| CSSが効かない | 同上 |
| Actions が権限エラー | `permissions:` 不足 |
| デプロイが完了しない | リポジトリがprivate のまま / Pages Source設定忘れ |
| URL開くと 404 | Pages設定が `GitHub Actions` になっているか確認 |

##  まとめ（10分）

### 今日できるようになったこと

- Vite の `base` を設定してGitHub Pages向けにビルドできる
- ワークフローで自動デプロイできる
- main マージ → 公開URL更新 の流れを構築

### よくある詰まりポイント

- **`base` 忘れ**：本番で真っ白。数分悩む人多し
- **リポジトリがprivate** → Free プランでは Pages が有効化できない。publicに
- **ブラウザキャッシュ**：更新が反映されないように見える時は **Ctrl + Shift + R** で強制リロード

### 次コマ予告

次回は **Vercel**。GitHub Pages との違い、PRプレビューの強力さを体感する。同じ TODOアプリを Vercel にもデプロイする。

##  課題

### 基礎課題（必須）

1. 公開URLを README.md の冒頭に載せる：

```markdown
[![Deploy](https://img.shields.io/badge/Live-Demo-green)](https://ユーザー名.github.io/todo-app/)
```

2. `build` ジョブに `npm run lint` も入れて、Lint失敗時はデプロイしないようにする
3. 公開URLを友達や家族に送って、実際に使ってもらう（この達成感が重要）

### 応用課題（推奨）

4. **デプロイ前にビルド成果物のサイズを表示** するステップを追加する：

```yaml
- name: ビルドサイズを確認
  run: |
    du -sh dist/
    ls -lh dist/assets/
```

→ Actions のログでPRごとに dist/ のサイズが記録される。**サイズが急に膨らんだらアラート** できる土台。

5. **カスタムドメイン設定** の手順を公式ドキュメントで調べ、以下をメモする（実施は任意）：
   - リポジトリに `CNAME` ファイルを置く
   - DNS の CNAME レコード設定
   - HTTPS の自動発行まで何分かかるか

実際のドメインを持っていなくても、**手順を読んで理解** することが価値。

### チャレンジ課題（挑戦）

6. **`base` を環境変数で切り替える** 設定に変更する（次コマで Vercel と両立させるための準備）：

```javascript
// vite.config.js
export default defineConfig(() => ({
  plugins: [react()],
  base: process.env.DEPLOY_TARGET === 'gh-pages' ? '/todo-app/' : '/',
  // ...
}))
```

そしてワークフローで：

```yaml
- run: npm run build
  env:
    DEPLOY_TARGET: gh-pages
```

→ ローカル実行時は `/`、GitHub Pages 用ビルド時だけ `/todo-app/` になることを確認。

7. **GitHub Pages の URL 構造** を調べる：ユーザーサイト（`username.github.io`）と プロジェクトサイト（`username.github.io/repo-name`）の違い、**組織アカウント** の場合の違いを1〜2行にまとめる
