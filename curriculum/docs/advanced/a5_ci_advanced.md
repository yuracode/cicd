# 発展5｜CI/CD強化（キャッシュ・並列化・Dependabot）

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 |  |
| 前提コマ | Phase 3 修了（コマ18 Secrets管理まで） |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- CIの実行時間を計測し、キャッシュと並列化で短縮できる
- 無駄なCI実行を `concurrency` で自動キャンセルできる
- Dependabotで依存パッケージの更新を自動化し、CIと組み合わせて安全に取り込める

##  導入

### 「動くCI」から「速くて安いCI」へ

Phase 3で作ったCIは正しく動く。だが現場では次の不満が必ず出る。

- **遅い**：pushしてから結果が出るまで数分。待ち時間×人数×回数は大きなコスト
- **無駄が多い**：同じPRに3回連続pushしたら、古い2回分の実行は結果を見る前にゴミになる
- **依存が古びる**：`package.json` の依存は放っておくと脆弱性の温床になる

今日はこの3つを潰す。**CIは「作って終わり」ではなく「運用して磨く」もの**、というのが本コマの主題。

### まず現状を計測する

改善の第一歩は計測。GitHubリポジトリの **Actions → 対象ワークフロー** を開き、直近数回の実行時間をメモしておく。特に `npm ci` のステップに何秒かかっているかを見る。

> **推測するな、計測せよ**：性能改善の鉄則。「速くなった気がする」ではなく、before/afterの数字で語れるようにする。

##  本題

### 1. npmキャッシュで依存インストールを高速化

CIのマシンは毎回まっさら（コマ13）なので、`npm ci` が毎回全ダウンロードしている。`setup-node` の1行でキャッシュが効く。

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm   # ← この1行を追加
```

> **何がキャッシュされるのか**：`node_modules` そのものではなく、npmの **ダウンロードキャッシュ**（`~/.npm`）。`package-lock.json` の内容をキーにして保存され、lockファイルが変わらない限り再利用される。だから「lockと違う古いパッケージが混入する」事故は起きない。

pushして、`npm ci` のステップ時間をbeforeと比較する。依存が多いほど効果が大きい。

### 2. concurrency：無駄な実行を自動キャンセル

同じPRに続けてpushしたとき、古い実行を自動で止める設定。ワークフローの先頭（`on:` の下あたり）に追加する。

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

- **`group`**：「ワークフロー名 × ブランチ」単位でグループ化
- **`cancel-in-progress: true`**：同じグループの実行が始まったら、走行中の古い方をキャンセル

タイプミス修正のpushを3連発したとき、1・2回目のCIが自動キャンセルされるのを確認してみる。**無料枠の実行時間（プライベートリポジトリでは月2,000分）を守る** 実用的な設定でもある。

### 3. timeout-minutes：固まったジョブを打ち切る

依存サーバの不調などでジョブが無限に待ち続けると、実行時間を延々と浪費する。ジョブには必ず上限を切る習慣をつける。

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10   # ← 通常5分で終わるジョブなら2倍を目安に
```

### 4. ジョブの並列化を見直す

コマ15〜16で lint と test を作った。もし1つのジョブに直列で入れているなら、ジョブを分けると **同時に走る**。

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run test -- --run
```

> **トレードオフに注意**：ジョブを分けると `npm ci` が2回走る（キャッシュがあるので高速だが、ゼロではない）。「全体の待ち時間は短くなるが、合計の実行分数は増える」。**待ち時間を取るか、実行分数（コスト）を取るか** は現場でも定番の議論。理由を説明できるならどちらでもよい。

### 5. Dependabot：依存更新の自動PR

リポジトリに `.github/dependabot.yml` を作る。

```yaml
# .github/dependabot.yml
version: 2
updates:
  # npm パッケージの更新チェック
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5

  # GitHub Actions（uses: しているアクション）の更新チェック
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

これだけで、毎週GitHubが依存の新バージョンを調べ、**更新PRを自動で作ってくれる**。

> **DependabotとCIの相乗効果**：Dependabotが作るのは「ただのPR」。つまり **Phase 3で作ったCI（lint・test）が自動で走る**。CIが緑なら「この更新を取り込んでもアプリは壊れない」とほぼ判断できる。テストの充実度が、そのまま「更新を安心して取り込める度」になる——Phase 2で書いたテストがここで効いてくる。

最初のPRが来たら、CIが緑なことを確認して自分でマージしてみる。

### 6. READMEにステータスバッジを付ける

CIの状態をREADMEの先頭で見せる。バッジのMarkdownは Actions → 対象ワークフロー → 右上「…」→ **Create status badge** からコピーできる。形式は次の通り。

```markdown
![CI](https://github.com/ユーザー名/リポジトリ名/actions/workflows/ci.yml/badge.svg)
```

「このリポジトリはCIが整備されていて、いま緑です」という **他人への信頼情報**。OSSのREADMEにバッジが並んでいる理由がこれ。

##  まとめ

### 今日できるようになったこと

- `cache: npm` と並列ジョブでCIの待ち時間を計測・短縮できる
- `concurrency` と `timeout-minutes` で実行時間の浪費を防げる
- Dependabot + CI で「依存更新が来る→自動テスト→安心してマージ」の循環を作れる

### よくある詰まりポイント

- **キャッシュが効かない**：`package-lock.json` がコミットされていないとキーが作れない。lockファイルは必ずコミットする（コマ1以来の約束）
- **Dependabotのメジャー更新PRでCIが赤**：それは **Dependabotが正しく仕事をした** 状態。壊れる更新を本番前に検出できた、ということ。PRの変更履歴（リリースノート）を読んで対応を判断する

### 次の一歩

発展4（Playwright）を導入済みなら、E2Eワークフローにもキャッシュとconcurrencyとtimeoutを適用してみる。個人制作リポジトリに今日の設定一式＋バッジを入れると、発表時の説得力が上がる。

##  課題

### 基礎課題（必須）

1. `cache: npm`・`concurrency`・`timeout-minutes` の3点をCIに追加するPRを作り、`npm ci` のbefore/afterの秒数をPR本文に書いてマージする
2. `dependabot.yml` を追加し、最初に来た更新PRをCI緑を確認してマージする（来るまで数日かかる場合は、届いたら対応でよい）

### 応用課題（推奨）

3. READMEにCIバッジを追加する。ついでにデプロイ用ワークフローがあればそのバッジも並べる
4. わざと `package-lock.json` を変更する更新（何かのパッケージを1つ更新）を行い、キャッシュキーが変わって再ダウンロードが走ること、その次の実行では再びキャッシュが効くことをログで確認する

### チャレンジ課題（挑戦）

5. **paths-ignore** を調べ、「READMEだけの変更ではテストCIを走らせない」設定を追加する。ドキュメント修正のたびにCIが回る無駄を止める
6. リポジトリの **Insights → Dependency graph → Dependabot** と **Security → Dependabot alerts** を見て、脆弱性アラートの仕組みを調べる。「依存の脆弱性が見つかったら何が起きて、自分は何をすべきか」を3行でまとめる
