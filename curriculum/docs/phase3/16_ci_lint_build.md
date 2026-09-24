# コマ16｜CIでlintとbuildを自動実行する

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 | 90分 |
| 前提コマ | コマ15 はじめてのワークフロー |
| 次コマ | コマ17 CIでテストを自動実行する |

##  目標

- PR と `main` への push で、`npm ci` → `npm run lint` → `npm run build` が自動で実行されるワークフローを書ける
- `npm ci` と `npm install` の違い、依存パッケージのキャッシュの意味を説明できる
- CI が失敗した PR のログから原因を見つけて直せる

##  導入

### 前回の振り返り

前回は「Hello」と表示するだけのワークフローを動かし、ランナーはまっさらなマシンであること、コマンドが失敗するとワークフローも失敗することを確かめた。

### 今日のゴール

PR を出すと、次の2つが **自動で** チェックされるようにする。

| チェック | 見つけられるもの |
|---------|----------------|
| `npm run lint`（ESLint） | Hooks の使い方の間違いなど、**書き方のルール違反** |
| `npm run build`（Next.js のビルド） | `'use client'` の付け忘れ、存在しないファイルの import など、**本番用にまとめるときのエラー** |

失敗したら PR に赤い × が付き、「このまま取り込むと壊れる」と一目で分かるようになる。

##  本題

### 1. 手元でチェックを実行しておく

CI で実行するコマンドは、**まず手元で通ることを確認する**。

```bash
cd ~/workspace/todo-app
git switch main
git pull
git switch -c ci/lint-build

npm run lint
npm run build
```

両方エラーなく終わればOK。

> `npm run build` は本番用のファイルを `.next/` に作る。`.gitignore` に入っているので GitHub には上がらない。

### 2. CI のワークフローを書く

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-build:
    runs-on: ubuntu-latest
    steps:
      - name: コードを取ってくる
        uses: actions/checkout@v7

      - name: Node.js を用意する
        uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - name: 依存パッケージをインストール
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
```

| 部分 | 意味 |
|------|------|
| `pull_request: branches: [main]` | `main` に向けた PR が作られた・更新されたとき |
| `push: branches: [main]` | `main` に push（マージ）されたとき。マージ後の状態も確かめる |
| `node-version: 24` | 授業の環境（Node.js 24）とそろえる。**手元と CI でバージョンを合わせる** のが大事 |
| `cache: npm` | ダウンロードしたパッケージを保存しておき、次回から速くする |
| `npm ci` | `package-lock.json` どおりにパッケージを入れる（次で説明） |

### 3. npm ci と npm install の違い

| | `npm install` | `npm ci` |
|--|--------------|----------|
| 読むファイル | `package.json`（足りなければ `package-lock.json` を更新する） | `package-lock.json` **だけ**（書き換えない） |
| `node_modules` | あるものは残す | **一度消してから** 入れ直す |
| lock と package.json が食い違うと | lock を書き換えて続ける | **エラーで止まる** |
| 使う場面 | 開発中にパッケージを追加するとき | **CI**、クローン直後 |

CI では「毎回まったく同じバージョンのパッケージで」確かめたいので `npm ci` を使う。`package-lock.json` は必ずコミットしておく。

### 4. push して PR を作る

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lintとbuildを実行するCIを追加"
git push -u origin ci/lint-build
gh pr create --fill
```

PR の画面を開く。

```bash
gh pr view --web
```

PR の下のほうに **チェックの一覧**（`CI / lint-build`）が表示され、黄色の丸 → 緑のチェックに変わる。**Details** を押すとログが見られる。

ターミナルでも確認できる。

```bash
gh pr checks --watch
```

すべて緑になったらマージする。

```bash
gh pr merge --merge --delete-branch
git switch main
git pull
```

`main` への push でも CI が動くので、Actions タブで確認しておく。

### 5. lint で失敗させる

CI が本当に役に立つか、わざと壊して確かめる。

```bash
git switch -c test/break-lint
```

`components/TodoApp.js` の中に、**条件付きで Hook を呼ぶ** 間違いを入れる。

```jsx
// components/TodoApp.js（return の直前に、わざと追加）
if (todos.length > 100) {
  useState(0)
}
```

```bash
npm run lint
```

```text
  error  React Hook "useState" is called conditionally. React Hooks must be called in the exact
  same order in every component render  react-hooks/rules-of-hooks
```

**手元で気づいたが、あえてそのまま** push して PR を作る。

```bash
git commit -am "test: わざとlintエラーを入れる"
git push -u origin test/break-lint
gh pr create --fill
gh pr checks --watch
```

- PR のチェックに **赤い ×** が付く
- **Details** → 「Lint」のステップにエラーが出ている
- 「Lint」が失敗したので、「Build」のステップは実行されずにスキップされている

> **Hooks のルール**：`useState` などの Hook は、毎回の描画で **同じ順番で同じ数だけ** 呼ばれる必要がある。`if` の中や、途中の `return` のあとで呼ぶと、React がどの state がどれか分からなくなる。ESLint はこれを見つけてくれる。

### 6. build で失敗させる

lint のエラーを消して、今度は別の壊し方をする。`components/Header.js` の先頭の `'use client'` を消す。

```bash
npm run lint    # 通ってしまう
npm run build   # 失敗する
```

```text
Error: You're importing a module that depends on `usePathname` into a React Server Component module.
This API is only available in Client Components.
```

**ESLint では見つからないが、ビルドでは見つかる間違い** がある。だから CI では lint と build の両方を実行する。

```bash
git commit -am "test: わざとbuildエラーを入れる"
git push
gh pr checks --watch
```

「Lint」は緑、「Build」が赤になることを確かめる。

### 7. 直して緑に戻す

`'use client'` を戻し、`TodoApp.js` に入れた `if` も消す。

```bash
npm run lint
npm run build
git commit -am "fix: わざと入れたエラーを直す"
git push
gh pr checks --watch
```

緑になったことを確かめたら、この PR はマージせずに閉じる（練習用なので）。

```bash
gh pr close --delete-branch
git switch main
```

> **CI の失敗は「怒られた」のではなく「本番に出る前に見つかった」**。赤い × を見たら、まずログの一番下のエラーと、失敗したステップ名を読む。

##  演習

### 演習1（基本）：警告も失敗にする

ESLint には **エラー（error）** と **警告（warning）** がある。今の設定では、警告があっても `npm run lint` は成功してしまう。

`app/about/page.js` に `<img src="/next.svg" alt="logo" />` を追加して `npm run lint` を実行し、警告が出ても終了コードが 0 であることを確かめる（`echo $?`）。

次に `package.json` の `lint` を `"eslint --max-warnings=0"` に変え、もう一度実行する。

**確認方法**：`--max-warnings=0` を付けると `echo $?` が `1` になり、`<img>` を消す（または `next/image` の `<Image>` に変える）と `0` に戻ればOK。変更をコミットして PR を作り、CI が緑になることも確かめる。

<details>
<summary>解説</summary>

```json
"lint": "eslint --max-warnings=0"
```

```text
✖ 1 problem (0 errors, 1 warning)
ESLint found too many warnings (maximum: 0).
```

警告を放っておくと、だんだん増えて誰も見なくなる。**CI で警告も 0 に保つ** と決めておくと、きれいな状態を保ちやすい。

</details>

### 演習2（基本）：ビルドのエラーをログから読む

`app/page.js` の import を、存在しないファイルに書き換えて push する。

```jsx
import TodoAppClient from '@/components/TodoAppClinet'
```

PR の CI ログから、**どのファイルの何行目で、何が見つからないのか** を読み取る。

**確認方法**：ログから「`app/page.js` の1行目で `@/components/TodoAppClinet` が見つからない」ことを読み取れ、直して緑に戻せればOK。

<details>
<summary>解説</summary>

```text
Module not found: Can't resolve '@/components/TodoAppClinet'
> 1 | import TodoAppClient from '@/components/TodoAppClinet'
```

ファイル名の打ち間違いは、`npm run dev` で開いていないページだと気づきにくい。**build はすべてのページを作るので、見ていないページのエラーも見つかる**。

</details>

### 演習3（応用）：Prettier で書式をそろえ、CI でチェックする

コードの見た目（クォート・セミコロン・インデント）を自動でそろえる **Prettier** を入れ、CI でも書式がそろっているかをチェックする。

```bash
npm install -D prettier
```

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 120
}
```

```bash
npm pkg set scripts.format="prettier --write ." scripts.format:check="prettier --check ."
npm run format:check
```

1. `format:check` で、書式がそろっていないファイルの一覧が出ることを確かめる
2. `npm run format` で全ファイルを整形する
3. `ci.yml` の Lint の後ろに「Format check」のステップ（`run: npm run format:check`）を追加する

**確認方法**：CI に Format check が加わって緑になる。わざとセミコロンを付けた行を push すると Format check だけが赤になればOK。

<details>
<summary>ヒント</summary>

- `.prettierignore` を作り、`.next`、`coverage`、`package-lock.json` を書いておくと、整形の対象から外せる
- VS Code の Prettier 拡張機能で「保存時にフォーマット（Format On Save）」を有効にすると、手で `npm run format` しなくて済む
- ESLint は「バグにつながる書き方」、Prettier は「見た目」を担当する、と役割を分けて考える

</details>

### 演習4（早く終わった人向け）：古い実行を自動で止める

PR に続けて何回も push すると、古いコミットの CI も最後まで動き続けて無駄になる。`ci.yml` に `concurrency` を追加し、**同じブランチで新しい実行が始まったら古い実行をキャンセル** するようにする。

**確認方法**：1分以内に2回続けて push し、Actions タブで古い実行が「Cancelled」になればOK。

<details>
<summary>ヒント</summary>

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

`on:` と `jobs:` の間（トップレベル）に書く。`group` が同じ実行は同時に1つしか動かない。

</details>

##  まとめ

### 今日できるようになったこと

- PR と `main` への push で lint と build を実行する `ci.yml` を書けるようになった
- `npm ci` を使う理由と、`cache: npm` でパッケージのダウンロードを速くする方法を知った
- lint でしか見つからない間違い・build でしか見つからない間違いを CI で見つけ、ログから直せるようになった

### よくある詰まりポイント

- **`npm ci` で `package-lock.json` と食い違っているというエラー**：手元で `npm install` してから `package-lock.json` をコミットし直す
- **手元では通るのに CI で失敗する**：Node.js のバージョンの違い、コミットし忘れたファイル、ファイル名の大文字・小文字の違い（Linux は区別する）を疑う
- **PR にチェックが表示されない**：`on: pull_request: branches: [main]` になっているか、PR の向き先が `main` か確認する

### 次コマ予告

次回は CI に **テスト（`npm test`）** を加える。lint とテストを別のジョブに分けて同時に動かし、カバレッジのレポートを CI からダウンロードできるようにする。

##  課題

### 基礎課題（必須）

1. 演習1・2を完成させ、`ci.yml` と `--max-warnings=0` を `main` にマージする
2. README に「CI で何をチェックしているか」を書き足す

### 応用課題（推奨）

3. 演習3の Prettier を導入してマージする。以降の PR は Format check が通る状態で出す
4. Actions のログで、1回目の実行と2回目の実行の「Node.js を用意する」「依存パッケージをインストール」のステップの時間を比べ、`cache: npm` の効果を確かめる

### チャレンジ課題（挑戦）

5. `.nvmrc` に `24` と書いてコミットし、`setup-node` の `node-version: 24` を `node-version-file: .nvmrc` に変える。手元の `nvm use` と CI が同じファイルを見るようになる利点を説明する
6. README の一番上に CI のステータスバッジを表示する（Actions タブ → ワークフロー → 右上の `…` → Create status badge）。CI が失敗するとバッジが赤くなることを確かめる
