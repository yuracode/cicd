# コマ23｜CI/CDパイプラインの完成

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 4 |
| 所要時間 | 90分 |
| 前提コマ | コマ22 GitHub Pagesへのデプロイ（GitHub Actions） |
| 次コマ | コマ24 トラブルシューティング演習 |

##  目標

- CI（lint・test・build）とデプロイを1つのワークフローにまとめ、**CI が通ったものだけ** が公開されるパイプラインを作れる
- `if:` とジョブごとの `permissions` で、「PR では検査だけ、`main` では検査＋デプロイ」を書き分けられる
- Issue → PR → プレビュー → CI → マージ → 自動公開の流れを一人で回し、問題が起きたら `git revert` で戻せる

##  導入

### 前回の振り返り

今の `todo-app` の自動化は、次の3つがばらばらに動いている。

| 仕組み | きっかけ | やること |
|--------|---------|---------|
| `ci.yml` | PR と `main` への push | lint・test・build |
| `deploy-pages.yml` | `main` への push | Pages 向けにビルドしてデプロイ |
| Vercel | すべての push | プレビュー / 本番にデプロイ |

`main` に push されると、`ci.yml` と `deploy-pages.yml` は **同時に** 動き始める。もし `main` で CI が失敗しても、Pages のデプロイは止まらない。

> ルールセットで「CI が通った PR しかマージできない」ようにしてあるので、普段はこれで困らない。それでも、手動実行や、ルールを一時的に外したとき、`main` でだけ起きる失敗（コマ18の「最新にしてから」問題）などで、壊れたものが公開される可能性が残る。

### 今日のゴール

```text
                    ┌──────┐   ┌──────┐
PR / main に push → │ lint │   │ test │
                    └──┬───┘   └──┬───┘
                       └────┬─────┘
                         ┌──┴───┐
                         │build │                         ← ここまでが CI（PR でも main でも）
                         └──┬───┘
                    ┌───────┴────────┐
                    │ pages-build    │ ← main のときだけ    ← ここからが CD
                    └───────┬────────┘
                    ┌───────┴────────┐
                    │ pages-deploy   │ → https://ユーザー名.github.io/todo-app/
                    └────────────────┘
```

**1本の流れ（パイプライン）** にして、前の段が失敗したら後ろの段は動かないようにする。

##  本題

### 1. ci.yml にデプロイを取り込む

```bash
cd ~/workspace/todo-app
git switch main
git pull
git switch -c ci/pipeline
```

`ci.yml` を次のように書き換える（`lint`・`test`・`build` はこれまでと同じ。後ろに2つのジョブを足す）。

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Lint
        run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Test（カバレッジ付き）
        run: npm run test:coverage
      - name: カバレッジのレポートを保存
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_APP_NAME: ${{ vars.APP_NAME }}

  pages-build:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Build（GitHub Pages 向けの静的書き出し）
        run: npm run build
        env:
          GITHUB_PAGES: 'true'
          NEXT_PUBLIC_APP_NAME: ${{ vars.APP_NAME }}
      - uses: actions/upload-pages-artifact@v5
        with:
          path: out

  pages-deploy:
    needs: pages-build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: GitHub Pages にデプロイ
        id: deployment
        uses: actions/deploy-pages@v5
```

そして、役目を終えた `deploy-pages.yml` を消す。

```bash
git rm .github/workflows/deploy-pages.yml
```

### 2. 新しく出てきた書き方

| 部分 | 意味 |
|------|------|
| `if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'` | `main` ブランチで、PR 以外（push か手動実行）のときだけこのジョブを動かす。PR ではスキップされる |
| `needs: pages-build` → `needs: build` → `needs: [lint, test]` | つながったジョブの **どれか1つでも失敗・スキップされたら、後ろは動かない** |
| 一番上の `permissions: contents: read` | すべてのジョブを「読むだけ」にする |
| `pages-deploy` の中の `permissions:` | **このジョブだけ** に Pages へ書き込む権限を与える。CI のジョブ（テストなど）には渡さない |
| `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` | PR では古い実行を止める（無駄を減らす）。`main` では止めない（デプロイを途中で止めないため） |

> **なぜ build を2回するの？** `build` ジョブは Vercel と同じ普通のビルド（サーバあり）で「ビルドできること」を確かめ、`pages-build` は Pages 向けの静的書き出しをする。**設定が違うビルドなので別々に行う**。

> **ルールセットの必須チェックはそのまま**：必須チェックは **ジョブ名**（`lint`・`test`・`build`）で指定している（コマ18）。ワークフローの名前（`name:`）を変えても、ジョブ名が同じなら影響しない。

### 3. PR で「CI だけ」動くことを確かめる

```bash
git add .
git commit -m "ci: CIとGitHub Pagesのデプロイを1本のパイプラインにまとめる"
git push -u origin ci/pipeline
gh pr create --fill
gh pr view --web
```

Actions の画面で実行を開くと、`lint` / `test` → `build` まで動き、`pages-build` と `pages-deploy` は **スキップ**（灰色）になっている。

```bash
gh pr checks --watch
gh pr merge --merge --delete-branch
git switch main
git pull
gh run watch
```

`main` への push では、5つのジョブが順に動き、最後に `pages-deploy` に公開 URL が表示される。

### 4. Vercel はどう守られているか

Vercel は GitHub Actions とは別に、自分で push を見てデプロイしている。

| デプロイ | CI との関係 |
|---------|------------|
| Vercel のプレビュー | CI と **同時に** 作られる。CI が赤くても作られるが、プレビューなので本番には影響しない |
| Vercel の本番 | `main` への push で作られる。`main` には **ルールセットで CI 必須の PR しか入らない** ので、実質的に CI を通ったものだけが本番になる |

つまり今の `todo-app` は、

- **GitHub Pages**：ワークフローの `needs` で CI の後に直接つないでいる
- **Vercel**：ルールセット（PR 必須・CI 必須）で、`main` に入るものを守っている

という2つの方法で「CI が通ったものだけを公開する」ようになっている。

### 5. パイプライン全体を通しで回す

新しい機能を1つ、Issue から公開まで通しで作る。ここでは **フッター** を追加する。

**① Issue を作る**

```bash
gh issue create --title "フッターを追加する" --body "全ページの下に「© 2026 名前」を表示する。"
```

**② ブランチを切って、テストを先に書く**

```bash
git switch -c feature/footer
```

```jsx
// components/Footer.test.js
import { render, screen } from '@testing-library/react'
import Footer from './Footer'

test('著作権表示が出る', () => {
  render(<Footer />)

  expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2026')
})
```

> `<footer>` の role は `contentinfo`（ページの付属情報）。

```bash
npm test   # Footer がないので失敗する
```

**③ 実装する**

```jsx
// components/Footer.js
export default function Footer() {
  return (
    <footer className="footer">
      <small>© 2026 山田 太郎</small>
    </footer>
  )
}
```

```jsx
// app/layout.js（<body> の中、{children} の下に追加）
import Footer from '@/components/Footer'

// ...
<body>
  <Header />
  {children}
  <Footer />
</body>
```

```css
/* app/globals.css（末尾に追加） */
.footer {
  text-align: center;
  padding: 24px 0;
  color: #666;
}
```

**④ 手元で CI と同じチェックをする**

```bash
npm run lint
npm test
npm run build
```

**⑤ PR を作る**

```bash
git add .
git commit -m "feat: フッターを追加"
git push -u origin feature/footer
gh pr create --title "フッターを追加" --body "Closes #<Issue番号>"
```

**⑥ CI とプレビューで確かめる**

- CI：`lint` / `test` / `build` が緑、`pages-build` / `pages-deploy` はスキップ
- Vercel のプレビュー URL でフッターが表示されている

**⑦ マージする**

```bash
gh pr merge --merge --delete-branch
git switch main
git pull
gh run watch
```

**⑧ 公開を確かめる**

- GitHub Pages の URL でフッターが表示される
- Vercel の本番 URL でフッターが表示される
- Issue が Closed になっている

これが、この授業で作ってきた **CI/CD パイプラインの完成形**。

### 6. 公開したものを戻すには：git revert

Pages には Vercel の Instant Rollback のようなボタンがない。**「変更を打ち消すコミット」を作って、もう一度パイプラインに流す** のが基本。

```bash
git switch -c revert/footer
git revert <フッターを追加したマージコミットのID> -m 1
git push -u origin revert/footer
gh pr create --fill
```

- **`git revert`**：指定したコミットの変更を **打ち消す新しいコミット** を作る。履歴は消さないので、`main` のような共有ブランチでも安全に使える
- **`-m 1`**：マージコミットを打ち消すときに、「どちら側を正とするか」を指定する（1 = マージ先の `main` 側）
- コミットの ID は `git log --oneline` で確かめる

この PR をマージすると、CI → Pages のデプロイが走り、Vercel の本番も含めてフッターのない状態に戻る。確かめたら、もう一度フッターを入れ直す（revert の revert をするか、同じ変更の PR を作る）。

> Vercel の Instant Rollback は「すぐに戻す応急処置」、`git revert` は「コードの履歴ごと戻す正式な対応」。本番で問題が起きたら、**まず応急処置で止血し、そのあと revert か修正の PR で直す**。

##  演習

### 演習1（基本）：パイプラインの実行時間を測る

Actions の画面で、`main` への push で動いた CI/CD の実行を開き、次を調べる。

1. 全体でかかった時間
2. 一番時間がかかったジョブと、その中で一番時間がかかったステップ
3. `lint` と `test` が同時に動いたことで、何秒くらい短くなったか（2つを順番に動かした場合との比較）

**確認方法**：3つの数字と、それを調べた画面の場所をメモできればOK。

### 演習2（基本）：実行のまとめ（Summary）に公開 URL を書く

`pages-deploy` ジョブの最後に、公開した URL を Summary に書き込むステップを追加する。

**確認方法**：`main` への push のあと、実行ページの Summary に「公開しました：https://...」と表示され、クリックで開ければOK。

<details>
<summary>解答例</summary>

```yaml
      - name: 公開 URL を Summary に書く
        run: echo "公開しました：${{ steps.deployment.outputs.page_url }}" >> "$GITHUB_STEP_SUMMARY"
```

`steps.deployment` は、同じジョブの `id: deployment` のステップのこと。

</details>

### 演習3（応用）：デプロイの前に「本当に公開していいか」確認する

GitHub の **Environment** の保護ルールを使うと、デプロイの前に人の承認を必須にできる。

1. Settings → **Environments** → `github-pages` → **Required reviewers** に自分を追加して保存
2. 小さな変更の PR を作ってマージする
3. Actions の画面で `pages-deploy` が **Waiting**（承認待ち）になることを確かめる
4. **Review deployments** → `github-pages` にチェック → **Approve and deploy**

**確認方法**：承認するまで Pages が更新されず、承認したら公開されればOK。確かめたら Required reviewers は外しておく（毎回承認が必要になるため）。

> 公開リポジトリなら無料で使える。「テストは自動、公開の最終判断は人」という運用は、実際の現場でもよく使われる。

### 演習4（早く終わった人向け）：Vercel へのデプロイも Actions から行う

Vercel の自動デプロイを止め、GitHub Actions のパイプラインの中から Vercel CLI でデプロイするように変える。

**確認方法**：`main` への push で、`pages-deploy` と並んで `vercel-deploy` ジョブが動き、Vercel の本番が更新されればOK。

<details>
<summary>ヒント</summary>

- Vercel の **Account Settings → Tokens** でトークンを作り、GitHub の Secrets に `VERCEL_TOKEN` として登録する
- 手元で `vercel link` すると `.vercel/project.json` に `orgId` と `projectId` が書かれる。これを Secrets の `VERCEL_ORG_ID` と `VERCEL_PROJECT_ID` に登録する
- ジョブの中では次の順に実行する

```yaml
      - run: npm install -g vercel
      - run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

（`VERCEL_ORG_ID` と `VERCEL_PROJECT_ID` は、`vercel pull` と `vercel build` のステップにも渡す）

- Git 連携による自動デプロイを止めるには、`vercel.json` の `git.deploymentEnabled` を調べる
- 詳しい手順は Vercel のドキュメント「How can I use GitHub Actions with Vercel?」を参照する

コマ19で学んだ Secrets を、本物のデプロイで使う練習になる。

</details>

##  まとめ

### 今日できるようになったこと

- CI とデプロイを `needs` でつなぎ、CI が通ったものだけが Pages に公開されるパイプラインを作った
- `if:` で PR と `main` の動きを書き分け、Pages への書き込み権限をデプロイのジョブだけに絞れるようになった
- Issue → PR → プレビュー → CI → マージ → 自動公開を通しで回し、`git revert` で公開したものを戻せるようになった

### よくある詰まりポイント

- **PR で `pages-build` が動いてしまう / main で動かない**：`if:` の条件を確認する。`github.ref` は `refs/heads/main` の形（`main` だけではない）
- **`pages-deploy` だけ権限エラーになる**：一番上の `permissions: contents: read` だけでは足りない。`pages-deploy` ジョブの中に `pages: write` と `id-token: write` を書く
- **`git revert` で `is a merge but no -m option was given`**：マージコミットを打ち消すときは `-m 1` を付ける

### 次コマ予告

パイプラインは完成したが、実際の開発では **CI が赤くなる** ことが何度もある。次回は、よくある失敗をわざと起こして、**ログから原因を突き止めて直す** トラブルシューティングの練習をする。

##  課題

### 基礎課題（必須）

1. 本題1〜5を完成させ、フッター付きのアプリが Pages と Vercel の両方で公開されている状態にする
2. README に「開発の流れ」の節を作り、Issue からマージ・公開までの手順を自分の言葉で書く

### 応用課題（推奨）

3. 本題6の `git revert` を実際に試し、Pages と Vercel の両方が戻ること、そのあと入れ直せることを確かめる
4. 演習2・3を完成させる

### チャレンジ課題（挑戦）

5. 演習4の「Vercel へのデプロイも Actions から」を完成させる。Vercel の Git 連携によるデプロイと比べて、良い点・悪い点をまとめる
6. `lint`・`test`・`build`・`pages-build` のジョブで毎回 `npm ci` している。`build` ジョブの `.next/cache`（Next.js のビルドのキャッシュ）を `actions/cache` で保存すると、ビルドが速くなるか試す（ヒント：Next.js のドキュメント「Build Cache」の GitHub Actions の例）
