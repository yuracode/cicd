# コマ23｜デバッグ演習

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 4 |
| 所要時間 |  |
| 前提コマ | コマ22 パイプライン完成（一気通貫） |
| 次コマ | コマ24 チーム開発シミュレーション |

##  目標

- CIのログから失敗原因を特定する手順を言える
- 典型的なCI失敗パターン（依存・権限・環境差・YAML構文）を識別できる
- `act` などローカル検証の選択肢を知っている

##  導入

### 前回の振り返り

完全自動パイプラインができた。だが **実務では壊れる方が普通**。壊れた時に直せる力が、CI/CDを扱う上で最重要。

### 今日のスタイル

講師が **わざと壊したPR** を各学生のリポジトリに用意（または自分で壊す）。ログを見て原因を特定し、修正する。

### デバッグの基本姿勢

1. **ログを頭から読む**（飛ばさない）
2. 最初のエラー行に集中（後ろのエラーは波及かも）
3. **再現性の確認**：もう一度回して同じ失敗か
4. **ローカルで同じコマンドを打つ**
5. 直したら **わざと同じ壊し方を再現** して、本当に直ったか確認

##  本題

### 1. 演習1：YAML構文エラー

`.github/workflows/ci.yml` の `lint` ジョブをわざと壊す：

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
     - uses: actions/checkout@v4    # ← スペース1個（インデント崩れ）
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
```

PR作成 → Actions。**ワークフロー自体が起動しない**。

**エラー表示：**

```
Invalid workflow file
You have an error in your yaml syntax on line X
```

**解き方：**

- メッセージの行番号に注目
- YAMLは **インデントが命**
- VS Codeの「空白文字を表示」やYAML Lint拡張で視覚化

**修正：**

```yaml
    steps:
      - uses: actions/checkout@v4     # ← スペース2個
      - uses: actions/setup-node@v4
```

### 2. 演習2：依存のバージョン不整合

`package.json` と `package-lock.json` がずれる典型。

再現：手動で `package.json` の React バージョンだけ書き換える：

```json
"dependencies": {
  "react": "^18.0.0",   // 19 → 18 に勝手に変える
  ...
}
```

push → CIで `npm ci` が失敗：

```
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync.
```

**解き方：**

```bash
# package.json を 19 に戻す、または
npm install   # package-lock.json を更新
git add package.json package-lock.json
git commit -m "fix: 依存バージョンを整合"
```

**教訓：** 手で `package.json` を書き換えたら必ず `npm install` で lock を同期。

### 3. 演習3：環境変数の未設定

`ApiSample.jsx` で `VITE_API_URL` を必須にしてみる：

```jsx
// src/ApiSample.jsx
const API_URL = import.meta.env.VITE_API_URL
if (!API_URL) {
  throw new Error('VITE_API_URL is not set')
}
```

ローカルでは `.env` に書いてあるので動く。CIでは設定していないので **ビルドorテスト中にクラッシュ**。

**ログ：**

```
Error: VITE_API_URL is not set
```

**解き方：**

**Option A：** CIに環境変数を渡す

```yaml
      - run: npm run build
        env:
          VITE_API_URL: https://jsonplaceholder.typicode.com
```

**Option B：** デフォルト値にフォールバック

```jsx
const API_URL = import.meta.env.VITE_API_URL || 'https://jsonplaceholder.typicode.com'
```

**教訓：** 「ローカルで動くのにCIで落ちる」は **環境差** が原因の9割。

### 4. 演習4：タイムゾーン／ロケール依存

以下のようなテストを書くと、手元（日本時間）では通るがCI（UTC）で落ちる：

```jsx
it('今日の日付を表示する', () => {
  render(<DateDisplay />)
  const today = new Date().toLocaleDateString('ja-JP')
  expect(screen.getByText(today)).toBeInTheDocument()
})
```

日付が日付をまたぐ時刻だとCIと手元で違う結果に。

**解き方：**

- 時間／環境に依存するテストは **モック** する（コマ11参照）
- `vi.setSystemTime(new Date('2026-01-01'))` で固定

```jsx
import { vi } from 'vitest'
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-04-21T12:00:00'))
})
afterEach(() => {
  vi.useRealTimers()
})
```

**教訓：** テストは **同じ入力に対して同じ結果** でなければならない（決定的であるべき）。

### 5. 演習5：権限エラー

GitHub Pagesデプロイで `permissions:` を削除：

```yaml
# permissions:    # ← コメントアウト
#   contents: read
#   pages: write
#   id-token: write
```

push → デプロイジョブで `HttpError: Resource not accessible by integration`。

**解き方：** `permissions:` を復活させる。

**教訓：** GitHub Actions のデフォルト権限はどんどん **最小に** なっている。書き込み系の操作には明示的な `permissions:` が必要。

### 6. 演習6：キャッシュが古い

「ローカルで npm install したら通るのにCIで落ちる」時の確認：

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
```

`package-lock.json` が変わると自動でキャッシュキーが変わるので基本は大丈夫。だが、**まれにキャッシュが壊れる** ことがある。

**解き方：** Actions画面 → **Caches** から該当エントリを削除して再実行。

### 7. ログを効率的に読むコツ

- **一番上の `Error:` / `Fail:` から読む**。下は派生エラーのことが多い
- `##[error]` マーカーは GitHub Actions 特有のFAIL行
- **折りたたみを全展開** して grep で検索（ブラウザのCtrl+Fで十分）
- **Raw log** ボタンで全文をダウンロードして手元のエディタで開く

### 8. ローカルでCIを再現する選択肢

CIが落ちるたびにpushして待つのは時間の無駄。ローカルで同じ環境を作る方法：

**方法1：シェルで同じコマンドを順に打つ（基本）**

```bash
npm ci
npm run lint
npm run format:check
npm run test -- --run
npm run build
```

**方法2：`act` で GitHub Actions をローカル実行**

```bash
# インストール（Ubuntu）
sudo curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# ワークフロー実行
act -j lint     # lint ジョブを走らせる
act pull_request
```

> **`act` は Docker を使う** ので、WSL2内でDockerを使う設定が必要。詳しくは nektos/act の README。

**方法3：Docker で同じコンテナを使う**

```bash
docker run --rm -v "$PWD":/app -w /app node:24-bullseye bash -lc '
  npm ci && npm run lint && npm run test -- --run
'
```

### 9. トラブル記録を残す

チーム開発では同じミスが繰り返される。**自分用のトラブルシュートログ** を作っておくと成長が早い。

`docs/troubleshooting.md`：

```markdown
# トラブルシュートログ

## 2026-04-XX: CI YAMLインデント崩れ
- 症状：ワークフローが起動しない
- 原因：`steps:` の下のスペースが1個
- 再発防止：VS Code で空白文字表示をON
```

##  まとめ

### 今日できるようになったこと

- 代表的なCI失敗パターンを識別できる
- ログから原因を特定する基本動作が身についた
- ローカルでCIを再現する方法の選択肢を知った

### 「壊れた」から学ぶ観点

- ローカルと CI の違いに気付けるか（環境差）
- 履歴（`package-lock.json` 等）の整合性を意識できるか
- 権限／Secret など、ローカルに無い制約を踏まえられるか

### 次コマ予告

次回は Phase 4 ラスト。**チーム開発シミュレーション**：2〜3人でお互いの PR をレビューしあい、ブランチ保護の運用を体験する。

##  課題

### 基礎課題（必須）

1. `docs/troubleshooting.md` を新規作成し、今日詰まった（または詰まりかけた）ポイントを1件以上記録する
2. `act` または `docker run node:24` で、**ローカルで CI と同じコマンド** を1度走らせる

### 応用課題（推奨）

3. **「ローカルで通るのにCIで落ちる」原因リスト** を自分用に5個以上まとめる（今日のパターン + 自分の経験）。テンプレ例：

```
| # | 症状 | 原因カテゴリ | 確認手順 |
|---|------|-------------|----------|
| 1 | npm ci が失敗 | lock不整合 | package-lock.json を比較 |
| 2 | テストだけ落ちる | タイムゾーン依存 | TZ=UTC で再現 |
| 3 | ビルドが落ちる | 環境変数なし | Secrets設定確認 |
| ...
```

4. **CIログを他人と共有しやすくする工夫** を1つ実践：
   - Actionsの「Raw log」をダウンロード
   - 失敗部分だけ抜粋してSlack/Discord/メールに貼る
   - 関連コミット・ブランチ名も添える

→ 「ログ全体を送る」ではなく、**要点を切り出して渡す** スキルは実務で超重要。

5. **自分のプロジェクトに意図的に3種類のバグを入れて CI を落とす**：① YAML構文、② 依存不整合、③ テストFail。**落ちてから直すまでの時間を測る**

### チャレンジ課題（挑戦）

6. **隣の学生のリポジトリと「壊しっこ交換」** をする：お互いのリポジトリに1つずつ故意のバグを入れた PR を送り合い、相手のPRを時間制限内でデバッグ＆修正する。**他人のコードのデバッグ** は自分のコードより難しい、を体感する

7. **CI失敗の「自動通知」** を調べる：GitHub の通知設定、Slack連携、Discord Webhook など。自分が受け取りやすい方法を1つ設定して、CI失敗時にアラートが来る状態を作る
