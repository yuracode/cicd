# コマ15｜はじめてのワークフロー

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 | 90分 |
| 前提コマ | コマ14 GitHub Actions入門（全体像とYAML） |
| 次コマ | コマ16 CIでlintとbuildを自動実行する |

##  目標

- `.github/workflows/` にワークフローを置いて push し、Actions タブで実行結果とログを確認できる
- ランナーが「まっさらなマシン」であることを、`checkout` の有無で確かめられる
- コンテキスト（`${{ github.○○ }}`）・複数ジョブ・`needs` を使い、失敗したワークフローのログから原因を読める

##  導入

### 前回の振り返り

前回は GitHub Actions の用語（ワークフロー・ジョブ・ステップ・アクション・ランナー）と、YAML の書き方を学んだ。

### 今日のゴール

`todo-app` リポジトリで、実際にワークフローを動かす。

1. 「Hello」と表示するだけのワークフローを動かす
2. ランナーの中がどうなっているか覗く
3. わざと失敗させて、失敗したときの画面とログを読む

> `todo-app` が GitHub にない人は、コマ7の本題 1〜2（`gh auth login` → `gh repo create`）を先に済ませておく。

##  本題

### 1. ワークフローファイルを作る

```bash
cd ~/workspace/todo-app
git switch main
git pull
git switch -c ci/hello
mkdir -p .github/workflows
```

```yaml
# .github/workflows/hello.yml
name: Hello

on:
  push:
  workflow_dispatch:

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: あいさつ
        run: echo "Hello, GitHub Actions!"
      - name: 実行した人を表示
        run: echo "実行した人：${{ github.actor }}"
```

- `push:` の下に何も書かないと、**どのブランチへの push でも** 動く（今回は作業ブランチで試したいのでこうする）
- フォルダ名 `.github/workflows/` は **決まった名前**。1文字でも違うと動かない

```bash
git add .github/workflows/hello.yml
git commit -m "ci: はじめてのワークフローを追加"
git push -u origin ci/hello
```

### 2. Actions タブで結果を見る

```bash
gh repo view --web
```

リポジトリの **Actions** タブを開く。

1. 左側にワークフロー名「Hello」がある
2. 右側に、今 push したコミットのメッセージが並んでいる（黄色の丸 = 実行中、緑のチェック = 成功、赤の × = 失敗）
3. クリック → ジョブ `greet` をクリック → ステップの一覧が出る
4. 各ステップの `>` を開くと **ログ**（実行された内容と出力）が見られる

「実行した人を表示」のステップを開くと、`${{ github.actor }}` が自分のユーザー名に置き換わっていることが分かる。

ターミナルからも確認できる。

```bash
gh run list --limit 3
gh run view --log | tail -20
```

### 3. ランナーの中を覗く

ランナーがどんなマシンなのか調べるステップを追加する。

```yaml
# .github/workflows/hello.yml（steps の最後に追加）
      - name: ランナーを調べる
        run: |
          uname -a
          node -v
          npm -v
          pwd
          ls -la
```

```bash
git add .
git commit -m "ci: ランナーの情報を表示"
git push
```

ログを見ると、

- Linux（Ubuntu）で動いている
- Node.js は **最初から入っている**（ただし自分で選んだバージョンではない）
- `ls -la` の結果が **空っぽ**：リポジトリのファイルが1つもない

ランナーは毎回まっさらなマシンで、**コードを取ってくるのも自分で指示する必要がある**。

### 4. checkout でコードを取ってくる

`steps` の **一番最初** に `actions/checkout` を追加する。

```yaml
# .github/workflows/hello.yml
name: Hello

on:
  push:
  workflow_dispatch:

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: コードを取ってくる
        uses: actions/checkout@v7
      - name: あいさつ
        run: echo "Hello, GitHub Actions!"
      - name: 実行した人を表示
        run: echo "実行した人：${{ github.actor }}"
      - name: ランナーを調べる
        run: |
          uname -a
          node -v
          npm -v
          pwd
          ls -la
```

```bash
git add .
git commit -m "ci: checkout を追加"
git push
```

今度は `ls -la` に `app/`、`components/`、`package.json` などが並ぶ。`uses:` で **他の人が作った部品（アクション）** を呼び出すと、自分で git のコマンドを書かなくてもコードを取ってこられる。

### 5. コンテキストで情報を取り出す

`${{ ... }}` の中では、GitHub が用意した情報（**コンテキスト**）が使える。

```yaml
# .github/workflows/hello.yml（steps の最後に追加）
      - name: 実行の情報を表示
        run: |
          echo "イベント：${{ github.event_name }}"
          echo "ブランチ：${{ github.ref_name }}"
          echo "コミット：${{ github.sha }}"
          echo "リポジトリ：${{ github.repository }}"
          echo "ランナーの OS：${{ runner.os }}"
```

| コンテキスト | 中身の例 |
|------------|---------|
| `github.event_name` | `push`、`pull_request`、`workflow_dispatch` |
| `github.ref_name` | `ci/hello`（ブランチ名） |
| `github.sha` | `3f2a...`（コミットの ID） |
| `github.repository` | `ユーザー名/todo-app` |
| `runner.os` | `Linux` |

### 6. 手動で実行する

`workflow_dispatch` を書いてあるので、手動でも動かせる。

- Actions タブ → 左の「Hello」→ 右上の **Run workflow** → ブランチに `ci/hello` を選んで実行

ターミナルからも実行できる。

```bash
gh workflow run hello.yml --ref ci/hello
gh run list --limit 3
```

`github.event_name` が `workflow_dispatch` になっていることをログで確かめる。

> Actions タブの **Run workflow** ボタンは、`workflow_dispatch` を書いたワークフローが **デフォルトブランチ（`main`）にある** ときに表示される。まだ `main` にない場合は `gh workflow run` を使う。

### 7. ジョブを増やして順番をつける

ジョブは何も指定しないと **同時に** 動く。順番をつけたいときは `needs` を使う。

```yaml
# .github/workflows/hello.yml（jobs の中、greet の下に追加。インデントは greet と同じ）
  goodbye:
    needs: greet
    runs-on: ubuntu-latest
    steps:
      - name: お別れ
        run: echo "greet が終わったので goodbye です"
```

```bash
git add .
git commit -m "ci: needs で順番のあるジョブを追加"
git push
```

Actions の画面で、`greet` → `goodbye` と矢印でつながった図が表示される。`greet` が失敗すると、`goodbye` は実行されずにスキップされる。

### 8. わざと失敗させる

```yaml
# .github/workflows/hello.yml（greet の steps の最後に追加）
      - name: わざと失敗する
        run: |
          echo "これから失敗します"
          exit 1
```

```bash
git add .
git commit -m "ci: わざと失敗させる"
git push
```

- 赤い × が付く
- 失敗したステップのログに `Error: Process completed with exit code 1.` と出る
- 失敗したステップより後のステップ、そして `needs: greet` の `goodbye` ジョブは **実行されない**
- GitHub に登録したメールアドレスに、失敗の通知が届く

コマ13で見たとおり、**コマンドが 0 以外の終了コードで終わると「失敗」** と判断される。`npm test` がテスト失敗で終了コード 1 を返せば、それだけでワークフローも失敗になる。次回からこの仕組みを使う。

確認したら、「わざと失敗する」のステップを消して push し、緑に戻す。

```bash
git add .
git commit -m "ci: わざと失敗させるステップを削除"
git push
gh pr create --fill
```

PR をマージしたら、`hello.yml` の `on:` を次のように変えておくと、以降の作業ブランチの push のたびに動かなくて済む。

```yaml
on:
  workflow_dispatch:
```

##  演習

### 演習1（基本）：自分の情報を表示するステップ

`hello.yml` に次の2つを表示するステップを追加し、push して確認する。

- 「○○ が △△ ブランチに push しました」（`github.actor` と `github.ref_name` を使う）
- 今の日時（日本時間）。ヒント：`TZ=Asia/Tokyo date`

**確認方法**：Actions のログに、自分のユーザー名・ブランチ名・日本時間の日時が表示されればOK。

<details>
<summary>解答例</summary>

```yaml
      - name: 自分の情報
        run: |
          echo "${{ github.actor }} が ${{ github.ref_name }} ブランチに push しました"
          TZ=Asia/Tokyo date
```

ランナーの時計は UTC（日本時間より9時間遅い）なので、`TZ=Asia/Tokyo` で日本時間にしている。

</details>

### 演習2（基本）：3つのジョブの順番

次の順番で動くジョブ構成に変える。

```text
prepare ──┬── build
          └── check
```

- `prepare` が最初に動く
- `prepare` が終わったら、`build` と `check` が **同時に** 動く

**確認方法**：Actions の画面の図が、`prepare` から2本の矢印が出ている形になっていればOK。

<details>
<summary>解答例</summary>

```yaml
jobs:
  prepare:
    runs-on: ubuntu-latest
    steps:
      - run: echo "準備"

  build:
    needs: prepare
    runs-on: ubuntu-latest
    steps:
      - run: echo "ビルド"

  check:
    needs: prepare
    runs-on: ubuntu-latest
    steps:
      - run: echo "チェック"
```

複数のジョブを待ちたいときは `needs: [build, check]` のようにリストで書く。

</details>

### 演習3（応用）：失敗したら原因を読んで直す

次のステップを追加して push すると、ワークフローが失敗する。**ログだけを見て** 原因を突き止め、直す。

```yaml
      - name: package.json の名前を表示
        run: |
          cat package.jsn
          node -e "console.log(require('./package.json').name)"
```

**確認方法**：失敗したログから原因の行を特定し、直したあと緑のチェックになればOK。

<details>
<summary>解説</summary>

ログに次のように出る。

```text
cat: package.jsn: No such file or directory
Error: Process completed with exit code 1.
```

ファイル名の打ち間違い（`package.jsn`）。`run: |` の複数行のコマンドは、**途中の1つが失敗した時点で止まる**（次の `node -e ...` は実行されない）。直すと `todo-app` と表示される。

もし `actions/checkout` を書き忘れていたら、ファイル名が正しくても同じエラーになる。**ログのエラーは「何が見つからないか」を教えてくれる** ので、まずそこを読む。

</details>

### 演習4（早く終わった人向け）：手動実行に入力欄を付ける

`workflow_dispatch` に `inputs` を追加し、手動実行のときに名前を入力できるようにする。入力した名前で「こんにちは、○○さん」と表示する。

**確認方法**：`gh workflow run hello.yml --ref ci/hello -f name=花子`（または Actions の画面の入力欄）で実行し、ログに「こんにちは、花子さん」と出ればOK。

<details>
<summary>ヒント</summary>

```yaml
on:
  workflow_dispatch:
    inputs:
      name:
        description: あいさつする相手
        required: true
        default: 名無し
```

入力した値は `${{ inputs.name }}` で取り出せる。

</details>

##  まとめ

### 今日できるようになったこと

- `.github/workflows/hello.yml` を push して、Actions タブと `gh run` で結果とログを確認できるようになった
- ランナーは毎回まっさらで、`actions/checkout` でコードを取ってくる必要があることを確かめた
- コンテキスト・`needs`・失敗時のログの読み方を身につけた

### よくある詰まりポイント

- **Actions タブに何も出ない**：ファイルの場所が `.github/workflows/` か確認する（`.github/workflow/` や `github/workflows/` では動かない）。拡張子は `.yml` か `.yaml`
- **`Invalid workflow file` と表示される**：YAML のインデントか、キーの書き間違い。表示される行番号を確認する
- **`ls` でファイルが見えない・`No such file or directory`**：`actions/checkout` を最初のステップに書いているか確認する

### 次コマ予告

次回は、いよいよ本物の CI を作る。PR を出すたびに `npm ci` → `npm run lint` → `npm run build` が自動で実行され、失敗したら PR に赤い × が付くようにする。

##  課題

### 基礎課題（必須）

1. 演習1・2を完成させ、PR を作ってマージする
2. 自分のリポジトリの Actions タブで、成功した実行と失敗した実行を1つずつ開き、それぞれ「どのステップで何が表示されたか」をメモする

### 応用課題（推奨）

3. `if:` を使って、「`main` ブランチのときだけ実行されるステップ」を作る（ヒント：`if: github.ref_name == 'main'`）。作業ブランチと `main` で、そのステップがスキップされるか実行されるかを確かめる
4. `env:` を使ってワークフロー全体で使う変数（例：`GREETING: こんにちは`）を定義し、ステップの中で `$GREETING` として使う。`${{ env.GREETING }}` と `$GREETING` の2通りの書き方があることを確かめる

### チャレンジ課題（挑戦）

5. `schedule` で「毎日 日本時間の朝8時」に動くワークフローを作る。実際に次の朝に動いたかを Actions タブで確認する（`schedule` は `main` にあるワークフローだけが動く点に注意）
6. `strategy.matrix` を調べ、`node-version: [22, 24]` のように書くと同じジョブが2つ同時に動くことを確かめる。ログで `node -v` がそれぞれ違うことを確認する（ヒント：`actions/setup-node@v7` の `node-version: ${{ matrix.node-version }}`）
