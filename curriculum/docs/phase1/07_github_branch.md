# コマ7｜GitHub連携・ブランチ・PR体験

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 1 |
| 所要時間 | 90分 |
| 前提コマ | コマ6 TODOアプリ実装②（保存・ページ分け） |
| 次コマ | コマ8 テスト入門とJestの導入 |

##  目標

- `todo-app` を GitHub リポジトリに push できる
- 作業ブランチを切って機能を追加し、プルリクエスト（PR）を作ってマージできる
- Issue と PR をつなげ、「何のための変更か」を記録に残せる

##  導入

### 前回の振り返り

TODO アプリは、保存・ページ分けまでできた。ただし今のコードは **自分の PC の中にしかない**。

- PC が壊れたら消える
- 他の人に見せられない、一緒に作れない
- Phase 3 以降の自動チェック（GitHub Actions）や自動公開も、GitHub にコードがないと始まらない

### 今日のゴール

開発現場の基本リズム **「ブランチを切る → コミット → push → PR → マージ」** を一人で一通り回す。

### なぜブランチを使うのか

`main` に直接コミットし続けると、

- 作りかけの壊れたコードが `main` に混ざる
- 複数の変更が混ざり、どれが何のための変更か分からなくなる
- 他の人がチェック（レビュー）する機会がない

そこで、**機能ごとに枝（ブランチ）を分けて作業し、完成してから `main` に取り込む**。

```text
main       ●───●───────────────●  ← マージ
                ╲             ╱
feature/xxx      ●───●───●───●
```

##  本題

### 1. GitHub CLI でログインする

GitHub への push にはログイン（認証）が必要。**GitHub CLI（`gh`）** を使うと、ブラウザ経由で簡単に設定できる。

```powershell
winget install --id GitHub.cli -e
# インストール後、ターミナルを開き直してから次へ

gh auth login
```

質問には次のように答える。

| 質問 | 答え |
|------|------|
| Where do you use GitHub? | **GitHub.com** |
| What is your preferred protocol? | **HTTPS** |
| Authenticate Git with your GitHub credentials? | **Yes** |
| How would you like to authenticate? | **Login with a web browser** |

表示された8桁のコードを控えて Enter。ブラウザでコードを入力して許可する（ブラウザが自動で開かない場合は、表示された URL をブラウザで開く）。

```powershell
gh auth status
# => Logged in to github.com account ユーザー名
```

### 2. リポジトリを作って push する

```powershell
cd ~/workspace/todo-app
git status
```

`create-next-app` が最初から `git init` してくれているので、コミットし忘れがあれば先にコミットする。

```powershell
git add .
git commit -m "chore: コマ6までの実装"
```

`.gitignore` も確認しておく。

```powershell
cat .gitignore
```

`/node_modules` と `/.next/` が含まれていればOK。これらは `npm install` や `npm run dev` で **いつでも作り直せる** ので、GitHub には上げない。

GitHub 上にリポジトリを作って push する。

```powershell
gh repo create todo-app --public --source=. --remote=origin --push
```

| オプション | 意味 |
|-----------|------|
| `--public` | 公開リポジトリにする（Phase 4 の GitHub Pages で公開するため） |
| `--source=.` | 今いるフォルダの中身を使う |
| `--remote=origin` | GitHub 側を `origin` という名前で登録する |
| `--push` | 作ったらすぐ push する |

ブラウザで確認する。

```powershell
gh repo view --web
```

`app/`、`components/` などのファイルが並んでいれば成功。

### 3. Issue で「やること」を登録する

いきなりコードを書く前に、**何をするか** を GitHub の Issue に書いておく。

```powershell
gh issue create --title "すべて削除ボタンを追加する" --body "TODO を一度に全部消せるボタンがほしい。誤操作防止のため確認ダイアログを出す。"
```

```text
https://github.com/ユーザー名/todo-app/issues/1
```

最後の数字（`#1`）が Issue 番号。

> **Issue とは**：GitHub 上の「やること・不具合・要望」のメモ。チーム開発では「どの Issue のための変更か」を PR に書いてつなげる。

### 4. 作業ブランチを切る

```powershell
git switch -c feature/clear-all
git branch
# => * feature/clear-all
#      main
```

> **ブランチ名の付け方**：`feature/〜`（機能追加）、`fix/〜`（バグ修正）、`docs/〜`（ドキュメント）のように **種類/内容** で付けるのが一般的。英小文字とハイフンで書く。

### 5. 機能を追加してコミットする

`components/TodoApp.js` に「すべて削除」ボタンを追加する。

```jsx
// components/TodoApp.js（追加部分）
function clearAll() {
  if (!window.confirm('すべての TODO を削除しますか？')) return
  setTodos([])
}
```

```jsx
// components/TodoApp.js（return の中、<p>残り…</p> の下）
<button onClick={clearAll} disabled={todos.length === 0}>
  すべて削除
</button>
```

ブラウザで動作確認する。

- TODO がないときはボタンが押せない
- 「キャンセル」を選ぶと何も消えない
- 「OK」を選ぶと全部消える

確認できたらコミットする。

```powershell
git status
git diff
git add components/TodoApp.js
git commit -m "feat: すべて削除ボタンを追加"
```

> **`git diff`**：まだ `git add` していない変更の中身を表示する。コミット前に「意図しない変更が混ざっていないか」を見るクセをつける。
>
> **コミットメッセージの書き方（Conventional Commits）**：先頭に種類を付ける。
>
> | 種類 | 意味 |
> |------|------|
> | `feat:` | 新機能 |
> | `fix:` | バグ修正 |
> | `docs:` | ドキュメント |
> | `style:` | 見た目・書式の調整 |
> | `refactor:` | 動きを変えずにコードを整理 |
> | `test:` | テストの追加・修正 |
> | `chore:` | 設定ファイルなどの雑務 |
>
> この教材では以降この形で書く。履歴を見たときに何の変更か一目で分かる。

### 6. ブランチを push して PR を作る

```powershell
git push -u origin feature/clear-all
```

`-u` は「このブランチを GitHub 側の同名ブランチとひも付ける」指定。初回だけ付ければ、次からは `git push` だけでよい。

PR（プルリクエスト）を作る。

```powershell
gh pr create --title "すべて削除ボタンを追加" --body @'
Closes #1

## 変更内容
- 「すべて削除」ボタンを追加
- 押すと確認ダイアログを出し、OK なら全件削除

## 動作確認
- [x] TODO が0件のときはボタンが押せない
- [x] キャンセルでは何も消えない
- [x] OK で全件消える
'@
```

> **`@'` 〜 `'@` とは**：PowerShell の **ヒア文字列**。複数行の文章をそのまま1つの文字列として渡せる。閉じの `'@` は必ず **行の先頭** に書く（前に空白があるとエラーになる）。

- **PR とは**：「このブランチの変更を `main` に取り込んでください」というお願い。変更内容の確認（レビュー）や議論の場になる
- **`Closes #1`**：この PR がマージされると Issue #1 が自動で閉じる

```powershell
gh pr view --web
```

### 7. セルフレビューしてマージする

PR ページの **Files changed** タブで、自分の差分を他人の目で読み直す。

- 消し忘れた `console.log` はないか
- 関係ないファイルの変更が混ざっていないか

問題なければ **Merge pull request → Confirm merge → Delete branch** の順に押す。

手元の `main` を最新にする。

```powershell
git switch main
git pull
git branch -d feature/clear-all
git log --oneline --graph -5
```

Issue #1 が「Closed」になっていることも確認する。

```powershell
gh issue list --state closed
```

##  演習

### 演習1（基本）：Issue → ブランチ → PR → マージをもう1周

次の変更を、本題と同じ流れ（Issue 作成 → ブランチ → コミット → push → PR → マージ）で行う。

- Issue：「README をこのアプリの説明に書き換える」
- ブランチ：`docs/readme`
- 変更：`README.md` を全部書き換え、アプリ名・できること・起動方法（`npm install` → `npm run dev`）を書く
- コミット：`docs: READMEをアプリの説明に書き換え`

**確認方法**：GitHub のリポジトリのトップに新しい README が表示され、Issue が Closed になっていればOK。

<details>
<summary>README の例</summary>

````markdown
# TODOアプリ

Next.js（App Router）で作った TODO アプリです。

## できること

- TODO の追加・完了・削除
- ブラウザを再読み込みしても TODO が残る（localStorage に保存）

## 起動方法

```powershell
npm install
npm run dev
```

http://localhost:3000 を開く。
````

</details>

### 演習2（基本）：コミットを役割ごとに分ける

ブランチ `feature/count-summary` で「全 ○ 件 / 完了 ○ 件 / 残り ○ 件」の表示を追加する（コマ5の演習1をまだやっていなければここでやる）。次の **2つのコミットに分けて** 積み、PR を作ってマージする。

1. `feat: 完了件数と全件数を表示`
2. `style: 件数表示の文字色を灰色にする`

**確認方法**：`git log --oneline` で2つのコミットが順に並び、PR の **Commits** タブにも2件表示されていればOK。

<details>
<summary>ヒント</summary>

1つ目の変更だけを作ってコミットしてから、2つ目の変更に取りかかる。すでに両方の変更をしてしまった場合は、ファイルの一部だけを選んでステージする `git add -p` が使える（`y` で含める、`n` で含めない）。

</details>

### 演習3（応用）：コンフリクトを起こして解決する

1. `main` で `app/about/page.js` の説明文を「授業で作った TODO アプリです。」に変えてコミットし、push する
2. `main` から切ったブランチ `feature/about-text` で、**同じ行** を「Next.js の練習用 TODO アプリです。」に変えてコミットする（このブランチは手順1より前に `main` から切っておく）
3. `feature/about-text` で `git merge main` を実行し、コンフリクト（衝突）を起こす
4. エディタで `<<<<<<<` / `=======` / `>>>>>>>` の部分を直し、コミットして PR → マージする

**確認方法**：`git log --oneline --graph` で枝分かれと合流が見え、最終的な説明文が自分で決めた内容になっていればOK。

<details>
<summary>手順の例とコンフリクトの読み方</summary>

```powershell
git switch main
git switch -c feature/about-text     # 先にブランチを作っておく
git switch main
# app/about/page.js を編集
git commit -am "docs: about の説明文を変更"
git push

git switch feature/about-text
# app/about/page.js の同じ行を別の内容に編集
git commit -am "docs: about の説明文を変更（別案）"
git merge main
# => CONFLICT (content): Merge conflict in app/about/page.js
```

```jsx
<<<<<<< HEAD
      <p>Next.js の練習用 TODO アプリです。</p>
=======
      <p>授業で作った TODO アプリです。</p>
>>>>>>> main
```

- `<<<<<<< HEAD` 〜 `=======`：今いるブランチ（feature/about-text）の内容
- `=======` 〜 `>>>>>>> main`：取り込もうとしている `main` の内容

どちらかを残す、または両方を合わせた文にして、記号の行はすべて消す。

```powershell
git add app/about/page.js
git commit -m "merge: main を取り込みコンフリクトを解消"
git push -u origin feature/about-text
gh pr create --fill
```

</details>

### 演習4（早く終わった人向け）：PR にレビューコメントを付ける

隣の人とリポジトリの URL を交換し、相手の PR（マージ済みでもよい）の **Files changed** で、コードの行にコメントを付ける。良いところを1つ、改善案を1つ書く。

**確認方法**：相手の PR にコメントが付き、自分の PR にも相手のコメントが届いていればOK。

> 公開リポジトリなら、他人の PR にもコメントできる。**コードではなく変更について** 書く、「なぜそう思うか」を添える、の2点を意識する。

##  まとめ

### 今日できるようになったこと

- `gh` でログインし、`todo-app` を GitHub に公開できるようになった
- Issue → ブランチ → コミット → push → PR → マージ の1サイクルを回せるようになった
- Conventional Commits の書き方で、変更の種類が分かるコミットを積めるようになった

### よくある詰まりポイント

- **`git push` で `rejected`**：GitHub 側の `main` が手元より進んでいる。`git pull` で取り込んでから push する
- **PR に関係ないファイルが混ざる**：`git add .` の前に `git status` と `git diff` で確認する。`.next/` や `node_modules/` が出てくる場合は `.gitignore` を確認する
- **`gh auth login` のブラウザが開かない**：表示された URL をブラウザに貼り付けて開けばよい

### 次コマ予告

Phase 2 に入る。次回は「なぜテストを書くのか」から始め、Next.js 公式の方法で **Jest** を `todo-app` に導入して、最初のテストを動かす。

##  課題

### 基礎課題（必須）

1. 演習1・2を完成させる（GitHub 上で Issue 1件以上が Closed、マージ済み PR が3件以上ある状態）
2. `git log --oneline` の結果を見て、すべてのコミットメッセージが Conventional Commits の形になっているか確認する

### 応用課題（推奨）

3. PR の本文テンプレートを作る。`.github/pull_request_template.md` に「関連 Issue」「変更内容」「動作確認」の見出しを書いてマージし、次に PR を作ったとき本文に自動で入ることを確認する
4. コマ6の演習（404 ページ・使い方ページなど）でまだ `main` に入っていないものを、**1機能1ブランチ1 PR** で取り込む

### チャレンジ課題（挑戦）

5. `git merge` の代わりに `git rebase main` でコンフリクトを解消する手順を試し、`git log --oneline --graph` の見え方が merge とどう違うかを比べる
6. `.gitignore` に `/node_modules` がある理由を、`package.json` と `package-lock.json` の役割と合わせて3行で説明する
