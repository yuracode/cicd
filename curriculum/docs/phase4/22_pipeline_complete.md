# コマ22｜パイプライン完成（一気通貫）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 4 |
| 所要時間 | 90分 |
| 前提コマ | コマ21 Vercel連携・プレビューデプロイ |
| 次コマ | コマ23 デバッグ演習 |

##  目標

- Push → Lint → Test → Build → Deploy の全自動パイプラインを整理できる
- ジョブ間依存を `needs:` で設計できる
- README にバッジ・構成図を書き、プロジェクトの全体像を第三者に伝えられる

##  導入（15分）

### 前回までの振り返り

ここまでで以下が全部揃った：

1. React + テスト（Phase 1-2）
2. CI（Lint / Test / Coverage）（Phase 3）
3. デプロイ（GitHub Pages / Vercel）（Phase 4前半）

ただ、**バラバラの .yml** や **設定の重複** が残っているので、整理する。

### 今日のゴール

**1本のパイプライン図** として整理し、実務で「CI/CDの流れ」を説明できる状態に仕上げる。

```
┌─────────────────────────────────────────────────────────┐
│  開発者が push                                            │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  ci.yml（並列）                                           │
│   ├─ lint ジョブ（ESLint + Prettier）                     │
│   └─ test ジョブ（Vitest + Coverage）                     │
└──────────────┬──────────────────────────────────────────┘
               │両方緑
               ▼
         ┌─────┴─────┐
         ▼           ▼
 ┌─────────────┐ ┌──────────────┐
 │ GH Pages    │ │ Vercel        │
 │ (main only) │ │ (PR + main)   │
 └─────────────┘ └──────────────┘
```

##  本題（65分）

### 1. ワークフロー構成を見直す（10分）

今あるワークフロー：

- `.github/workflows/ci.yml`（lint + test）
- `.github/workflows/deploy-ghpages.yml`
- `.github/workflows/hello.yml`（コマ14の実験用 → 今日は削除）

**整理：**

```bash
cd ~/workspace/todo-app
git switch main
git pull origin main
git switch -c chore/pipeline-cleanup

rm .github/workflows/hello.yml
```

### 2. ci.yml を最終形に（15分）

Phase 3〜4 で断片的に作ってきた CI を **これ1本で完結** させる版：

`.github/workflows/ci.yml` を上書き：

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
      - name: カバレッジ計測
        run: npm run test:coverage
      - name: カバレッジ保存
        uses: actions/upload-artifact@v4
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
      - name: Artifact に保存
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 3
```

> **新要素：**
>
> - **`concurrency`**：同じブランチの進行中CIを自動キャンセル（PRに連続pushした時など）
> - **`needs: [lint, test]`**：lintとtestが両方成功してからbuildが走る
> - **`build` ジョブ追加**：デプロイ前にビルドが成功するか別ジョブで確認

### 3. GitHub Pages デプロイを ci.yml から連鎖させる（15分）

別ファイルに分けていた `deploy-ghpages.yml` を、ci.yml の `build` を利用する形に組み替え。

`.github/workflows/deploy-ghpages.yml` を上書き：

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
      - name: ビルド（GH Pages 用）
        env:
          DEPLOY_TARGET: gh-pages
        run: npm run build
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

> **独立したワークフローにしている理由：** `permissions` 要件が特殊で、CIと同じジョブには入れにくい。分けたままが素直。

### 4. README を仕上げる（15分）

第三者（＝レビュワー・発表の観衆）が **README を見るだけ** でプロジェクトを理解できる状態に。

`README.md` を上書き：

```markdown
# TODO App

React 19 + Vite で作った学習用TODOアプリ。

[![CI](https://github.com/ユーザー名/todo-app/actions/workflows/ci.yml/badge.svg)](https://github.com/ユーザー名/todo-app/actions/workflows/ci.yml)
[![Deploy](https://github.com/ユーザー名/todo-app/actions/workflows/deploy-ghpages.yml/badge.svg)](https://github.com/ユーザー名/todo-app/actions/workflows/deploy-ghpages.yml)

##  公開URL

- **本番（Vercel）**：https://todo-app-xxxx.vercel.app/
- **本番（GitHub Pages）**：https://ユーザー名.github.io/todo-app/

##  技術スタック

- React 19 / Vite
- Vitest / React Testing Library
- ESLint / Prettier
- GitHub Actions（CI/CD）
- GitHub Pages / Vercel（デプロイ）

##  ローカル開発

\`\`\`bash
npm install
npm run dev       # 開発サーバ
npm run test      # テスト（watchモード）
npm run lint      # Lint
npm run format    # 整形
npm run build     # 本番ビルド
\`\`\`

##  CI/CD パイプライン

\`\`\`
push / PR
  ├─ Lint（ESLint + Prettier）
  └─ Test（Vitest + Coverage）
       └─ Build
             └─ Deploy
                 ├─ GitHub Pages（main push）
                 └─ Vercel（自動・PRはプレビュー）
\`\`\`

## 📄 ライセンス

MIT
```

> **バッジURL：** `https://github.com/〜/actions/workflows/〜.yml/badge.svg` で取得。現在の CI 状態が緑／赤で表示される。

### 5. コミット & マージ（5分）

```bash
git add .
git commit -m "chore: CI/CDパイプラインを整理＆README更新"
git push -u origin chore/pipeline-cleanup
gh pr create --title "CI/CDパイプライン整理" --body "$(cat <<'EOF'
## 変更
- 不要な hello.yml を削除
- ci.yml を build ステージ追加の最終形に
- README に公開URL・CI/CD構成図を追記

## 確認
- [x] PR でCI全パス
- [x] Vercel プレビューが動く
EOF
)"
```

CI全緑を確認 → マージ → mainの GH Pages・Vercel 両方で動作確認。

### 6. 作業の証拠を整える（5分）

**発表資料・Phase 5 のために：**

1. Actionsタブを開いて、**数十回のワークフロー実行履歴** をスクリーンショット
2. README のトップをスクリーンショット（バッジ緑の状態）
3. Vercel のPRプレビューコメントをスクリーンショット

→ Phase 5 の発表で「これだけの自動化を構築した」証拠として使う。

##  まとめ（10分）

### 今日できるようになったこと

- Lint / Test / Build / Deploy の4ステージの依存関係を設計できる
- 複数ワークフローファイルを整理し、重複なく構成できる
- READMEにバッジ・構成図を書いて全体像を第三者に伝えられる

### Phase 4 前半の到達点

**「push 1回で、壊れていないコードだけが自動的に公開される」** 状態が完成した。これが現代のWeb開発の標準的なセットアップ。Phase 4 後半ではこれをデバッグしたりチーム運用したりする。

### よくある詰まりポイント

- **`needs:` ループ**：ジョブAが B を needs、B が A を needs → デッドロック。循環参照に注意
- **バッジURLのユーザー名忘れ**：README例の `ユーザー名` を実名に置換忘れしやすい
- **PR毎のVercelビルドが多すぎる**：コミット頻度とビルド時間のバランスに注意（個人利用なら無料枠内）

### 次コマ予告

次回は **デバッグ演習**。わざと壊れたワークフローを配って、ログを読み解いて直す練習。実務ではここが一番時間を使う部分。

##  課題

### 基礎課題（必須）

1. 自分のプロジェクトのREADMEをチームメイト／家族に見せて、「何ができるアプリで、どう動いているか」30秒で説明してもらう（伝われば勝ち）
2. `ci.yml` に `build` ジョブの Artifact をPRコメントにリンクするステップを追加する（調べ課題）

### 応用課題（推奨）

3. **ワークフローの実行時間を計測** し、ボトルネックを特定する：
   - 各ジョブの実行時間を Actions タブで確認
   - 最も時間がかかっているステップは？（たいていは `npm ci` か `npm run test`）
   - キャッシュを有効化する前後で差が出るか

4. **並列ジョブの依存関係図を README に追加**。mermaid構文が使える：

```markdown
\`\`\`mermaid
graph LR
  Push --> Lint
  Push --> Test
  Lint --> Build
  Test --> Build
  Build --> GHPages
  Build --> Vercel
\`\`\`
```

→ 文章より図のほうが伝わる。GitHub は mermaid をレンダリングしてくれる。

5. **各ワークフローに `timeout-minutes:` を設定** する（例：`timeout-minutes: 10`）。暴走ジョブで無料枠を食いつぶさない守り

> **狙い：** 「動いているからヨシ」ではなく、**時間・コスト・失敗時の影響** まで設計して初めてパイプライン。

### チャレンジ課題（挑戦）

6. **dist/ サイズが閾値を超えたら PR を失敗** させる仕組みを組む：

```yaml
- name: サイズチェック
  run: |
    SIZE=$(du -sb dist/ | cut -f1)
    echo "dist size: $SIZE bytes"
    if [ $SIZE -gt 524288 ]; then    # 512KB
      echo "❌ dist is too large"
      exit 1
    fi
```

→ パフォーマンス意識を **仕組み** で担保する。誰かが気付くのを待たない。

7. **ワークフローの依存関係** を別の視点で整理：「もし lint だけ手動で再実行したい時は？」「失敗したジョブだけ re-run したい時は？」を調べて、**GitHub UI の Re-run 機能** を1度使ってみる
