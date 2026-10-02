# コマ14｜GitHub Actions入門（全体像とYAML）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 | 90分 |
| 前提コマ | コマ13 カバレッジとNext.jsのテスト戦略 |
| 次コマ | コマ15 はじめてのワークフロー |

##  目標

- CI / CD とは何か、GitHub Actions で何を自動化できるかを説明できる
- ワークフロー・ジョブ・ステップ・アクション・ランナーの関係を説明できる
- YAML の書き方（インデント・キーと値・リスト・複数行）を読み書きできる

##  導入

### Phase 2 の振り返り

`npm test` や `npm run lint` で、コードが壊れていないかを確かめられるようになった。ただし、これは **人が忘れずに実行すれば** の話。

- 急いでいて、テストを実行せずに push してしまった
- 自分の PC では通ったが、他の人の PC では失敗した
- PR を見る人は、そのコードのテストが通ったか分からない

### 今日のテーマ

**push や PR をきっかけに、GitHub が自動でテストや lint を実行してくれる仕組み** ＝ **GitHub Actions** を学ぶ。今日はその全体像と、設定ファイルを書くための **YAML** の読み書きを押さえる。

| 言葉 | 意味 |
|------|------|
| **CI**（継続的インテグレーション） | コードを変えるたびに、自動でビルド・テストして「壊れていない」ことを確かめ続けること |
| **CD**（継続的デリバリー / デプロイ） | テストに通ったコードを、自動で公開（デプロイ）できる状態にする／公開すること |

Phase 3 で CI を、Phase 4 で CD を作る。

##  本題

### 1. GitHub Actions でできること

GitHub Actions は、リポジトリに **`.github/workflows/○○.yml`** というファイルを置くだけで動く自動化の仕組み。

| きっかけ（イベント） | 自動でやること（例） |
|--------------------|-------------------|
| PR が作られた・更新された | lint とテストを実行し、結果を PR に表示する |
| `main` にマージされた | ビルドして Web サイトを公開する |
| 毎朝9時になった | 使っているパッケージに古いものがないか調べる |
| ボタンが押された | 手動でデプロイする |

公開リポジトリなら無料で使える（非公開リポジトリにも毎月の無料枠がある）。

### 2. 5つの用語の関係

```text
ワークフロー（.github/workflows/ci.yml：1ファイル = 1ワークフロー）
│  「いつ」動くか（on: push, pull_request ...）
│
├─ ジョブ「lint」 ─── ランナー（GitHub が用意する使い捨ての Linux マシン）で動く
│   ├─ ステップ1：コードを取ってくる   ← アクション（部品）を使う  uses: actions/checkout@v7
│   ├─ ステップ2：Node.js を用意する   ← アクションを使う          uses: actions/setup-node@v7
│   └─ ステップ3：npm run lint         ← コマンドを直接実行する    run: npm run lint
│
└─ ジョブ「test」 ─── 別のランナーで動く（lint と同時に進む）
    └─ ...
```

| 用語 | 意味 |
|------|------|
| **ワークフロー** | 自動化の単位。YAML ファイル1つ |
| **ジョブ** | ワークフローの中の作業のまとまり。**ジョブごとに別のマシン** で動き、何も指定しなければ同時に進む |
| **ステップ** | ジョブの中の1手順。**上から順に** 実行される |
| **アクション** | よく使う手順を部品にしたもの。`uses:` で呼び出す |
| **ランナー** | ジョブを実行するマシン。毎回まっさらな状態で用意され、終わったら捨てられる |

> **ランナーは毎回まっさら**：自分の PC と違い、`node_modules` も何も入っていない。だから毎回「コードを取ってくる → Node.js を入れる → `npm ci` でパッケージを入れる」から始める。

### 3. YAML の基本

ワークフローは **YAML**（ヤムル）という形式で書く。「設定を人間が読みやすく書くための形式」。

#### キーと値

```yaml
name: CI
runs-on: ubuntu-latest
```

`キー: 値` の形。`:` の後ろには **半角スペースが必要**。

#### インデント（字下げ）で階層を表す

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
```

- `jobs` の中に `lint`、`lint` の中に `runs-on` がある
- **インデントは半角スペース2つ**。**タブは使えない**
- インデントが1つずれるだけで意味が変わる（またはエラーになる）

#### リスト（配列）

```yaml
steps:
  - name: コードを取ってくる
    uses: actions/checkout@v7
  - name: lint を実行
    run: npm run lint
```

`- ` で始まる行が、リストの1要素。`- ` の次の行は、`name` と同じ位置までインデントをそろえる。

短いリストは `[ ]` で1行にも書ける。

```yaml
branches: [main, develop]
```

#### 複数行の文字列

```yaml
run: |
  npm ci
  npm run lint
  npm test
```

`|` の次の行から、インデントされた部分が **改行を含んだ1つの文字列** になる。複数のコマンドを順に実行したいときに使う。

#### コメント

```yaml
# ここはコメント
node-version: 24  # 行の途中からもコメントにできる
```

### 4. YAML を JavaScript のデータと見比べる

YAML は、JavaScript のオブジェクトや配列と同じ構造を表している。

```yaml
name: CI
on:
  push:
    branches: [main]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: npm run lint
```

```js
{
  name: 'CI',
  on: { push: { branches: ['main'] } },
  jobs: {
    lint: {
      'runs-on': 'ubuntu-latest',
      steps: [
        { uses: 'actions/checkout@v7' },
        { run: 'npm run lint' },
      ],
    },
  },
}
```

- インデント → `{ }` の入れ子
- `- ` → 配列 `[ ]` の要素

手元で YAML を JSON に変換して確かめられる。

```powershell
mkdir -Force ~/workspace/yaml-practice
cd ~/workspace/yaml-practice
```

上の YAML を `sample.yml` として保存し、変換する。

```powershell
npx --yes js-yaml sample.yml
```

```json
{
  "name": "CI",
  "on": {
    "push": {
      "branches": [
        "main"
      ]
    }
  },
  ...
}
```

インデントを1つわざとずらしたり、タブを入れたりして、エラーや結果の変化を確かめる。

> **js-yaml** は YAML を読み込む JavaScript のライブラリ。`npx --yes` で、インストールせずにその場で使っている。

### 5. ワークフローを読む

次のワークフローを1行ずつ読む。（次回、実際に動かす）

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
      - name: あいさつ
        run: echo "Hello, GitHub Actions!"
      - name: 実行した人を表示
        run: echo "実行した人：${{ github.actor }}"
```

| 行 | 意味 |
|----|------|
| `name: Hello` | Actions の画面に表示されるワークフロー名 |
| `on:` | いつ動くか |
| `push: branches: [main]` | `main` に push されたとき |
| `workflow_dispatch:` | Actions の画面のボタンから手動で動かせる |
| `jobs:` | ジョブの一覧 |
| `greet:` | ジョブの ID（名前は自由） |
| `runs-on: ubuntu-latest` | 最新の Ubuntu のランナーで動かす |
| `steps:` | 手順の一覧 |
| `run:` | シェルのコマンドを実行する |
| `${{ github.actor }}` | GitHub が用意している情報（**コンテキスト**）。ここでは「push した人のユーザー名」に置き換わる |

### 6. よく使うイベントとアクション

| イベント（`on:`） | 動くタイミング |
|-----------------|--------------|
| `push` | ブランチに push されたとき |
| `pull_request` | PR が作られた・更新されたとき |
| `workflow_dispatch` | Actions の画面から手動で |
| `schedule` | 決まった時刻に（`cron: '0 0 * * *'` など。時刻は UTC） |

| アクション（`uses:`） | 役割 |
|---------------------|------|
| `actions/checkout@v7` | リポジトリのコードをランナーに取ってくる。**ほぼ必ず最初に書く** |
| `actions/setup-node@v7` | 指定したバージョンの Node.js を用意する |
| `actions/upload-artifact@v7` | ファイル（テスト結果など）を保存してダウンロードできるようにする |

`@v7` は **アクションのバージョン**。バージョンを固定しておくと、アクション側の大きな変更で急に動かなくなるのを防げる。

> `actions/` で始まるアクションは GitHub 公式。それ以外のアクションは誰でも公開できるので、**使う前に作者・スター数・更新日を確認する**。アクションはリポジトリのコードや秘密の値に触れられるので、信頼できないものは使わない。

##  演習

### 演習1（基本）：自己紹介を YAML で書く

`~/workspace/yaml-practice/me.yml` に、自分の情報を YAML で書く。次の要素を必ず含める。

- `name`（文字列）と `age`（数値）
- `skills`（リスト。3つ以上）
- `school`（入れ子：`name` と `department` を持つ）
- `goal`（`|` を使った2行以上の文章）

**確認方法**：`npx --yes js-yaml me.yml` で JSON に変換でき、`skills` が配列、`school` がオブジェクトになっていればOK。

<details>
<summary>解答例</summary>

```yaml
name: 山田 太郎
age: 19
skills:
  - HTML
  - JavaScript
  - React
school:
  name: ○○専門学校
  department: ICT学科
goal: |
  自分で作ったアプリを公開する。
  テストと自動デプロイまで自分でできるようになる。
```

</details>

### 演習2（基本）：壊れた YAML を直す

次の YAML には2か所の間違いがある。`broken.yml` として保存し、`npx --yes js-yaml broken.yml` のエラーを手がかりに直す。

```yaml
name: Broken
on:
  push:
    branches:[main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: step1
        run: echo "one"
     - name: step2
        run: echo "two"
```

さらに、`runs-on` の行の先頭のスペースを **タブ** に置き換えたらどうなるかも試す。

**確認方法**：エラーなく JSON に変換でき、`steps` が2要素の配列になっていればOK。

<details>
<summary>解説</summary>

1. `- name: step2` の前のスペースが1つ足りない（5つになっている）。`- name: step1` と同じ6つにそろえる。js-yaml は `bad indentation of a mapping entry (11:6)` のように **行と列** を教えてくれる
2. `branches:[main]` → `:` の後ろにスペースがないので、エラーにはならないが `"push": "branches:[main]"` という **ただの文字列** として読まれてしまう。`branches: [main]` にする。**エラーが出ない間違い** なので、JSON に変換して形を確かめることが大事

タブを入れると `tab characters must not be used in indentation` のようなエラーになる。VS Code の右下で「スペース: 2」になっていることを確認しておく。

</details>

### 演習3（応用）：ワークフローを読んで説明する

次のワークフローについて、下の質問に答える。

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npm ci
      - run: npm test
```

1. このワークフローはいつ動くか
2. ジョブはいくつあり、それぞれ何をするか
3. `lint` と `test` は、どちらが先に動くか
4. `with:` は何のために書いているか
5. `test` ジョブでも `checkout` と `setup-node` をもう一度書いているのはなぜか

**確認方法**：5つの質問に1〜2行ずつ答えられればOK。

<details>
<summary>解答例</summary>

1. `main` に向けた PR が作られたとき・更新されたとき
2. 2つ。`lint` は ESLint を、`test` は Jest を実行する
3. 何も指定していないので **同時に** 動く（どちらが先ということはない）
4. アクションに渡す設定（引数）。ここでは「Node.js のバージョンは 24」と伝えている
5. ジョブごとに **別のランナー（まっさらなマシン）** で動くので、`lint` で取ってきたコードや Node.js は `test` のマシンにはない

</details>

### 演習4（早く終わった人向け）：他人のワークフローを読む

GitHub で有名なオープンソースのリポジトリ（例：`vercel/next.js`、`facebook/react`、`testing-library/react-testing-library` など）を開き、`.github/workflows/` の中のファイルを1つ読む。

- どのイベントで動くか
- どんなジョブがあるか
- 知らない書き方（キーやアクション）を2つ見つけて、GitHub のドキュメントで意味を調べる

**確認方法**：読んだファイル名と、調べた2つの書き方の意味をメモできればOK。

##  まとめ

### 今日できるようになったこと

- CI / CD と、GitHub Actions で自動化できることを説明できるようになった
- ワークフロー > ジョブ > ステップ、アクション、ランナーの関係を理解した
- YAML のインデント・リスト・`|` を読み書きし、`js-yaml` で JSON に変換して確かめられるようになった

### よくある詰まりポイント

- **インデントのずれ**：YAML で一番多い間違い。VS Code の設定をスペース2つにし、タブを使わない
- **`:` の後ろのスペース忘れ**：`key:value` は1つの文字列になってしまう。`key: value` と書く
- **「ジョブは上から順に動く」という思い込み**：ジョブは同時に動く。ステップは上から順に動く

### 次コマ予告

次回は実際に `todo-app` に `.github/workflows/hello.yml` を置いて push し、GitHub の Actions タブでワークフローが動く様子とログを見る。わざと失敗させて、失敗したときの画面も確認する。

##  課題

### 基礎課題（必須）

1. 演習1・2を完成させる
2. 次の言葉を1〜2行で説明する：CI / CD / ワークフロー / ジョブ / ステップ / アクション / ランナー

### 応用課題（推奨）

3. GitHub Actions の料金（無料枠）を公式ドキュメントで調べ、「公開リポジトリ」「非公開リポジトリ」でそれぞれどうなるかまとめる
4. `schedule` イベントの `cron` の書き方を調べ、「毎週月曜の朝9時（日本時間）」に動かすにはどう書くかを答える（ヒント：GitHub Actions の時刻は UTC。日本時間は UTC + 9 時間）

### チャレンジ課題（挑戦）

5. GitHub Actions 以外の CI サービス（GitLab CI / CircleCI など）を1つ調べ、設定ファイルの置き場所と書き方が GitHub Actions とどう違うかを比べる
6. サードパーティ製のアクションを使うときの危険（例：作者のアカウントが乗っ取られてアクションが書き換えられる）と、その対策（バージョンをコミットの SHA で固定する）について調べてまとめる
