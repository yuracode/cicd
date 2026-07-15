# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## リポジトリの概要

専門学校ICT学科の授業「技術研究」で使う学習教材リポジトリ。React → テスト → GitHub Actions → CI/CD → デプロイ を全30コマで学ぶカリキュラムを、**1コマ1ファイルのMarkdown**（計30ファイル）として管理している。ソースコードやビルド・テストの仕組みは存在せず、成果物はMarkdownのみ。

- `curriculum/docs/phase1/`〜`phase5/`：各フェーズ6コマ、ファイル名は `NN_topic.md`（NNは全体の通し番号。例：phase2は `07_` から始まる）
- `claude.md`（小文字）：カリキュラム生成時に使った元の仕様書。カリキュラム全体構成表と対象学習者の前提が載っている
- `README.md`：学習者向けの全体案内

**注意**：`claude.md` の生成ルールは一部古い。時間配分（90分・導入15分など）と絵文字付き見出し（🎯 📋 等）はその後の改訂で削除された。仕様が食い違う場合は既存の教材ファイルの形式に合わせること。

## 教材ファイルの形式

全30ファイルが同じ構成を持つ。編集・追加時はこれを崩さない。

```markdown
# コマN｜タイトル

| 項目 | 内容 |
|------|------|
| フェーズ | Phase X |
| 所要時間 |  |            ← 空欄のまま（時間配分は廃止済み）
| 前提コマ | コマN-1 のタイトル |
| 次コマ | コマN+1 のタイトル |

##  目標        ← 絵文字なし・## の後にスペース2つ（既存ファイルの実態に合わせる）
##  導入
##  本題
##  まとめ
##  課題
```

- 目標：学習者が「できるようになること」を箇条書き2〜3点
- 本題：そのまま打てるコマンドをステップ形式で。「なぜそうするか」の理由を必ず添える
- まとめ：要点整理＋よくある詰まりポイント1〜2点＋次コマ予告
- 各ファイルは**単体で読めるように**書く（前のコマを開かなくても手順が完結する）

## 内容の規約

- **文体**：専門学校1〜2年生向け。丁寧すぎず砕けすぎない。専門用語は初出時に一言説明を添える
- **コードブロック言語**：シェルは `bash`、Reactは `jsx`、GitHub Actionsは `yaml`
- **`npm run dev` は必ず `npm run dev -- --host` と書く**（学習者はWSL2上で実行し、Windows側ブラウザからアクセスするため）
- 学習者の環境は Windows + WSL2 Ubuntu、Node.js 24（nvm）、Vite + React 19 前提
- 教える技術スタック：React 19 / Vitest / React Testing Library / ESLint + Prettier / GitHub Actions / GitHub Pages + Vercel

## 確認コマンド

```bash
# 30ファイル揃っているか
find curriculum/docs -name "*.md" | wc -l
```
