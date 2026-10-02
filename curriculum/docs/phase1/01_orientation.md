# コマ1｜オリエンテーション・環境構築（create-next-app で最初の一歩）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | なし（初回） |
| 次コマ | コマ2 JSXとコンポーネント・props |

##  目標

- 「技術研究」全30コマのゴールと、毎回の進め方を説明できる
- Windows の PowerShell で Node.js 24 と Git をセットアップできる
- `create-next-app` で Next.js プロジェクトを作り、`npm run dev` でブラウザに表示できる

##  導入

### このコースのゴール

全30コマかけて、**「自分で作った Next.js アプリを、テストで守り、GitHub から自動で公開する」** ところまでを一気通貫で体験する。

現場の開発はコードを書いて終わりではなく、

1. **書く** → 2. **テストする** → 3. **CI で自動チェックする** → 4. **自動デプロイする**

という流れが当たり前になっている。この流れ（**CI/CD パイプライン**）を自分の手で作れるようになるのがゴール。

### React と Next.js の関係

| 名前 | ひとことで | この授業での役割 |
|------|-----------|-----------------|
| React | 画面を「部品（コンポーネント）」に分けて作る JavaScript ライブラリ | 画面の書き方そのもの |
| Next.js | React で Web サイトを作るための「全部入りの土台（フレームワーク）」 | ページ分け・開発サーバ・本番ビルドを担当 |

React だけだと「ページをどう分けるか」「どうやって公開用にまとめるか」を自分で組み立てる必要がある。Next.js はそこを最初から用意してくれるので、**React の書き方を学ぶことに集中できる**。

> React や Next.js を少し触ったことがある人も、Phase 1 は復習のつもりで最初からやり直してほしい。「なんとなく動いた」を「説明できる」に変えるのが Phase 1 の目的。

### 進め方

- 毎回 **導入 → 本題（先生と一緒に打つ）→ 演習（自分で解く）→ まとめ** の順
- 演習は「基本 → 応用 → 早く終わった人向け」の3段階。**基本までは全員クリア** を目指す
- 詰まったら **エラーメッセージを読む → 公式ドキュメント → 検索 → 周りに聞く** の順

##  本題

### 1. ターミナル（PowerShell）の基本をおさらい

この授業では Windows の **PowerShell** でコマンドを打つ。スタートメニューで「ターミナル」（Windows Terminal）を開くと PowerShell が立ち上がる。まずは「今どこにいるか」を確認するクセをつける。

```powershell
$PSVersionTable.PSVersion   # PowerShell のバージョン（5.1 でも 7.x でもよい）

pwd          # 今いる場所（ディレクトリ）を表示
ls           # 今いる場所のファイル一覧
cd ~         # ホームディレクトリ（C:\Users\ユーザー名）へ移動
mkdir -Force ~/workspace   # 作業用フォルダを作る（-Force は「すでにあってもエラーにしない」）
cd ~/workspace
pwd
# => C:\Users\ユーザー名\workspace
```

> **PowerShell とは**：Windows 標準のコマンド実行環境。`pwd`・`ls`・`cd`・`mkdir` など Linux と同じ名前のコマンドがそのまま使える（中身は PowerShell 版のコマンドの別名）。パスの区切りは `\` だが、`/` で書いても通じる。
>
> **なぜ `~/workspace` に作るのか**：OneDrive と同期されるフォルダ（「ドキュメント」や「デスクトップ」）に作ると、`node_modules` の大量のファイルまで同期されて遅くなったりロックされたりする。プロジェクトは同期対象外の `C:\Users\ユーザー名\workspace` に置く。日本語や空白を含むパスも避ける。

### 2. Node.js 24 と Git をインストールする

Node.js は「ブラウザの外で JavaScript を動かす環境」。Next.js の開発サーバもビルドも Node.js の上で動く。Windows 標準のパッケージ管理ツール **winget** で LTS 版（長期サポート版。2026年秋時点で 24 系）を入れる。Git もここで入れておく。

```powershell
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Git.Git -e
```

インストールが終わったら **ターミナルをいったん閉じて開き直す**（新しく入ったコマンドの場所＝PATH を読み込み直すため）。

```powershell
# 確認
node -v
# => v24.x.x
npm -v
# => 11.x.x など
```

`npm -v` で「このシステムではスクリプトの実行が無効になっているため…」と赤いエラーが出たら、PowerShell のスクリプト実行を自分のユーザーだけ許可する（1回やればよい）。

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
npm -v
```

> **winget とは**：Windows のアプリをコマンドで入れる仕組み。`OpenJS.NodeJS.LTS` は Node.js の LTS 版の ID。
>
> **npm とは**：Node.js に付いてくる「部品（パッケージ）の取り寄せ係」。Next.js も React も npm でダウンロードする。
>
> **実行ポリシーとは**：PowerShell が「スクリプトファイル（`.ps1`）を実行してよいか」を決める設定。`npm` や `npx` は `npm.ps1` というスクリプトとして動くので、初期設定のままだと止められてしまう。

### 3. Git の初期設定

```powershell
git --version
# => git version 2.x.x.windows.x

# 名前とメールを登録（GitHub に登録したメールにする）
git config --global user.name "あなたの名前"
git config --global user.email "github登録メール@example.com"

# 改行コードを勝手に変換しない（理由は下）
git config --global core.autocrlf false

# 確認
git config --global --list
```

> **改行コードとは**：行の終わりを表す見えない文字。Windows は `CRLF`、Linux や Mac は `LF` を使う。CI（GitHub Actions）は Linux で動くので、この授業ではファイルを **LF にそろえる**。Git が勝手に CRLF に変換しないよう `core.autocrlf false` にしておく。

> GitHub アカウントがまだなければ [github.com](https://github.com) で作っておく。コマ7から使う。

### 4. VS Code を準備する

VS Code がまだなければ winget で入れる。

```powershell
winget install --id Microsoft.VisualStudioCode -e
```

VS Code に次の拡張機能を入れる。

- **ESLint**：コードの書き方の問題をその場で教えてくれる
- **Prettier - Code formatter**：保存時にコードの見た目を整える

さらに、VS Code で新しく作るファイルも LF になるように設定する。`Ctrl + ,` で設定を開き、「eol」で検索して **Files: Eol** を `\n` にする。

```powershell
cd ~/workspace
code .
```

VS Code の下のバーに `LF` と出ていればOK（`CRLF` ならクリックして `LF` に変える）。VS Code の中のターミナル（`` Ctrl + ` ``）も PowerShell なので、以降のコマンドはそこで打ってもよい。

### 5. create-next-app でプロジェクトを作る

```powershell
cd ~/workspace
npx create-next-app@latest hello-next --js --eslint --app --no-tailwind --no-src-dir --no-react-compiler --import-alias "@/*" --use-npm --yes
```

オプションが多いので、それぞれの意味を押さえておく。

| オプション | 意味 | この授業で選ぶ理由 |
|-----------|------|-------------------|
| `--js` | JavaScript で作る | まずは JS で React の考え方に集中する（TypeScript は発展編） |
| `--eslint` | ESLint（書き方チェッカー）を入れる | Phase 3 で CI に組み込む |
| `--app` | App Router（`app/` フォルダ方式）を使う | 今の Next.js の標準 |
| `--no-tailwind` | Tailwind CSS を入れない | CSS は素の書き方から（Tailwind は発展編） |
| `--no-src-dir` | `src/` フォルダを作らない | 階層を浅くして見通しをよくする |
| `--import-alias "@/*"` | `@/` でプロジェクト直下から import できる | `../../components/...` 地獄を避ける |
| `--yes` | 残りの質問はすべてデフォルトで答える | 全員同じ構成にそろえる |

> **npx とは**：パッケージを「インストールせずに1回だけ実行する」コマンド。`create-next-app` は最初に1回使うだけなので npx で呼ぶ。

`Success! Created hello-next at ...` と出れば完成。

### 6. 開発サーバを起動する

```powershell
cd hello-next
npm run dev
```

```text
▲ Next.js 16.x.x (Turbopack)
- Local:         http://localhost:3000
- Network:       http://192.168.xx.xx:3000
✓ Ready in 300ms
```

ブラウザで **http://localhost:3000** を開く。Next.js のロゴが出たら成功。

> **開発サーバとは**：自分の PC の中だけで動く「お試し用の Web サーバ」。ファイルを保存すると自動で画面が更新される（**ホットリロード**）。
>
> 止めるときはターミナルで `Ctrl + C`。

### 7. 生成されたファイルを読む

VS Code で `hello-next` を開き、次のファイルを確認する。

```text
hello-next/
├── app/
│   ├── layout.js       # 全ページ共通の外枠（<html> と <body>）
│   ├── page.js         # トップページ（URL の / ）の中身
│   ├── globals.css     # 全ページ共通の CSS
│   └── page.module.css # page.js 専用の CSS
├── public/             # 画像などをそのまま置く場所（/next.svg で参照できる）
├── package.json        # プロジェクトの設定と、使っているパッケージの一覧
├── eslint.config.mjs   # ESLint の設定
└── AGENTS.md / CLAUDE.md  # AI コーディングツール向けの説明書（今は気にしなくてよい）
```

`package.json` の `scripts` を見てみる。

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

`npm run dev` は「`scripts` の `dev` に書かれた `next dev` を実行して」という意味。**`npm run ○○` は `scripts` のショートカット** と覚えておく。

### 8. トップページを最小にする

`app/page.js` の中身を **全部消して**、次のように書き換える。

```jsx
// app/page.js
export default function Home() {
  return (
    <main>
      <h1>Hello, Next.js!</h1>
      <p>はじめての Next.js アプリ</p>
    </main>
  )
}
```

保存すると、ブラウザが自動で書き換わる。

- `export default function Home()`：このファイルの「主役」の関数。Next.js は `app/page.js` の default export を **トップページとして表示する**
- `return ( ... )` の中の HTML っぽいもの：**JSX**（次回詳しくやる）

### 9. Git に最初の記録を残す

`create-next-app` は自動で `git init` と最初のコミットまで済ませてくれている。

```powershell
git log --oneline
# => xxxxxxx Initial commit from Create Next App

git add .
git commit -m "トップページを最小構成にする"
```

> **コミットとは**：その時点のファイルの状態を「セーブポイント」として記録すること。壊しても戻れる安心感が得られる。

##  演習

### 演習1（基本）：自己紹介ページにする

`app/page.js` を書き換えて、次の内容をトップページに表示する。

- `<h1>` に自分の名前
- `<p>` で「出身」「好きなもの」「この授業で作ってみたいもの」の3行

**確認方法**：http://localhost:3000 に自分の自己紹介が表示されればOK。

<details>
<summary>解答例</summary>

```jsx
// app/page.js
export default function Home() {
  return (
    <main>
      <h1>山田 太郎</h1>
      <p>出身：大阪府</p>
      <p>好きなもの：ラーメン、ゲーム</p>
      <p>作ってみたいもの：部活の予定表アプリ</p>
    </main>
  )
}
```

</details>

### 演習2（基本）：わざと壊して、エラーを読む

開発サーバを起動したまま、次を1つずつ試す。**ブラウザとターミナルに何が出たかをメモする**。メモしたら元に戻す。

1. `</h1>` を消す
2. `return (` の直後に `<p>2つ目</p>` を足して、`<main>` の外側に要素が2つ並ぶようにする
3. `export default` の `default` を消す

**確認方法**：3つそれぞれについて「どこに・どんなメッセージが出たか」をメモできればOK。

<details>
<summary>解説</summary>

1. JSX はタグを必ず閉じる必要がある。ブラウザ左下に赤いエラー表示（**エラーオーバーレイ**）が出て、ファイル名と行番号が示される
2. JSX は **1つの親要素** しか return できない。`<main>` の外に並べたいなら全体を `<>...</>`（フラグメント）で囲む
3. Next.js はページファイルの default export を探すので、見つからないと「default export がない」というエラーになる

エラーメッセージには **ファイル名と行番号** がほぼ必ず書いてある。まずそこを見るクセをつける。

</details>

### 演習3（応用）：見た目を整える

`app/page.js` と同じフォルダにある `page.module.css` の中身を全部消して、自分でスタイルを書く。

```jsx
// app/page.js
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.card}>
      <h1>山田 太郎</h1>
      {/* 以下略 */}
    </main>
  )
}
```

```css
/* app/page.module.css */
.card {
  max-width: 480px;
  margin: 40px auto;
  padding: 24px;
  border: 1px solid #ccc;
  border-radius: 12px;
}
```

**確認方法**：自己紹介が枠線付きのカードとして中央に表示されればOK。色・余白は自由にアレンジしてよい。

> **CSS Modules とは**：`○○.module.css` という名前にすると、そのクラス名がそのファイル専用になる仕組み。別のページで同じ `.card` を使っても衝突しない。JSX では `class` ではなく **`className`** と書く点に注意。

### 演習4（早く終わった人向け）：2ページ目を作る

`app/profile/page.js` を新しく作り、http://localhost:3000/profile で別のページが表示されるようにする。

**確認方法**：`/` と `/profile` で違う内容が表示されればOK。

<details>
<summary>解答例とヒント</summary>

```jsx
// app/profile/page.js
export default function Profile() {
  return (
    <main>
      <h1>プロフィール詳細</h1>
      <p>ここに詳しい自己紹介を書く</p>
    </main>
  )
}
```

Next.js では **フォルダ名がそのまま URL になる**（ファイルベースルーティング）。詳しくはコマ6で扱う。

</details>

##  まとめ

### 今日できるようになったこと

- PowerShell + Node.js 24 + Git の開発環境を整えた
- `create-next-app` で Next.js プロジェクトを作り、`npm run dev` で起動できた
- `app/page.js` の default export がトップページになることを確認した

### よくある詰まりポイント

- **`node` や `npm` が「認識されません」と出る**：インストール後にターミナルを開き直していない。全部閉じて開き直す。`npm` だけ赤いエラーなら本題2の `Set-ExecutionPolicy` を実行する
- **ブラウザで開けない**：ターミナルで `npm run dev` が動いたままになっているか確認する。`Ctrl + C` で止めていたら表示されない。ポート3000が使用中だと `3001` で起動するので、ターミナルに表示された URL を開く
- **保存しても画面が変わらない／`npm install` が異常に遅い**：プロジェクトを OneDrive で同期されるフォルダ（デスクトップ・ドキュメント）に作っていないか `pwd` で確認する。ウイルス対策ソフトのリアルタイムスキャンが原因のこともある

### 次コマ予告

次回は JSX のルールをきちんと押さえ、画面を「コンポーネント」という部品に分けて、**props** で中身を差し替えられるようにする。今日作った自己紹介を「プロフィールカード部品」に作り変える。

##  課題

### 基礎課題（必須）

1. 演習1〜3で作った自己紹介ページを完成させ、コミットする

```powershell
git add .
git commit -m "自己紹介ページを作成"
```

2. 次のコマンドの意味を、それぞれ1行で説明するメモを作る：`pwd` / `cd` / `mkdir -Force` / `npx` / `npm run dev` / `git commit`

### 応用課題（推奨）

3. `app/layout.js` の `metadata.title` を自分のサイト名に変え、ブラウザのタブに表示されるタイトルが変わることを確認する。`lang="en"` も `lang="ja"` に直す
4. `public/` に好きな画像（例：`me.png`）を置き、次のように表示する。`public/` のファイルが URL の `/` 直下で参照できることを確かめる

```jsx
// app/page.js
import Image from 'next/image'

export default function Home() {
  return (
    <main>
      <Image src="/me.png" alt="自分の写真" width={120} height={120} />
    </main>
  )
}
```

> Next.js では `<img>` の代わりに `next/image` の `<Image>` を使うのが基本（画像を自動で軽くしてくれる）。`<img>` と書くと ESLint が警告を出す。`width` と `height` は必須。

### チャレンジ課題（挑戦）

5. `npm run build` を実行し、ターミナルに出る表の `○ (Static)` が何を意味するかを調べて1〜2行でまとめる。続けて `npm run start` を実行し、`npm run dev` との違い（起動速度・ホットリロードの有無）を比べる
6. `package.json` の `scripts` に `"hello": "echo Hello from npm"` を追加し、`npm run hello` で動くことを確認する
