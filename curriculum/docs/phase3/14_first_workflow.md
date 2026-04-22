# コマ14｜初めてのワークフロー

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 |  |
| 前提コマ | コマ13 GitHub Actions概要・YAML構文 |
| 次コマ | コマ15 CI：Lintの自動化 |

##  目標

- `.github/workflows/` にワークフローファイルを作成できる
- GitHub上の Actions タブで実行履歴・ログを読める
- `workflow_dispatch` で手動実行、`push` で自動実行の両方を試せる

##  導入

### 前回の振り返り

YAMLの書き方、ワークフロー／ジョブ／ステップの関係を座学で学んだ。今日は **実際に動かす**。

### 今日のゴール

- TODOアプリのリポジトリに初めてのワークフローを置く
- push したら GitHub 上で「Hello」と出るだけの超シンプルなものを動かす
- Actions タブでログを確認する

### 予習：どこに置くの？

**必ず** リポジトリ直下の `.github/workflows/` の中に `.yml` で置く。この場所以外は無視される。

```
todo-app/
├── .github/
│   └── workflows/
│       └── hello.yml   ← これを作る
├── src/
├── package.json
└── ...
```

##  本題

### 1. ワークフローファイルを作る

```bash
cd ~/workspace/todo-app

# まず main ブランチに居ることを確認
git switch main
git pull origin main

# 作業ブランチを切る
git switch -c feature/add-workflow

# ディレクトリ作成
mkdir -p .github/workflows
```

`.github/workflows/hello.yml` を新規作成：

```yaml
name: Hello

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: 挨拶
        run: echo "Hello from GitHub Actions!"

      - name: 今の日時を表示
        run: date

      - name: 作業ディレクトリを表示
        run: pwd
```

> **`workflow_dispatch:` を入れる理由**：手動実行できるようにしておくと、デバッグや動作確認の時に便利。

### 2. push して動かす

```bash
git add .github/workflows/hello.yml
git commit -m "ci: hello ワークフローを追加"
git push -u origin feature/add-workflow
```

GitHub 上でPRを作ってマージまで実行：

```bash
gh pr create --title "hello ワークフロー追加" --body "初めてのGitHub Actions"
gh pr view --web
# マージ後
git switch main
git pull origin main
```

main にマージされた瞬間に `push` イベントが発火してワークフローが走る。

### 3. Actions タブでログを見る

ブラウザで：

```bash
gh repo view --web
```

→ **Actions** タブに移動

- 「Hello」ワークフローの実行履歴が並んでいる
- 最新の緑チェックマークをクリック
- `greet` ジョブを選択
- 各ステップを展開するとコマンドの標準出力（stdout）が見える

> **ここがCI/CDの心臓部**：普段は閉じているが、FAIL時はこのログを読むことになる。どの程度の情報が出るかを今のうちに眺めておく。

### 4. 手動実行もやってみる

Actions タブ → 左の「Hello」→ 右上「Run workflow」ボタン → 実行するブランチ選んで「Run」

これで `workflow_dispatch` の起動が確認できる。数秒で新しい実行が走る。

### 5. 失敗を体験する

わざと失敗させてみる。新しい作業ブランチで：

```bash
git switch -c feature/intentional-fail
```

`.github/workflows/hello.yml` に存在しないコマンドを追加：

```yaml
      - name: わざと失敗
        run: this-command-does-not-exist
```

コミット＆push：

```bash
git add .github/workflows/hello.yml
git commit -m "ci: わざと失敗する step を追加（学習用）"
git push -u origin feature/intentional-fail
```

ブランチ push では発火しない（`on: push: branches: [main]` なので）。PR を作って main へマージしてみる……と言いたいところだが、**これをマージすると main の Actions が壊れる**。

代わりに **PRで直接ワークフローを試す** ための小改造：

```yaml
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
```

`pull_request` を追加すると、PRの時点でワークフローが走る。

もう一度コミット＆push してPR作成：

```bash
git add .github/workflows/hello.yml
git commit -m "ci: PR でもワークフローを発火させる"
git push
gh pr create --title "PRで発火するよう変更" --body "学習用"
```

PR画面で「Checks」に **赤い ✕ マーク** が出る。クリックするとFAILしたステップと原因が見える。

**この体験が重要**：実務では PR を出した時に Checks が赤くなったら、まずログを読んで原因を特定する。

```bash
# 失敗の原因ステップを削除してマージしない（学習用の実験だったので）
# 以下、実験ブランチを削除：
git switch main
git branch -D feature/intentional-fail
gh pr close 該当PR番号
```

### 6. 基本イベントとパス指定

運用でよく使うパターン：

**特定パスの変更時だけ走らせる：**

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package.json'
```

**PR時だけ走らせる（mainには入る前に確認）：**

```yaml
on:
  pull_request:
    branches: [main]
```

**定時実行（cron）：**

```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # 毎日 UTC 0時
```

> **cron の書き方：** `分 時 日 月 曜` の順。`*` はワイルドカード。
> `0 0 * * *` → 毎日 00:00（UTC）
> `0 9 * * 1-5` → 平日 09:00（UTC）

### 7. ワークフローを整理して終わる

実験用の `hello.yml` は最終形にしておく：

```yaml
name: Hello

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: 挨拶
        run: echo "Hello from GitHub Actions!"
      - name: 今の日時を表示
        run: date
```

コミットしてmainに入れておく。

##  まとめ

### 今日できるようになったこと

- `.github/workflows/xxx.yml` を作り push するだけでCIが動く
- Actions タブのログを読める
- `push` / `pull_request` / `workflow_dispatch` のイベントを使い分けられる

### よくある詰まりポイント

- **ファイル場所の間違い**：`.github/workflows/` 以外はGitHubに拾われない
- **YAMLのインデント**：タブ混入や2スペース外しで構文エラー。エディタの「空白文字の表示」をONに
- **main以外に push したのに動かない**：`on:` の指定と突き合わせて確認

### 次コマ予告

次回は実用の第一歩。ESLintを設定してCIで自動チェック。「コードの汚れたPR」をマージできない状態にしていく。

##  課題

### 基礎課題（必須）

1. `hello.yml` に `echo "Hello $GITHUB_ACTOR"` のステップを追加し、自分のGitHubユーザー名が表示されることを確認する
2. Actions のログを開いて、仮想マシンのOS情報（`uname -a` など）を表示する step を追加してみる

### 応用課題（推奨）

3. **複数ステップを連結する** ワークフローを書く。各ステップに意味のある `name:` を付けて、Actions のログで流れを追えるようにする：

```yaml
steps:
  - name: 1. ファイルを作る
    run: echo "Hello" > greeting.txt
  - name: 2. 中身を表示
    run: cat greeting.txt
  - name: 3. 行数をカウント
    run: wc -l greeting.txt
```

4. **2つのジョブを並列に実行** する練習：`job-a` と `job-b` を定義し、Actions のタイムラインで並行実行されていることを確認する。各ジョブの所要時間をログで計測

> **狙い：** ジョブは並列、ステップは直列。この基本を体感で覚えると後々の設計が楽になる。

### チャレンジ課題（挑戦）

5. **条件分岐 `if:`** をワークフローに入れる。例：「ブランチ名が `feature/` で始まる時だけ挨拶する」：

```yaml
- name: featureブランチ挨拶
  if: startsWith(github.ref_name, 'feature/')
  run: echo "Feature branch detected!"
```

→ `github.ref_name` 以外の **コンテキスト変数** も調べて、1つ使ってみる（例：`github.event_name`, `github.actor`）

6. **ワークフロー間の連携** を調べる：`workflow_run` イベントを使うと、別ワークフローの完了をトリガにできる。実装は任意、**概念だけ** 押さえてメモする

7. GitHub Actions の **Job Summary** 機能（`$GITHUB_STEP_SUMMARY`）を使って、ジョブの実行結果を **Markdown形式でActionsのタブに表示** してみる：

```yaml
- run: echo "## 今日の実行結果" >> $GITHUB_STEP_SUMMARY
- run: echo "- 成功件数：1" >> $GITHUB_STEP_SUMMARY
```
