# コマ17｜CIでテストを自動実行する

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 | 90分 |
| 前提コマ | コマ16 CIでlintとbuildを自動実行する |
| 次コマ | コマ18 ブランチ保護（ルールセット） |

##  目標

- CI に Jest のテストとカバレッジの基準チェックを加えられる
- lint・test・build をジョブに分け、同時に動かすものと順番に動かすものを設計できる
- テスト結果（カバレッジのレポート）を artifact として保存し、ダウンロードして確認できる

##  導入

### 前回の振り返り

前回は `ci.yml` で、PR のたびに `npm run lint` と `npm run build` が自動で実行されるようにした。

> `ci.yml` がまだない人は、コマ16の本題 2 のワークフローを先に作って `main` にマージしておく。テストはコマ8〜13で書いたもの（`npm test` が通る状態）を使う。

### 今日のゴール

Phase 2 で書いたテストを CI でも実行する。これで PR を出すたびに、

- 書き方のルール違反がないか（lint）
- 今までの機能が壊れていないか（test）
- カバレッジが基準を下回っていないか（test:coverage）
- 本番用にビルドできるか（build）

が **全部自動で** 確かめられるようになる。

##  本題

### 1. 手元でテストとカバレッジを確認する

```powershell
cd ~/workspace/todo-app
git switch main
git pull
git switch -c ci/test

npm test
npm run test:coverage
$LASTEXITCODE
```

`$LASTEXITCODE` が `0` ならOK（`$LASTEXITCODE` は直前のコマンドの終了コード）。

> `test:coverage` がない人は、コマ13の本題 1 と 5（`collectCoverageFrom` と `coverageThreshold`）を先に済ませておく。最低限、`npm pkg set scripts.test:coverage="jest --coverage"` だけでも今日の手順は進められる。

### 2. ジョブの分け方を考える

1つのジョブに全部並べることもできるが、分けたほうが便利なことが多い。

```text
┌──────┐   ┌──────┐
│ lint │   │ test │    ← 同時に動く（どちらかが遅くても待たない）
└──┬───┘   └──┬───┘
   └────┬─────┘
     ┌──┴───┐
     │build │           ← lint と test が両方通ってから動く
     └──────┘
```

| 分けると良いこと | 説明 |
|----------------|------|
| 速い | lint と test が同時に動くので、全体の待ち時間が短くなる |
| どこで失敗したか一目で分かる | PR のチェック一覧に `lint` `test` `build` が別々に並ぶ |
| 無駄がない | lint か test が失敗したら、時間のかかる build はしない |

### 3. ci.yml を書き直す

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Lint
        run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Test（カバレッジ付き）
        run: npm run test:coverage
      - name: カバレッジのレポートを保存
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Build
        run: npm run build
```

新しく出てきたもの：

| 部分 | 意味 |
|------|------|
| `needs: [lint, test]` | `lint` と `test` の **両方が成功してから** `build` を動かす |
| `actions/upload-artifact@v7` | ランナーの中のファイルを **artifact**（成果物）として保存する。ランナーは終わると捨てられるので、残したいものはこれで保存する |
| `retention-days: 7` | 保存しておく日数 |
| `if: always()` | **前のステップが失敗しても** このステップは実行する。テストが失敗したときこそレポートを見たいので付けている |

> **なぜ毎回 `checkout` → `setup-node` → `npm ci` を書くの？** ジョブごとに別のまっさらなランナーで動くから（コマ14）。同じ3ステップの繰り返しになるが、`cache: npm` があるので2回目以降のダウンロードは速い。

### 4. テストは CI で自動的に「CI モード」になる

GitHub Actions のランナーでは、環境変数 `CI=true` が最初から設定されている。Jest はこれを見て、

- ウォッチモード（`--watch`）にならない
- 実行が終わったら必ず終了する

ように動く。だから CI でも `npm test` や `npm run test:coverage` をそのまま書けばよい。

### 5. push して確認する

```powershell
git add .github/workflows/ci.yml
git commit -m "ci: テストジョブを追加し、lint・test・buildに分割"
git push -u origin ci/test
gh pr create --fill
gh pr checks --watch
```

PR のチェック一覧に `CI / lint`、`CI / test`、`CI / build` の3つが並ぶ。Actions タブで実行を開くと、`lint` と `test` から `build` に矢印が伸びた図が表示される。

### 6. artifact をダウンロードして見る

Actions タブで実行を開き、ページの下のほうの **Artifacts** に `coverage-report` があることを確認する。

ターミナルからダウンロードして、HTML レポートを開く。

```powershell
gh run list --limit 3
gh run download <実行のID> -n coverage-report -D $env:TEMP/coverage-report
start $env:TEMP/coverage-report/lcov-report/index.html
```

`<実行のID>` は `gh run list` の一番右の数字。手元で `npm run test:coverage` したときと同じレポートが見られる。

> **`wslpath -w`**：WSL（Linux）のパスを、Windows から開けるパス（`\\wsl.localhost\Ubuntu\tmp\...`）に変換するコマンド。

確認できたら PR をマージする。

```powershell
gh pr merge --merge --delete-branch
git switch main
git pull
```

### 7. テストを失敗させて、CI のログを読む

```powershell
git switch -c test/break-test
```

`lib/todos.js` の `countRemaining` にわざとバグを入れる。

```js
export function countRemaining(todos) {
  return todos.filter((todo) => todo.done).length   // ! を消した
}
```

**手元でテストを実行せずに** push する（CI が見つけてくれるかを確かめるため）。

```powershell
git commit -am "test: わざとバグを入れる"
git push -u origin test/break-test
gh pr create --fill
gh pr checks --watch
```

- `test` が赤、`lint` は緑、`build` は **スキップ**（`needs` の相手が失敗したため）
- `test` のログを開くと、手元と同じ形式で失敗が表示されている

```text
FAIL lib/todos.test.js
  ● countRemaining › すべて完了なら 0

    expect(received).toBe(expected) // Object.is equality

    Expected: 0
    Received: 2
    ...
```

（どのテストが失敗するかは、書いたテストによって違う。`TodoApp` の結合テストの「残り ○ 件」も失敗するはず）

**CI のログの読み方は、手元で `npm test` したときと同じ**。`●` の行でどのテストが、`Expected` / `Received` で何が違うかを読む。

`!` を戻して push し、緑になったら PR は閉じる。

```powershell
git commit -am "fix: countRemaining を元に戻す"
git push
gh pr checks --watch
gh pr close --delete-branch
git switch main
```

##  演習

### 演習1（基本）：カバレッジの基準で CI を落とす

`jest.config.mjs` の `coverageThreshold` の `lines` を、今のカバレッジより高い値（例：`99`）にして push し、**テストは全部通っているのに CI が失敗する** ことを確かめる。

**確認方法**：`test` ジョブのログに `does not meet "global" threshold` と出て赤くなり、値を戻すと緑になればOK。

<details>
<summary>解説</summary>

```text
Jest: Coverage for lines (86.81%) does not meet "global" threshold (99%)
Error: Process completed with exit code 1.
```

カバレッジの基準を CI に組み込むと、「テストを書かずに機能だけ足した PR」が自動で止まる。ただし基準を上げすぎると、意味の薄いテストを書く原因になる（コマ13）。

</details>

### 演習2（基本）：テスト結果をまとめて表示する

`test` ジョブの最後に、カバレッジの **要約** を実行結果のページ（Summary）に表示するステップを追加する。

```yaml
      - name: カバレッジの要約を Summary に書く
        if: always()
        run: |
          echo "## カバレッジ" >> "$GITHUB_STEP_SUMMARY"
          echo '```' >> "$GITHUB_STEP_SUMMARY"
          npx jest --coverage --coverageReporters=text-summary 2>/dev/null >> "$GITHUB_STEP_SUMMARY"
          echo '```' >> "$GITHUB_STEP_SUMMARY"
```

**確認方法**：Actions の実行ページの一番上（Summary）に、Statements / Branches / Functions / Lines の割合が表示されればOK。

<details>
<summary>解説</summary>

- **`$GITHUB_STEP_SUMMARY`**：このファイルに Markdown を書き込むと、実行ページの Summary に表示される
- `>>` はファイルの末尾に追記する記号
- Jest はテストの結果を **エラー出力**、カバレッジの表を **標準出力** に出す。`2>/dev/null` でエラー出力を捨てると、カバレッジの要約だけが残る
- この例ではテストをもう一度実行しているので、少し時間がかかる。`jest.config.mjs` の `coverageReporters` に `'text-summary'` を加えて1回で済ませる方法もある（課題5）

</details>

### 演習3（応用）：Node.js 22 と 24 の両方でテストする

`test` ジョブに `strategy.matrix` を追加し、Node.js 22 と 24 の2つのバージョンで同時にテストする。

**確認方法**：PR のチェック一覧に `CI / test (22)` と `CI / test (24)` が並び、両方緑になればOK。

<details>
<summary>解答例</summary>

```yaml
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [22, 24]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - name: Test（カバレッジ付き）
        run: npm run test:coverage
      - name: カバレッジのレポートを保存
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: coverage-report-node${{ matrix.node-version }}
          path: coverage/
          retention-days: 7
```

artifact の名前が同じだとぶつかるので、`name` にもバージョンを入れている。

ライブラリを作って配布するときは、複数のバージョンで動くことを確かめるのが一般的。アプリの場合は「本番で使うバージョン1つ」で十分なことも多い。

</details>

### 演習4（早く終わった人向け）：README だけの変更では CI を動かさない

README を直しただけの PR でも CI が動くのは無駄。`on:` に `paths-ignore` を追加して、**Markdown ファイルだけの変更なら CI を動かさない** ようにする。

**確認方法**：README だけを変えた PR ではチェックが表示されず、`.js` を変えた PR では CI が動けばOK。

<details>
<summary>ヒントと注意</summary>

```yaml
on:
  pull_request:
    branches: [main]
    paths-ignore:
      - '**.md'
```

注意：次回の **ブランチ保護** で「CI が通ること」を必須にすると、CI が動かなかった PR は「チェック待ち」のままマージできなくなる。この設定を使うかどうかは、次回の内容と合わせて判断する。

</details>

##  まとめ

### 今日できるようになったこと

- CI に `npm run test:coverage` を加え、テストの失敗やカバレッジ不足で CI を失敗させられるようになった
- lint・test を同時に、build をそのあとに動かすジョブ構成（`needs`）を作れるようになった
- `upload-artifact` でレポートを保存し、`gh run download` で手元に取ってこられるようになった

### よくある詰まりポイント

- **手元では通るテストが CI で失敗する**：日時・タイムゾーン（ランナーは UTC）・ファイル名の大文字小文字・前のテストの影響（localStorage やモックの後片付け）を疑う
- **artifact が見つからない**：`path` が正しいか（`coverage/` はテストを実行したフォルダの中にできる）、`if: always()` を付けているか確認する
- **`build` がスキップされる**：`needs` に書いたジョブが失敗している。失敗したジョブのログを先に見る

### 次コマ予告

CI が赤でも、今のままでは **マージボタンは押せてしまう**。次回は GitHub の **ブランチ保護（ルールセット）** で、「CI が全部緑で、PR 経由でないと `main` に入れられない」ようにする。

##  課題

### 基礎課題（必須）

1. 本題の `ci.yml`（lint・test・build の3ジョブ）を `main` にマージする
2. 演習1・2を試し、Summary にカバレッジが表示された実行ページのスクリーンショットを撮っておく

### 応用課題（推奨）

3. `ci.yml` の3つのジョブで繰り返している「checkout → setup-node → npm ci」を1つにまとめる方法（Composite Action）を調べ、`.github/actions/setup/action.yml` を作ってまとめてみる
4. CI の実行時間を、Actions タブの各ジョブの時間から調べる。一番時間がかかっているステップはどれか、短くする方法はあるかを考える

### チャレンジ課題（挑戦）

5. `jest.config.mjs` に `coverageReporters: ['text', 'text-summary', 'html', 'json-summary']` を設定し、テストを1回実行するだけで Summary 用の要約も作れるようにする。演習2のステップを、テストを再実行しない形に書き直す
6. テストが失敗したときだけ実行されるステップ（`if: failure()`）を追加し、「手元で `npm test` を実行して確認してください」というメッセージを Summary に書き込む
