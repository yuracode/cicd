# コマ21｜Vercel連携・プレビューデプロイ

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 4 |
| 所要時間 | 90分 |
| 前提コマ | コマ20 GitHub Pagesへの自動デプロイ |
| 次コマ | コマ22 パイプライン完成（一気通貫） |

##  目標

- Vercel にGitHub連携でリポジトリを接続できる
- main への push で本番、PR作成でプレビューURLが発行される仕組みを理解している
- Vercel 側の環境変数設定とGitHub Secretsの違いを説明できる

##  導入（15分）

### 前回の振り返り

GitHub Pages は **自分でワークフローを書いてデプロイ** した。今日はまったく別のアプローチ：Vercelに **お任せ** でデプロイする。

### Vercel の強み

**PRプレビュー：** PRを作るたびに固有URLが発行され、**マージ前に** 動作確認できる。

```
PR作成
 → Vercel が自動ビルド
 → https://todo-app-git-feature-x-username.vercel.app/ が発行
 → レビュー時にそのURLで触って確認
 → マージ → 本番URL反映
```

これは GitHub Pages には無い（自分で作れば作れるが、Vercelは標準で付いてくる）。

### 今日のゴール

1. Vercel に GitHubからリポジトリをインポート
2. 初回デプロイ
3. PRでプレビューデプロイを体験
4. Vite の `base` を Vercel 向けに戻す

##  本題（65分）

### 1. Viteの base を Vercel 向けに戻す（10分）

GitHub Pages 用に `base: '/todo-app/'` を設定したが、Vercel はルート配信なので `/` に戻す。

`vite.config.js` を編集：

```javascript
export default defineConfig({
  plugins: [react()],
  // base: '/todo-app/',  // ← コメントアウト or 削除
  test: {
    // ...
  },
})
```

**GitHub Pages と Vercel の両立：** 環境変数で切り替えるのが定石。

```javascript
// vite.config.js
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: process.env.DEPLOY_TARGET === 'gh-pages' ? '/todo-app/' : '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    // ...
  },
}))
```

そしてGitHub Pages のワークフローで `DEPLOY_TARGET` を設定：

```yaml
# .github/workflows/deploy-ghpages.yml
      - name: ビルド
        env:
          DEPLOY_TARGET: gh-pages
        run: npm run build
```

動作確認：

```bash
npm run build
npm run preview
# http://localhost:4173/ で表示される（base が / に戻っている）
```

### 2. Vercelにリポジトリをインポート（15分）

ブラウザで Vercel にログイン → **Add New → Project**

1. **Import Git Repository** → GitHubアカウント連携（初回のみ）
2. 検索窓で `todo-app` を探してImport
3. **Configure Project：**
   - **Framework Preset：** `Vite`（自動検出されるはず）
   - **Build Command：** `npm run build`（デフォルト）
   - **Output Directory：** `dist`
   - **Install Command：** `npm ci`
4. **Environment Variables：** 今はスキップ（後で追加）
5. **Deploy**

数十秒でビルドが終わり `https://todo-app-xxxxx.vercel.app/` が発行される。開いて動けば成功。

### 3. PRを作ってプレビューデプロイ体験（15分）

新しい機能ブランチを切る：

```bash
cd ~/workspace/todo-app
git switch main
git pull origin main
git switch -c feature/add-footer
```

`src/App.jsx` に簡単な変更：

```jsx
// return の中の最後に追加
<footer style={{ marginTop: '24px', color: '#888', fontSize: '12px' }}>
  <p>TODO App - Phase 4 Demo</p>
</footer>
```

push & PR作成：

```bash
git add src/App.jsx
git commit -m "feat: フッターを追加"
git push -u origin feature/add-footer
gh pr create --title "フッター追加" --body "Vercelプレビュー確認用"
```

PR画面を開くと：

- GitHub Actions の Checks（lint, test）
- **Vercel のコメント** が自動投稿され、**プレビューURL** が載る

プレビューURLをクリック → フッター付きのバージョンが見られる！

> **これが実務でよく使われる価値：** レビュワーは **実際に触って** からApproveできる。本番と別URLなので安心して触れる。

### 4. PRをマージして本番反映（5分）

```bash
gh pr merge --squash --delete-branch
git switch main
git pull origin main
```

main の push で本番URLが自動更新される。数十秒後にアクセスするとフッターが見える。

### 5. Vercel の環境変数管理（10分）

Vercel ダッシュボード → プロジェクト → **Settings → Environment Variables**

設定できるスコープ：

- **Production**：main ブランチのデプロイ
- **Preview**：PRブランチのデプロイ
- **Development**：ローカル `vercel dev` 実行時

例：

- `VITE_API_URL`（Production）= `https://api.example.com`
- `VITE_API_URL`（Preview）= `https://staging-api.example.com`

> **GitHub Secrets との違い：**
>
> | | GitHub Secrets | Vercel 環境変数 |
> |-|---------------|----------------|
> | 使う場所 | GitHub Actions | Vercel ビルド・ランタイム |
> | 管理画面 | GitHub | Vercel |
> | 環境分離 | Environments 機能 | Production/Preview/Development |
>
> → **Vercel にデプロイする場合、Vercel側にも別途設定が必要**。GitHubに入れてもVercelは参照しない。

### 6. PRプレビューのコメント設定（5分）

Vercel のデフォルトでPRにコメントが付く。無効化したい時：

**Settings → Git → Ignored Build Step** / **Deployment Protection**

逆にコメントを充実させたい時は **Comments** のオプションを確認。

### 7. 自動デプロイの裏側を眺める（5分）

「Vercel がいつのまにかやっている」ことを理解するために：

- **Git連携：** VercelはGitHubからイベントをWebhookで受け取る
- **ビルド：** Vercel の仮想マシンで `npm ci && npm run build`
- **配信：** Vercel の グローバルCDN に配置

→ **GitHub Actions を書かなくても自動CD**。対して GitHub Pages はワークフローを自分で書いた。

**違いまとめ：**

- **GitHub Pages 方式：** 自由度高い／勉強になる／手間かかる
- **Vercel 方式：** 楽／PRプレビュー標準／外部サービス依存

実務ではプロジェクトの性質に合わせて選ぶ。

##  まとめ（10分）

### 今日できるようになったこと

- Vercel に GitHub リポジトリをインポートして自動デプロイ
- PR → プレビューURL → マージ → 本番URL のフロー体験
- GitHub Secrets と Vercel 環境変数の違いを理解

### よくある詰まりポイント

- **base 設定が残っていて真っ白**：Vercelでは `/` に戻す（条件分岐が無難）
- **Vercelが古いブランチでビルド**：GitHub連携が切れていることがある → Settings → Git で再接続
- **環境変数が効かない**：Vite は `VITE_` プレフィックス必須

### 次コマ予告

次回は **パイプライン完成**。今まで別々に作った Lint / Test / デプロイ を1本のパイプラインとして整え、「PR → プレビュー → マージ → 本番」の完全自動化を確認する。

##  課題

### 基礎課題（必須）

1. Vercelのプロジェクト設定で `VITE_API_URL` を **Preview** と **Production** で異なる値に設定し、PRで挙動が切り替わることを確認する
2. README に Vercel の本番URLを追加する（GitHub Pages と2つ並ぶことになる）
3. 友達／家族にVercelのURLを送ってみる（GitHub Pagesと比べて応答速度の違いも体感する）

### 応用課題（推奨）

4. **Vercel Analytics** を有効にして、訪問者数・Core Web Vitalsを観察する（無料枠内）。友達に送ったURLのアクセスがダッシュボードに現れることを確認

5. Vercel 側のビルドコマンドを **「テスト通過後のみビルド」** にカスタマイズ：

```
Build Command: npm run test -- --run && npm run build
```

→ テストが落ちればデプロイも失敗。**GitHub Actions側で担保していたものを Vercel 側にも** 張る発想。どちらが責務を持つべきかを考える材料になる。

6. Vercel の **Deployment Protection** 設定を調べる。Preview URL に「パスワードをかける」「特定のチームメンバーだけ見られる」などの設定を試す

> **狙い：** デフォルトで強力な機能があっても、**自分のユースケースに合うか** を判断して設定するのが実務。

### チャレンジ課題（挑戦）

7. **Vercel の Edge Functions** に挑戦：`api/hello.js` を作って、Vercel上でサーバーサイドのJavaScriptを動かす：

```javascript
// api/hello.js
export default function handler(request) {
  return new Response('Hello from Edge!', { status: 200 })
}
```

→ `https://your-app.vercel.app/api/hello` でアクセスできる。**静的サイトの枠を超える** 最初の一歩。

8. Vercel の **PR プレビューコメント機能** を調整する：毎PR自動コメント投稿の ON / OFF、ミュート期間などを **自分のチーム想定** で最適な設定を1つ選ぶ
