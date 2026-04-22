# コマ13｜GitHub Actions概要・YAML構文

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 |  |
| 前提コマ | コマ12 カバレッジ計測 |
| 次コマ | コマ14 初めてのワークフロー |

##  目標

- GitHub Actions が「何を自動化できるか」を具体例で説明できる
- ワークフロー／ジョブ／ステップ／アクションの階層関係が説明できる
- YAML の基本書式（インデント、配列、マッピング）を読める

##  導入

### Phase 2 の振り返り

ローカルで `npm run test` すればテストが走るようになった。でも人間が忘れたら意味がない。

> 「PR 出すたびに誰かが忘れずテストを回している仕組み」が欲しい。

これを自動でやってくれるのが **GitHub Actions**。

### GitHub Actions とは

- GitHub が提供する **CI/CD プラットフォーム**
- リポジトリに `.github/workflows/*.yml` を置くだけで動く
- **何かのイベント（push / PR / 定期時刻）をきっかけに** GitHubが用意した仮想マシンでスクリプトを実行する
- パブリックリポジトリなら無料、プライベートも月まで無料枠

### 何ができるか（実例）

1. **push のたびに自動テスト**（今回の本命）
2. **PR時に自動で Lint → NG ならマージ不可**
3. **main にマージされたら自動で本番デプロイ**
4. **毎朝9時にバックアップ実行**（cron）
5. **Issueに特定ラベルが付いたら通知**

##  本題

### 1. GitHub Actions の階層構造

覚える順番：**ワークフロー > ジョブ > ステップ > アクション**

```
ワークフロー（.yml ファイル1つ）
 ├─ ジョブ1（build）
 │   ├─ ステップ1：コードをチェックアウト
 │   ├─ ステップ2：Node.js セットアップ
 │   └─ ステップ3：npm test を実行
 └─ ジョブ2（deploy）
     └─ ステップ1：デプロイ
```

**用語整理：**

| 用語 | 意味 |
|------|------|
| **ワークフロー** | `.yml` ファイル1つ＝1ワークフロー。「いつ」「何を」実行するか |
| **ジョブ** | ひとつの仮想マシン上で走る作業単位。**ジョブ間はデフォルトで並列** |
| **ステップ** | ジョブ内の1手順。上から順に実行される |
| **アクション** | ステップで使う **再利用可能な部品**。他人が作ったものを利用できる |
| **ランナー** | 実際にジョブを実行する仮想マシン（通常 Ubuntu 最新） |

### 2. YAML の基本

GitHub Actions の設定ファイルは **YAML**。まずYAMLの書式を読めるようになる。

**キー・バリュー：**

```yaml
name: 授業用ワークフロー
runs-on: ubuntu-latest
```

**ネスト（インデント＝階層）**：

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
```

> **重要：インデントはスペース。タブは禁止**。慣例的に **2スペース**。

**配列（`-` で列挙）：**

```yaml
steps:
  - name: チェックアウト
    uses: actions/checkout@v4
  - name: Node をセットアップ
    uses: actions/setup-node@v4
```

**複数行の文字列：**

```yaml
run: |
  echo "1行目"
  echo "2行目"
```

> **`|`**（パイプ）＝改行を保持。シェルコマンドを複数行書く時に使う。

**変数展開：**

```yaml
env:
  GREETING: Hello
steps:
  - run: echo "$GREETING World"
```

### 3. 簡単なワークフローの読み方

以下は最小のサンプル。読み解いてみる。

```yaml
name: Hello World

on:
  push:
    branches: [main]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: 挨拶する
        run: echo "Hello GitHub Actions!"
```

**各行の意味：**

- `name: Hello World` … ワークフローの表示名
- `on:` … 発火イベント。`push: branches: [main]` は「main への push 時」
- `jobs:` … ジョブ一覧
- `greet:` … ジョブID（任意の名前）
- `runs-on: ubuntu-latest` … Ubuntu の最新版で動かす
- `steps:` … 手順
- `uses:` … 既成アクションを使う
- `run:` … シェルコマンドをそのまま実行

### 4. よく使うイベント一覧

`on:` に書けるもの：

| イベント | タイミング |
|---------|-----------|
| `push` | ブランチに push された時 |
| `pull_request` | PRが作成・更新された時 |
| `workflow_dispatch` | 手動ボタンで実行 |
| `schedule` | cron で定期実行（例: `'0 9 * * *'` で毎朝9時） |
| `release` | リリースが公開された時 |

**複数イベント＋フィルタ：**

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
```

### 5. よく使うアクション

現場でほぼ必ず使う3つ：

| アクション | 用途 |
|----------|------|
| `actions/checkout@v4` | リポジトリのコードを取ってくる（最初にほぼ必須） |
| `actions/setup-node@v4` | 指定バージョンのNode.jsを用意 |
| `actions/cache@v4` | 依存キャッシュで高速化 |

> **`@v4` の意味**：アクションのバージョン指定。主要バージョンを固定しておくのが基本。

サードパーティ製で有名なもの：

- `peaceiris/actions-gh-pages` … GitHub Pages デプロイ
- `codecov/codecov-action` … カバレッジをCodecovに送る

### 6. Actions を探すには

GitHub Marketplace：

```
https://github.com/marketplace?type=actions
```

または、良いワークフローは他OSSリポジトリを覗くのが一番勉強になる。

**見分けるポイント：**

- スター数が多いか
- 最終更新が新しいか
- **`actions/*` は GitHub公式（信頼できる）**

##  まとめ

### 今日分かったこと

- GitHub Actions は「`.github/workflows/*.yml` にYAMLを置くだけ」で動く
- ワークフロー > ジョブ > ステップ > アクション の階層
- `on:` でイベント、`runs-on:` で実行環境、`steps:` で手順

### よくある誤解

- **「YAMLが難しそう」** → インデント2スペースさえ守れば読める
- **「毎回全部書く必要がある」** → `actions/*` を組み合わせるだけのことが多い
- **「CI = テスト専用」** → デプロイ・通知・定時実行など何でもできる

### 次コマ予告

次回は実際に `.github/workflows/hello.yml` を作り、プッシュして GitHub 上でワークフローが動くのを目で見る。

##  課題

### 基礎課題（必須）

1. YAML の練習サイト（https://onlineyamltools.com/convert-yaml-to-json 等）で、身近なデータ（自己紹介や今週の予定）をYAMLで書いてみる
2. GitHub Marketplace を眺めて「便利そう」と思ったアクションを1つ見つけ、名前と用途をメモする

### 応用課題（推奨）

3. **GitHub Actions の無料枠** を公式ドキュメントで調べる：
   - public リポジトリは無制限
   - private リポジトリは月何分まで無料か（プランによる）
   - 超えたらどうなるか

自分のプロジェクトで「月にざっくり何分使うか」を見積もって1行でメモ。

4. GitHub Actions 以外のCIサービス（**CircleCI / GitLab CI / Jenkins / Travis CI** のいずれか1つ）を選んで調べ、**GitHub Actions との違い** を1〜2行で自分の言葉でまとめる：

```
例：CircleCI は設定ファイルが .circleci/config.yml に置かれ、
    コンテナベースでの並列実行が強み。Actions との違いは〜
```

> **狙い：** GitHub Actions が「絶対」ではない。選択肢を知ってこそ自信を持って選べる。

### チャレンジ課題（挑戦）

5. **Reusable Workflows（再利用可能ワークフロー）** の公式ドキュメントを読み、以下を自分の言葉でまとめる：
   - 普通のワークフローとの違い
   - 何が嬉しいのか（例：複数リポジトリで共通CIを使い回せる）
   - どう呼び出すか（`uses:` の書き方）

→ 実装はしなくてよい。**概念の理解** がゴール。次のステージの知識。

6. **Composite Action**（複数ステップを1つのアクションに束ねる機能）と **Reusable Workflow** の違いを1〜2行でまとめる。粒度の違い（ステップ集 vs ジョブ集）を押さえる
