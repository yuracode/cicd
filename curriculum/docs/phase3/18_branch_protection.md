# コマ18｜ブランチ保護（ルールセット）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 | 90分 |
| 前提コマ | コマ17 CIでテストを自動実行する |
| 次コマ | コマ19 Secretsと環境変数 |

##  目標

- ブランチ保護が必要な理由を、「CI があるだけでは足りない」ことと合わせて説明できる
- GitHub のルールセットで、`main` への直接 push を禁止し、PR と CI の成功を必須にできる
- ルールに引っかかったときのエラーや画面の表示を読み、正しい手順でマージし直せる

##  導入

### 前回の振り返り

前回までで、PR を出すと `lint` / `test` / `build` が自動で実行されるようになった。

> `ci.yml` がまだない人は、コマ17の本題 3 のワークフローを先に `main` にマージしておく。ルールセットで「必須のチェック」を選ぶには、**そのチェックが一度は実行されている** 必要がある。

### 考えてみよう

> CI が赤い PR。今の設定で、マージボタンは押せる？

**押せてしまう**。さらに、PR を作らずに `git push origin main` すれば、CI の結果を待たずに `main` を書き換えることもできる。CI は「知らせてくれる」だけで、「止めてくれる」わけではない。

### 今日のゴール

GitHub の **ルールセット** で、`main` に次のルールを付ける。

- `main` に直接 push できない（**PR 経由** でしか変更できない）
- `lint` / `test` / `build` が **すべて緑** でないとマージできない
- `main` を消したり、履歴を強制的に書き換えたり（force push）できない

##  本題

### 1. ルールセットとは

**ルールセット（Rulesets）** は、ブランチに「守るべきルール」を付ける GitHub の機能。以前は「ブランチ保護ルール（Branch protection rules）」という機能が使われていて、今も両方あるが、この授業ではより新しいルールセットを使う。

| ルール | 効果 |
|--------|------|
| Restrict deletions | ブランチを削除できない |
| Block force pushes | `git push --force` で履歴を書き換えられない |
| Require a pull request before merging | PR を通さないと変更できない（直接 push 禁止） |
| Require status checks to pass | 指定したチェック（CI のジョブ）が成功しないとマージできない |

> 公開リポジトリなら無料で使える。非公開リポジトリの場合はプランによって使えないことがある（Phase 4 で公開するので、`todo-app` は公開リポジトリにしてある）。

### 2. ルールセットを作る

```powershell
cd ~/workspace/todo-app
gh repo view --web
```

1. **Settings** → 左のメニューの **Rules** → **Rulesets**
2. **New ruleset** → **New branch ruleset**
3. 次のように設定する

| 項目 | 設定 |
|------|------|
| Ruleset Name | `protect-main` |
| Enforcement status | **Active** |
| Bypass list | 何も追加しない（自分も含めて全員がルールに従う） |
| Target branches | **Add target** → **Include default branch** |

4. **Branch rules** で次にチェックを入れる

- ☑ **Restrict deletions**
- ☑ **Require a pull request before merging**
  - Required approvals：**0**（今は1人で開発しているため。チームでは1以上にする）
- ☑ **Require status checks to pass**
  - ☑ Require branches to be up to date before merging
  - **Add checks** → `lint`、`test`、`build` を検索して3つとも追加する
- ☑ **Block force pushes**

5. 一番下の **Create** を押す

> **Add checks で `lint` などが出てこない**：そのジョブ名のチェックが、このリポジトリで一度も実行されていない。コマ17の `ci.yml` で PR を1回動かしてから、もう一度探す。
>
> **Required approvals を 0 にする理由**：GitHub では **自分の PR を自分で承認（Approve）できない**。1人で開発中に 1 にすると、誰もマージできなくなる。コマ25のチーム開発では 1 にする。

### 3. main に直接 push してみる

```powershell
git switch main
git pull
code README.md   # 末尾に1行足して保存する
git commit -am "docs: mainに直接pushしてみる"
git push
```

```text
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - Changes must be made through a pull request.
remote: - 3 of 3 required status checks are expected.
 ! [remote rejected] main -> main (push declined due to repository rule violations)
```

**拒否された**。`main` を変えるには PR を通すしかない。

手元の `main` に作ってしまったコミットは、取り消しておく。

```powershell
git reset --hard origin/main
```

> **`git reset --hard origin/main`**：手元のブランチを GitHub 側の `main` と同じ状態に戻す。**手元の未コミットの変更も消える** ので、使う前に `git status` で確認する。

### 4. CI が赤い PR はマージできない

```powershell
git switch -c test/protected
```

わざとテストを失敗させる。`lib/todos.test.js` の適当なテストの期待値を変える（例：`toBe(1)` → `toBe(999)`）。

```powershell
git commit -am "test: わざとテストを失敗させる"
git push -u origin test/protected
gh pr create --fill
gh pr view --web
```

PR の画面の下のほう：

- CI が動いている間は「**Merging is blocked**」と表示され、マージボタンが押せない
- `test` が赤になっても、マージボタンは押せないまま
- ターミナルから `gh pr merge` しようとしても拒否される

```powershell
gh pr merge --merge
# => X Pull request ... is not mergeable: the base branch policy prohibits the merge.
```

テストを直して push する。

```powershell
git commit -am "fix: テストを元に戻す"
git push
gh pr checks --watch
```

3つとも緑になると、マージボタンが押せるようになる。

```powershell
gh pr merge --merge --delete-branch
git switch main
git pull
```

### 5. 「最新にしてから」ルール

「Require branches to be up to date before merging」にチェックを入れたので、**`main` が先に進んでいると、PR ブランチに取り込み直すまでマージできない**。

なぜこのルールが必要か：

```text
PR A：TodoForm を変更（CI 緑）───────────┐
PR B：TodoForm を使う TodoApp を変更（CI 緑）┼── 両方マージ ── main で壊れる！
```

A と B はそれぞれ単独ではテストが通っていても、**組み合わせたら壊れる** ことがある。「最新の `main` を取り込んだ状態で CI が通ったこと」を必須にすると、これを防げる。

PR の画面に **Update branch** ボタンが出たら、押すと `main` の変更が PR ブランチに取り込まれ、CI がもう一度動く。ターミナルでは次のようにする。

```powershell
git switch <PRのブランチ>
git pull origin main
git push
```

### 6. ルールセットの状態を確認する

```powershell
gh api "repos/{owner}/{repo}/rulesets"
```

`{owner}` と `{repo}` は、今いるリポジトリの持ち主と名前に `gh` が自動で置き換えてくれる。`protect-main` が表示されればOK。

また、Settings → Rules → **Insights** では、ルールによって拒否された push や、ルールを満たしてマージされた PR の記録が見られる。

##  演習

### 演習1（基本）：ルールを1つずつ体験する

次の3つを試し、それぞれどんなメッセージで止められるかをメモする。

1. `main` に直接 push する（本題3）
2. CI が赤い PR を `gh pr merge` する（本題4）
3. `git push --force origin main`（手元の `main` で `git commit --amend` などをしてから）

**確認方法**：3つともエラーで止められ、どのルールで止められたかをメモできればOK。試したあとは `git reset --hard origin/main` で手元を戻す。

<details>
<summary>解説</summary>

3 は次のように止められる。

```text
remote: - Cannot force-push to this branch
```

force push は GitHub 上の履歴を書き換える操作で、他の人が持っている履歴と食い違ってしまう。`main` では絶対に禁止しておくのが一般的。

</details>

### 演習2（基本）：「Update branch」を体験する

1. ブランチ `feature/a` と `feature/b` を `main` から作る
2. `feature/a` で README に1行足し、PR を作ってマージする
3. `feature/b` で `app/about/page.js` の文章を変え、PR を作る

**確認方法**：`feature/b` の PR に「This branch is out-of-date with the base branch」と表示され、マージできない。**Update branch** を押す（または `git pull origin main` → `git push`）と CI が動き直し、緑になるとマージできればOK。

### 演習3（応用）：CI を変えたらルールも見直す

コマ17の演習3で `test` を matrix（Node.js 22 と 24）にすると、チェックの名前が `test` から `test (22)` と `test (24)` に変わる。

1. matrix にした `ci.yml` の PR を作る
2. PR のチェック一覧で、`test` が「Expected — Waiting for status to be reported」のまま進まないことを確かめる
3. ルールセットを編集し、必須のチェックを `test (22)` と `test (24)` に変える

**確認方法**：ルールセットを直すと、PR がマージできる状態になればOK。

<details>
<summary>解説</summary>

必須チェックは **ジョブの名前（チェック名）で指定** している。CI 側でジョブ名を変えたり matrix にしたりすると、ルールセットが探している名前のチェックが来なくなり、PR は永遠に待たされる。**CI を変えるときは、ルールセットの必須チェックも一緒に見直す**。

matrix をやめて元に戻す場合も、ルールセットを `test` に戻す。

</details>

### 演習4（早く終わった人向け）：ルールセットを JSON で書き出す

ルールセットは JSON で書き出して、他のリポジトリに同じ設定を作れる。

1. Settings → Rules → Rulesets → `protect-main` の右の `…` → **Export ruleset** で JSON をダウンロードする
2. 中身を読み、画面で設定した項目が JSON のどこに書かれているかを対応させる
3. （できる人は）別の練習用リポジトリで **New ruleset → Import a ruleset** から読み込む

**確認方法**：JSON の `rules` の中の `pull_request`、`required_status_checks`、`non_fast_forward`、`deletion` が、それぞれ画面のどの設定か説明できればOK。

##  まとめ

### 今日できるようになったこと

- CI は「知らせる」だけで、ルールセットで「止める」仕組みが必要なことを理解した
- `main` に、PR 必須・CI（lint / test / build）成功必須・削除禁止・force push 禁止のルールを付けられるようになった
- `GH013` などのエラーや「Merging is blocked」の表示を読み、PR を直して正しくマージできるようになった

### よくある詰まりポイント

- **必須チェックの候補に `lint` などが出てこない**：そのチェックが一度も実行されていない。PR で CI を1回動かしてから設定する
- **PR が「Waiting for status to be reported」のまま**：必須にしたチェック名と、CI のジョブ名が一致していない（matrix や名前の変更）。ルールセットを直す
- **自分の PR をマージできない**：Required approvals が 1 以上になっていないか確認する（1人のときは 0）

### 次コマ予告

次回は **環境変数** と **Secrets**。アプリの名前やバージョンなどの設定をコードの外に出す方法と、パスワードや API キーのような **秘密の値** を GitHub に安全に預け、CI から使う方法を学ぶ。Next.js ならではの `NEXT_PUBLIC_` の落とし穴も扱う。

##  課題

### 基礎課題（必須）

1. 本題のルールセット `protect-main` を作り、演習1の3つのメッセージをメモする
2. 以降の作業は、**必ずブランチを切って PR でマージする** 流れで行う

### 応用課題（推奨）

3. ルールセットに **Require linear history**（マージコミットを作らない）を追加し、PR のマージ方法が「Squash and merge」か「Rebase and merge」しか選べなくなることを確かめる。`git log --oneline --graph` の見え方がどう変わるかを比べる
4. リポジトリの Settings → General → Pull Requests で **Automatically delete head branches** をオンにし、マージ後にブランチが自動で消えることを確かめる

### チャレンジ課題（挑戦）

5. **CODEOWNERS** ファイル（`.github/CODEOWNERS`）について調べ、「`.github/workflows/` の変更には特定の人のレビューを必須にする」設定を書く。ルールセットの「Require review from Code Owners」と組み合わせると何ができるか説明する
6. 「ブランチ保護を設定しても防げない事故」を2つ考え、それぞれどう防ぐかを書く（ヒント：テストが足りない、Bypass list に入っている管理者）
