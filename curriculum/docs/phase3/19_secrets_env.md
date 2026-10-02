# コマ19｜Secretsと環境変数

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 | 90分 |
| 前提コマ | コマ18 ブランチ保護（ルールセット） |
| 次コマ | コマ20 デプロイ先の比較と選定 |

##  目標

- 設定値を環境変数としてコードの外に出し、`.env.local` で切り替えられる
- Next.js の `NEXT_PUBLIC_` 付き / なしの環境変数の違いと、**ブラウザに見えてしまう** 危険を説明できる
- GitHub の Variables と Secrets に値を登録し、ワークフローから安全に使える

##  導入

### 前回の振り返り

前回は `main` にルールセットを付け、PR と CI の成功を必須にした。

> 今日の作業もブランチを切って PR でマージする。ルールセットがまだない人も、手順は同じように進められる。

### 考えてみよう

アプリには、コードに直接書きたくない値がある。

| 値の例 | 直接書くと困ること |
|--------|------------------|
| アプリの表示名（開発版 / 本番版で変えたい） | 切り替えるたびにコードを直す必要がある |
| 外部サービスの API キー | GitHub に公開すると **誰でも使えてしまう**（不正利用・高額請求） |
| データベースのパスワード | 同上。一度でも公開したら「漏れた」と考える |

こうした値を **環境変数** としてコードの外に置く。そして、GitHub Actions で使う秘密の値は **Secrets** に預ける。

##  本題

### 1. 環境変数とは

**環境変数** は、プログラムの外（OS やターミナル）から渡される「名前と値」の組。

```powershell
echo $HOME
# => C:\Users\ユーザー名

$env:GREETING = "こんにちは"
node -e "console.log(process.env.GREETING)"
# => こんにちは
```

Node.js では `process.env.名前` で読み取れる。コードは同じでも、**動かす場所ごとに違う値を渡せる**。

### 2. Next.js の .env ファイル

Next.js は、プロジェクト直下の `.env` 系のファイルを自動で読み込み、`process.env` に入れてくれる。

| ファイル | 用途 | Git に入れる？ |
|---------|------|---------------|
| `.env.local` | 自分の PC だけの値（秘密の値もここ） | **入れない** |
| `.env` | 全員共通の初期値 | 秘密がなければ入れてもよい |
| `.env.example` | 「どんな変数が必要か」の見本（値は空かダミー） | **入れる** |

`create-next-app` の `.gitignore` には `.env*` と書いてあり、**`.env` で始まるファイルは全部 Git に入らない** ようになっている。

### 3. アプリ名を環境変数にする

```powershell
cd ~/workspace/todo-app
git switch main
git pull
git switch -c feature/env-app-name
```

設定を読むファイルを作る。

```js
// lib/config.js
export const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'TODOアプリ'
```

`??` は「左が `undefined` か `null` なら右を使う」演算子。環境変数が設定されていなくても動くように、**初期値** を用意しておく。

ヘッダーにアプリ名を表示する。

```jsx
// components/Header.js（変更部分）
import { appName } from '@/lib/config'

// return の中、<nav> の前に追加
<span className="app-name">{appName}</span>
```

```css
/* app/globals.css（末尾に追加） */
.app-name {
  color: #fff;
  font-weight: bold;
  margin-right: 24px;
}
```

VS Code でプロジェクト直下に `.env.local` を新しく作り、次の1行を書いて保存する。

```text
NEXT_PUBLIC_APP_NAME=TODOアプリ（開発版）
```

> PowerShell 5.1 の `echo ... > ファイル` は文字コードが UTF-16 になり、Next.js や Git が正しく読めない。設定ファイルは **VS Code で開いて書く** のが確実。

```powershell
npm run dev
```

ヘッダーに「TODOアプリ（開発版）」と表示されればOK。

> **`.env.local` を書き換えたら `npm run dev` を再起動する**。環境変数はサーバの起動時に読み込まれる。

### 4. NEXT_PUBLIC_ の意味

試しに、`.env.local` に接頭辞のない変数を追加する。

```text
SECRET_WORD=himitsu123
```

`components/Header.js`（Client Component）で表示してみる。

```jsx
<span>{process.env.SECRET_WORD}</span>
```

`npm run dev` を再起動しても、**何も表示されない**。

| 変数の名前 | Server Component / サーバの処理 | Client Component（ブラウザ） |
|-----------|-------------------------------|---------------------------|
| `NEXT_PUBLIC_○○` | 読める | 読める |
| それ以外 | 読める | **読めない（`undefined`）** |

Next.js は、**`NEXT_PUBLIC_` で始まる変数だけ** をブラウザ用の JavaScript に埋め込む。それ以外はサーバの中だけで使える。これは **秘密の値がうっかりブラウザに送られないようにするため** の仕組み。

確認したら `<span>{process.env.SECRET_WORD}</span>` は消す。

### 5. NEXT_PUBLIC_ の値は「誰でも見られる」

ビルドして、`NEXT_PUBLIC_APP_NAME` の値がどこに入るか確かめる。

```powershell
npm run build
Get-ChildItem -Recurse -File .next/static | Select-String -List "開発版" | % Path
```

```text
.next/static/chunks/xxxxxxxx.js
```

ブラウザに配られる JavaScript のファイルに、**値がそのまま書き込まれている**。公開したサイトでも、開発者ツールを開けば誰でも読める。

> **鉄則：API キーやパスワードを `NEXT_PUBLIC_` 付きの変数に入れてはいけない**。「ブラウザで使いたいから」と `NEXT_PUBLIC_` を付けた瞬間、世界中に公開される。秘密の値を使う処理は、サーバ側（Server Component や Route Handler）で行う。

もう1つの注意：`NEXT_PUBLIC_` の値は **ビルドした時点で埋め込まれる**。あとから環境変数を変えても、ビルドし直すまで反映されない。

### 6. .env.example を用意する

`.env.local` は Git に入らないので、他の人（や、別の PC の自分）は「どんな変数が必要か」分からない。見本として `.env.example` を作る。

```text
# .env.example
# コピーして .env.local を作り、値を入れる
NEXT_PUBLIC_APP_NAME=TODOアプリ
```

`.gitignore` の `.env*` のすぐ下に1行足して、`.env.example` だけは Git に入れるようにする。

```text
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

`!` は「上のルールの例外」という意味。

```powershell
git status
# .env.example は表示され、.env.local は表示されないことを確認
```

テストも確認する。

```powershell
npm test
```

`lib/config.js` に初期値を用意したので、テストでは `.env.local` がなくても `TODOアプリ` と表示される。

> Jest（`next/jest`）も `.env` 系のファイルを読み込むが、**テストでは `.env.local` は読まれない**（人によって結果が変わらないようにするため）。テストで使いたい値は `.env.test` に書く。

```powershell
git add .
git commit -m "feat: アプリ名を環境変数 NEXT_PUBLIC_APP_NAME で設定できるようにする"
git push -u origin feature/env-app-name
gh pr create --fill
```

### 7. GitHub の Variables と Secrets

CI（GitHub Actions）には `.env.local` がない。CI で使う値は GitHub に登録する。

| 種類 | 使いどころ | ログでの見え方 | ワークフローでの書き方 |
|------|-----------|--------------|--------------------|
| **Variables** | 秘密ではない設定（アプリ名など） | そのまま表示される | `${{ vars.名前 }}` |
| **Secrets** | 秘密の値（API キー、トークン） | `***` で隠される | `${{ secrets.名前 }}` |

Secrets に登録した値は、**登録した本人も含めて、あとから画面で見ることはできない**（上書きか削除だけ）。

ターミナルから登録する。

```powershell
gh variable set APP_NAME --body "TODOアプリ（CI）"
gh secret set DEMO_SECRET --body "this-is-a-secret"
gh variable list
gh secret list
```

画面からは Settings → **Secrets and variables** → **Actions** で登録・確認できる。

### 8. ワークフローから使う

`ci.yml` の `build` ジョブの Build ステップに `env:` を追加する。

```yaml
# .github/workflows/ci.yml（build ジョブの Build ステップ）
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_APP_NAME: ${{ vars.APP_NAME }}
```

Secrets がログで隠されることも確かめる。`build` ジョブの最後に、練習用のステップを追加する。

```yaml
      - name: Secrets の練習（あとで消す）
        run: |
          echo "秘密の値：$DEMO_SECRET"
          echo "文字数：${#DEMO_SECRET}"
        env:
          DEMO_SECRET: ${{ secrets.DEMO_SECRET }}
```

```powershell
git add .
git commit -m "ci: ビルドで APP_NAME を使い、Secrets の動きを確認する"
git push
gh pr checks --watch
```

ログを見ると、

```text
秘密の値：***
文字数：16
```

値そのものは `***` に置き換わるが、プログラムの中では本物の値が使えている（文字数が 16）。

> **Secrets は「ログに出さない」だけ**。ワークフローの中で値をファイルに書き出したり、外部に送ったりすれば漏れる。**信頼できないアクションやコードに Secrets を渡さない** こと。また、フォーク（他人がコピーしたリポジトリ）から来た PR のワークフローには、Secrets は渡されない。

確認できたら「Secrets の練習」のステップを消して push し、CI が緑になったらマージする。

```powershell
git add .
git commit -m "ci: Secrets の練習ステップを削除"
git push
gh pr checks --watch
gh pr merge --merge --delete-branch
```

##  演習

### 演習1（基本）：バージョン表示を追加する

`NEXT_PUBLIC_APP_VERSION` という環境変数を追加し、`app/about/page.js` に「バージョン：1.0.0」のように表示する。設定されていないときは「バージョン：開発中」と表示する。

- `.env.local` に `NEXT_PUBLIC_APP_VERSION=1.0.0` を書く
- `.env.example` にも追加する
- `lib/config.js` に `appVersion` を追加する

**確認方法**：`.env.local` に書いたときは「1.0.0」、その行を消して `npm run dev` を再起動すると「開発中」になればOK。`npm test` も通ること。

<details>
<summary>解答例</summary>

```js
// lib/config.js
export const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'TODOアプリ'
export const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? '開発中'
```

```jsx
// app/about/page.js（変更部分）
import { appVersion } from '@/lib/config'

// return の中
<p>バージョン：{appVersion}</p>
```

`app/about/page.js` は Server Component なので、`NEXT_PUBLIC_` を付けなくても読める。ただし `lib/config.js` はヘッダー（Client Component）からも読み込まれるので、ここに置く変数は `NEXT_PUBLIC_` を付けておくと混乱しない。

</details>

### 演習2（基本）：秘密の値がどこまで見えるか確かめる

`.env.local` に `SECRET_WORD=himitsu123` がある状態で、次の2か所に `process.env.SECRET_WORD` を表示するコードを書き、それぞれブラウザで表示されるか確かめる。

1. `app/about/page.js`（Server Component）
2. `components/Header.js`（Client Component）

**確認方法**：1 では表示され、2 では表示されないことを確かめられればOK。確かめたら **両方とも消す**。

<details>
<summary>解説</summary>

1 で表示されたのは、サーバで HTML を作るときに値を **HTML に書き込んだ** から。Server Component なら秘密の値を「使う」ことはできるが、**画面に表示すれば当然ブラウザに届く**。

秘密の値は、「サーバの中で使って、結果だけを返す」ように使う（例：API キーを使って外部サービスからデータを取り、そのデータだけを表示する）。

</details>

### 演習3（応用）：ビルドした日時を埋め込む

CI でビルドするときに、ビルドした日時を `NEXT_PUBLIC_BUILD_TIME` として渡し、about ページに「最終ビルド：2026-10-01 12:34」のように表示する。

**確認方法**：PR の CI（`build` ジョブ）のログで、環境変数に日時が入っていることを確認できればOK。（実際にサイトで表示を確かめるのは、Phase 4 でデプロイしてから）

<details>
<summary>ヒント</summary>

ステップの中でコマンドの結果を環境変数にするには、`$GITHUB_ENV` ファイルに書き込む。

```yaml
      - name: ビルド日時を決める
        run: echo "NEXT_PUBLIC_BUILD_TIME=$(TZ=Asia/Tokyo date '+%Y-%m-%d %H:%M')" >> "$GITHUB_ENV"
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_APP_NAME: ${{ vars.APP_NAME }}
```

`$GITHUB_ENV` に書いた変数は、**その後のステップ** で自動的に使える。

</details>

### 演習4（早く終わった人向け）：漏らしてしまったときの対応を調べる

次の状況になったとき、どうすればよいかを調べてまとめる。

> API キーを `.env` に書いて、うっかりコミットして GitHub に push してしまった。すぐに気づいて、次のコミットで `.env` を消した。

**確認方法**：「コミットを消すだけでは足りない理由」と「最初にやるべきこと」を説明できればOK。

<details>
<summary>解説</summary>

- Git の **履歴には残っている**。過去のコミットを開けば誰でも見られる。公開リポジトリなら、push した瞬間に自動で収集するプログラムに拾われていると考える
- 最初にやるべきことは **そのキーを無効化して、新しいキーを発行する**（ローテーション）。履歴の書き換えはその後
- GitHub には **Secret scanning** と **Push protection** という機能があり、よく知られたサービスのキーの形をした文字列を push しようとすると止めてくれる（公開リポジトリでは初期設定で有効）

</details>

##  まとめ

### 今日できるようになったこと

- `.env.local` と `process.env` で、設定値をコードの外に出せるようになった
- `NEXT_PUBLIC_` 付きの変数はビルド時にブラウザ用の JavaScript に埋め込まれ、誰でも見られることを確かめた
- GitHub の Variables（`vars.○○`）と Secrets（`secrets.○○`）を登録し、ワークフローから使えるようになった

### よくある詰まりポイント

- **`.env.local` を書き換えたのに反映されない**：`npm run dev` を再起動する。`NEXT_PUBLIC_` の値は `npm run build` し直すまで本番には反映されない
- **Client Component で環境変数が `undefined`**：名前が `NEXT_PUBLIC_` で始まっているか確認する（秘密の値なら、そもそもブラウザで使わない設計にする）
- **`${{ secrets.○○ }}` が空になる**：名前のつづり、登録した場所（Repository secrets か）を確認する。フォークからの PR では Secrets は渡されない

### 次コマ予告

Phase 4 に入る。いよいよアプリを **インターネットに公開（デプロイ）** する。次回は、GitHub Pages と Vercel という2つの公開先を比べ、Next.js のアプリをどちらにどう公開するかを決める。

##  課題

### 基礎課題（必須）

1. 本題の `NEXT_PUBLIC_APP_NAME` と `.env.example` を `main` にマージする
2. README に「環境変数」の節を作り、`.env.example` をコピーして `.env.local` を作る手順を書く

### 応用課題（推奨）

3. 演習1・3を完成させてマージする
4. Secrets の **Environments**（Settings → Environments）について調べ、「本番用の Secrets は `main` ブランチからの実行でしか使えないようにする」にはどう設定するかをまとめる（Phase 4 のデプロイで使う考え方）

### チャレンジ課題（挑戦）

5. `app/api/hello/route.js` に Route Handler（サーバで動く API）を作り、`process.env.SECRET_WORD` を **使って** 何かを計算し（例：文字数）、結果だけを JSON で返す。ブラウザで `/api/hello` を開いて、秘密の値そのものは返っていないことを確かめる
6. `npm run build` の結果の `.next/static` を `grep` して、`NEXT_PUBLIC_` の値は見つかり、`SECRET_WORD` の値は見つからないことを確かめる。なぜそうなるのかを「ビルド時に何が起きているか」という観点で説明する
