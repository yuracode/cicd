# コマ21｜Vercelへのデプロイ

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 4 |
| 所要時間 | 90分 |
| 前提コマ | コマ20 デプロイ先の比較と選定 |
| 次コマ | コマ22 GitHub Pagesへのデプロイ（GitHub Actions） |

##  目標

- Vercel に GitHub のリポジトリをつなぎ、`todo-app` を公開 URL で見られるようにできる
- Vercel の環境変数を「本番（Production）」と「プレビュー（Preview）」で分けて設定できる
- PR ごとに作られるプレビュー URL で変更を確かめ、問題があれば以前のデプロイに戻せる

##  導入

### 前回の振り返り

前回は、静的ホスティング（GitHub Pages）とサーバを動かすホスティング（Vercel）を比べ、`todo-app` を両方に公開すると決めた。

### 今日のゴール

```text
PR を作る ──→ Vercel が自動でプレビュー用に公開（https://todo-app-xxxx.vercel.app）
                  └ PR にプレビュー URL がコメントされる
main にマージ ──→ Vercel が自動で本番に公開（https://todo-app-ユーザー名.vercel.app）
```

Vercel は Next.js を作っている会社のサービスなので、**設定をほとんど書かずに** Next.js のすべての機能で公開できる。

##  本題

### 1. Vercel のアカウントを作る

1. https://vercel.com を開き、**Sign Up**
2. プランは **Hobby**（個人の趣味・学習用。無料）を選ぶ
3. **Continue with GitHub** を選び、GitHub のアカウントでログインする

> Hobby プランは **個人の非商用** の利用に限られる。授業や個人制作ならこれで十分。

### 2. リポジトリをつなぐ（インポート）

1. Vercel のダッシュボードで **Add New…** → **Project**
2. **Import Git Repository** の一覧に `todo-app` がなければ、**Adjust GitHub App Permissions** から Vercel に `todo-app` へのアクセスを許可する
3. `todo-app` の **Import** を押す

**Configure Project** の画面が出る。

| 項目 | 設定 |
|------|------|
| Project Name | `todo-app`（URL の一部になる。使われていれば別の名前になる） |
| Framework Preset | **Next.js**（自動で選ばれる） |
| Root Directory | `./`（そのまま） |
| Build and Output Settings | そのまま（`npm run build` が自動で使われる） |

**Environment Variables** を開き、コマ19で作った環境変数を追加する。

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_APP_NAME` | `TODOアプリ` |

**Deploy** を押す。

### 3. デプロイの様子を見る

ビルドのログが流れる。中身は、手元で `npm run build` したときとほぼ同じ。

```text
Running "npm run build"
▲ Next.js 16.x.x
  Creating an optimized production build ...
✓ Compiled successfully
Route (app)
┌ ○ /
...
```

1分ほどで **Congratulations!** の画面になる。**Continue to Dashboard** → **Visit** で公開された URL を開く。

- TODO の追加・完了・削除ができる
- 再読み込みしても TODO が残る
- ヘッダーのアプリ名が「TODOアプリ」になっている
- `/about`、`/tips` に移動できる

**スマホでも同じ URL を開いてみる**。自分の PC の外から、アプリが使えるようになった。

> スマホの TODO と PC の TODO は別々。データは各ブラウザの localStorage にあるので、端末ごとに保存されている。

### 4. デプロイの種類：Production と Preview

Vercel のプロジェクト画面の **Deployments** を開く。

| 種類 | いつ作られるか | URL |
|------|--------------|-----|
| **Production**（本番） | `main`（本番ブランチ）に push されたとき | `todo-app-ユーザー名.vercel.app` のような固定の URL |
| **Preview**（プレビュー） | `main` 以外のブランチに push されたとき、PR が作られたとき | `todo-app-xxxxxxxx-ユーザー名.vercel.app` のようにデプロイごとに違う URL |

Vercel は、リポジトリにつないだ時点から **push のたびに自動でデプロイ** する。自分でワークフローを書く必要はない。

### 5. PR でプレビューを使う

ヘッダーの色を変える PR を作って、プレビューを体験する。

```powershell
cd ~/workspace/todo-app
git switch main
git pull
git switch -c feature/header-color
```

```css
/* app/globals.css（.header の background を変更） */
.header {
  background: #1e3a8a;
  padding: 12px 16px;
}
```

```powershell
git commit -am "style: ヘッダーの色を紺にする"
git push -u origin feature/header-color
gh pr create --fill
gh pr view --web
```

PR の画面で起きること：

1. チェックの一覧に、CI（`lint` / `test` / `build`）と並んで **Vercel** のチェックが出る
2. Vercel のボットが PR に **コメント** し、プレビュー URL を教えてくれる
3. プレビュー URL を開くと、**紺色のヘッダー** のアプリが表示される。本番の URL はまだ元の色のまま

> **プレビューの良いところ**：「マージしたらどう見えるか」を、**マージする前に** 本物の環境で確かめられる。チームなら、レビューする人がプレビュー URL を開いて見た目を確認できる。

CI と Vercel のチェックが緑になったらマージする。

```powershell
gh pr checks --watch
gh pr merge --merge --delete-branch
git switch main
git pull
```

数十秒後、本番の URL も紺色のヘッダーになる。

### 6. 環境変数を本番とプレビューで分ける

プレビューで見ているのか、本番で見ているのかが一目で分かるように、アプリ名を分ける。

Vercel のプロジェクト → **Settings** → **Environment Variables**

1. 既存の `NEXT_PUBLIC_APP_NAME` の `…` → **Edit** → 適用先（Environments）を **Production だけ** にする
2. **Add New** で、もう1つ `NEXT_PUBLIC_APP_NAME` を追加する
   - Value：`TODOアプリ（プレビュー）`
   - Environments：**Preview** だけ

> **環境変数を変えたら、デプロイし直すまで反映されない**。`NEXT_PUBLIC_` の値はビルドのときに埋め込まれるから（コマ19）。

確かめるために、小さな PR を作る。

```powershell
git switch -c docs/vercel-url
```

README に公開 URL を書き足す。

```markdown
## 公開URL

- 本番（Vercel）：https://todo-app-ユーザー名.vercel.app
```

```powershell
git commit -am "docs: 公開URLをREADMEに追加"
git push -u origin docs/vercel-url
gh pr create --fill
```

プレビュー URL では「TODOアプリ（プレビュー）」、本番の URL では「TODOアプリ」と表示されることを確かめてからマージする。

### 7. 以前のデプロイに戻す（ロールバック）

本番に問題が出たとき、**コードを直すより先に、まず前の状態に戻す** のが鉄則。

1. **Deployments** を開く
2. 1つ前の Production のデプロイの `…` → **Instant Rollback**（または **Promote to Production**）
3. 確認して実行

本番の URL が、数秒で1つ前の状態に戻る。ビルドし直さずに、**以前に作ったデプロイをそのまま本番に切り替える** ので速い。

試したら、最新のデプロイの `…` から本番に戻しておく。

> ロールバックした状態で `main` に次の push をすると、それが新しい本番になる。「戻したまま忘れる」ことがないよう、戻したら原因を直す PR をすぐに作る。

##  演習

### 演習1（基本）：プレビューでバグを見つける

わざと見た目のバグを入れた PR を作り、**プレビュー URL で見つけてから直す** 流れを体験する。

1. ブランチを切り、`app/globals.css` の `.container` の `max-width` を `56px` にする（本当は `560px`）
2. PR を作る。CI は緑になる（テストは見た目の崩れを見つけられない）
3. プレビュー URL を開き、表示が崩れていることを確かめる
4. 直して push し、プレビュー URL（新しい URL が PR にコメントされる）で直ったことを確かめてからマージする

**確認方法**：PR に Vercel のコメントが2回付き、1回目のプレビューでは崩れていて、2回目では直っていればOK。

> CI（自動テスト）とプレビュー（人の目での確認）は、**見つけられるものが違う**。両方あって安心できる。

### 演習2（基本）：デプロイのログを読む

わざとビルドが失敗する PR を作り、Vercel 側のログを読む。

- `components/Header.js` の `'use client'` を消して push する（コマ16と同じ間違い）

**確認方法**：PR で CI の `build` と Vercel のチェックの両方が失敗し、Vercel の Deployments → 失敗したデプロイ → **Build Logs** で、CI と同じエラーメッセージが出ていることを確かめられればOK。確かめたら PR は閉じる。

<details>
<summary>解説</summary>

失敗したデプロイは本番にもプレビューにも出ない。**本番は前の成功したデプロイのまま** 動き続ける。Vercel が「ビルドに成功したものだけを公開する」からで、これも CD の大事な性質。

</details>

### 演習3（応用）：Vercel の CLI を使う

Vercel はコマンドラインからも操作できる。

```powershell
npm install -g vercel
vercel login
vercel link
```

`vercel link` で、手元のフォルダを Vercel のプロジェクトとつなぐ（質問には既存の `todo-app` を選ぶ）。

1. `vercel env ls` で環境変数の一覧を見る
2. `vercel env pull .env.local` で、Vercel の Development 用の環境変数を手元の `.env.local` に取ってくる（上書きされるので、必要ならバックアップを取っておく）
3. `vercel ls` でデプロイの一覧を見る

**確認方法**：3つのコマンドの結果が、ダッシュボードの表示と一致していればOK。

> `vercel link` で作られる `.vercel/` フォルダは Git に入れない（`.gitignore` に `.vercel` を追加する）。

### 演習4（早く終わった人向け）：アクセス解析を見る

Vercel のプロジェクトの **Analytics** タブで Web Analytics を有効にし、`@vercel/analytics` を入れて `app/layout.js` に `<Analytics />` を追加する。

**確認方法**：本番の URL を何回か開いたあと、Analytics の画面に訪問数が表示されればOK。

<details>
<summary>ヒント</summary>

```powershell
npm install @vercel/analytics
```

```jsx
// app/layout.js
import { Analytics } from '@vercel/analytics/next'

// <body> の中の最後
<Analytics />
```

具体的な手順は Vercel のドキュメント（Web Analytics の Quickstart）に沿って進める。個人情報を集める機能を入れるときは、**何を集めているかを利用者に説明する** 必要があることも覚えておく。

</details>

##  まとめ

### 今日できるようになったこと

- Vercel に GitHub のリポジトリをつなぎ、`todo-app` を本番 URL で公開できた
- 環境変数を Production と Preview に分けて設定できるようになった
- PR ごとのプレビュー URL で変更を確かめ、Instant Rollback で本番を前の状態に戻せるようになった

### よくある詰まりポイント

- **Import の一覧にリポジトリが出てこない**：Vercel の GitHub App に、そのリポジトリへのアクセスが許可されていない。**Adjust GitHub App Permissions** から追加する
- **環境変数を変えたのに表示が変わらない**：再デプロイが必要。Deployments → 最新のデプロイの `…` → **Redeploy**
- **手元では動くのに Vercel のビルドだけ失敗する**：Build Logs を読む。ファイル名の大文字・小文字（Linux は区別する）、コミットし忘れたファイル、Vercel 側に設定していない環境変数を疑う

### 次コマ予告

Vercel は便利だが、デプロイの中身は自動で見えにくい。次回は GitHub Pages に、**GitHub Actions のワークフローを自分で書いて** デプロイする。`basePath` の設定と、Pages ならではの落とし穴も体験する。

##  課題

### 基礎課題（必須）

1. 本番 URL を README に書き、スマホで開いた画面のスクリーンショットを撮っておく
2. 演習1を完成させる

### 応用課題（推奨）

3. Vercel のプロジェクト → Settings → **Git** を開き、「どのブランチを本番にするか（Production Branch）」がどこで決まっているか確認する。`main` 以外にしたらどうなるかを考える（実際には変えなくてよい）
4. プロジェクトの **Domains** で、`todo-app-ユーザー名.vercel.app` を自分の好きな名前（空いていれば `○○-todo.vercel.app` など）に変えてみる

### チャレンジ課題（挑戦）

5. Vercel の Deployment Protection（プレビュー URL にパスワードやログインをかける機能）について調べ、Hobby プランで何ができるかをまとめる
6. Vercel が自動でやってくれていること（ビルド、配信、HTTPS、PR へのコメント、ロールバック）を、GitHub Actions で自分で書くとしたら何が必要かを書き出す。次回の GitHub Pages のワークフローと見比べる
