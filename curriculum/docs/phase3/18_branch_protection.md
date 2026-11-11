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

**ルールセット（Rulesets）** は、ブランチに「守るべきルール」を付ける GitHub の機能。ルールを破る操作（直接 push、CI が赤いままのマージなど）を、GitHub 側が **受け付けずに拒否** してくれる。

以前は「ブランチ保護ルール（Branch protection rules）」という機能が使われていて、今も両方ある。ルールセットはその後継で、次のような点が改良されている。この授業ではルールセットを使う。

- 1つのルールセットを複数のブランチにまとめて当てられる
- 「有効／無効」を切り替えられ、一時的に止めたいときに消さずに済む
- JSON で書き出して、別のリポジトリにコピーできる（演習4）

今日使うルールは次の4つ。

| ルール | 効果 | 防げる事故の例 |
|--------|------|----------------|
| Restrict deletions | ブランチを削除できない | 間違えて `main` ブランチごと消してしまう |
| Block force pushes | `git push --force` で履歴を書き換えられない | 手元の古い履歴で上書きして、他の人のコミットが消える |
| Require a pull request before merging | PR を通さないと変更できない（直接 push 禁止） | レビューも CI も通っていないコードが `main` に入る |
| Require status checks to pass | 指定したチェック（CI のジョブ）が成功しないとマージできない | テストが落ちているのに「あとで直す」と言ってマージする |

> **ステータスチェック（status check）**：PR の画面の下に並ぶ「✓」「✗」の1つ1つのこと。GitHub Actions のワークフローでは、**ジョブ1つが1つのチェック** になる。コマ17の `ci.yml` には `lint` / `test` / `build` の3つのジョブがあるので、チェックも3つ並ぶ。

> 公開リポジトリなら無料で使える。非公開リポジトリの場合はプランによって使えないことがある（Phase 4 で公開するので、`todo-app` は公開リポジトリにしてある）。

### 2. ルールセットを作る

ルールセットはコマンドではなく、GitHub の Web 画面で作る。まずリポジトリのページをブラウザで開く。

```powershell
cd ~/workspace/todo-app
gh repo view --web
```

`gh repo view --web` は、今いるフォルダの GitHub リポジトリをブラウザで開くコマンド。開いたら、次の順に進む。

1. 上のタブの **Settings** → 左のメニューの **Rules** → **Rulesets**
   - Settings タブが見えないときは、自分のリポジトリを開いているか確認する（他人のリポジトリでは設定を変えられない）
2. **New ruleset** → **New branch ruleset**
   - 「branch ruleset」はブランチ向け、「tag ruleset」はタグ（`v1.0.0` などのバージョンの目印）向け。今回はブランチを守るので branch を選ぶ
3. 画面の上半分で、ルールセット全体の設定をする

| 項目 | 設定 | 意味と理由 |
|------|------|------------|
| Ruleset Name | `protect-main` | ルールセットの名前。あとで一覧で見分けるためのものなので、何を守るのかがわかる名前にする |
| Enforcement status | **Active** | ルールを実際に効かせるかどうか。**Disabled** にすると、設定は残したままルールが止まる。作っただけで効いていない、ということがないよう Active を選ぶ |
| Bypass list | 何も追加しない | ここに入れた人（管理者など）はルールを無視できる。リポジトリの持ち主である自分も含めて **全員がルールに従う** ように、空のままにする |
| Target branches | **Add target** → **Include default branch** | どのブランチを守るか。**default branch（デフォルトブランチ）** は、リポジトリの基準になるブランチのことで、今は `main`。「`main` という名前を直接書く」代わりに「デフォルトブランチ」を指定しておくと、あとで名前を変えても守られ続ける |

> Target branches を設定したら、その下に **Applies to 1 target: main** のように表示されるのを確認する。ここが空のままだと、ルールを作っても **どのブランチにも効かない**。

4. 画面の下半分の **Branch rules** で、どんなルールを付けるかを選ぶ

ずらっと十数個のルールが並ぶが、チェックを入れるのは次の4つだけ。それ以外（Restrict creations、Require signed commits など）はチェックを外したままでよい。

- ☑ **Restrict deletions**
- ☑ **Require a pull request before merging**
  - Required approvals：**0**
- ☑ **Require status checks to pass**
  - ☑ Require branches to be up to date before merging
  - **Add checks** → `lint`、`test`、`build` を検索して3つとも追加する
- ☑ **Block force pushes**

それぞれの設定の意味を、上から順に確認しておく。

**Restrict deletions／Block force pushes**

新しいルールセットを作ると、この2つは最初からチェックが入っていることが多い。外れていたら入れる。どちらも「`main` の履歴を壊す操作」を禁止するもので、`main` には必ず付けておくのが一般的。

**Require a pull request before merging**

チェックを入れると、その下に詳しい設定が開く。

- **Required approvals**（必要な承認の数）は **0** にする。PR では、他の人がコードを読んで「OK」を出すこと（**承認、Approve**）をマージの条件にできるが、GitHub では **自分の PR を自分で承認することはできない**。1人で開発している今これを 1 にすると、承認してくれる人がいないので **誰もマージできなくなる**。0 でも「PR を通さないと `main` を変えられない」という効果はちゃんと残る。コマ25のチーム開発では 1 以上にする
- そのほかの項目（Dismiss stale pull request approvals… など）は、レビューする人がいるときのための設定。今は初期値のままでよい

**Require status checks to pass**

チェックを入れると、「どのチェックが成功していればマージしてよいか」を選ぶ欄が開く。

- **Require branches to be up to date before merging** にもチェックを入れる。「PR ブランチに最新の `main` が取り込まれていること」もマージの条件にするオプションで、なぜ必要かは本題5で体験する
- **Add checks** を押すと検索欄が出るので、`lint` と入力し、候補に出てきた `lint` を選ぶ。同じように `test`、`build` も追加し、**3つとも一覧に並んだ** ことを確認する
  - ここに出てくる名前は、`ci.yml` の `jobs:` の下に書いた **ジョブの名前**（`lint:` / `test:` / `build:`）。だから CI 側でジョブ名を変えたら、ここも直す必要がある（演習3）
  - 候補の横に GitHub Actions のアイコンが付いていれば、そのチェックが Actions から報告されていることを表す
  - 1つも追加しないと、「チェックが成功していること」を何も要求していないのと同じになるので注意

5. 一番下の **Create** を押す。Rulesets の一覧に `protect-main` が表示され、横に **Active** と出ていれば完成

> **Add checks で `lint` などが出てこない**：GitHub は「このリポジトリで実際に実行されたことのあるチェック」しか候補に出さない。コマ17の `ci.yml` で PR を1回動かしてから、もう一度探す。

### 3. main に直接 push してみる

ルールが本当に効いているかを、わざとルールを破って確かめる。今までなら成功していた「`main` で直接コミットして push」をやってみる。

```powershell
git switch main
git pull
code README.md   # 末尾に1行足して保存する
git add .
git commit -m "docs: mainに直接pushしてみる"
git push
```

```text
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - Changes must be made through a pull request.
remote: - 3 of 3 required status checks are expected.
 ! [remote rejected] main -> main (push declined due to repository rule violations)
```

**拒否された**。エラーメッセージは次のように読む。

| 行 | 意味 |
|----|------|
| `GH013: Repository rule violations found for refs/heads/main` | `main` ブランチ（`refs/heads/main` は Git 内部でのブランチの正式名）でルール違反が見つかった |
| `Changes must be made through a pull request.` | 「Require a pull request before merging」に違反。PR を通して変更すること |
| `3 of 3 required status checks are expected.` | 「Require status checks to pass」に違反。必須の3つのチェックの結果がまだ1つもない |
| `[remote rejected] main -> main` | GitHub（remote）側が push を受け付けなかった。GitHub 上の `main` は何も変わっていない |

`main` を変えるには PR を通すしかない、ということがわかる。

ただし、手元のパソコンの `main` には、さっき作ったコミットが残ったままになっている。このままだと手元と GitHub の `main` が食い違ってしまうので、取り消しておく。

```powershell
git reset --hard origin/main
```

> **`git reset --hard origin/main`**：手元のブランチを GitHub 側の `main` と同じ状態に戻す。**手元の未コミットの変更も消える** ので、使う前に `git status` で確認する。

### 4. CI が赤い PR はマージできない

次は、正しく PR を出したけれど CI が失敗している場合。ルールセットを作る前は「CI が赤くてもマージボタンが押せてしまう」状態だった（導入の「考えてみよう」）。それが本当に止められるかを確かめる。

```powershell
git switch -c test/protected
```

`git switch -c <名前>` は、新しいブランチを作ってそこへ移動するコマンド。ここでわざとテストを失敗させる。`lib/todos.test.js` の適当なテストの期待値を変える（例：`toBe(1)` → `toBe(999)`）。

```powershell
git add .
git commit -m "test: わざとテストを失敗させる"
git push -u origin test/protected
gh pr create --fill
gh pr view --web
```

PR の画面の下のほう：

- CI が動いている間は「**Merging is blocked**」と表示され、マージボタンが押せない（必須チェックの結果がまだ出ていないため）
- `test` が赤（✗）になっても、マージボタンは押せないまま
- `build` は `needs: [lint, test]` で「`lint` と `test` が成功したら動く」ように書いてあるので、`test` が失敗すると実行されずに **Skipped**（スキップ）になる
- ターミナルから `gh pr merge` しようとしても拒否される

> チェック一覧で **Required** と付いているものが、ルールセットで必須にしたチェック。どれが原因で止められているかは、ここで赤くなっているものを探せばわかる。

```powershell
gh pr merge --merge
# => X Pull request ... is not mergeable: the base branch policy prohibits the merge.
```

`the base branch policy prohibits the merge` は「マージ先のブランチ（base branch＝`main`）のルールがマージを禁止している」という意味。

テストを元に戻して（`toBe(999)` → 元の値）、もう一度 push する。同じ PR のブランチに push すれば、PR に新しいコミットが追加され、CI が自動でもう一度動く。PR を作り直す必要はない。

```powershell
git add .
git commit -m "fix: テストを元に戻す"
git push
gh pr checks --watch
```

`gh pr checks --watch` は、PR のチェックの結果が全部出るまでターミナルで見張り続けるコマンド。3つとも緑（✓）になると、マージボタンが押せるようになる。

```powershell
gh pr merge --merge --delete-branch
git switch main
git pull
```

`--delete-branch` を付けると、マージしたあとに PR のブランチ（`test/protected`）を GitHub 側と手元の両方から消してくれる。最後に `main` に戻って `git pull` し、マージされた内容を手元にも取り込んでおく。

### 5. 「最新にしてから」ルール

「Require branches to be up to date before merging」にチェックを入れたので、**`main` が先に進んでいると、PR ブランチに取り込み直すまでマージできない**。

なぜこのルールが必要か：

```text
PR A：TodoForm を変更（CI 緑）───────────┐
PR B：TodoForm を使う TodoApp を変更（CI 緑）┼── 両方マージ ── main で壊れる！
```

A と B はそれぞれ単独ではテストが通っていても、**組み合わせたら壊れる** ことがある。「最新の `main` を取り込んだ状態で CI が通ったこと」を必須にすると、これを防げる。

`main` が先に進んでいると、PR の画面に「**This branch is out-of-date with the base branch**」（このブランチはマージ先より古い）と表示される。その横の **Update branch** ボタンを押すと、`main` の変更が PR ブランチに取り込まれ、CI がもう一度動く。緑になればマージできる。

ターミナルで同じことをするには次のようにする。

```powershell
git switch <PRのブランチ>
git pull origin main
git push
```

`git pull origin main` は「GitHub の `main` の最新の変更を、今いるブランチに取り込む」コマンド。取り込んだ結果を `git push` すると、PR に反映されて CI が動き直す。

> 取り込むときに **コンフリクト**（同じ行を両方で変えていて、Git が自動でまとめられない状態）が起きたら、VS Code でどちらを残すか選んで保存し、`git add .` → `git commit` → `git push` する。

### 6. ルールセットの状態を確認する

```powershell
gh api "repos/{owner}/{repo}/rulesets"
```

`gh api` は、GitHub の API（プログラムから GitHub の情報を読み書きするための窓口）を呼び出すコマンド。`{owner}` と `{repo}` は、今いるリポジトリの持ち主と名前に `gh` が自動で置き換えてくれる。結果は JSON（データを `{ }` や `[ ]` で表す書き方）で表示され、`"name": "protect-main"` と `"enforcement": "active"` が見つかればOK。

画面で確認するだけでなくコマンドでも確かめられるようにしておくと、「設定したつもりで効いていなかった」を早く見つけられる。

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
