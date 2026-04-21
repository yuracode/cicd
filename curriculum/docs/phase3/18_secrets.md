# コマ18｜Secrets管理

| 項目 | 内容 |
|------|------|
| フェーズ | Phase 3 |
| 所要時間 | 90分 |
| 前提コマ | コマ17 ブランチ保護ルール |
| 次コマ | コマ19 デプロイ先選定 |

##  目標

- ソースコードに秘密情報を直接書いてはいけない理由を説明できる
- GitHub Secrets に値を登録し、ワークフローから安全に参照できる
- 本番／開発環境を Environments で分けて管理できる

##  導入（15分）

### よくある事故

> 「APIキーを `App.jsx` に書いて、うっかりpublicリポジトリにpush」

これは **毎年どこかの会社で起こっている実被害**。

- GitHubには自動スキャンBOTがいて、秘密情報を数分で検知して悪用する事例がある
- 悪用されるとクラウド費用が数十万円分発生するケースも

### そもそも「秘密情報」とは

- APIキー（Vercel, AWS, Firebase …）
- データベースのパスワード
- OAuthクライアントシークレット
- デプロイ用アクセストークン

**共通点：** 漏れたら不正利用される／再発行が面倒／ソースコードと一緒に管理したくない。

### 今日のゴール

1. ローカルは `.env` ファイル
2. GitHub Actions は **Secrets** で渡す
3. 本番と開発で **Environments** を分ける

##  本題（65分）

### 1. ローカル：.env と .gitignore（10分）

Viteは `.env` ファイルを自動で読んでくれる。

```bash
cd ~/workspace/todo-app
git switch main
git pull origin main
git switch -c feature/secrets
```

プロジェクト直下に `.env`：

```
VITE_API_URL=https://jsonplaceholder.typicode.com
VITE_API_KEY=dummy-key-12345
```

> **Vite のルール：** 環境変数名は **`VITE_` で始める** こと。それ以外はブラウザに漏れないように遮断される。

`.gitignore` に `.env` を追加（Viteの初期状態ですでに入っていることが多いが確認）：

```
# .gitignore
node_modules
dist
coverage
.env
.env.local
```

**`.env.example` を作ってリポジトリに入れる：**

```
# .env.example（値は書かない。変数名と形式だけ）
VITE_API_URL=
VITE_API_KEY=
```

> **この運用が定番：** 実値は `.env`（ignore）、サンプルは `.env.example`（commit）。チームで「何を設定すればいいか」を共有できる。

Reactコード内での使い方：

```jsx
// src/ApiSample.jsx の fetch URL を環境変数から
const API_URL = import.meta.env.VITE_API_URL
fetch(`${API_URL}/todos?_limit=5`)
```

```bash
git add .env.example src/ApiSample.jsx
git commit -m "feat: 環境変数 VITE_API_URL でAPI基盤を切り替え可能に"
```

### 2. GitHub Secrets に登録（15分）

GitHubリポジトリで：

```bash
gh repo view --web
```

**Settings → Secrets and variables → Actions → New repository secret**

登録：

- Name: `API_KEY`
- Secret: `本番用の秘密文字列`（ダミーで `prod-secret-abcdef` 等でOK）

> **ポイント：**
> - 一度登録すると **値は二度と見られない**（再登録だけ）
> - ログに出力しても `***` にマスクされる

CLI から登録もできる：

```bash
gh secret set API_KEY
# プロンプトで値を入力
```

### 3. ワークフローで Secrets を使う（15分）

`.github/workflows/ci.yml` を編集（例：テスト実行時に環境変数として渡す）：

```yaml
# 該当jobの steps に追加
      - name: テスト実行（Secrets を使う）
        env:
          VITE_API_KEY: ${{ secrets.API_KEY }}
        run: npm run test -- --run
```

> **`${{ secrets.XXX }}`** は **GitHub Actionsの式構文**。ワークフローYAML特有の書き方。
>
> **`env:`** でステップに環境変数として渡す。

**試しに値を確認する：**

```yaml
      - name: Secrets の存在確認
        env:
          KEY: ${{ secrets.API_KEY }}
        run: |
          echo "長さ: ${#KEY}"
          # echo "$KEY" はマスクされて *** になる
```

> **文字そのものはログに出ない** よう自動でマスキングされる。長さだけ確認するのは安全なデバッグ手段。

### 4. push して動作確認（5分）

```bash
git add .github/workflows/ci.yml
git commit -m "ci: テストに環境変数 VITE_API_KEY を渡す"
git push -u origin feature/secrets
gh pr create --title "Secrets を使ったCI" --body "API_KEY を Secrets 経由で渡す"
```

PR → Checks → テストジョブのログで「長さ: N」が出ればOK。

### 5. Environments で本番・開発を分ける（15分）

プロジェクトが大きくなると「開発用キー」「本番用キー」を分けたくなる。

**Environments** ＝ Secrets にラベルを付けて、ワークフロー側で「この環境のSecretsを使う」と指定できる仕組み。

GitHub画面で：

**Settings → Environments → New environment**

- Name: `staging`
- Environment secrets: `API_KEY = staging-key-xxx`

もう1つ：

- Name: `production`
- Environment secrets: `API_KEY = prod-key-yyy`
- **Protection rules：**
  -  Required reviewers（デプロイ前に人間の承認を要求）
  -  Deployment branches → `main` のみ

ワークフロー側：

```yaml
jobs:
  deploy-staging:
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - run: echo "Using ${{ secrets.API_KEY }}"

  deploy-production:
    environment: production
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - run: echo "Using ${{ secrets.API_KEY }}"
```

> **Environment ごとに同じ名前の `API_KEY`** を登録しておけば、ジョブの `environment:` 指定だけで値が切り替わる。

### 6. よくある秘密情報の分類とおすすめ管理方法（5分）

| 情報の種類 | 管理場所 |
|-----------|---------|
| APIキー・トークン | **Secrets**（Repository or Environment） |
| 公開設定（APIのURL等） | **Variables**（Secretsと同じ画面にVariables） |
| ローカル開発用ダミー値 | `.env`（gitignore） |
| 設定の雛形 | `.env.example`（commit） |

> **Variables と Secrets の違い：** Variablesは **ログに普通に出る**。公開して問題ない値（API URL、環境名等）はこちら。

### 7. 万一 push してしまった時の対応（5分）

**焦らず順番に：**

1. **まずそのキーを無効化／再発行**（元を絶つ）
2. gitの履歴から削除：`git filter-repo` か BFG Repo-Cleaner（講師に要相談）
3. Secretsとして改めて登録
4. 可能ならリポジトリ閲覧制限

> **重要：** git log を cleanしてもGitHubには残っていることがある。**無効化が最優先**。

##  まとめ（10分）

### 今日できるようになったこと

- `.env` と `.env.example` でローカル秘密情報を管理できる
- GitHub Secrets に値を登録し、ワークフローから安全に使える
- Environments で本番／開発の Secrets を分離できる

### Phase 3 の総括

これで **CI（Continuous Integration）** が完成。PR → Lint → Test → レビュー → マージ の全自動チェーンができた。Phase 4 からは **CD（Continuous Delivery / Deployment）** に入る。

### よくある詰まりポイント

- **`.env` をうっかりコミット**：`git rm --cached .env` で外してgitignoreを見直す
- **Secretsがマスクされすぎて原因が分からない**：長さや存在確認のデバッグを挟む
- **`${{ secrets.X }}` を単引用符の中に入れる**：ダブルクォート `"` の中でないと展開されない

### 次コマ予告

Phase 4 スタート。作ったReactアプリを **自動でインターネットに公開** する。GitHub Pages と Vercel、それぞれの違いと向き不向きを知る。

##  課題

### 基礎課題（必須）

1. 自分のリポジトリに `VITE_API_URL` を Secrets に登録し、CIで値の長さが出ることを確認する
2. `.env.example` を必ず作ってコミット済みの状態にする（チーム開発の基本マナー）

### 応用課題（推奨）

3. **Environments 機能** を使って `production` と `development` でSecretsを分離する。ワークフロー側で `environment: production` を指定したジョブと `environment: development` を指定したジョブで、同じ `secrets.VITE_API_URL` が別の値になることを確認

4. **Secret debug用のテクニック** を試す：

```yaml
- name: Secretの長さだけ確認（値は出さない）
  run: echo "Length is ${#MY_SECRET}"
  env:
    MY_SECRET: ${{ secrets.VITE_API_URL }}
```

値そのものは絶対ログに出さず、「入っている／入っていない」「長さが妥当か」だけを確認する習慣を身につける。

> **狙い：** Secretのデバッグで **うっかり値をログ出力** すると事故になる。**出さないでも判定できる技** を持っておく。

### チャレンジ課題（挑戦）

5. **「Secretを誤ってコミットしてしまった」インシデント対応手順** を紙上で再現してみる。以下を順序立てて自分の言葉で書く：
   1. 最優先で何をするか（答え：漏れたキーの **無効化・再発行**）
   2. git履歴からの削除はどう行うか（ツール名まで：`git filter-repo` / BFG）
   3. チームへの周知と再発防止策の決定
   4. 影響範囲調査（そのキーで何にアクセスできたか）

→ 実際に事故ってから考えるのでは遅い。**事前に手順を整理しておく** のが事故対応の鉄則。

6. **OIDC（OpenID Connect）による短期クレデンシャル** の概念を調べる：AWS / GCP にデプロイする際、長期Secretを使わずにその場限りのトークンで認証する方式。GitHub Actions の `permissions: id-token: write` と関係する。1〜2行でまとめる
