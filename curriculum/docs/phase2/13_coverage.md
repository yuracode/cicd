# コマ13｜カバレッジとNext.jsのテスト戦略

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 2 |
| 所要時間 | 90分 |
| 前提コマ | コマ12 モックと非同期のテスト |
| 次コマ | コマ14 GitHub Actions入門（全体像とYAML） |

##  目標

- `jest --coverage` でカバレッジを測り、表と HTML レポートから「テストされていない行」を見つけられる
- カバレッジの基準（しきい値）を設定し、下回ったらテストが失敗するようにできる
- async な Server Component を含め、Next.js のどの部分をどの方法でテストするか説明できる

##  導入

### 前回の振り返り

```powershell
cd ~/workspace/todo-app
git switch main
git pull
npm test
```

Phase 2 で、関数・部品・操作・通信までテストを書いてきた。

> 前回までの内容がない人は、コマ8の本題 3〜4（Jest の導入）を先に済ませておく。カバレッジはテストが少なくても測れる。

### 考えてみよう

> テストは何本か書いた。では、**アプリのコードのうち、どこがテストされていて、どこがされていない？**

テストファイルとコードを見比べて探すのは大変。これを自動で調べてくれるのが **カバレッジ**。

##  本題

### 1. カバレッジを測る

**カバレッジ** は「テストを実行したときに、コードの各行・各分岐が **1回以上実行されたか**」の割合。

```powershell
git switch -c test/coverage
npm pkg set scripts.test:coverage="jest --coverage"
```

`jest.config.mjs` に2行追加する。

```js
// jest.config.mjs
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: ['app/**/*.js', 'components/**/*.js', 'lib/**/*.js', '!**/*.test.js'],
}

export default createJestConfig(config)
```

| 設定 | 意味 |
|------|------|
| `coverageProvider: 'v8'` | Node.js に組み込まれた仕組みでカバレッジを測る（Next.js 公式の推奨） |
| `collectCoverageFrom` | カバレッジを測る対象のファイル。`!` で始まるものは除外 |

> `collectCoverageFrom` を書かないと、**テストから一度も読み込まれなかったファイルは表に出てこない**。「テストが1本もないファイル」こそ見つけたいので、対象を明示しておく。

```powershell
npm run test:coverage
```

```text
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   82.58 |    93.84 |   81.81 |   82.58 |
 app               |       0 |        0 |       0 |       0 |
  layout.js        |       0 |        0 |       0 |       0 | 1-18
  page.js          |       0 |        0 |       0 |       0 | 1-10
 components        |    94.5 |    97.36 |   94.44 |    94.5 |
  TodoAppClient.js |       0 |        0 |       0 |       0 | 1-10
  TodoApp.js       |     100 |      100 |     100 |     100 |
  ...
 lib               |   88.88 |      100 |      80 |   88.88 |
  todos.js         |   82.85 |      100 |      75 |   82.85 | 28-29,32-35
-------------------|---------|----------|---------|---------|-------------------
```

（数字は人によって違う）

| 列 | 意味 |
|----|------|
| `% Stmts` | 文（ステートメント）のうち、実行された割合 |
| `% Branch` | `if` や三項演算子の **分かれ道** のうち、両方向とも通った割合 |
| `% Funcs` | 関数のうち、1回以上呼ばれた割合 |
| `% Lines` | 行のうち、実行された割合 |
| `Uncovered Line #s` | 一度も実行されなかった行番号 |

### 2. HTML レポートで行ごとに見る

カバレッジを測ると、`coverage/lcov-report/index.html` にレポートが作られる。ブラウザで開く。

```powershell
start coverage/lcov-report/index.html
```

ファイル名をクリックすると、コードが色分けされて表示される。

- **赤い背景**：一度も実行されなかった行
- **黄色の印**：分かれ道の片方しか通っていない
- 行の左の **`1x`・`3x`**：その行が何回実行されたか

`lib/todos.js` を開き、赤い行があれば、**その関数のテストが抜けている**。

> `coverage/` は毎回作り直されるので GitHub には上げない。`create-next-app` の `.gitignore` に最初から `/coverage` が入っている。

### 3. ESLint がレポートを検査しないようにする

この状態で `npm run lint` を実行すると、`coverage/` の中の JavaScript まで検査して警告が出る。

```powershell
npm run lint
# coverage/lcov-report/prettify.js
#   1:1  warning  Unused eslint-disable directive ...
```

`eslint.config.mjs` の `globalIgnores` に1行追加する。

```js
// eslint.config.mjs（globalIgnores の中）
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
```

```powershell
npm run lint
# 何も表示されなければOK
```

### 4. 0% のファイルをどう考えるか

表を見ると、0% のファイルがいくつかある。**全部をテストすべきとは限らない**。

| ファイル | 中身 | どうする？ |
|---------|------|-----------|
| `app/layout.js` | `<html>` と `<body>` で包むだけ | テストしなくてよい。壊れたら画面が全部出ないのですぐ気づく |
| `app/page.js` | 見出しと `TodoAppClient` を置くだけ | テストしなくてよい |
| `components/TodoAppClient.js` | `dynamic` で読み込むだけ | テストしにくく、得るものも少ない。中身の `TodoApp` はテスト済み |
| `lib/todos.js` の一部 | TODO の操作のロジック | **テストすべき**。ロジックのバグは見た目では気づきにくい |

> **カバレッジは「テストの抜けを見つける道具」であって、「100% を目指すゲーム」ではない**。カバレッジ 100% でも、`expect` を1つも書いていなければ何も確かめていない。逆に、ロジック（`lib/`）と操作（`components/`）がしっかりテストされていれば、薄いファイルが 0% でも問題は少ない。

テストが抜けていた関数（上の例なら `lib/todos.js` の 28〜35 行目）のテストを書いて、もう一度測る。

```powershell
npm run test:coverage
```

`todos.js` が 100% になればOK。

```powershell
git add .
git commit -m "test: カバレッジ測定を追加し、抜けていたテストを補う"
```

### 5. しきい値：基準を下回ったら失敗させる

カバレッジの **最低ライン** を決めておくと、テストを書き忘れたまま機能を足したときに気づける。

```js
// jest.config.mjs（config に追加）
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
```

わざと基準を高くして、失敗させてみる。

```js
      lines: 95,
```

```powershell
npm run test:coverage
$LASTEXITCODE
```

```text
Jest: Coverage for lines (82.58%) does not meet "global" threshold (95%)
1
```

- テストがすべて PASS していても、基準を下回ると **失敗扱い** になる
- `$LASTEXITCODE` は直前のコマンドの **終了コード**（0 なら成功、それ以外なら失敗）を表示する。Phase 3 で使う GitHub Actions は、この終了コードを見て「OK」か「NG」かを判断する

確認したら `80` に戻す。

> **何 % にすればいい？** 最初は「今の値より少し下」にしておき、下がらないように守るのが現実的。いきなり高い数字にすると、テストのためのテスト（意味の薄いテスト）が増えてしまう。

### 6. async な Server Component のテスト

TODO アプリに「TODO のコツ」ページを追加する。データは `lib/tips.js` から取ってくる（今は中に書いてあるが、本当のアプリならデータベースや API から取ってくる部分）。

```js
// lib/tips.js
const tips = [
  { id: 1, text: '大きなタスクは小さく分けて登録する' },
  { id: 2, text: '終わったらすぐチェックを付ける' },
  { id: 3, text: '1日の終わりに残りを見直す' },
]

export async function getTips() {
  return tips
}
```

```jsx
// app/tips/page.js
import { getTips } from '@/lib/tips'

export const metadata = {
  title: 'TODOのコツ | TODOアプリ',
}

export default async function TipsPage() {
  const tips = await getTips()

  return (
    <main className="container">
      <h1>TODOのコツ</h1>
      <ol>
        {tips.map((tip) => (
          <li key={tip.id}>{tip.text}</li>
        ))}
      </ol>
    </main>
  )
}
```

`async function` のページは Server Component にしか書けない。サーバでデータを待ってから HTML を作れるのが Next.js の強み。

`components/Header.js` の `links` に `{ href: '/tips', label: 'コツ' }` を足して、ブラウザで http://localhost:3000/tips を確認する。

これまでと同じようにテストを書いてみる。

```jsx
// app/tips/page.test.js
import { render, screen } from '@testing-library/react'
import TipsPage from './page'

test('コツが3件表示される', () => {
  render(<TipsPage />)

  expect(screen.getAllByRole('listitem')).toHaveLength(3)
})
```

```text
console.error
  <TipsPage> is an async Client Component. Only Server Components can be async at the moment.
```

テストは失敗する。Jest の中の React は **ブラウザ側の React** なので、async な部品を表示できない。Next.js 公式ドキュメントにも「Jest は async な Server Component に対応していない。E2E テストを推奨する」と書かれている。

### 7. async な Server Component をテストする3つの方法

| 方法 | やり方 | 向いているもの |
|------|--------|---------------|
| ① データ取得を関数として単体テスト | `getTips()` を Jest でテストする | データの加工・計算 |
| ② ページ関数を `await` してから表示 | `render(await TipsPage())` | 単純なページ（中に別の async 部品がない） |
| ③ E2E テスト | 本物のブラウザでページを開く（Playwright） | ページ全体の動き |

①と②を書いてみる。

```js
// lib/tips.test.js
import { getTips } from './tips'

test('コツを3件返す', async () => {
  const tips = await getTips()

  expect(tips).toHaveLength(3)
  expect(tips[0]).toEqual({ id: 1, text: expect.any(String) })
})
```

```jsx
// app/tips/page.test.js
import { render, screen } from '@testing-library/react'
import TipsPage from './page'

test('コツが3件表示される', async () => {
  render(await TipsPage())

  expect(screen.getByRole('heading', { name: 'TODOのコツ' })).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(3)
})
```

`TipsPage()` を **普通の関数として呼び、`await` で JSX を受け取ってから** `render` に渡している。ページの中にさらに async な部品がある場合はこの方法は使えないので、そのときは ③ E2E を使う（発展編で扱う）。

```powershell
npm run test:coverage
git add .
git commit -m "feat: TODOのコツページを追加（テスト付き）"
git push -u origin test/coverage
gh pr create --fill
```

### 8. このアプリのテスト戦略

Phase 2 で書いたテストを整理すると、次のようになる。

| 対象 | 例 | テスト方法 |
|------|-----|-----------|
| ロジック（純粋関数） | `lib/todos.js` | Jest で単体テスト。**一番多く、細かく** |
| 通信する関数 | `lib/api.js` | `fetch` をモックして単体テスト |
| 表示だけの部品 | `TodoItem`、`TodoList`、`about` ページ | RTL で表示を確認 |
| 操作のある部品 | `TodoForm`、`TodoApp` | RTL + user-event で操作の流れを確認 |
| Next.js の機能を使う部品 | `Header`（`usePathname`） | `jest.mock('next/navigation')` |
| async な Server Component | `tips` ページ | データ関数を単体テスト ＋ `render(await Page())` か E2E |
| 包むだけのファイル | `layout.js`、`TodoAppClient.js` | テストしない（E2E でまとめて確認） |

次の Phase 3 では、これらのテストを **PR を出すたびに GitHub が自動で実行する** ようにする。

##  演習

### 演習1（基本）：HTML レポートで抜けを見つけて埋める

HTML レポートを開き、`components/` か `lib/` の中で、赤い行または黄色の印がある場所を1か所見つける。その行が実行されるテストを追加し、赤・黄色が消えることを確かめる。

**確認方法**：テスト追加の前後で、そのファイルの `% Lines` か `% Branch` が上がっていればOK。

<details>
<summary>ヒント</summary>

見つかりやすい例：

- コマ9の演習で作った `clearDone` / `editTodo` のテストがまだない
- コマ5演習2の `TodoForm` のエラー表示（`if (trimmed === '')` の分かれ道）
- コマ6演習3の `loadTodos` の `catch`（壊れた JSON のとき）

`loadTodos` の `catch` を通すには、テストの準備で `localStorage.setItem('todos', 'abc')` のように壊れた値を入れてから `render(<TodoApp />)` する。

</details>

### 演習2（基本）：lib だけは 100% を守る

`coverageThreshold` に、`lib/` フォルダだけ厳しい基準を追加する。

```js
coverageThreshold: {
  global: {
    lines: 80,
  },
  './lib/': {
    lines: 100,
    branches: 100,
  },
},
```

**確認方法**：`npm run test:coverage` が成功する。さらに `lib/todos.js` にテストのない関数（例：`export function noop() { return 1 }`）を追加すると失敗し、消すと成功に戻ればOK。

<details>
<summary>解説</summary>

「ロジックは厳しく、画面は緩く」のように、**大事な場所ほど基準を高くする** とメリハリのある運用ができる。失敗したときは次のように表示される。

```text
Jest: Coverage for lines (88.88%) does not meet "./lib/" threshold (100%)
```

</details>

### 演習3（応用）：コツページに「今日のおすすめ」を追加する

`lib/tips.js` に `pickTip(tips, day)` を追加する。`day`（0〜6 の曜日の数字）によって、`tips` の中から1つを選んで返す（例：`tips[day % tips.length]`）。`app/tips/page.js` で「今日のおすすめ」として表示する。

**確認方法**：`pickTip` の単体テスト（`day` が 0、2、3、6 のとき）と、ページのテスト（`render(await TipsPage())` で「今日のおすすめ」の見出しが出る）が PASS すればOK。

<details>
<summary>解答例</summary>

```js
// lib/tips.js（追加）
export function pickTip(tips, day) {
  return tips[day % tips.length]
}
```

```js
// lib/tips.test.js（追加）
import { getTips, pickTip } from './tips'

test.each([
  [0, 1],
  [2, 3],
  [3, 1],
  [6, 1],
])('曜日 %i なら id %i のコツを選ぶ', async (day, expectedId) => {
  const tips = await getTips()

  expect(pickTip(tips, day).id).toBe(expectedId)
})
```

```jsx
// app/tips/page.js（return の中、<h1> の下に追加）
<h2>今日のおすすめ</h2>
<p>{pickTip(tips, new Date().getDay()).text}</p>
```

「曜日を選ぶ計算」は `pickTip` に切り出したので、**日付に関係なくテストできる**。ページのテストでは「見出しがあるか」だけを確かめればよい。

> このページは `npm run build` の時点で HTML が作られる（Static）ので、表示される「今日」はビルドした日になる。毎日変えたい場合の方法は、Next.js の公式ドキュメントで「Dynamic Rendering」を調べてみよう。

</details>

### 演習4（早く終わった人向け）：テストの質を確かめる

カバレッジが高くても、`expect` が弱ければバグを見逃す。次の手順で、自分のテストが **本当にバグを見つけられるか** を確かめる。

1. `lib/todos.js` の `toggleTodo` の `!todo.done` を `todo.done` にする
2. `npm test` を実行し、失敗するテストがあるか確かめる
3. 同じように、`countRemaining` の `!todo.done` → `todo.done`、`deleteTodo` の `!==` → `===` を1つずつ試す
4. 確かめたらすべて元に戻す

**確認方法**：3つの「わざと入れたバグ」すべてで、少なくとも1つのテストが FAIL すればOK。PASS のままのものがあれば、そのバグを見つけられるテストを追加する。

> このように「わざとバグを入れて、テストが気づくか」を調べる方法を **ミューテーションテスト** と呼ぶ。自動で行う道具（Stryker など）もある。

##  まとめ

### 今日できるようになったこと

- `jest --coverage` の表と HTML レポートから、テストされていない行・分かれ道を見つけられるようになった
- `coverageThreshold` で基準を決め、下回ったら終了コード 1 で失敗させられるようになった
- async な Server Component を含め、Next.js のどの部分をどの方法でテストするかを整理できた

### よくある詰まりポイント

- **テストのないファイルが表に出てこない**：`collectCoverageFrom` を設定する
- **`npm run lint` で `coverage/` の警告が出る**：`eslint.config.mjs` の `globalIgnores` に `"coverage/**"` を足す
- **async なページを `render(<Page />)` して何も表示されない**：`render(await Page())` にするか、データ取得の関数を単体テストする

### 次コマ予告

Phase 3 に入る。これまで手で実行していた `npm test` や `npm run lint` を、**GitHub が自動で実行してくれる仕組み（GitHub Actions）** を学ぶ。まずは全体像と、YAML という設定ファイルの書き方から。

##  課題

### 基礎課題（必須）

1. 演習1・2を完成させ、PR を作ってマージする
2. 自分の `todo-app` のカバレッジの表を見て、「0% だがテストしなくてよいファイル」と「0% ではないがもっとテストすべきファイル」を1つずつ挙げ、理由を書く

### 応用課題（推奨）

3. README に「テストの実行方法」の節を追加し、`npm test` / `npm run test:watch` / `npm run test:coverage` の違いを書く
4. `app/not-found.js` と `app/tips/page.js` のテストがあるか確認し、なければ追加する。`collectCoverageFrom` から `app/layout.js` と `app/page.js` と `components/TodoAppClient.js` を除外する（`'!app/layout.js'` のように書く）と、全体の数字がどう変わるか確かめる。除外することの良い点・悪い点を考える

### チャレンジ課題（挑戦）

5. `lib/tips.js` の `getTips` を、JSONPlaceholder の `https://jsonplaceholder.typicode.com/posts?_limit=3` から取ってくるように変える。`getTips` は `fetch` をモックして単体テストし、ページのテストでは `jest.mock('@/lib/tips')` で `getTips` をモックする。`npm run build` のときにも通信が発生することを確かめる
6. Playwright の公式ドキュメントの「Getting started」を読み、`/tips` ページを開いて見出しを確かめる E2E テストを書くとしたらどんなコードになるか、Jest + RTL のテストと比べて何が違うかをまとめる（実際に動かすのは発展編で扱う）
