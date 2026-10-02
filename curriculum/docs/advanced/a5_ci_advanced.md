# 発展5｜CI/CD強化（キャッシュ・共通化・Dependabot）

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 | 90分 |
| 前提コマ | Phase 4 のコマ23 CI/CDパイプラインの完成まで |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- CI の実行時間を測り、ビルドのキャッシュで短くできる
- ジョブごとにくり返している手順を **Composite Action** にまとめ、`timeout-minutes` で固まったジョブを打ち切れる
- Dependabot で依存パッケージの更新 PR を自動で作らせ、CI と組み合わせて安全に取り込める

##  導入

### 「動く CI」から「速くて、手入れしやすい CI」へ

コマ23で作った CI/CD は正しく動く。だが、使い続けると次のような不満が出てくる。

- **遅い**：push してから結果が出るまで数分かかる。待ち時間 × 人数 × 回数は大きなコスト
- **同じことを何度も書いている**：`checkout` → `setup-node` → `npm ci` が、どのジョブにも並んでいる。Node.js のバージョンを上げるときに、全部直す必要がある
- **依存パッケージが古くなる**：`package.json` のパッケージは、放っておくと古くなり、セキュリティの穴が見つかることもある

**CI は作って終わりではなく、使いながら手入れしていくもの**。今日はこの3つに取り組む。

### まず測る

改善の第一歩は **測ること**。「速くなった気がする」ではなく、変更の前と後を数字で比べる。

```powershell
cd ~/workspace/todo-app
gh run list --workflow=ci.yml --limit 5
gh run view <実行のID>
```

`gh run view` で、ジョブごとの時間が表示される。Actions の画面でジョブを開くと、ステップごとの時間も見られる。**`npm ci` と `Build` のステップに何秒かかっているか** をメモしておく。

##  本題

### 1. ブランチを切る

```powershell
git switch main
git pull
git switch -c ci/improve
```

### 2. くり返しを Composite Action にまとめる

今の `ci.yml` では、どのジョブもこの3ステップで始まっている。

```yaml
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
```

「Node.js を用意して `npm ci` する」部分を、**自分専用のアクション** にまとめる。

```powershell
mkdir -Force .github/actions/setup
```

```yaml
# .github/actions/setup/action.yml
name: Node.js と依存パッケージの準備
description: Node.js 24 を用意し、npm ci で依存パッケージを入れる
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v7
      with:
        node-version: 24
        cache: npm
    - name: 依存パッケージをインストール
      run: npm ci
      shell: bash
```

| 部分 | 意味 |
|------|------|
| `using: composite` | 複数のステップをまとめた **Composite Action** であることを示す |
| `shell: bash` | Composite Action の中の `run` には、どのシェルで実行するかを必ず書く |

`ci.yml` の各ジョブを、次のように書き換える。

```yaml
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup
```

`uses: ./.github/actions/setup` は「このリポジトリの中の、このフォルダのアクションを使う」という意味。**`actions/checkout` だけは先に書く** 必要がある（コードを取ってくるまで、`.github/actions/setup` もランナーの中にないため）。

これで、Node.js のバージョンを上げるときは `action.yml` の1か所を直すだけで済む。

### 3. 固まったジョブを打ち切る

何かの不調でジョブが止まらなくなると、最大で6時間動き続けて実行時間を無駄にする。**ジョブにはいつも上限を付ける**。

```yaml
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 10
```

目安は **ふだんかかる時間の2〜3倍**。E2E（発展4）のような時間のかかるジョブは長めにする。

### 4. Next.js のビルドをキャッシュする

Next.js は、ビルドの途中の結果を `.next/cache` に保存し、次のビルドで使い回す。手元で試してみる。

```powershell
Remove-Item -Recurse -Force .next
Measure-Command { npm run build }     # 1回目（TotalSeconds を見る）
Measure-Command { npm run build }     # 2回目（.next/cache が残っている）
```

```text
real    0m5.291s   ← 1回目
real    0m2.600s   ← 2回目
```

（時間は PC によって違う）

ところが CI のランナーは **毎回まっさら** なので、`.next/cache` はいつも空。`actions/cache` でランナーの外に保存しておき、次の実行で戻す。

```yaml
# .github/workflows/ci.yml（build ジョブ。npm run build の前に追加）
      - name: Next.js のビルドキャッシュ
        uses: actions/cache@v6
        with:
          path: .next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-${{ hashFiles('app/**', 'components/**', 'lib/**') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-
```

| 部分 | 意味 |
|------|------|
| `path` | 保存・復元するフォルダ |
| `key` | キャッシュの名前。**中身が変わったら名前も変わる** ように、ファイルのハッシュ（`hashFiles`）を入れる |
| `restore-keys` | `key` と完全に一致するキャッシュがないとき、**先頭が一致する一番新しいキャッシュ** を使う。コードを少し変えただけなら、前回のキャッシュを使って速くなる |

> **`hashFiles` とは**：ファイルの中身から計算した「指紋」のような文字列。中身が1文字でも変わると、まったく違う値になる。`package-lock.json` が変わる（パッケージを更新する）と、キャッシュを作り直す。
>
> `setup-node` の `cache: npm` は **ダウンロードしたパッケージ**（`~/.npm`）のキャッシュ、今回のものは **Next.js のビルド結果** のキャッシュ。役割が違うので両方使う。

`pages-build` ジョブにも同じステップを入れると、Pages 向けのビルドも速くなる（ただしキャッシュの `key` は `nextjs-pages-...` のように別の名前にする。Pages 向けは設定が違うため）。

### 5. push して効果を測る

```powershell
npx --yes js-yaml .github/workflows/ci.yml > $null; if ($LASTEXITCODE -eq 0) { "YAML OK" }
git add .
git commit -m "ci: Composite Actionで共通化し、Next.jsのビルドキャッシュとtimeoutを追加"
git push -u origin ci/improve
gh pr create --fill
gh pr checks --watch
```

1回目の実行ではキャッシュがないので、「Next.js のビルドキャッシュ」のステップに `Cache not found` と出る。何か小さな変更（コメントを1行足すなど）をもう一度 push すると、2回目は `Cache restored` と出て、Build のステップが短くなる。

**変更前と後の時間を PR の本文に書いてから** マージする。

### 6. Dependabot：依存パッケージの更新を自動化する

`.github/dependabot.yml` を作る。

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: '09:00'
      timezone: Asia/Tokyo
    open-pull-requests-limit: 5
    groups:
      testing:
        patterns:
          - 'jest*'
          - '@testing-library/*'
      nextjs:
        patterns:
          - 'next'
          - 'eslint-config-next'
          - 'react'
          - 'react-dom'

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: '09:00'
      timezone: Asia/Tokyo
```

| 部分 | 意味 |
|------|------|
| `package-ecosystem: npm` | `package.json` のパッケージの更新を調べる |
| `package-ecosystem: github-actions` | ワークフローで使っている `actions/checkout@v7` などの更新を調べる |
| `schedule` | 毎週月曜の朝9時（日本時間）に調べる |
| `open-pull-requests-limit` | 同時に開く PR の上限 |
| `groups` | 関係の深いパッケージを **1つの PR にまとめる**。`next` と `eslint-config-next` はバージョンをそろえる必要があるので、一緒に更新させる |

```powershell
git switch main
git pull
git switch -c chore/dependabot
git add .github/dependabot.yml
git commit -m "chore: Dependabotを設定"
git push -u origin chore/dependabot
gh pr create --fill
```

マージすると、GitHub がパッケージの新しいバージョンを調べ、**更新の PR を自動で作る** ようになる（最初の PR が来るまで少し時間がかかることがある）。

```powershell
gh pr list --author "app/dependabot"
```

### 7. Dependabot の PR をどう扱うか

Dependabot が作るのは **ふつうの PR**。つまり、**これまで作ってきた CI（lint・test・build・E2E）がそのまま動く**。

| CI の結果 | 判断 |
|----------|------|
| 全部緑 | 「この更新を取り込んでもアプリは壊れない」と、ほぼ判断できる。プレビュー URL も軽く確かめてマージする |
| 赤 | **Dependabot が仕事をした** 状態。壊れる更新を、本番に出る前に見つけられた。PR の中のリリースノート（変更点）を読み、コードを直すか、今は見送るか決める |

> **テストがあるほど、更新を安心して取り込める**。Phase 2 で書いたテストは、ここでも効いてくる。逆に、テストが少ないプロジェクトでは、Dependabot の PR を怖くてマージできなくなる。

バージョンの番号の読み方（**セマンティックバージョニング**）も押さえておく。

| 例 | 変わった場所 | 意味 |
|----|------------|------|
| 16.3.6 → 16.3.7 | パッチ | バグの修正。基本的に安全 |
| 16.3.6 → 16.4.0 | マイナー | 機能の追加。基本的に今のコードは動く |
| 16.3.6 → 17.0.0 | メジャー | **互換性のない変更がある**。リリースノートと移行ガイドを必ず読む |

##  演習

### 演習1（基本）：前と後の時間を比べる

本題5の PR で、変更の前（`main` の最近の実行）と後（PR の2回目の実行）について、次の時間を表にまとめて PR の本文に書く。

- 全体の時間
- `build` ジョブの時間
- `build` ジョブの中の「Build」ステップの時間

**確認方法**：表の数字から、キャッシュの効果があったか（なかったか）を1行で説明できればOK。

> 小さなアプリでは、キャッシュの効果が数秒しかないこともある。**効果が小さいなら、設定を増やさない** という判断も正しい。測ってから決める。

### 演習2（基本）：Composite Action を E2E ジョブにも使う

発展4の `e2e` ジョブがあれば、そこも Composite Action を使う形に書き換える。なければ、`pages-build` ジョブで使っていることを確かめる。

**確認方法**：`ci.yml` の中に `node-version: 24` が **1か所も出てこない**（`action.yml` にだけある）状態になればOK。

```powershell
Select-String -Pattern "node-version" -Path .github/workflows/ci.yml, .github/actions/setup/action.yml
```

### 演習3（応用）：Dependabot の PR を1つマージする

Dependabot から来た PR を1つ選び、次の手順で扱う。

1. PR の本文の **Release notes** や **Changelog** を読み、何が変わったかを1〜2行でまとめてコメントに書く
2. CI の結果を確かめる
3. プレビュー URL でアプリが動くことを確かめる
4. 問題がなければマージする。CI が赤ければ、原因を調べてコメントに書く

**確認方法**：PR に、変更内容のまとめと判断の理由がコメントで残っていればOK。

> PR がまだ来ていない場合は、`npm outdated` で古いパッケージを探し、手で `npm install パッケージ名@latest` して同じ手順で PR を作ってもよい。

### 演習4（早く終わった人向け）：脆弱性の情報を確かめる

```powershell
npm audit
```

を実行し、見つかった脆弱性（セキュリティの穴）があれば、その深刻度（`low`・`moderate`・`high`・`critical`）と、どのパッケージを通して入っているかを読む。

リポジトリの **Security** タブ → **Dependabot alerts** も開き、GitHub が見つけた脆弱性の一覧を確かめる（Settings → **Advanced Security** で Dependabot alerts が有効になっているか確認する）。

**確認方法**：「脆弱性が見つかったら、何が起き、自分は何をすればよいか」を3行でまとめられればOK。

##  まとめ

### 今日できるようになったこと

- CI の時間を測り、`.next/cache` のキャッシュで Build を短くできるようになった
- くり返しの手順を Composite Action にまとめ、`timeout-minutes` で上限を決められるようになった
- Dependabot で更新の PR を自動で作らせ、CI とセマンティックバージョニングで判断して取り込めるようになった

### よくある詰まりポイント

- **`Can't find 'action.yml'`**：`uses: ./.github/actions/setup` の前に `actions/checkout` があるか確認する
- **Composite Action で `shell` がないというエラー**：`run` を使うステップには `shell: bash` を書く
- **キャッシュがいつも `Cache not found`**：`key` にいつも変わる値（日時など）が入っていないか、`restore-keys` を書いたかを確認する
- **Dependabot の PR で `next` と `eslint-config-next` のバージョンがずれて CI が落ちる**：`groups` で一緒に更新させる

### 次の一歩

発展4の E2E と今日の設定を組み合わせると、Playwright のブラウザのダウンロードもキャッシュしたくなる。`actions/cache` で `~/.cache/ms-playwright` を保存する方法を調べてみよう。個人制作のリポジトリにも今日の設定をまとめて入れておくと、発表のときに「CI の手入れもしている」と言える。

##  課題

### 基礎課題（必須）

1. 本題のCI の改善（Composite Action・timeout・ビルドキャッシュ）と Dependabot の設定をマージする
2. 演習1の表を完成させる

### 応用課題（推奨）

3. 演習3を行い、Dependabot の PR を1つ以上マージする
4. `pages-build` ジョブにも、別の `key` でビルドキャッシュを入れる

### チャレンジ課題（挑戦）

5. **Reusable Workflow**（`on: workflow_call`）を調べ、「lint と test をするワークフロー」を別ファイルにして `ci.yml` から呼び出す。Composite Action（ステップのまとまり）との違いを説明する
6. アクションのバージョンを `@v7` ではなく **コミットの SHA**（`actions/checkout@<40文字の英数字>`）で固定する方法と、その理由（コマ14の課題6）を調べる。Dependabot が SHA で固定したアクションも更新してくれるかを確かめる
