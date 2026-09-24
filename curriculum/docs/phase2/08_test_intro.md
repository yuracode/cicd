# コマ8｜テスト入門とJestの導入

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 2 |
| 所要時間 | 90分 |
| 前提コマ | コマ7 GitHub連携・ブランチ・PR体験 |
| 次コマ | コマ9 Jest基礎（関数の単体テスト） |

##  目標

- 自動テストを書く理由と、テストの種類（単体・結合・E2E）を説明できる
- Next.js 公式の方法で `todo-app` に Jest を導入し、`npm test` で実行できる
- `expect` とマッチャー（`toBe` / `toEqual` など）で最初のテストを書き、失敗したときの表示を読める

##  導入

### 前回の振り返り

Phase 1 で TODO アプリを作り、GitHub に push して PR でマージできるようになった。ここから Phase 2。

### 考えてみよう

> コマ7で「すべて削除」ボタンを追加したとき、**他の機能が壊れていないこと** をどうやって確認した？

たぶん、ブラウザで TODO を追加して、チェックを付けて、削除して…と **手で** 確かめたはず。機能が増えるほど、この確認は長くなる。そして面倒になると、だんだん省略してしまう。

**自動テスト** は、この「手で確かめていたこと」をコードに書いておき、**コマンド1つで何度でも一瞬で確認できる** ようにする仕組み。

### Phase 2 の流れ

| コマ | 内容 |
|------|------|
| 8 | テスト入門と Jest の導入（今回） |
| 9 | 関数の単体テスト |
| 10 | 画面の表示をテストする（React Testing Library） |
| 11 | ユーザー操作をテストする |
| 12 | モックと非同期のテスト |
| 13 | カバレッジと、Next.js ならではのテストの考え方 |

##  本題

### 1. なぜテストを書くのか

| 理由 | 説明 |
|------|------|
| 確認が一瞬で終わる | 手で5分かかる確認が、数秒で終わる。何回やっても疲れない |
| 壊したことにすぐ気づける | 新機能を足したとき、昔の機能が壊れたら（**デグレ**）すぐ分かる |
| 安心して書き直せる | コードを整理しても、テストが通れば動きは変わっていないと言える |
| 動きの説明書になる | テストを読めば「この関数はどう動くべきか」が分かる |
| 自動チェックの材料になる | Phase 3 で、PR を出すたびに GitHub が自動でテストを実行するようにする |

ただし、テストを書く時間やテストを直す手間はかかる。**全部をテストする必要はない**。「壊れたら困るところ」「間違えやすいところ」から書く。

### 2. テストの種類

```text
        ／＼
       ／E2E＼        少ない：ブラウザを実際に動かす。遅いが本物に近い
      ／──────＼
     ／ 結合    ＼     中くらい：部品を組み合わせて動かす
    ／──────────＼
   ／   単体      ＼   多い：関数1つ・部品1つ。速くて原因が分かりやすい
  ／──────────────＼
```

| 種類 | 何を確かめるか | この教材の道具 |
|------|--------------|---------------|
| 単体テスト | 関数1つ、部品1つが正しく動くか | **Jest**（コマ8〜9） |
| 結合テスト | 部品を組み合わせたときに正しく動くか | **Jest + React Testing Library**（コマ10〜12） |
| E2E テスト | ブラウザで最初から最後まで操作して動くか | Playwright（発展編） |

> **Jest（ジェスト）とは**：JavaScript のテストを書いて実行するための道具（テストランナー）。Next.js には Jest 用の設定が最初から用意されていて、少しの設定で使える。

### 3. Jest をインストールする

```bash
cd ~/workspace/todo-app
git switch main
git pull
git switch -c feature/setup-jest

npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

| パッケージ | 役割 |
|-----------|------|
| `jest` | テストを実行する本体 |
| `jest-environment-jsdom` | Node.js の中に **偽物のブラウザ（jsdom）** を用意する。画面のテストに必要 |
| `@testing-library/react` | React の部品をテストの中で表示する（コマ10〜） |
| `@testing-library/dom` | 画面から要素を探す道具（上の本体） |
| `@testing-library/jest-dom` | 「表示されている」「チェックされている」などの判定を追加する |
| `@testing-library/user-event` | クリックや入力などの操作を再現する（コマ11〜） |

> **`-D`（`--save-dev`）とは**：「開発のときだけ使う道具」として入れる指定。`package.json` の `devDependencies` に記録される。本番のアプリには含まれない。

### 4. 設定ファイルを作る

プロジェクト直下に `jest.config.mjs` を作る。

```js
// jest.config.mjs
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
```

| 設定 | 意味 |
|------|------|
| `nextJest({ dir: './' })` | Next.js の設定（JSX の変換、CSS の読み飛ばしなど）を Jest に引き継ぐ |
| `testEnvironment: 'jsdom'` | テストを偽物のブラウザの中で動かす |
| `setupFilesAfterEnv` | 各テストの前に読み込むファイル |
| `moduleNameMapper` | `@/components/...` の `@/` をプロジェクト直下として解決する |

同じ場所に `jest.setup.js` を作る。

```js
// jest.setup.js
import '@testing-library/jest-dom'
```

`package.json` の `scripts` にテスト用のコマンドを追加する。

```bash
npm pkg set scripts.test="jest" scripts.test:watch="jest --watch"
```

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

> `npm pkg set` は `package.json` をコマンドで書き換える方法。エディタで直接書き足してもよい。

### 5. テストしたい関数を切り出す

今の `components/TodoApp.js` には、残り件数を数える計算が埋め込まれている。

```jsx
const remaining = todos.filter((todo) => !todo.done).length
```

部品の中に埋め込まれていると、この計算だけを取り出して確かめにくい。**普通の関数として別ファイルに切り出す**。

```bash
mkdir -p lib
```

```js
// lib/todos.js
export function countRemaining(todos) {
  return todos.filter((todo) => !todo.done).length
}
```

`TodoApp.js` から使う。

```jsx
// components/TodoApp.js（変更部分）
import { countRemaining } from '@/lib/todos'

// ...

const remaining = countRemaining(todos)
```

ブラウザで、残り件数の表示がこれまでどおり動くことを確認しておく。

> **`lib/` とは**：画面を持たない「ロジック（計算や処理）」を置く場所としてよく使われるフォルダ名。画面（`components/`）とロジック（`lib/`）を分けておくと、ロジックだけを簡単にテストできる。

### 6. 最初のテストを書く

テスト対象のファイルと同じ場所に `○○.test.js` という名前で作る。Jest は **`.test.js` で終わるファイルを自動で探して実行する**。

```js
// lib/todos.test.js
import { countRemaining } from './todos'

test('未完了の TODO の数を返す', () => {
  const todos = [
    { id: '1', text: '牛乳を買う', done: false },
    { id: '2', text: 'レポート提出', done: true },
    { id: '3', text: '部屋の掃除', done: false },
  ]

  const result = countRemaining(todos)

  expect(result).toBe(2)
})
```

| 部分 | 意味 |
|------|------|
| `test('説明', () => { ... })` | テスト1つ。説明には **何を確かめるか** を日本語で書いてよい |
| `expect(実際の値)` | 確かめたい値を渡す |
| `.toBe(期待する値)` | 「〜と等しいはず」という判定（**マッチャー**） |

テストの中身は **準備 → 実行 → 確認** の3段で書くと読みやすい（**AAA パターン**：Arrange / Act / Assert）。

実行する。

```bash
npm test
```

```text
 PASS  lib/todos.test.js
  ✓ 未完了の TODO の数を返す (2 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

`PASS` と緑のチェックが出れば成功。

### 7. わざと失敗させて、表示を読む

期待する値を `2` から `3` に変えて、もう一度実行する。

```js
expect(result).toBe(3)
```

```text
 FAIL  lib/todos.test.js
  ✕ 未完了の TODO の数を返す (3 ms)

  ● 未完了の TODO の数を返す

    expect(received).toBe(expected) // Object.is equality

    Expected: 3
    Received: 2

      12 |   const result = countRemaining(todos)
      13 |
    > 14 |   expect(result).toBe(3)
         |                  ^
```

- **Expected**：テストに書いた「期待する値」
- **Received**：実際に関数が返した値
- `>` の行：失敗した場所

テストが失敗したら、**「テストが間違っている」のか「コードが間違っている」のか** を考える。今回はテストのほうが間違いなので `2` に戻す。

> テストを書いたら、**一度わざと失敗させてみる** のがおすすめ。何を変えても通ってしまうテストは、何も確かめていないのと同じ。

### 8. よく使うマッチャー

```js
// lib/matchers.test.js（練習用。試したら消してよい）
test('マッチャーの練習', () => {
  expect(1 + 2).toBe(3)                                   // 値が同じ
  expect({ text: 'a', done: false }).toEqual({ text: 'a', done: false }) // 中身が同じ
  expect([1, 2, 3]).toHaveLength(3)                       // 長さ
  expect(['りんご', 'バナナ']).toContain('バナナ')          // 含んでいる
  expect('TODOアプリ').toMatch(/TODO/)                     // 文字列のパターン
  expect(null).toBeNull()                                 // null である
  expect(5).toBeGreaterThan(3)                            // より大きい
  expect(1 + 1).not.toBe(3)                               // not で否定
})
```

`toBe` と `toEqual` の違いが一番大事。

```js
expect({ a: 1 }).toBe({ a: 1 })     // ✕ 失敗する
expect({ a: 1 }).toEqual({ a: 1 })  // ○ 成功する
```

`toBe` は「**まったく同じもの**」か、`toEqual` は「**中身が同じ**」かを見る。見た目が同じオブジェクトでも、別々に作ったものは「同じもの」ではない。**数値・文字列・真偽値は `toBe`、配列・オブジェクトは `toEqual`** と覚えておく。

### 9. コミットして PR を出す

```bash
npm test
git add .
git commit -m "test: Jestを導入し countRemaining のテストを追加"
git push -u origin feature/setup-jest
gh pr create --fill
```

PR をマージしたら、手元の `main` を更新する。

```bash
git switch main
git pull
```

##  演習

### 演習1（基本）：countRemaining のテストを増やす

`lib/todos.test.js` に次の2つのテストを追加する。

- TODO が0件のとき、`0` を返す
- すべて完了しているとき、`0` を返す

**確認方法**：`npm test` で3件すべて PASS になればOK。さらに、`countRemaining` の中の `!todo.done` を `todo.done` にわざと書き換えると、どのテストが失敗するかを確認する（確認したら戻す）。

<details>
<summary>解答例</summary>

```js
// lib/todos.test.js（追加）
test('TODO が0件なら 0 を返す', () => {
  expect(countRemaining([])).toBe(0)
})

test('すべて完了なら 0 を返す', () => {
  const todos = [
    { id: '1', text: 'A', done: true },
    { id: '2', text: 'B', done: true },
  ]
  expect(countRemaining(todos)).toBe(0)
})
```

`!todo.done` を `todo.done` に変えると、最初のテスト（期待 2 → 実際 1）と「すべて完了」のテスト（期待 0 → 実際 2）が失敗する。0件のテストは通ってしまう。**1つのテストだけでは見つけられないバグがある** ので、いくつかのパターンを用意する。

</details>

### 演習2（基本）：入力チェックの関数を作ってテストする

`lib/todos.js` に、TODO の文字列が正しいかを判定する関数 `isValidTodoText(text)` を追加する。

- 前後の空白を除いて空なら `false`
- 前後の空白を除いて 50 文字を超えたら `false`
- それ以外は `true`

テストを `lib/todos.test.js` に書く。

**確認方法**：「普通の文字列」「空文字」「空白だけ」「50文字ちょうど」「51文字」の5パターンのテストがすべて PASS すればOK。

<details>
<summary>解答例</summary>

```js
// lib/todos.js（追加）
export function isValidTodoText(text) {
  const trimmed = text.trim()
  return trimmed.length > 0 && trimmed.length <= 50
}
```

```js
// lib/todos.test.js（追加）
import { countRemaining, isValidTodoText } from './todos'

test('普通の文字列は OK', () => {
  expect(isValidTodoText('牛乳を買う')).toBe(true)
})

test('空文字は NG', () => {
  expect(isValidTodoText('')).toBe(false)
})

test('空白だけは NG', () => {
  expect(isValidTodoText('   ')).toBe(false)
})

test('50文字ちょうどは OK', () => {
  expect(isValidTodoText('あ'.repeat(50))).toBe(true)
})

test('51文字は NG', () => {
  expect(isValidTodoText('あ'.repeat(51))).toBe(false)
})
```

50 と 51 のように **ちょうど境目の値** をテストすることを **境界値テスト** と呼ぶ。`<=` と `<` の書き間違いは、境目でしか見つからない。

</details>

### 演習3（応用）：toBe と toEqual の違いを確かめる

次のテストを書いて実行し、どれが成功してどれが失敗するかを予想してから確かめる。予想と結果を表にまとめる。

```js
test('toBe と toEqual', () => {
  const a = { text: '牛乳', done: false }
  const b = { text: '牛乳', done: false }
  const c = a

  expect(a).toBe(b)
  expect(a).toEqual(b)
  expect(a).toBe(c)
  expect([1, 2]).toEqual([1, 2])
  expect([1, 2]).toBe([1, 2])
})
```

**確認方法**：1つずつコメントアウトしながら実行し、5つそれぞれの成功・失敗を表にできればOK。

<details>
<summary>解説</summary>

| 行 | 結果 | 理由 |
|----|------|------|
| `expect(a).toBe(b)` | 失敗 | 中身は同じだが、別々に作ったオブジェクト |
| `expect(a).toEqual(b)` | 成功 | 中身が同じ |
| `expect(a).toBe(c)` | 成功 | `c = a` なので同じもの |
| `expect([1, 2]).toEqual([1, 2])` | 成功 | 中身が同じ |
| `expect([1, 2]).toBe([1, 2])` | 失敗 | 別々に作った配列 |

これはコマ4で学んだ「React は **同じ配列かどうか** で変更を判断する」とつながっている。`push` で中身を変えても配列そのものは同じなので、React から見ると `toBe` が成功する状態 ＝ 変わっていない、となる。

</details>

### 演習4（早く終わった人向け）：ウォッチモードでテストを先に書く

`npm run test:watch` を実行したままにする（ファイルを保存するたびに自動でテストが走る）。その状態で、**先にテストを書いてから** 関数を作る。

作る関数：`countDone(todos)`（完了済みの件数を返す）

1. テストだけを書く → 関数がないので失敗する（赤）
2. 関数を最低限書く → テストが通る（緑）
3. 必要ならコードを整理する（テストは緑のまま）

**確認方法**：ウォッチモードの表示が 赤 → 緑 と変わる流れを体験できればOK。終了は `q`。

> このように「テストを先に書き、通るようにコードを書き、整理する」進め方を **TDD（テスト駆動開発）** と呼ぶ。次回もう少し練習する。

##  まとめ

### 今日できるようになったこと

- 自動テストを書く理由と、単体・結合・E2E の違いを説明できるようになった
- Next.js 公式の `next/jest` を使って Jest を導入し、`npm test` で実行できるようになった
- `test` / `expect` / マッチャーで最初のテストを書き、失敗表示の Expected と Received を読めるようになった

### よくある詰まりポイント

- **`No tests found`**：ファイル名が `.test.js` で終わっているか確認する（`todos.tests.js` や `todos-test.js` は見つからない）
- **`Cannot find module '@/lib/todos'`**：`jest.config.mjs` の `moduleNameMapper` を確認する
- **オブジェクトの比較が失敗する**：`toBe` を使っていないか確認する。配列・オブジェクトは `toEqual`

### 次コマ予告

次回は TODO の追加・完了・削除の処理そのものを `lib/todos.js` に切り出し、`describe` でテストを整理しながら、「元の配列を書き換えていないか」まで確かめるテストを書く。

##  課題

### 基礎課題（必須）

1. 演習1・2のテストを `feature/` ブランチでコミットし、PR を作ってマージする
2. 次の言葉をそれぞれ1〜2行で説明するメモを作る：単体テスト / E2E テスト / マッチャー / デグレ / 境界値テスト

### 応用課題（推奨）

3. `lib/todos.js` の `isValidTodoText` を `components/TodoForm.js` で使うように書き換え、50文字を超えると追加できないようにする。ブラウザで動作を確かめ、テストがすべて通ることも確認する
4. Jest の公式ドキュメント（Expect のページ）を読み、今日使っていないマッチャーを3つ選んで、それぞれ使うテストを1つずつ書く

### チャレンジ課題（挑戦）

5. `lib/text.js` に `truncate(text, max)`（`max` 文字を超えたら末尾を `…` にして切り詰める関数）を **テストを先に書いてから** 作る。境界値（ちょうど `max` 文字、`max + 1` 文字、空文字）を必ず含める
6. 「テストを書かないほうがよいもの」の例を3つ考え、理由とセットで書く（ヒント：すぐ消える試作、見た目の細かい色、外部サービスそのもの）
