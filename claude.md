# 技術研究カリキュラム 生成プロジェクト

## 目的

専門学校ICT学科「技術研究」授業（全30コマ）のコマ別詳細授業計画を
**1コマ1ファイル・計30ファイル** のMarkdownとして生成する。

テーマ：**React → テスト → GitHub Actions → CI/CD → デプロイ**

---

## ディレクトリ構成

```
docs/
  phase1/
    01_orientation.md
    02_react_basics.md
    03_component_design.md
    04_todo_app_1.md
    05_todo_app_2.md
    06_github_branch.md
  phase2/
    07_test_intro.md
    08_vitest_basics.md
    09_rtl_render.md
    10_rtl_interaction.md
    11_mock_async.md
    12_coverage.md
  phase3/
    13_actions_overview.md
    14_first_workflow.md
    15_ci_lint.md
    16_ci_test.md
    17_branch_protection.md
    18_secrets.md
  phase4/
    19_deploy_target.md
    20_ghpages_deploy.md
    21_vercel_deploy.md
    22_pipeline_complete.md
    23_debug_practice.md
    24_team_simulation.md
  phase5/
    25_project_plan.md
    26_project_impl.md
    27_project_test.md
    28_project_cicd.md
    29_presentation_prep.md
    30_final_presentation.md
```

---

## 対象学生の前提知識

- React：**ほぼ初めて**（コンポーネントの概念は薄く知っている程度）
- GitHub Actions：**完全初めて**（GitとGitHubの基本操作はできる）
- JavaScript / Node.js：授業で一通り学習済み
- OS環境：Windows（WSL2 / Ubuntu）

---

## 各ファイルの生成ルール

### ファイル先頭に必ずメタ情報を入れる

```markdown
# コマN｜タイトル

| 項目 | 内容 |
|------|------|
| フェーズ | Phase X |
| 所要時間 | 90分 |
| 前提コマ | コマN-1 のタイトル |
| 次コマ | コマN+1 のタイトル |
```

### 必須セクション構成

```markdown
## 🎯 目標
このコマで学生が「できるようになること」を箇条書きで2〜3点

## 📋 導入（15分）
- 前コマの振り返りまたは本題への導入
- デモや問いかけで興味を引く工夫を入れる

## 🛠 本題（65分）
- 具体的な操作手順をステップ形式で記述
- コードブロックには言語を明記（```bash ```jsx ```yaml など）
- コマンドは学生がそのまま打てる形にする
- 「なぜそうするか」の理由を必ず添える

## ✅ まとめ（15分）
- 本コマの要点整理
- よくある詰まりポイントを1〜2点記載
- 次コマの予告

## 📝 課題
次コマまでに取り組む内容
```

### コードブロックのルール

- シェルコマンドは `bash`
- Reactコンポーネントは `jsx`
- GitHub Actions YAMLは `yaml`
- コードは最小限・そのまま動くものにする

### 文体のルール

- 専門学校1〜2年生向け
- 丁寧すぎず、砕けすぎない
- 専門用語は初出時に一言説明を添える

---

## カリキュラム全体構成

### Phase 1｜React基盤づくり（コマ1〜6）

| コマ | ファイル名 | タイトル |
|-----|-----------|---------|
| 1 | 01_orientation.md | オリエンテーション・環境構築 |
| 2 | 02_react_basics.md | コンポーネント・props・state基礎 |
| 3 | 03_component_design.md | コンポーネント設計 |
| 4 | 04_todo_app_1.md | TODOアプリ実装①（追加・表示・削除） |
| 5 | 05_todo_app_2.md | TODOアプリ実装②（useEffect・API連携） |
| 6 | 06_github_branch.md | GitHub連携・ブランチ戦略・PR体験 |

### Phase 2｜テストの書き方（コマ7〜12）

| コマ | ファイル名 | タイトル |
|-----|-----------|---------|
| 7 | 07_test_intro.md | テスト入門（なぜテストを書くか） |
| 8 | 08_vitest_basics.md | Vitest基礎（describe/it/expect） |
| 9 | 09_rtl_render.md | React Testing Library①（レンダリングテスト） |
| 10 | 10_rtl_interaction.md | React Testing Library②（ユーザー操作テスト） |
| 11 | 11_mock_async.md | モック・非同期テスト |
| 12 | 12_coverage.md | カバレッジ計測 |

### Phase 3｜GitHub Actions入門（コマ13〜18）

| コマ | ファイル名 | タイトル |
|-----|-----------|---------|
| 13 | 13_actions_overview.md | GitHub Actions概要・YAML構文 |
| 14 | 14_first_workflow.md | 初めてのワークフロー |
| 15 | 15_ci_lint.md | CI：Lintの自動化 |
| 16 | 16_ci_test.md | CI：テストの自動化 |
| 17 | 17_branch_protection.md | ブランチ保護ルール |
| 18 | 18_secrets.md | Secrets管理 |

### Phase 4｜CI/CDパイプライン構築（コマ19〜24）

| コマ | ファイル名 | タイトル |
|-----|-----------|---------|
| 19 | 19_deploy_target.md | デプロイ先選定 |
| 20 | 20_ghpages_deploy.md | GitHub Pagesへの自動デプロイ |
| 21 | 21_vercel_deploy.md | Vercel連携・プレビューデプロイ |
| 22 | 22_pipeline_complete.md | パイプライン完成（一気通貫） |
| 23 | 23_debug_practice.md | デバッグ演習 |
| 24 | 24_team_simulation.md | チーム開発シミュレーション |

### Phase 5｜仕上げ・発表（コマ25〜30）

| コマ | ファイル名 | タイトル |
|-----|-----------|---------|
| 25 | 25_project_plan.md | 個人制作①：企画・設計 |
| 26 | 26_project_impl.md | 個人制作②：実装 |
| 27 | 27_project_test.md | 個人制作③：テスト追加 |
| 28 | 28_project_cicd.md | 個人制作④：CI/CD適用 |
| 29 | 29_presentation_prep.md | 発表準備（README・スライド） |
| 30 | 30_final_presentation.md | 最終発表・振り返り |

---

## 生成手順（WSL2 Ubuntu）

### 事前準備

```bash
# プロジェクトフォルダ作成
mkdir -p curriculum/docs/{phase1,phase2,phase3,phase4,phase5}
cd curriculum
# このCLAUDE.mdをここに配置

# Claude Codeを起動
claude
```

### フェーズごとに生成（推奨）

```
# Phase 1
docs/phase1/ 以下に Phase1の6ファイルを生成してください。
ファイル名と内容は @CLAUDE.md のカリキュラム構成表に従うこと。
1ファイルずつ順番に作成してください。

# Phase 2
docs/phase2/ 以下に Phase2の6ファイルを生成してください。
@CLAUDE.md の指示に従うこと。

# Phase 3〜5も同様
```

### 1ファイルだけ生成・修正する場合

```
docs/phase1/01_orientation.md を生成してください。@CLAUDE.md の指示に従うこと。
```

```
docs/phase1/02_react_basics.md の本題セクションをもっと詳しくしてください。
```

### 生成後の確認

```bash
# 30ファイルあるか確認
find docs/ -name "*.md" | wc -l

# 一覧表示
find docs/ -name "*.md" | sort
```

---

## 注意事項

- 各ファイルは**単体で読めるように**書く
- コマ番号は**通し番号**（Phase2は「コマ7」から）
- 内容が薄い場合は該当ファイルを指定して追記指示する
