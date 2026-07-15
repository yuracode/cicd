# 発展4｜Playwrightで E2Eテスト＋CI組み込み

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 |  |
| 前提コマ | Phase 2・3 修了（コマ16 CI：テストの自動化まで） |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- E2Eテストが単体・結合テストと何が違い、何を守るのかを説明できる
- PlaywrightでTODOアプリのE2Eテストを書き、ローカルで実行できる
- E2EテストをGitHub Actionsに組み込み、失敗時のレポートを確認できる

##  導入

### コマ7で「扱わない」と言ったやつ

テストのピラミッド（コマ7）で3階層の一番上にいた **E2Eテスト（End-to-End）** に、ついに手を出す。

- 単体・結合テスト（Vitest + RTL）：コンポーネントを **Node内の仮想DOM** で検証。速いが、本物のブラウザでは動かしていない
- E2Eテスト：**本物のブラウザ** を自動操作して、ユーザーと同じ手順で検証。遅いが、最も本番に近い

RTLのテストが全部緑でも、「ビルド設定のミスで本番ページが真っ白」は検出できない。E2Eは **「アプリ全体が本当に動くか」** という最後の砦を守る。

> **Playwrightとは**：Microsoft製のE2Eテストフレームワーク。Chromium / Firefox / WebKit の3エンジンを自動操作できる。近年のフロントエンド現場では第一選択になりつつある。

### 戦略：E2Eは「少数精鋭」

E2Eは遅く、壊れやすい。だから **数を絞る**。

- 単体・結合：数十〜数百本（細かい仕様を守る）
- E2E：数本（「ユーザーの最重要動線」だけを守る）

TODOアプリなら「追加して、表示されて、削除できる」の1本がまず書くべきE2E。

##  本題

### 1. インストール

```bash
cd ~/workspace/todo-app
npm init playwright@latest
```

対話形式で聞かれる。以下を選ぶ：

- テストの場所 → `e2e`（`tests` だとVitestのファイルと混ざりやすいため）
- GitHub Actions workflow → **false**（後で自分で書く。中身を理解するため）
- ブラウザのインストール → **true**

WSL2ではブラウザの動作に必要なライブラリが不足していることがある。エラーが出たら：

```bash
sudo npx playwright install-deps chromium
```

### 2. 設定：テスト前にdevサーバを自動起動させる

`playwright.config.js` を開き、`webServer` と `baseURL` を設定する。

```javascript
// playwright.config.js（要点のみ）
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

- **`webServer`**：テスト実行前にViteを自動起動し、終わったら止めてくれる。「サーバ起動を忘れてテストが全滅」を防ぐ
- **`reuseExistingServer: !process.env.CI`**：ローカルでは起動済みサーバを再利用、CIでは必ず新規起動
- **`trace: 'on-first-retry'`**：失敗時に操作の記録（後述のトレース）を残す

> **ここの `npm run dev` に `-- --host` が要らない理由**：この教材で `--host` を付けてきたのは **Windows側のブラウザ** からWSL2内のサーバを見るため。E2Eではブラウザ自体がWSL2の中で動くので、localhostのままで届く。

### 3. 最初のE2Eテストを書く

サンプルとして生成された `e2e/example.spec.js` は削除し、自分のテストを書く。

```javascript
// e2e/todo.spec.js
import { test, expect } from '@playwright/test'

test.describe('TODOアプリ', () => {
  test('追加 → 表示 → 削除 の基本動線が動く', async ({ page }) => {
    await page.goto('/')

    // 追加
    await page.getByRole('textbox').fill('E2Eから追加したTODO')
    await page.getByRole('button', { name: '追加' }).click()

    // 表示確認
    await expect(page.getByText('E2Eから追加したTODO')).toBeVisible()

    // 削除
    await page.getByRole('button', { name: '削除' }).click()
    await expect(page.getByText('E2Eから追加したTODO')).not.toBeVisible()
  })

  test('空入力では追加されない', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '追加' }).click()
    await expect(page.getByRole('listitem')).toHaveCount(0)
  })
})
```

見覚えのある書き方のはず。**`getByRole` はRTL（コマ9〜10）と同じ思想**：「ユーザーから見えるもの（役割・ラベル）」で要素を探す。RTLで身につけた習慣がそのまま活きる。

> **`await expect(...)` に注目**：Playwrightの `expect` は **自動リトライ** する。「要素がまだ出てない」場合も数秒待ってくれるので、RTLの `findBy` に相当する待ち処理が組み込みになっている。

### 4. 実行

```bash
npx playwright test
```

Viteが自動起動し、ヘッドレス（画面なし）のChromiumでテストが走る。

**ブラウザの動きを目で見たいとき**（Windows 11のWSL2はGUIアプリをそのまま表示できる）：

```bash
npx playwright test --headed
```

**UIモード**（テストを1ステップずつ再生できる。デバッグに最強）：

```bash
npx playwright test --ui
```

失敗したときはHTMLレポートを開く：

```bash
npx playwright show-report
```

### 5. CIに組み込む

コマ16のCIとは **別ワークフロー** にする。E2Eは遅いので、まず分けて様子を見るのが安全。

```yaml
# .github/workflows/e2e.yml
name: E2E

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload report on failure
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

コマ16との違いに注目：

- **`npx playwright install --with-deps chromium`**：CIのマシンは毎回まっさら（コマ13）なので、ブラウザも毎回インストールする
- **`timeout-minutes: 15`**：E2Eは無限に固まることがある。上限を切っておく
- **`if: failure()`**：失敗したときだけレポートをアーティファクトとして保存。ActionsのSummaryページからダウンロードして `npx playwright show-report ダウンロードしたフォルダ` で開ける

わざとテストを失敗させて（`'E2Eから追加したTODO'` を別の文字列に変えるなど）、レポートがアップロードされるところまで確認しておくと、本当に困ったときに慌てない。

##  まとめ

### 今日できるようになったこと

- E2Eテストの位置づけ（少数精鋭で最重要動線を守る）を説明できる
- Playwright + webServer設定で、コマンド1発のE2E実行環境を作れる
- E2EをCIに組み込み、失敗時のレポートを回収できる

### よくある詰まりポイント

- **ローカルで `browserType.launch` エラー**：WSL2の依存ライブラリ不足。`sudo npx playwright install-deps chromium`
- **CIだけタイムアウトする**：CIマシンはローカルより遅い。`webServer` の起動待ち（`url` 指定）が正しいか、`timeout-minutes` が短すぎないかを確認
- **セレクタが見つからない**：`getByRole('button', { name: '追加' })` の `name` はボタンの表示文字列と完全一致が基本。`npx playwright test --ui` で実際のDOMを見ながら直すのが早い

### 次の一歩

発展3（MSW）と組み合わせると、外部APIに依存しないE2Eが書ける。発展5（CI/CD強化）のキャッシュ最適化はE2Eワークフローの高速化にも効く。個人制作アプリに「最重要動線のE2E 1本」を足すと、発表時に「E2EまでCIで回してます」と言える。

##  課題

### 基礎課題（必須）

1. TODOアプリに「追加→表示→削除」のE2Eテストを書き、ローカルでPASSさせる
2. `e2e.yml` を追加したPRを作り、Actionsで E2E が緑になることを確認してマージする

### 応用課題（推奨）

3. **完了チェックの動線** のE2Eを1本追加する（チェック→取り消し線が付く→再チェックで戻る）
4. わざと失敗するテストをpushして、アーティファクトのHTMLレポートをダウンロード→ `npx playwright show-report` で開き、失敗時のスクリーンショットとトレースを確認する（確認後、テストは元に戻す）

### チャレンジ課題（挑戦）

5. `projects` に `firefox` を追加し、2ブラウザでテストを走らせる。CIの実行時間がどれだけ伸びるかを計測し、「全ブラウザで回す価値があるか」を自分なりに判断する
6. デプロイ済みの本番URL（GitHub Pages / Vercel）に対してE2Eを実行する設定を調べて試す（ヒント：`baseURL` を環境変数で切り替え、`webServer` をスキップ）。「デプロイ後の自動動作確認（スモークテスト）」という考え方を知る
