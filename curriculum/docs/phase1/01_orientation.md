# コマ1｜オリエンテーション・環境構築

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | なし（初回） |
| 次コマ | コマ2 コンポーネント・props・state基礎 |

## 🎯 目標

- 「技術研究」全30コマのゴールと、毎回の進め方を説明できる
- WSL2 Ubuntu上に Node.js 24 と必要ツールをセットアップできる
- Vite + React 19 のテンプレートからプロジェクトを作成し、ブラウザで起動できる

## 📋 導入（15分）

### 授業のゴール

この授業では半年かけて、**「自分で作ったReactアプリをGitHub経由で自動デプロイするところまで」** を一気通貫で体験してもらう。

現場の開発現場ではコードを書くだけでは終わらず、
1. **書く** → 2. **テストする** → 3. **CIで自動チェックする** → 4. **自動デプロイする**
という流れが当たり前になっている。この流れ（CI/CDパイプライン）を自分の手で構築できるようになるのがゴール。

### 最終成果物イメージ

- Phase 5の個人制作で、自作Reactアプリに自動テスト・自動デプロイのパイプラインを構築して発表
- 発表会ではURL・GitHub・READMEの3点セットを共有

### 進め方の説明

- 全30コマ、毎回 **導入15分 / 本題65分 / まとめ10分** が基本
- ほぼ毎回手を動かす。聞くだけの授業ではない
- 詰まった時は隣と相談 → 講師に聞く の順で

## 🛠 本題（65分）

### 1. 環境確認（10分）

まず手元のWSL2 Ubuntuが使える状態か確認する。

```bash
# WSL2 内で実行
uname -a
# => Linux ... microsoft-standard-WSL2 と出ればOK

# ホームディレクトリの確認
cd ~
pwd
# => /home/ユーザー名
```

> **WSL2 とは**：Windows上でLinux（Ubuntu）を動かす仕組み。開発現場ではLinux環境で動かすことが多いので、Windowsユーザーでも同じ感覚で作業できるようにWSL2を使う。

### 2. Node.js 24 のインストール（20分）

Node.jsのバージョンを柔軟に切り替えられるように、バージョン管理ツール **nvm** を使う。

```bash
# nvm インストール
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# シェルを再読み込み
source ~/.bashrc

# インストール確認
command -v nvm
# => nvm と表示されればOK
```

> **nvm を使う理由**：プロジェクトによって必要なNodeバージョンが違うことが多い。nvmを使うと `nvm use 24` のようにワンコマンドで切り替えられる。

```bash
# Node.js 24 をインストール
nvm install 24

# デフォルトに設定
nvm alias default 24

# バージョン確認
node -v
# => v24.x.x
npm -v
# => 10.x 以上
```

### 3. Git と GitHubアカウントの確認（5分）

```bash
# Git インストール済みか確認
git --version
# => git version 2.x.x

# 名前とメールが登録されているか確認
git config --global user.name
git config --global user.email
```

未登録の場合は設定する：

```bash
git config --global user.name "あなたの名前"
git config --global user.email "github登録メール@example.com"
```

> GitHubのアカウントは学校配布済みの前提。持っていない人は授業後すぐ作成する。

### 4. VS Code と拡張機能（5分）

WindowsのVS Codeから WSL2に接続できるようにする。

- 拡張機能「**WSL**」（Microsoft製）をインストール
- 拡張機能「**ES7+ React/Redux/React-Native snippets**」
- 拡張機能「**Prettier - Code formatter**」

VS Codeから WSL2 のホームを開く：

```bash
# WSL2内で実行（ホームディレクトリから）
code .
```

初回のみVS Code Serverが自動インストールされる。

### 5. 初めての Vite + React プロジェクト作成（20分）

作業用ディレクトリを作って、Viteで新規プロジェクトを作成する。

```bash
# 作業フォルダ作成
mkdir -p ~/workspace
cd ~/workspace

# Vite で React プロジェクト作成
npm create vite@latest hello-react -- --template react
```

> **Vite（ヴィート）とは**：Reactプロジェクトを爆速で立ち上げられるビルドツール。昔は Create React App（CRA）が主流だったが、今はViteが公式推奨。
>
> **`--template react`** はJavaScript版のテンプレート。`react-ts` ならTypeScript版になる（この授業ではJavaScript版を使う）。

```bash
# 作成したプロジェクトに移動
cd hello-react

# 依存パッケージをインストール
npm install

# 開発サーバ起動
npm run dev
```

`http://localhost:5173` が表示されたらブラウザで開く。Reactのロゴが回っているページが見えれば成功。

> `Ctrl + C` でサーバ停止。

### 6. ソースコードを軽く眺める（5分）

`src/App.jsx` を開いて、HTMLっぽいものがJSに書かれていることを確認する。

```jsx
function App() {
  return (
    <div>
      <h1>Hello, React 19!</h1>
    </div>
  )
}

export default App
```

保存すると、ブラウザが自動でリロードされて変更が反映される（**ホットリロード**）。これがVite開発の気持ちよさ。

## ✅ まとめ（10分）

### 今日できるようになったこと

- WSL2 + Node.js 24 + Vite + React 19 の開発環境が整った
- `npm run dev` で開発サーバが起動することを理解した

### よくある詰まりポイント

- **`nvm: command not found`**：`source ~/.bashrc` を実行するか、ターミナルを開き直す
- **`npm create vite` で固まる**：社内ネットワーク等でプロキシが原因のことが多い。学校のWi-Fiで再試行する

### 次コマ予告

次回はJSXの書き方、コンポーネント、props、useStateを使って、ボタンをクリックしたらカウントが増える「カウンターアプリ」を作る。

## 📝 課題

1. `App.jsx` の `<h1>` の中身を自分の名前＋好きな言葉に書き換えて、ブラウザで確認する
2. 作ったプロジェクトを `git init` しておく（リモートへのpushは次々回）

```bash
cd ~/workspace/hello-react
git init
git add .
git commit -m "initial commit"
```
