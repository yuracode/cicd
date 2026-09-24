# コマ20｜デプロイ先の比較と選定

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 4 |
| 所要時間 | 90分 |
| 前提コマ | コマ19 Secretsと環境変数 |
| 次コマ | コマ21 Vercelへのデプロイ |

##  目標

- デプロイとは何か、「静的ホスティング」と「サーバを動かすホスティング」の違いを説明できる
- Next.js の静的書き出し（`output: 'export'`）を試し、できること・できないことを確かめられる
- GitHub Pages と Vercel を比べ、アプリの機能に合った公開先を選べる

##  導入

### Phase 3 の振り返り

PR を出すと lint・test・build が自動で実行され、全部緑でないと `main` にマージできないようになった。ここまでが **CI**。

### Phase 4 で作るもの

`main` にマージされたら、**自動でインターネットに公開される** ところまでつなげる（**CD**）。

```text
ブランチで開発 → PR → CI（lint / test / build）→ マージ → 自動デプロイ → 公開 URL
                                                     ↑ Phase 4 はここ
```

| コマ | 内容 |
|------|------|
| 20 | デプロイ先の比較と選定（今回） |
| 21 | Vercel へのデプロイ |
| 22 | GitHub Pages へのデプロイ（GitHub Actions） |
| 23 | CI/CD パイプラインの完成 |
| 24 | トラブルシューティング演習 |
| 25 | チーム開発シミュレーション |

### 考えてみよう

> `npm run dev` で見ている画面を、友だちのスマホで見てもらうには何が必要？

自分の PC は、外のインターネットからは見えない。**いつでも誰でもアクセスできる場所（サーバ）に、アプリを置く** 必要がある。これが **デプロイ**。

##  本題

### 1. 2種類のホスティング

アプリを置く場所（**ホスティング**）には、大きく2種類ある。

| | 静的ホスティング | サーバを動かすホスティング |
|--|----------------|------------------------|
| 置くもの | 完成した HTML / CSS / JS のファイル | Next.js のサーバ（Node.js）ごと |
| アクセスされたとき | 置いてあるファイルをそのまま返す | リクエストのたびにサーバがページを作れる |
| 例 | GitHub Pages、Netlify、Cloudflare Pages | Vercel、Render、自分で借りたサーバ |
| 得意なこと | 速い・安い（無料が多い）・壊れにくい | ログイン・データベース・人ごとに違うページ |

### 2. ビルド結果の記号を読む

```bash
cd ~/workspace/todo-app
git switch main
git pull
npm run build
```

```text
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /about
└ ○ /tips

○  (Static)  prerendered as static content
```

| 記号 | 意味 |
|------|------|
| `○` (Static) | ビルドのときに HTML まで作ってしまえるページ |
| `ƒ` (Dynamic) | アクセスされるたびにサーバで作るページ |

`todo-app` は **全部 `○`**。TODO のデータはブラウザの localStorage にあるので、サーバで人ごとにページを作る必要がない。つまり、**静的ホスティングでも公開できる**。

### 3. 静的書き出しを試す

Next.js の設定で `output: 'export'` にすると、ビルド結果を **HTML などのファイルだけ** で書き出せる。今日は試すだけなので、ブランチを切って作業する（コミットはしない）。

```bash
git switch -c try/static-export
```

```js
// next.config.mjs（試しに変更）
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
}

export default nextConfig
```

```bash
npm run build
ls out
```

```text
404.html  _next  about.html  favicon.ico  index.html  tips.html  ...
```

`out/` の中に、ページごとの HTML と、`_next/` に JavaScript や CSS ができている。これだけあれば、**どんな静的ホスティングにも置ける**。

中身を開いて確かめる。

```bash
head -c 500 out/about.html
```

「このアプリについて」の文章が、HTML の中にすでに書き込まれている。

### 4. 書き出したファイルを配信してみる

`out/` をそのまま配信する簡単なサーバで確かめる。

```bash
npx --yes serve out
```

表示された http://localhost:3000 を開く。

- TODO の追加・完了・削除ができる
- 再読み込みしても TODO が残る（localStorage）
- ヘッダーのリンクで about・tips に移動できる

**Node.js の Next.js サーバを動かしていないのに、アプリとして動く**。ページの HTML はビルドのときに作ってあり、ボタンなどの動きはブラウザの JavaScript が担当しているから。

`Ctrl + C` で止める。

> **serve** は、フォルダの中身をそのまま返すだけの小さな Web サーバ。GitHub Pages がやっていることと、ほぼ同じ。

### 5. 静的書き出しでは使えない機能

アクセスのたびに結果が変わる API（Route Handler）を追加してみる。

```bash
mkdir -p app/api/time
```

```js
// app/api/time/route.js（試しに作る）
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ now: new Date().toISOString() })
}
```

```bash
npm run build
```

```text
Error: export const dynamic = "force-dynamic" on page "/api/time" cannot be used with "output: export".
```

`output: 'export'` は「全部をビルドのときに作る」設定なので、**アクセスのたびにサーバで処理する機能** は使えない。

| 静的書き出しで使えないもの（主なもの） | 例 |
|------------------------------------|-----|
| リクエストのたびに作るページ・API | `dynamic = 'force-dynamic'`、`cookies()`、`headers()` |
| Server Actions | フォームの送信をサーバで処理する |
| 画像の自動最適化 | `next/image` の標準の変換。ビルドは通るが画像が 404 になる（`images.unoptimized: true` にすれば使える） |
| リダイレクトや認証をサーバでする仕組み | `next.config` の `redirects`、Proxy（旧 Middleware） |

試したものを片付ける。

```bash
rm -rf app/api out
git restore next.config.mjs
git switch main
git branch -D try/static-export
```

### 6. もう1つの問題：URL の場所

GitHub Pages で公開すると、URL は次の形になる。

```text
https://ユーザー名.github.io/todo-app/
                             ^^^^^^^^^ リポジトリ名のフォルダの下
```

ところが、ビルドした HTML は `/_next/...` のように **サイトの一番上（`/`）にファイルがある前提** で書かれている。そのまま置くと、`https://ユーザー名.github.io/_next/...` を探しに行って、CSS も JavaScript も見つからない（真っ白な画面になる）。

これを解決するのが **`basePath`**（「このアプリは `/todo-app` の下に置く」という設定）。コマ22で設定する。

### 7. GitHub Pages と Vercel を比べる

| | GitHub Pages | Vercel |
|--|-------------|--------|
| 種類 | 静的ホスティング | サーバを動かすホスティング（Next.js の開発元） |
| 料金 | 公開リポジトリなら無料 | 個人の趣味用（Hobby プラン）は無料 |
| Next.js の機能 | 静的書き出しでできる範囲だけ | **ほぼすべて** |
| 設定 | `output: 'export'`、`basePath`、Actions のワークフローが必要 | ほぼ不要（リポジトリをつなぐだけ） |
| URL | `ユーザー名.github.io/リポジトリ名/` | `プロジェクト名.vercel.app` |
| PR ごとのお試し公開（プレビュー） | 標準ではない | **自動で作られる** |
| デプロイの仕組みを学ぶには | ワークフローを自分で書くので **よく分かる** | 自動なので中身が見えにくい |

### 8. この授業の方針

`todo-app` は **両方に** 公開する。

- **Vercel（コマ21）**：Next.js の機能を制限なく使える本番。PR ごとのプレビューも使う
- **GitHub Pages（コマ22）**：GitHub Actions でビルドからデプロイまでを **自分で書いて**、CD の仕組みを理解する

Phase 5 の個人制作では、自分のアプリの機能に合わせてどちらか（または両方）を選ぶ。

##  演習

### 演習1（基本）：機能ごとに公開先を判断する

次のアプリの機能について、「GitHub Pages（静的）でもできる」か「Vercel などサーバが必要」かを判断し、理由を1行で書く。

1. TODO を localStorage に保存する
2. ログインした人ごとに違う TODO を、サーバのデータベースに保存する
3. JSONPlaceholder から、ボタンを押したときに TODO を取ってくる（コマ12の `SampleLoader`）
4. ビルドした日時をページに表示する（コマ19の演習3）
5. 問い合わせフォームの内容を、サーバで受け取ってメールで送る

**確認方法**：5つすべてに「静的でOK / サーバが必要」と理由を書ければOK。

<details>
<summary>解答例</summary>

1. 静的でOK：保存も読み込みもブラウザの中で完結している
2. サーバが必要：誰がログインしているかをサーバで確かめ、データベースを読み書きする必要がある
3. 静的でOK：通信するのはブラウザの JavaScript で、相手（JSONPlaceholder）が API を用意している
4. 静的でOK：ビルドのときに決まる値なので、HTML に書き込める
5. サーバが必要：メールを送る処理と、そのための秘密の値（API キー）をサーバ側に置く必要がある（外部のフォームサービスを使えば静的でも可能）

</details>

### 演習2（基本）：書き出したファイルを調べる

本題3の手順で `out/` を作り（試したら片付ける）、次を調べる。

1. `out/_next/static/` の中にあるファイルの種類（拡張子）と、だいたいの数
2. `out/index.html` を `grep` して、`/_next/` で始まるパスがいくつ書かれているか（`grep -o '/_next/[^"]*' out/index.html | wc -l`）
3. `out/` 全体のサイズ（`du -sh out`）

**確認方法**：3つの結果をメモし、「このフォルダだけで公開できる理由」を1行で説明できればOK。

### 演習3（応用）：画像の最適化と静的書き出し

`output: 'export'` にした状態で、`public/` に PNG 画像（例：`me.png`）を置き、`app/about/page.js` に `next/image` で表示してビルドする。

```jsx
import Image from 'next/image'

// return の中
<Image src="/me.png" alt="自分の写真" width={120} height={120} />
```

```bash
npm run build
npx --yes serve out
```

**確認方法**：ビルドは成功するのに、`serve` で開いた about ページでは **画像が表示されない（壊れた画像になる）** ことを確かめる。開発者ツールの Network タブや `grep -o '<img[^>]*>' out/about.html` で画像の URL を調べ、原因を説明したうえで `next.config.mjs` を直して表示されるようにできればOK。試したら片付ける。

<details>
<summary>解説</summary>

```html
<img ... src="/_next/image?url=%2Fme.png&amp;w=256&amp;q=75"/>
```

`next/image` は、標準では `/_next/image?url=...` という **サーバの画像変換の仕組み** を通して画像を返す（画像の最適化）。静的書き出しではそのサーバがないので、この URL は 404 になる。**ビルドはエラーにならないので、公開してから気づきやすい** 落とし穴。

次のように設定すると、変換せずに `public/` の画像をそのまま使うようになる。

```js
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
}
```

（SVG は最初から変換されないので、この問題は PNG や JPEG で起きる）

</details>

### 演習4（早く終わった人向け）：他の公開先を調べる

Netlify、Cloudflare Pages、Firebase Hosting、Render の中から2つ選び、次の項目を調べて本題7の表に列を足す。

- 無料で使える範囲
- Next.js の機能がどこまで使えるか（静的のみ / サーバも動く）
- GitHub との連携（PR ごとのプレビューがあるか）

**確認方法**：2つのサービスについて、3項目を埋めた表を作れればOK。

##  まとめ

### 今日できるようになったこと

- 静的ホスティングとサーバを動かすホスティングの違い、ビルド結果の `○` と `ƒ` の意味を説明できるようになった
- `output: 'export'` で書き出した `out/` を `serve` で配信し、Node.js のサーバなしで動くことを確かめた
- GitHub Pages と Vercel の違いを理解し、`todo-app` を両方に公開する方針を立てた

### よくある詰まりポイント

- **`out/index.html` をダブルクリックで開くと真っ白**：`file://` で開くと `/_next/...` のファイルが見つからない。`npx serve out` のように Web サーバ経由で開く
- **静的書き出しでビルドが失敗する**：エラーに `cannot be used with "output: export"` とあれば、静的では使えない機能を使っている。本当にサーバが必要な機能か見直す
- **`out/` をコミットしてしまいそう**：`create-next-app` の `.gitignore` に `/out/` が入っているので、通常は Git に入らない

### 次コマ予告

次回は Vercel にアカウントを作り、`todo-app` のリポジトリをつないで公開する。環境変数の設定と、PR ごとに自動で作られる **プレビュー URL** も体験する。

##  課題

### 基礎課題（必須）

1. 演習1・2を完成させる
2. 自分が Phase 5 で作りたいアプリを1つ思い浮かべ、その主な機能が「静的でOK」か「サーバが必要」かを整理する

### 応用課題（推奨）

3. Next.js 公式ドキュメントの「Static Exports」のページを読み、本題5の表にない「使えない機能」を2つ見つけてまとめる
4. `out/` を GitHub Pages 以外の静的ホスティング（Netlify の Drop 機能など、フォルダをドラッグするだけで公開できるもの）に置いてみる。basePath の問題が起きないのはなぜか考える

### チャレンジ課題（挑戦）

5. 静的ホスティングでも「サーバが必要そうな機能」を実現する方法（外部の API サービス、BaaS と呼ばれる Firebase・Supabase など）を調べ、演習1の 2 や 5 を静的ホスティングで実現するにはどうすればよいかを考える
6. Vercel の料金ページを読み、Hobby プランで「できないこと（禁止されている使い方）」を調べる（ヒント：商用利用）
