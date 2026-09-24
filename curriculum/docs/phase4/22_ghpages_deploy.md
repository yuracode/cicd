# コマ22｜GitHub Pagesへのデプロイ（GitHub Actions）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 4 |
| 所要時間 | 90分 |
| 前提コマ | コマ21 Vercelへのデプロイ |
| 次コマ | コマ23 CI/CDパイプラインの完成 |

##  目標

- `output: 'export'`・`basePath`・`trailingSlash` を、GitHub Pages 向けのビルドのときだけ有効にできる
- GitHub Actions で「ビルド → artifact のアップロード → Pages へのデプロイ」を行うワークフローを書ける
- 「Vercel では動くのに Pages では動かない」問題を見つけ、テスト付きで直せる

##  導入

### 前回の振り返り

前回は Vercel にリポジトリをつなぎ、設定をほとんど書かずに公開できた。便利な反面、**中で何が起きているかは見えにくい**。

### 今日のゴール

GitHub Pages に、**自分で書いたワークフロー** でデプロイする。

```text
main に push
  └→ build ジョブ：npm ci → 静的書き出し（out/）→ artifact としてアップロード
       └→ deploy ジョブ：artifact を GitHub Pages に公開
            └→ https://ユーザー名.github.io/todo-app/
```

コマ20で見たとおり、GitHub Pages では次の3つが必要になる。

| 必要なこと | 理由 |
|-----------|------|
| `output: 'export'` | Pages は静的ホスティング。HTML などのファイルだけで公開する |
| `basePath: '/todo-app'` | URL が `/todo-app/` の下になる。`/_next/...` を `/todo-app/_next/...` にする |
| `trailingSlash: true` | `about.html` ではなく `about/index.html` で書き出し、Pages で確実にページが見つかるようにする |

ただし、この設定を常に有効にすると、Vercel 側（`/` で公開・サーバあり）が困る。そこで **Pages 向けにビルドするときだけ** 有効にする。

##  本題

### 1. next.config.mjs を切り替え式にする

```bash
cd ~/workspace/todo-app
git switch main
git pull
git switch -c ci/github-pages
```

```js
// next.config.mjs
const isGithubPages = process.env.GITHUB_PAGES === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isGithubPages ? 'export' : undefined,
  basePath: isGithubPages ? '/todo-app' : '',
  trailingSlash: isGithubPages,
  images: {
    unoptimized: isGithubPages,
  },
}

export default nextConfig
```

- 環境変数 `GITHUB_PAGES` が `'true'` のときだけ、Pages 向けの設定になる
- `'/todo-app'` は **リポジトリ名**。違う名前のリポジトリなら、その名前に変える
- 普段の `npm run dev`、`npm run build`、Vercel のビルドには影響しない

> 環境変数の値は **文字列**。`'true'` と文字列で比べている点に注意（`true` と書いても一致しない）。

### 2. 手元で Pages 向けにビルドして確かめる

```bash
GITHUB_PAGES=true npm run build
ls out
ls out/about
```

```text
out/about/index.html  ...
```

`about.html` ではなく `about/index.html` になっている（`trailingSlash: true` の効果）。

HTML の中のパスも確かめる。

```bash
grep -o 'href="[^"]*"' out/index.html | head -5
```

```text
href="/todo-app/_next/static/chunks/xxxx.css"
href="/todo-app/"
href="/todo-app/tips/"
href="/todo-app/about/"
```

すべて `/todo-app/` から始まっている（`basePath` の効果）。

Pages と同じ `/todo-app/` の下に置いて、手元で動作を確かめる。

```bash
rm -rf /tmp/pages-preview
mkdir -p /tmp/pages-preview
cp -r out /tmp/pages-preview/todo-app
npx --yes serve /tmp/pages-preview
```

http://localhost:3000/todo-app/ を開き、TODO の操作とページ移動ができることを確かめる。`Ctrl + C` で止める。

> `GITHUB_PAGES=true npm run build` のように **コマンドの前に `変数=値`** を書くと、そのコマンドの間だけ環境変数を設定できる。

### 3. デプロイのワークフローを書く

```yaml
# .github/workflows/deploy-pages.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Build（静的書き出し）
        run: npm run build
        env:
          GITHUB_PAGES: 'true'
          NEXT_PUBLIC_APP_NAME: ${{ vars.APP_NAME }}
      - name: out/ を Pages 用にアップロード
        uses: actions/upload-pages-artifact@v5
        with:
          path: out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: GitHub Pages にデプロイ
        id: deployment
        uses: actions/deploy-pages@v5
```

新しく出てきたもの：

| 部分 | 意味 |
|------|------|
| `permissions:` | このワークフローに与える **権限**。`pages: write`（Pages に公開する）と `id-token: write`（本人確認のトークンを発行する）が Pages へのデプロイに必要。`contents: read` はコードを読むため |
| `concurrency: group: pages` | デプロイが同時に2つ走らないようにする。`cancel-in-progress: false` で、途中のデプロイは止めずに順番待ちにする |
| `actions/upload-pages-artifact@v5` | `out/` を Pages 用の形式でアップロードする |
| `environment: github-pages` | デプロイ先の **環境**。Actions の画面や、リポジトリのトップの「Deployments」に表示される |
| `id: deployment` と `steps.deployment.outputs.page_url` | ステップに ID を付けると、そのステップの **出力**（ここでは公開 URL）を他の場所で使える |

> **`permissions` を書く理由**：ワークフローには自動で `GITHUB_TOKEN`（リポジトリを操作する鍵）が渡される。**必要な権限だけ** を明示しておくと、万一ワークフローが悪用されても被害が小さくなる。

### 4. GitHub Pages の設定をする

```bash
gh repo view --web
```

**Settings** → 左のメニューの **Pages** → **Build and deployment** の **Source** を **GitHub Actions** にする。

> Source が「Deploy from a branch」のままだと、ワークフローの deploy ジョブが失敗する。

### 5. PR を出してマージする

```bash
git add .
git commit -m "ci: GitHub Pagesへのデプロイを追加"
git push -u origin ci/github-pages
gh pr create --fill
gh pr checks --watch
```

`deploy-pages.yml` は `main` への push でしか動かないので、PR では CI と Vercel のチェックだけが動く。緑になったらマージする。

```bash
gh pr merge --merge --delete-branch
git switch main
git pull
gh run list --workflow=deploy-pages.yml --limit 1
gh run watch
```

Actions タブで `build` → `deploy` の順に進み、`deploy` のボックスに **公開 URL** が表示される。

```text
https://ユーザー名.github.io/todo-app/
```

開いて、TODO の追加・保存・ページ移動を確かめる。

### 6. Pages でだけ起きる問題を見つける

Pages の URL で「このアプリについて」を開く。URL は `/todo-app/about/` のように **末尾に `/` が付いている**。そしてヘッダーを見ると、**今いるページのリンクが白い太字になっていない**。

Vercel の URL で同じページを開くと、正しく太字になる。

原因を調べる。ヘッダーは `usePathname()` の値と、リンクの `href` を比べていた。

```jsx
pathname === link.href   // '/about/' === '/about' → false
```

`trailingSlash: true` にしたので、Pages では `usePathname()` が `'/about/'` を返す。`basePath` の `/todo-app` は自動で取り除かれるが、**末尾の `/` は残る**。

### 7. テストを書いてから直す

比べる処理を関数に切り出し、**先にテストを書く**。

```bash
git switch -c fix/current-path
```

```js
// lib/nav.test.js
import { isCurrentPath } from './nav'

test.each([
  ['/', '/', true],
  ['/about', '/about', true],
  ['/about/', '/about', true],
  ['/about/', '/', false],
  ['/', '/about', false],
])('pathname %s と href %s → %s', (pathname, href, expected) => {
  expect(isCurrentPath(pathname, href)).toBe(expected)
})
```

```js
// lib/nav.js
export function isCurrentPath(pathname, href) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  return normalized === href
}
```

- `/\/$/` は「最後の `/`」を表す **正規表現**。`replace` で空文字に置き換えて取り除く
- `pathname.length > 1` の条件で、トップページの `'/'` だけは残す（取り除くと空文字になってしまう）

`components/Header.js` で使う。

```jsx
// components/Header.js（変更部分）
import { isCurrentPath } from '@/lib/nav'

// return の中の links.map
{links.map((link) => {
  const isCurrent = isCurrentPath(pathname, link.href)
  return (
    <Link
      key={link.href}
      href={link.href}
      className={isCurrent ? 'nav-link active' : 'nav-link'}
      aria-current={isCurrent ? 'page' : undefined}
    >
      {link.label}
    </Link>
  )
})}
```

```bash
npm test
git add .
git commit -m "fix: 末尾にスラッシュがあっても現在のページを判定できるようにする"
git push -u origin fix/current-path
gh pr create --fill
gh pr checks --watch
gh pr merge --merge --delete-branch
```

マージ後、Pages のデプロイが自動で走る。完了したら、Pages の URL でヘッダーが正しく太字になることを確かめる。

> **環境の違いで起きるバグ** は、手元や Vercel だけ見ていると気づけない。「公開先ごとに設定が違う」ときは、**それぞれの公開先で実際に確かめる** こと。そして見つけたバグは、テストを書いて再発を防ぐ。

##  演習

### 演習1（基本）：README に両方の URL を載せる

README の「公開URL」に、GitHub Pages の URL を追加する。さらに、リポジトリのトップページの右側（About の歯車）の **Website** に Pages の URL を設定する。

**確認方法**：リポジトリのトップページから、Pages の URL にワンクリックで行ければOK。

### 演習2（基本）：basePath を間違えるとどうなるか

`next.config.mjs` の `basePath` を `'/todo'`（リポジトリ名と違う）にして、本題2の手順で手元に `/todo-app/` として置いて開いてみる。

**確認方法**：画面が崩れる（CSS が当たらない）か真っ白になり、開発者ツールの Network タブで `/todo/_next/...` が 404 になっていることを確かめられればOK。確かめたら `/todo-app` に戻す。

<details>
<summary>解説</summary>

HTML は `/todo/_next/...` を読み込もうとするが、実際のファイルは `/todo-app/_next/...` にある。**basePath と実際の置き場所が1文字でも違うと、CSS も JavaScript も読み込めない**。Pages で真っ白な画面になったら、まず Network タブで 404 になっているファイルのパスを確認する。

</details>

### 演習3（応用）：main 以外からはデプロイできないことを確かめる

作業ブランチから、手動で Pages のデプロイを動かしてみる。

```bash
gh workflow run deploy-pages.yml --ref <作業ブランチ名>
gh run watch
```

**確認方法**：`build` は成功するが、`deploy` が失敗することを確かめ、ログのメッセージから理由を説明できればOK。

<details>
<summary>解説</summary>

```text
Branch "<作業ブランチ名>" is not allowed to deploy to github-pages due to environment protection rules.
```

GitHub Pages を有効にすると、`github-pages` という **環境（Environment）** が自動で作られ、「`main` からしかデプロイできない」というルールが付く。Settings → **Environments** → `github-pages` で確認できる。作業中のコードがうっかり本番に出るのを防ぐ仕組み。

</details>

### 演習4（早く終わった人向け）：Pages のデプロイを CI の後にする

今の `deploy-pages.yml` は、CI（lint・test）の結果に関係なく、`main` に push されたらビルドしてデプロイする。ルールセットで PR 経由・CI 必須にしてあるので普段は問題ないが、`workflow_dispatch` で手動実行した場合などに、テストしていないものが公開される可能性がある。

`deploy-pages.yml` の `build` ジョブに、`npm run lint` と `npm test` のステップを追加して、失敗したらデプロイしないようにする。

**確認方法**：手動実行（`gh workflow run deploy-pages.yml`）したとき、lint と test を通ってからデプロイされることを Actions のログで確かめられればOK。

> 次回は、CI とデプロイを **1つのパイプライン** にまとめて、この問題をきれいに解決する。

##  まとめ

### 今日できるようになったこと

- 環境変数 `GITHUB_PAGES` で、Pages 向けのビルドのときだけ `output: 'export'`・`basePath`・`trailingSlash` を有効にできるようになった
- `upload-pages-artifact` と `deploy-pages` を使ったワークフローと、`permissions`・`environment` の意味を理解した
- 公開先によって `usePathname()` の値が違うことで起きるバグを見つけ、テストを書いて直せた

### よくある詰まりポイント

- **Pages の URL で真っ白 / CSS が当たらない**：`basePath` がリポジトリ名と一致しているか、ビルドのときに `GITHUB_PAGES: 'true'` が渡っているかを確認する
- **deploy ジョブが `Get Pages site failed` などで失敗する**：Settings → Pages の Source が **GitHub Actions** になっているか確認する
- **`permissions` のエラー（`Resource not accessible by integration` など）**：`pages: write` と `id-token: write` を書き忘れていないか確認する

### 次コマ予告

今、`todo-app` には `ci.yml`（CI）と `deploy-pages.yml`（デプロイ）の2つのワークフローがあり、Vercel は自動でデプロイしている。次回は、**CI が通ったものだけが公開される** 一本のパイプラインに整理し、PR からマージ・公開までの流れ全体を完成させる。

##  課題

### 基礎課題（必須）

1. 本題1〜7を完成させ、Pages の URL でアプリが正しく動く（ヘッダーの太字も含む）状態にする
2. 演習1・2を完成させる

### 応用課題（推奨）

3. `components/Header.test.js` に、`usePathname` が `'/about/'` を返す場合のテストを追加し、「このアプリについて」が現在のページになることを確かめる
4. Pages の URL で存在しないページ（`/todo-app/abc/`）を開き、自作の 404 ページが表示されることを確かめる。`out/404.html` がどのように使われているかを GitHub Pages のドキュメントで調べる

### チャレンジ課題（挑戦）

5. `basePath` の `'/todo-app'` を直接書かず、ワークフローから `PAGES_BASE_PATH: /${{ github.event.repository.name }}` として渡すように変える。リポジトリ名を変えても設定を直さなくてよくなる利点を説明する
6. `actions/configure-pages` アクションについて調べ、何をしてくれるアクションか、今回のワークフローに入れるとしたらどこに入れるかを考える
