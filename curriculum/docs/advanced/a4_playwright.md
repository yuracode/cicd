# 発展4｜PlaywrightでE2Eテスト＋CI組み込み

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 | 90分 |
| 前提コマ | Phase 4 のコマ23 CI/CDパイプラインの完成まで |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- E2E テストが、Jest + React Testing Library のテストと何が違い、何を守るのかを説明できる
- Playwright で `todo-app` の E2E テストを書き、手元で実行・デバッグできる
- E2E テストを CI/CD パイプラインに組み込み、失敗したときのレポートを確かめられる

##  導入

### Jest のテストでは確かめられないこと

コマ8で見たテストのピラミッドの一番上、**E2E テスト**（End to End：最初から最後まで）に取り組む。

| | Jest + RTL（コマ8〜13） | E2E（Playwright） |
|--|----------------------|------------------|
| 動かす場所 | Node.js の中の **偽物のブラウザ（jsdom）** | **本物のブラウザ**（Chromium など） |
| 動かすもの | 部品や関数を1つずつ | `npm run build` したアプリ全体 |
| 速さ | 速い（数秒） | 遅い（数十秒〜） |

Jest のテストが全部緑でも、次のような問題は見つけられない。

- `dynamic` の `ssr: false` を外してしまい、**本番のビルドでだけ** ページが表示されない（コマ24の事件5）
- localStorage に保存して **再読み込み** したら本当に残るか
- **async な Server Component** のページ（コマ13の `/tips`）が正しく表示されるか
- CSS が読み込まれず、ボタンが画面の外に出て **押せない**

E2E テストは、**「アプリ全体が本物のブラウザで本当に動くか」** を守る最後の砦。

> **Playwright とは**：Microsoft が作っている E2E テストの道具。Chromium・Firefox・WebKit（Safari の中身）を自動で操作できる。

### E2E は「少なく、大事なところだけ」

E2E テストは遅く、ちょっとした変更で壊れやすい。だから **数を絞る**。

- Jest のテスト：数十〜数百本（細かい仕様を守る）
- E2E テスト：数本（**利用者にとって一番大事な操作の流れ** だけを守る）

##  本題

### 1. Playwright を入れる

```powershell
cd ~/workspace/todo-app
git switch main
git pull
git switch -c test/e2e

npm install -D @playwright/test
npx playwright install --with-deps chromium
```

- `@playwright/test`：E2E テストを書いて実行する本体
- `npx playwright install --with-deps chromium`：テストで使う Chromium を入れる（`--with-deps` は Linux で必要なライブラリも入れる指定。Windows では何もしないが、CI と同じコマンドにそろえておく）

### 2. 設定ファイルを作る

プロジェクト直下に `playwright.config.mjs` を作る。

```js
// playwright.config.mjs
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

| 設定 | 意味 |
|------|------|
| `testDir: './e2e'` | E2E テストは `e2e/` フォルダに置く |
| `baseURL` | `page.goto('/')` と書いたときの URL の先頭 |
| `webServer.command` | テストの前にアプリを起動するコマンド。**CI では本番と同じ `build` → `start`**、手元では速い `dev` |
| `reuseExistingServer` | 手元ですでに `npm run dev` が動いていれば、それを使う |
| `retries` | CI では、失敗したテストを2回までやり直す（E2E はたまたま失敗することがあるため） |
| `trace: 'on-first-retry'` | やり直したときに、操作の記録（トレース）を残す |
| `forbidOnly` | CI では `test.only`（そのテストだけ実行する書き方）の消し忘れをエラーにする |

> GitHub Actions のランナーでは、環境変数 `CI` が最初から設定されている（コマ17）。

### 3. Jest と E2E を分ける

Jest は `.test.js` だけでなく `.spec.js` も探すので、E2E テストのファイルまで実行しようとしてしまう。`jest.config.mjs` で `e2e/` を除外する。

```js
// jest.config.mjs（config に追加）
  testPathIgnorePatterns: ['<rootDir>/e2e/'],
```

Playwright が作るフォルダを、Git・ESLint・Prettier の対象から外す。

`.gitignore` の末尾に追加する。

```text
# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
```

`.prettierignore` の末尾に追加する。

```text
playwright-report
test-results
```

```js
// eslint.config.mjs（globalIgnores の中に追加）
    'playwright-report/**',
    'test-results/**',
```

実行するコマンドを追加する。

```powershell
npm pkg set scripts.test:e2e="playwright test"
```

### 4. 最初の E2E テスト

```powershell
mkdir -Force e2e
```

```js
// e2e/todo.spec.mjs
import { expect, test } from '@playwright/test'

test('TODO を追加・完了・削除できる', async ({ page }) => {
  await page.goto('/')
  const input = page.getByRole('textbox', { name: 'やること' })

  await input.fill('牛乳を買う')
  await input.press('Enter')
  await input.fill('レポート提出')
  await input.press('Enter')
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(page.getByText('残り 2 件')).toBeVisible()

  await page.getByRole('checkbox', { name: '牛乳を買う' }).check()
  await expect(page.getByText('残り 1 件')).toBeVisible()

  await page.getByRole('button', { name: 'レポート提出を削除' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
})
```

見覚えのある書き方のはず。**`getByRole` は RTL（コマ10）と同じ考え方**：利用者に見える役割と名前で要素を探す。コマ5で `aria-label` を付けておいたおかげで、E2E でもそのまま使える。

| RTL（コマ10〜11） | Playwright |
|------------------|-----------|
| `screen.getByRole(...)` | `page.getByRole(...)` |
| `await user.type(input, '...')` | `await input.fill('...')` |
| `await user.click(button)` | `await button.click()` |
| `expect(...).toBeInTheDocument()` | `await expect(...).toBeVisible()` |
| `await screen.findBy...`（待つ） | `await expect(...)` が **自動で待つ** |

> **`await expect(...)` は自動で待つ**：Playwright の `expect` は、条件を満たすまで最大5秒くり返し確かめてくれる。RTL の `findBy` に当たる待ちが、最初から組み込まれている。

```powershell
npm run test:e2e
```

```text
Running 1 test using 1 worker
  1 passed (4.2s)
```

### 5. E2E でしか確かめられないことを書く

Jest では確かめにくかったことを E2E で書く。

```js
// e2e/todo.spec.mjs（追加）
test('再読み込みしても TODO が残る', async ({ page }) => {
  await page.goto('/')
  const input = page.getByRole('textbox', { name: 'やること' })
  await input.fill('保存されるTODO')
  await input.press('Enter')

  await page.reload()

  await expect(page.getByRole('checkbox', { name: '保存されるTODO' })).toBeVisible()
})

test('async な Server Component のページも表示できる', async ({ page }) => {
  await page.goto('/tips')

  await expect(page.getByRole('heading', { name: 'TODOのコツ' })).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(3)
})
```

- **1つ目**：本物のブラウザの localStorage に保存し、本当に再読み込みする。Jest では「部品を消してもう一度描く」ことで近いことをしたが、E2E なら **利用者の操作そのもの** で確かめられる
- **2つ目**：コマ13で「Jest では描画できない、E2E を推奨」とされた async な Server Component のページ

> **テストごとに localStorage は空から始まる**：Playwright はテストごとに新しいブラウザの状態（コンテキスト）を作るので、前のテストの TODO は残らない。コマ11の `beforeEach(() => localStorage.clear())` に当たることを自動でやってくれる。

### 6. 通信を差し替える

「サンプルを読み込む」のテストでは、本物の JSONPlaceholder に通信したくない。Playwright の **`page.route`** で、ブラウザの通信を差し替えられる。

```js
// e2e/todo.spec.mjs（追加）
test('サンプルを読み込める（通信を差し替える）', async ({ page }) => {
  await page.route('https://jsonplaceholder.typicode.com/todos**', (route) =>
    route.fulfill({ json: [{ userId: 1, id: 1, title: 'E2Eで差し替えたTODO', completed: false }] }),
  )
  await page.goto('/')

  await page.getByRole('button', { name: 'サンプルを読み込む' }).click()

  await expect(page.getByText('E2Eで差し替えたTODO')).toBeVisible()
})
```

`**` は「その後ろに何が続いてもよい」という意味（`?_limit=3` を含めて一致させるため）。

### 7. 失敗したときの調べ方

期待する文字をわざと間違えて、失敗させてみる。

```js
await expect(page.getByText('残り 3 件')).toBeVisible()   // 本当は 2 件
```

```powershell
npm run test:e2e
npx playwright show-report
```

HTML のレポートが開き、**失敗した時点の画面のスクリーンショット** と、エラーの行が表示される。

さらに便利なのが **UI モード**。

```powershell
npx playwright test --ui
```

テストを1ステップずつ再生しながら、そのときの画面と HTML を見られる。確かめたら、テストを元に戻す。

### 8. CI/CD パイプラインに組み込む

コマ23の `ci.yml` に `e2e` ジョブを追加し、**E2E も通ってから** Pages に公開されるようにする。

```yaml
# .github/workflows/ci.yml（jobs の中、build の後に追加）
  e2e:
    needs: [lint, test]
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Playwright のブラウザを入れる
        run: npx playwright install --with-deps chromium
      - name: E2E テスト
        run: npm run test:e2e
      - name: レポートを保存
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

`pages-build` の `needs` を変えて、E2E が通らないと公開しないようにする。

```yaml
  pages-build:
    needs: [build, e2e]
```

| 部分 | 意味 |
|------|------|
| `npx playwright install --with-deps chromium` | ランナーは毎回まっさらなので、ブラウザも毎回入れる |
| `timeout-minutes: 15` | E2E は固まることがある。上限を決めておく |
| `if: failure()` | **失敗したときだけ** レポートを保存する |

```powershell
npm run lint
npm test
npm run test:e2e
git add .
git commit -m "test: PlaywrightのE2Eテストを追加し、CIに組み込む"
git push -u origin test/e2e
gh pr create --fill
gh pr checks --watch
```

PR のチェックに `CI/CD / e2e` が加わる。マージしたら、ルールセット（コマ18）の必須チェックに **`e2e` も追加** する。

```text
                    ┌──────┐   ┌──────┐
PR / main に push → │ lint │   │ test │
                    └──┬───┘   └──┬───┘
                   ┌───┴──────────┴───┐
                ┌──┴───┐          ┌───┴──┐
                │build │          │ e2e  │
                └──┬───┘          └──┬───┘
                   └───────┬─────────┘
                    ┌──────┴───────┐
                    │ pages-build  │ → pages-deploy（main のときだけ）
                    └──────────────┘
```

##  演習

### 演習1（基本）：ページ移動の E2E

「ヘッダーの『このアプリについて』をクリックすると `/about` に移動し、見出しが表示され、そのリンクが現在のページ（`aria-current="page"`）になる」E2E テストを書く。

**確認方法**：テストが通り、`Header.js` の `aria-current` を消すと失敗すればOK（確かめたら戻す）。

<details>
<summary>解答例</summary>

```js
test('ヘッダーからページを移動できる', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: 'このアプリについて' }).click()

  await expect(page).toHaveURL(/\/about$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('このアプリについて')
  await expect(page.getByRole('link', { name: 'このアプリについて' })).toHaveAttribute('aria-current', 'page')
})
```

</details>

### 演習2（基本）：失敗したときのレポートを CI から取ってくる

わざと失敗する E2E テストを PR で push し、CI の `e2e` ジョブが赤くなることを確かめる。Actions の実行ページから `playwright-report` をダウンロードして開く。

```powershell
gh run download <実行のID> -n playwright-report -D $env:TEMP/playwright-report
npx playwright show-report $env:TEMP/playwright-report
```

**確認方法**：CI で失敗した時点のスクリーンショットとトレースを、手元のレポートで見られればOK。確かめたらテストを直す。

### 演習3（応用）：404 ページと、ビルドでだけ起きる問題

1. 存在しない URL（`/abc`）を開くと、自作の 404 ページが表示される E2E テストを書く
2. コマ24の事件5（`app/page.js` で `TodoAppClient` ではなく `TodoApp` を直接 import する）をわざと起こし、`CI=1 npm run test:e2e`（本番ビルドで実行）で E2E がどうなるか確かめる

**確認方法**：1 のテストが通る。2 では `npm run build` の段階で失敗し、E2E が始まらないことを確かめる（確かめたら戻す）。

> 2 のように、E2E は「ビルドできて、起動できて、表示できる」ことまで含めて確かめている。

### 演習4（早く終わった人向け）：公開した URL に E2E を実行する

デプロイした GitHub Pages や Vercel の URL に対して、E2E テストを実行できるようにする。

**確認方法**：`BASE_URL=https://ユーザー名.github.io/todo-app npm run test:e2e` のように実行すると、手元のサーバを起動せずに、公開中のサイトでテストが通ればOK。

<details>
<summary>ヒント</summary>

- `baseURL: process.env.BASE_URL ?? 'http://localhost:3000'` にする
- `BASE_URL` があるときは `webServer` を使わない（`webServer: process.env.BASE_URL ? undefined : { ... }`）
- GitHub Pages は `/todo-app/` の下なので、`page.goto('/')` だと `https://ユーザー名.github.io/` に行ってしまう。`page.goto('./')` のように **相対パス** で書き、`BASE_URL` の末尾に `/` を付ける
- デプロイの直後に公開中のサイトを確かめるテストを **スモークテスト** と呼ぶ

</details>

##  まとめ

### 今日できるようになったこと

- E2E テストの役割（本物のブラウザで、アプリ全体の一番大事な流れを守る）を説明できるようになった
- Playwright で、localStorage・async な Server Component・通信の差し替えを含む E2E テストを書けるようになった
- E2E を CI/CD パイプラインに組み込み、E2E が通らないと公開されないようにできた

### よくある詰まりポイント

- **`browserType.launch` で失敗する**：ブラウザ本体が入っていない。`npx playwright install --with-deps chromium` をもう一度実行する
- **Jest が `e2e/` のファイルを実行してエラーになる**：`jest.config.mjs` の `testPathIgnorePatterns` に `'<rootDir>/e2e/'` を入れる
- **`getByRole('alert')` が別の要素に一致する**：Next.js はページ移動を読み上げソフトに伝えるための要素（`role="alert"`）を自動で置いている。`page.getByRole('alert').filter({ hasText: '...' })` のように文字で絞り込む
- **CI でだけ時間切れになる**：CI では `build` から始めるので時間がかかる。`webServer.timeout` と `timeout-minutes` を確認する

### 次の一歩

個人制作のアプリにも「一番大事な流れ」の E2E を1本入れよう。発表で「本物のブラウザでのテストまで CI で自動化しています」と言えるようになる。

##  課題

### 基礎課題（必須）

1. 本題の E2E テスト（4本）と演習1を完成させ、`e2e` ジョブ付きの CI をマージする
2. ルールセットの必須チェックに `e2e` を追加する

### 応用課題（推奨）

3. 「完了済みを削除」「絞り込み」など、自分で追加した機能の E2E を1本書く。**本当に E2E が必要か**（Jest で十分ではないか）も考えて、理由を PR に書く
4. 演習2を完成させる

### チャレンジ課題（挑戦）

5. `projects` に Firefox と WebKit を追加し、3つのブラウザで E2E を実行する。CI の時間がどれくらい延びるかを測り、「全部のブラウザで毎回実行する価値があるか」を判断する
6. 演習4のスモークテストを、`pages-deploy` ジョブの **後に** 動く `smoke` ジョブとして CI/CD に組み込む（`needs: pages-deploy`）。デプロイした直後の本番サイトを自動で確かめられるようになる
