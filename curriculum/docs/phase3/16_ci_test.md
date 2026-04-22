# コマ16｜CI：テストの自動化

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 |  |
| 前提コマ | コマ15 CI：Lintの自動化 |
| 次コマ | コマ17 ブランチ保護ルール |

##  目標

- CIで `npm run test` を自動実行できる
- カバレッジを計測し、レポートを artifact として残せる
- Lintとテストを並列ジョブで走らせて時短できる

##  導入

### 前回の振り返り

Lint が CI で自動実行されるようになった。次はPhase 2で作った **Vitest のテスト** も CI に乗せる。

### 今日のゴール

1. PR・push時に全テストが自動実行される
2. カバレッジレポートが保存され、あとから見られる
3. Lint と Test が **並列** で走って時短

### CIにテストを載せるメリット

- ローカルで回し忘れたテストを機械が代わりにやってくれる
- 他人のPRに対しても自動でテストが走る
- **「テストが通らないコードはマージできない」** 状態を作れる（次コマのブランチ保護と組み合わせ）

##  本題

### 1. 事前確認

Phase 2 で作ったテストが全てPASSする状態か確認：

```bash
cd ~/workspace/todo-app
git switch main
git pull origin main
git switch -c feature/ci-test

npm run test -- --run
npm run test:coverage
```

> **`-- --run`**：Vitest のwatchモードを切って1回だけ実行。CI向け。
>
> `--` の後が npm ではなく Vitest に渡る引数。

### 2. Testワークフローを作る

`.github/workflows/test.yml` を新規作成：

```yaml
name: Test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: チェックアウト
        uses: actions/checkout@v4

      - name: Node.js 24 をセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: 依存インストール
        run: npm ci

      - name: テスト実行
        run: npm run test -- --run

      - name: カバレッジ計測
        run: npm run test:coverage

      - name: カバレッジレポートを保存
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7
```

> **各ステップ解説：**
> - **`npm run test -- --run`**：まず全テストを通す（ここで落ちれば後続は走らない）
> - **`npm run test:coverage`**：カバレッジ付きで再実行。`coverage/` にHTMLが出る
> - **`actions/upload-artifact`**：生成物をGitHubの保存領域にアップロード。Actionsタブの実行ページから後でDLできる
> - **`if: always()`**：前のステップが失敗してもこのステップは実行（FAIL時もレポートを残す）

### 3. push してCIを走らせる

```bash
git add .github/workflows/test.yml
git commit -m "ci: Vitest のテスト自動実行とカバレッジ保存を追加"
git push -u origin feature/ci-test
gh pr create --title "CI でテスト自動実行" --body "Lint と並列で動くテストワークフローを追加"
```

PR画面で2つのCheck（Lint と Test）が並ぶ。両方緑になればOK。

### 4. artifact を落としてみる

Actions タブ → 該当ワークフロー実行を開く → 画面下部の **Artifacts** セクション → `coverage-report` をダウンロード。

zipを展開して `index.html` をブラウザで開けば、ローカル実行時と同じHTMLレポートが見られる。

> **用途：** CIで落ちた時の原因調査、PRレビュー時のカバレッジ確認。

### 5. ジョブを並列化して時短

現在、テストとLintは別の `.yml`（`lint.yml` / `test.yml`）に分かれていて **自動的に並列** で動く。それぞれ独立なので問題ない。

しかし「1つのワークフロー内に複数ジョブを並べる」書き方も覚えておくと便利。**まとめた `ci.yml` を書いてみる：**

`.github/workflows/ci.yml` を新規作成：

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --run
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
```

> **この書き方のメリット：** 1つのファイルにまとまっていて見通しが良い。まとめて条件（`on:`）を揃えやすい。
>
> **別ファイルのメリット：** 実行頻度やトリガーが違うものを分けやすい。

**元の `lint.yml` と `test.yml` は消す：**

```bash
rm .github/workflows/lint.yml
rm .github/workflows/test.yml
```

> **重複してCIを走らせるのは無駄。どちらかに統一する。**

### 6. 必要なら `needs:` で順序を指定

ジョブは **デフォルト並列**。順序を付けたい時は `needs:` を書く。

例：**lintが通ったらtestを走らせる**（ただし並列のほうが速い。順序を強制するのは必要な時だけ）：

```yaml
jobs:
  lint:
    # ...
  test:
    needs: lint  # ← lintが成功してから走る
    # ...
```

今回は並列のままでOK。

### 7. まとめてpushしてPRマージ

```bash
git add .github/workflows/
git commit -m "ci: lint.yml と test.yml を ci.yml に統合"
git push
# PRのChecksが緑になるのを待つ
gh pr merge --squash --delete-branch
git switch main
git pull origin main
```

##  まとめ

### 今日できるようになったこと

- CI で Vitest のテストを自動実行できる
- カバレッジレポートを artifact として残せる
- Lint と Test を並列に走らせる書き方ができる

### よくある詰まりポイント

- **watchモードのまま CI が止まらない**：必ず `-- --run` か `vitest run` で実行
- **`npm ci` で `EUSAGE`**：`package-lock.json` が無い／壊れている。ローカルで `npm install` してから commit
- **artifact が残らない**：`if: always()` を付けないと失敗時に残せないケース

### 次コマ予告

次回は **ブランチ保護ルール**。CIが通らないPRを **マージできない** 設定にする。これで授業で学んだ「自動テスト文化」を仕組みとして強制できるようになる。

##  課題

### 基礎課題（必須）

1. `ci.yml` に「`ubuntu-latest` と `ubuntu-22.04` の2つで test を並列実行する」**マトリックス** 設定を調べて試す（ヒント：`strategy.matrix.os`）
2. `package.json` の scripts に `test:ci` を足して、`vitest run --coverage` 1発で走るようにまとめてみる

### 応用課題（推奨）

3. **Node.js の複数バージョンをmatrixで並行テスト**：`20.x` / `22.x` / `24.x` の3バージョンで CI を走らせる。1つ失敗しても残りは継続する設定（`fail-fast: false`）を追加：

```yaml
strategy:
  fail-fast: false
  matrix:
    node: ['20.x', '22.x', '24.x']
```

4. **キャッシュのヒット率を観察** する。2回目以降のCIで `setup-node` のログに `Cache restored successfully` が出ているか確認。**`package-lock.json` を1文字変える → キャッシュが外れる** ことも実験して、キャッシュキーの仕組みを体感する

> **狙い：** 「速いCI」はモチベに直結する。キャッシュを **なんとなく貼る** のではなく、効いているか確認する習慣をつける。

### チャレンジ課題（挑戦）

5. **テスト結果を PR コメントに投稿** するアクションを導入：

```yaml
- uses: EnricoMi/publish-unit-test-result-action@v2
  if: always()
  with:
    junit_files: 'test-results/**/*.xml'
```

（Vitest で JUnit XML を出力するには `--reporter=junit --outputFile=test-results/results.xml` が必要。自分で調査して設定）

→ レビュワーがPRを見た時に **テスト結果がコメントに出ている** 体験をしてみる。

6. **「Flaky test（ふらつくテスト）」** という概念を調べ、どういう原因で起こるか／どう対処すべきかを1〜2行でまとめる（ヒント：タイミング依存、乱数、外部APIの瞬断）
