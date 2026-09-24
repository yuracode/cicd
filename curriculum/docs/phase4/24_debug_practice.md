# コマ24｜トラブルシューティング演習

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 4 |
| 所要時間 | 90分 |
| 前提コマ | コマ23 CI/CDパイプラインの完成 |
| 次コマ | コマ25 チーム開発シミュレーション |

##  目標

- CI/CD が失敗したとき、「どこで・何が・なぜ」を順に絞り込む手順で原因を見つけられる
- 手元で CI と同じ状況を再現して、修正を確かめてから push できる
- 「手元では通るのに CI で落ちる」典型的な原因（ロックファイル・タイムゾーン・テストの順番・サーバでの実行）を説明できる

##  導入

### 前回の振り返り

前回、Issue から公開までのパイプラインが完成した。ここからは「動かし続ける」力をつける。

### 考えてみよう

> PR を出したら CI が赤くなった。まず何をする？

ありがちな失敗は、**ログを読まずに、思いついたところを直して push し直す** こと。何回も push するうちに、何を変えたか分からなくなる。

### 今日の進め方

**わざと壊した状態** を自分で作り、ログだけを手がかりに原因を探して直す。本題で「調べ方の手順」を3つの事件で練習し、演習でさらに4つの事件に挑戦する。

> 今日の作業はすべて **練習用のブランチ** で行い、最後にブランチごと捨てる。`main` には何もマージしない。

```bash
cd ~/workspace/todo-app
git switch main
git pull
git switch -c practice/debug
```

##  本題

### 1. 原因を絞り込む5つの手順

| 手順 | やること | 見る場所 |
|------|---------|---------|
| ① どこで | 赤くなった **ジョブ** と **ステップ** を特定する | PR のチェック一覧 → Details |
| ② 何が | ログの **一番下から上へ** 読み、最初のエラーメッセージを見つける | 失敗したステップのログ |
| ③ 再現 | 手元で **同じコマンド** を実行し、同じエラーが出るか確かめる | ターミナル |
| ④ なぜ | 直前に何を変えたか比べる（`git diff`、`git log`） | 差分 |
| ⑤ 直して確かめる | 手元で直ったことを確かめてから push する | ターミナル → CI |

> ③で手元でも同じエラーが出れば、あとは普段の開発と同じ。**手元で再現しない** ときは、「CI と手元で何が違うか」（OS、時刻、環境変数、インストールされているパッケージ、ファイル）を疑う。

ターミナルで CI の結果を見るコマンドもおさらいしておく。

```bash
gh pr checks                          # PR のチェックの一覧
gh run list --limit 5                 # 最近の実行
gh run view <実行のID> --log-failed   # 失敗したステップのログだけを表示
```

### 2. 事件1：ワークフローが動かない

`.github/workflows/ci.yml` の `lint` ジョブの `runs-on` の行を、わざとインデントを1つずらす。

```yaml
  lint:
     runs-on: ubuntu-latest
    steps:
```

```bash
git commit -am "practice: 事件1"
git push -u origin practice/debug
gh pr create --title "練習：トラブルシューティング" --body "練習用。マージしない。"
```

**症状**：PR にチェックが1つも出ない（または Actions タブに赤い「Invalid workflow file」が出る）。

**調べる**：

1. Actions タブを開く → 失敗した実行をクリック
2. `Invalid workflow file: .github/workflows/ci.yml#L20` のように、**ファイル名と行番号** が表示される
3. 手元で、その行のインデントを確かめる（コマ14の `npx --yes js-yaml .github/workflows/ci.yml` でも確認できる）

**直す**：インデントを戻して push する。

> **ワークフローのファイル自体が壊れていると、ジョブは1つも動かない**。「チェックが出ない」「いつまでも始まらない」ときは、まずワークフローの YAML を疑う。

### 3. 事件2：npm ci だけが失敗する

`package.json` を **エディタで直接** 書き換えて、使っていないパッケージを追加する（`npm install` はしない）。

```json
"dependencies": {
  "dayjs": "^1.11.0",
  "next": "...",
```

```bash
git commit -am "practice: 事件2"
git push
```

**症状**：`lint` / `test` / `build` の全ジョブが、`npm ci` のステップで赤くなる。

**調べる**：`gh run view <実行のID> --log-failed` でログを見る。

```text
npm error `npm ci` can only install packages when your package.json and package-lock.json
or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
```

**再現する**：手元で `npm ci` を実行すると、同じエラーが出る（`npm run dev` や `npm test` では気づけない）。

> ⚠️ 手元で `npm ci` を実行すると、失敗した場合でも `node_modules` が消える。直したあとで `npm ci`（または `npm install`）をもう一度実行すれば元に戻る。

**なぜ**：`package.json` にだけ `dayjs` を足し、`package-lock.json` を更新していない。`npm ci` は「2つのファイルが一致していること」を必須にしている（コマ16）。

**直す**：パッケージを足したいなら `npm install dayjs` を使う（両方のファイルが更新される）。今回は不要なので、`package.json` から `dayjs` の行を消す。

```bash
npm ci
git commit -am "practice: 事件2を直す"
git push
```

### 4. 事件3：手元では通るのに、CI でだけテストが落ちる

時間帯であいさつを変える関数と、そのテストを追加する。

```js
// lib/greeting.js
export function greetingFor(date) {
  const hour = date.getHours()
  if (hour < 12) return 'おはようございます'
  if (hour < 18) return 'こんにちは'
  return 'こんばんは'
}
```

```js
// lib/greeting.test.js
import { greetingFor } from './greeting'

test('日本時間の朝8時は「おはようございます」', () => {
  expect(greetingFor(new Date('2026-10-01T08:00:00+09:00'))).toBe('おはようございます')
})
```

```bash
npm test        # 手元では通る
git add .
git commit -m "practice: 事件3"
git push
```

**症状**：`test` ジョブだけが赤い。

```text
● 日本時間の朝8時は「おはようございます」
    Expected: "おはようございます"
    Received: "こんばんは"
```

**再現する**：手元では通るので、**CI と手元の違い** を疑う。GitHub Actions のランナーの時計は **UTC**（日本時間 − 9時間）だった（コマ15）。手元でも UTC にして実行してみる。

```bash
TZ=UTC npm test
```

同じ失敗が再現した。日本時間の朝8時は UTC では前の日の23時なので、`getHours()` が `23` を返していた。

**直す方法**（どれか1つ）：

| 方法 | 書き方 | 考え方 |
|------|--------|--------|
| テストの時刻を「その環境の時刻」で作る | `new Date(2026, 9, 1, 8, 0)`（月は0始まり） | どのタイムゾーンでも「その場所の朝8時」になる |
| テストを実行するタイムゾーンを固定する | `package.json` の `test` を `"TZ=Asia/Tokyo jest"` にする | 日本の利用者向けのアプリなので、日本時間で確かめる |
| 関数に時刻（時）だけを渡す設計にする | `greetingFor(hour)` | 日付やタイムゾーンを関数の外で扱う |

ここでは1つ目で直す。

```js
test('朝8時は「おはようございます」', () => {
  expect(greetingFor(new Date(2026, 9, 1, 8, 0))).toBe('おはようございます')
})
```

```bash
TZ=UTC npm test
TZ=Asia/Tokyo npm test
git commit -am "practice: 事件3を直す（タイムゾーンに依存しないテストにする）"
git push
```

> **日時・タイムゾーン・言語設定** は、「手元では通るのに CI で落ちる」原因の代表。日時を扱うテストを書いたら、`TZ=UTC npm test` でも確かめるクセをつける。

##  演習

各事件は、**① 壊す → ② push して CI の結果を見る → ③ ログから原因を説明する → ④ 直して緑に戻す** の順に進める。解説は、自分で原因を説明できてから開く。

### 演習1（基本）：事件4「テストを1つだけ実行すると通る」

`components/TodoApp.test.js` の先頭の `beforeEach(() => { localStorage.clear() })` を消し、ファイルの **一番最後** に次のテストを追加して push する（コマ11の演習2のテスト）。

```jsx
test('空白だけでは TODO は増えない', async () => {
  const user = userEvent.setup()
  render(<TodoApp />)

  await user.type(screen.getByRole('textbox', { name: 'やること' }), '   {Enter}')

  expect(screen.getByText('やることはありません')).toBeInTheDocument()
})
```

さらに、手元で次の2つを実行して結果を比べる。

```bash
npx jest components/TodoApp.test.js
npx jest components/TodoApp.test.js -t '空白'
```

**確認方法**：「全部実行すると失敗、そのテストだけ実行すると成功する」理由を説明し、直して緑に戻せればOK。

<details>
<summary>解説</summary>

jsdom の localStorage は、**同じテストファイルの中では共有** されている。前のテストで追加した TODO が残っているので、「やることはありません」が表示されない。1つだけ実行すると、前のテストがないので通ってしまう。

**テストはそれぞれ独立して、どの順番で実行しても同じ結果になる** ように書く。`beforeEach` で毎回きれいな状態に戻すのが基本。

</details>

### 演習2（基本）：事件5「build だけが落ちる」

`app/page.js` の import を、`TodoAppClient` から `TodoApp` に直接変える（`dynamic` のラッパーを通さない）。

```jsx
import TodoAppClient from '@/components/TodoApp'
```

**確認方法**：`npm run dev` でトップページを開いたときの様子と、CI の `build` のログを比べ、原因を説明して直せればOK。

<details>
<summary>解説</summary>

```text
Error occurred prerendering page "/".
ReferenceError: localStorage is not defined
Export encountered an error on /page: /, exiting the build.
```

`npm run build` は、`○ (Static)` のページの HTML をビルドのときに **サーバ側（Node.js）で作る**。そのとき `TodoApp` の `loadTodos` が localStorage を読もうとして失敗する。コマ6で `dynamic(..., { ssr: false })` のラッパーを作ったのは、これを防ぐためだった。

`npm run dev` ではエラーがターミナルに出るだけで画面は表示されることがあるので、見逃しやすい。**build は本番と同じ条件で確かめてくれる**。

</details>

### 演習3（応用）：事件6「デプロイだけが落ちる」

この事件は `main` への push でしか起きないので、**ログの例を読んで** 原因を考える。

`ci.yml` の `pages-deploy` ジョブから `permissions:` の3行を消した状態でマージすると、次のログが出た。

```text
Run actions/deploy-pages@v5
Error: Ensure GITHUB_TOKEN has permission "id-token: write".
```

**確認方法**：なぜこのジョブだけ失敗するのか、ワークフローの一番上の `permissions: contents: read` との関係を含めて説明できればOK。

<details>
<summary>解説</summary>

ワークフローの一番上で `permissions: contents: read` と書くと、**すべてのジョブの権限が「読むだけ」になる**。`pages-deploy` ジョブの中に `permissions:` を書いてあったのは、このジョブだけに `pages: write` と `id-token: write` を足すためだった。消すと、一番上の設定（読むだけ）が使われるので、Pages に書き込めない。

**エラーメッセージに、足りない権限の名前がそのまま書いてある**。権限のエラーは「どのジョブに・どの権限が」足りないかを読む。

</details>

### 演習4（早く終わった人向け）：事件7「CI は全部緑なのにマージできない」

`ci.yml` の `test` ジョブの名前を `unit-test` に変えて push する（`build` の `needs: [lint, test]` も `[lint, unit-test]` に直す）。

**確認方法**：PR の画面で何が表示されてマージできないのかを確かめ、「CI のファイル」と「ルールセット」のどちらをどう直せばよいか説明できればOK。確かめたら名前を `test` に戻す。

<details>
<summary>解説</summary>

チェックの一覧は `lint`・`unit-test`・`build` が全部緑になるが、ルールセットは **`test` という名前のチェック** を待ち続ける（`Expected — Waiting for status to be reported`）。コマ18の演習3と同じ。

ジョブの名前を変えたいなら、**ルールセットの必須チェックも同時に変える**。CI の設定と GitHub の設定が別々の場所にあるので、片方だけ変えると食い違う。

</details>

### 片付け

練習が終わったら、PR を閉じてブランチを消す。

```bash
gh pr close --delete-branch
git switch main
git branch -D practice/debug
npm ci
```

##  まとめ

### 今日できるようになったこと

- 「どこで → 何が → 再現 → なぜ → 直して確かめる」の順に、CI の失敗の原因を絞り込めるようになった
- `gh run view --log-failed` や `TZ=UTC npm test` などで、CI と同じ状況を手元で再現できるようになった
- ロックファイルの不一致、タイムゾーン、テストの順番、サーバでの実行、権限、チェック名の食い違いといった典型的な失敗を経験した

### よくある詰まりポイント

- **ログが長すぎて読めない**：一番下の `Error:` か `exit code` の行から、上に向かって最初のエラーを探す。`--log-failed` で失敗したステップだけを見る
- **直したはずなのにまだ赤い**：新しいコミットの実行を見ているか確認する（古い実行のログを見ていることがある）。`gh run list` で一番上の実行を確認する
- **手元で再現しない**：CI との違い（OS・時刻・環境変数・Node.js のバージョン・`npm ci` か `npm install` か）を1つずつそろえてみる

### 次コマ予告

次回は Phase 4 のまとめとして、2〜3人のチームで1つのリポジトリを共同開発する。レビューを必須にしたルールセットのもとで、Issue の分担・PR のレビュー・コンフリクトの解決を体験する。

##  課題

### 基礎課題（必須）

1. 本題の事件1〜3と、演習1・2について、「症状」「原因」「直し方」を1行ずつの表にまとめる
2. 自分がこれまでの授業で実際にハマったエラーを1つ選び、同じ表の形式で書き足す

### 応用課題（推奨）

3. 隣の人と「事件」を出し合う。相手のリポジトリの練習用ブランチに、わざと1か所だけ壊したコミットを PR で送り、相手はログだけを見て原因を当てる
4. `package.json` の `test` を `"TZ=Asia/Tokyo jest"` にした場合と、テストの書き方で直した場合（本題の事件3）の、良い点・悪い点を比べる

### チャレンジ課題（挑戦）

5. **act**（GitHub Actions のワークフローを手元の Docker で動かす道具）について調べ、どんなときに便利か、どんな制限があるかをまとめる
6. CI が失敗したときに、PR にコメントで「失敗したジョブ名とログへのリンク」を自動で書き込むステップを考える（ヒント：`if: failure()`、`gh pr comment`、`permissions: pull-requests: write`）
