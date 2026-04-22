# コマ8｜Vitest基礎（describe/it/expect）

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 2 |
| 所要時間 |  |
| 前提コマ | コマ7 テスト入門（なぜテストを書くか） |
| 次コマ | コマ9 React Testing Library①（レンダリングテスト） |

##  目標

- Vitest を Vite プロジェクトにインストールし、`npm run test` で実行できる
- `describe` / `it` / `expect` の書き方を説明できる
- 純粋関数（純粋な計算をする関数）に対して単体テストを書ける

##  導入

### 前回の振り返り

テストは Arrange / Act / Assert の3ステップで書く。今日は実際にVitestで書いてみる。

### Vitest とは

**Vitest（ヴィテスト）** = Viteと相性抜群の高速テストランナー。

- 設定ほぼゼロで動く（Vite設定を再利用）
- Jestとほぼ同じAPI（`describe` / `it` / `expect`）なので学んだ知識が他でも使える
- ESM（importがそのまま使える）で爆速

### 今日作るもの

`utils.js` に簡単な関数（TODOのフィルタ・カウント）を切り出して、その関数に対するテストを書く。

##  本題

### 1. Vitest のインストール

TODOアプリの続きで作業する。

```bash
cd ~/workspace/todo-app
npm install -D vitest
```

> **`-D`（--save-dev）** = 開発時だけ使う依存。本番バンドルには含まれない。

`package.json` の `scripts` に `test` を追加：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

動作確認：

```bash
npm run test
```

> まだテストファイルが無いので「No test files found」と出る。これで正常。`q` で抜ける。

### 2. 初めてのテストファイル

`src/sum.js` を作成：

```javascript
// src/sum.js
export function sum(a, b) {
  return a + b
}
```

テストファイル `src/sum.test.js` を作成（**`.test.js` で終わるファイルを Vitestが自動で探す**）：

```javascript
// src/sum.test.js
import { describe, it, expect } from 'vitest'
import { sum } from './sum'

describe('sum', () => {
  it('1 + 2 は 3 になる', () => {
    expect(sum(1, 2)).toBe(3)
  })

  it('マイナス同士も足せる', () => {
    expect(sum(-2, -3)).toBe(-5)
  })
})
```

実行：

```bash
npm run test
```

緑色で2件PASSと出ればOK。

> **describe / it / expect の役割：**
> - **`describe`**：関連するテストをまとめるグループ（何の対象か分かる単位）
> - **`it`**（= `test` と同じ）：1件のテストケース。「〜の時〜になる」の1文で書くと読みやすい
> - **`expect(実際の値).toBe(期待する値)`**：検証本体

### 3. Vitest のwatchモードを知る

`npm run test` はデフォルトで **watchモード**（ファイル変更を監視して自動再実行）。

試しに `sum.js` の中身を：

```javascript
export function sum(a, b) {
  return a + b + 1  // わざと壊す
}
```

に変えて保存すると、Vitestが即座にFAILを出す。これが開発中にずっと回しっぱなしにする使い方。

戻しておく：

```javascript
export function sum(a, b) {
  return a + b
}
```

### 4. TODOアプリのロジックを切り出す

今 `App.jsx` の中にある「TODOの追加」「削除」などのロジックを、**純粋関数** に切り出してテストしやすくする。

> **純粋関数**：同じ入力に対して常に同じ出力を返し、外部の状態を変えない関数。テストしやすい。

`src/todoUtils.js` を作成：

```javascript
// src/todoUtils.js
export function addTodo(todos, text) {
  if (text.trim() === '') return todos
  const newTodo = { id: Date.now(), text, completed: false }
  return [...todos, newTodo]
}

export function removeTodo(todos, id) {
  return todos.filter((todo) => todo.id !== id)
}

export function countCompleted(todos) {
  return todos.filter((todo) => todo.completed).length
}
```

### 5. todoUtils のテストを書く

`src/todoUtils.test.js` を作成：

```javascript
// src/todoUtils.test.js
import { describe, it, expect } from 'vitest'
import { addTodo, removeTodo, countCompleted } from './todoUtils'

describe('addTodo', () => {
  it('空配列に1件追加される', () => {
    const result = addTodo([], '牛乳を買う')
    expect(result.length).toBe(1)
    expect(result[0].text).toBe('牛乳を買う')
    expect(result[0].completed).toBe(false)
  })

  it('既存の配列に追加される', () => {
    const initial = [{ id: 1, text: '既存', completed: false }]
    const result = addTodo(initial, '新規')
    expect(result.length).toBe(2)
  })

  it('空文字は追加されない', () => {
    const result = addTodo([], '   ')
    expect(result.length).toBe(0)
  })

  it('元の配列を破壊しない（イミュータブル）', () => {
    const initial = []
    addTodo(initial, 'テスト')
    expect(initial.length).toBe(0)
  })
})

describe('removeTodo', () => {
  it('指定IDのTODOが消える', () => {
    const todos = [
      { id: 1, text: 'A', completed: false },
      { id: 2, text: 'B', completed: false },
    ]
    const result = removeTodo(todos, 1)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe(2)
  })

  it('存在しないIDを指定しても配列はそのまま', () => {
    const todos = [{ id: 1, text: 'A', completed: false }]
    const result = removeTodo(todos, 999)
    expect(result.length).toBe(1)
  })
})

describe('countCompleted', () => {
  it('完了済みの件数を返す', () => {
    const todos = [
      { id: 1, text: 'A', completed: true },
      { id: 2, text: 'B', completed: false },
      { id: 3, text: 'C', completed: true },
    ]
    expect(countCompleted(todos)).toBe(2)
  })

  it('空配列なら0', () => {
    expect(countCompleted([])).toBe(0)
  })
})
```

```bash
npm run test
```

全PASSすればOK。

### 6. よく使う matcher 一覧

`expect(x).○○(...)` の ○○ の部分。覚えておくと便利：

| matcher | 用途 | 例 |
|---------|------|----|
| `.toBe(v)` | 値の完全一致（プリミティブ） | `expect(1+1).toBe(2)` |
| `.toEqual(v)` | オブジェクト/配列の中身一致 | `expect([1,2]).toEqual([1,2])` |
| `.toBeTruthy()` | 真に評価される | `expect('abc').toBeTruthy()` |
| `.toBeFalsy()` | 偽に評価される | `expect(0).toBeFalsy()` |
| `.toContain(v)` | 配列・文字列に含まれる | `expect([1,2]).toContain(2)` |
| `.toHaveLength(n)` | 長さ | `expect([1,2]).toHaveLength(2)` |
| `.toThrow()` | エラーが投げられる | `expect(() => fn()).toThrow()` |

> **`.toBe` と `.toEqual` を間違えやすい**：`{a:1}` と `{a:1}` は別のオブジェクトなので `.toBe` では一致しない。中身を比較したい時は `.toEqual` を使う。

##  まとめ

### 今日できるようになったこと

- Vite プロジェクトに Vitest を入れて `npm run test` で回せる
- `describe` / `it` / `expect` で単体テストが書ける
- ロジックを純粋関数として切り出せば、テストが書きやすくなる

### よくある詰まりポイント

- **テストファイルの名前**：`.test.js` または `.spec.js` で終えないと拾われない
- **`.toBe` でオブジェクト比較失敗**：`.toEqual` を使う
- **`import` 先のパス間違い**：相対パス `./foo` を忘れがち

### 次コマ予告

次回は **React コンポーネント** をテストする。画面に表示される内容や、ボタンの文字をテストコードから検査する技術「React Testing Library」に入門する。

##  課題

### 基礎課題（必須）

1. `todoUtils.js` に `toggleCompleted(todos, id)` を追加し、そのテストを3ケース書く（通常トグル、存在しないID、イミュータブル性）
2. 追加したテストを `npm run test` ですべてPASSさせる

### 応用課題（推奨）

3. `editTodo(todos, id, newText)` 関数を自作する。**以下の仕様は自分で決める**：空文字は許すか？ 存在しないIDの時どう振る舞う？ 決めた仕様を **テストの `it(...)` の文言で表現** する（仕様書＝テストコードの感覚）
4. テストコード中で繰り返し出てくるダミーデータを、**ファクトリ関数** としてまとめる：

```js
const createTodo = (overrides = {}) => ({
  id: 1,
  text: 'サンプル',
  completed: false,
  ...overrides,
})

// 使い方
const todo = createTodo({ completed: true })
```

> **狙い：** テストコードも「コード」。DRY（重複排除）の原則はここでも効く。ただし**やりすぎると読みづらくなる** ので、同じデータが3回以上出たら切り出す、くらいの感覚で。

### チャレンジ課題（挑戦）

5. **「バグを意図的に埋め込む」** 練習をする。例えば `toggleCompleted` を次のように壊す：

```js
// わざとバグを入れる：idの比較を間違える
export function toggleCompleted(todos, id) {
  return todos.map((t) => (t.id == t.id ? { ...t, completed: !t.completed } : t))
  //                        ~~~~~~~~ 全部trueになる
}
```

→ テストがちゃんとFAILするか確認。**FAILしないなら、テストケースが不足している証拠**。どんなケースを足せば検出できるか考えて追加する

6. 「**テストが書きにくい関数** とはどんな関数か」を自分の言葉でまとめる（ヒント：副作用を持つ関数、外部依存がある関数、乱数を使う関数）。**書きにくさ＝設計が悪いサイン** という視点を持つ
