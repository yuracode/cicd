# 技術研究カリキュラム（Next.js → テスト → CI/CD → デプロイ）

このリポジトリは、**1コマ90分×全30コマの授業教材** を、1コマ1ファイルのMarkdownで管理したものです。

Next.js（App Router）で React を **初歩の一歩から学び直し**、作ったアプリを

- テストで守り
- GitHub Actions で自動チェックし
- Vercel / GitHub Pages へ自動で公開し
- 最後に自分のアプリとして発表する

ところまでを、一気通貫で体験します。

---

## この教材の狙い

「ローカルで動いた」で終わらず、

- 実装
- テスト
- 自動チェック（CI）
- 自動デプロイ（CD）
- 説明・発表

までを **自分の手で通せる状態** になることを目標にしています。

---

## 各コマの進め方

どのコマも同じ構成です。

| 見出し | 内容 |
|--------|------|
| 目標 | そのコマで「できるようになること」 |
| 導入 | 前回のふりかえりと、今日のテーマ |
| 本題 | 先生と一緒に手を動かす部分。コマンドとコードはそのまま打てる |
| 演習 | 授業内で各自が解く問題。「基本 → 応用 → 早く終わった人向け」の順。解答例は折りたたみの中 |
| まとめ | 要点・よくある詰まりポイント・次回予告 |
| 課題 | 授業外の宿題（基礎・応用・チャレンジ） |

**演習の「基本」までは全員クリア** を目指してください。各ファイルは単体で読めるように書いてあるので、休んだ回もそのファイルだけで追いつけます。

---

## 全体の流れ（30コマ）

### Phase 1（コマ1〜7）Next.js で React 基礎

- `create-next-app` で環境を作り、`npm run dev` で動かす
- JSX・コンポーネント・props・state・イベント、`'use client'` の意味
- リストと条件付き表示、TODO アプリの実装、localStorage への保存、ページ分け
- GitHub・ブランチ・PR の基本

### Phase 2（コマ8〜13）テスト

- Jest（`next/jest`）の導入と、純粋関数の単体テスト
- React Testing Library で表示と操作をテストする
- モック（`next/navigation`、`fetch`、確認ダイアログ）と非同期のテスト
- カバレッジと、async な Server Component のテストの考え方

### Phase 3（コマ14〜19）GitHub Actions

- ワークフローと YAML の基本
- lint・test・build を自動で実行する CI
- ルールセット（ブランチ保護）、環境変数と Secrets（`NEXT_PUBLIC_` の注意点）

### Phase 4（コマ20〜25）CI/CD とデプロイ

- 静的ホスティングとサーバのあるホスティングの比較
- Vercel へのデプロイ（プレビュー URL・ロールバック）
- GitHub Pages へのデプロイ（静的書き出し・`basePath`・Actions）
- CI が通ったものだけを公開するパイプラインの完成
- トラブルシューティング演習、チーム開発シミュレーション

### Phase 5（コマ26〜30）個人制作・発表

- 企画・設計と、公開までの土台づくり
- 実装、テストと CI/CD の仕上げ
- 発表準備と最終発表

### 発展編（a1〜a6・任意）

本編の先にある実務寄りのテーマです。各ファイル冒頭の「前提コマ」を満たしていれば、興味のあるものから取り組めます。

- TypeScript 化：`todo-app` を JS から TS へ段階的に移行する（a1）
- Tailwind CSS v4 で見た目を整える（a2）
- MSW で API のモックを本格化する（Jest と開発中のブラウザの両方）（a3）
- Playwright で E2E テストを書き、CI/CD に組み込む（a4）
- CI/CD の強化：ビルドキャッシュ・Composite Action・Dependabot（a5）
- MSW 総合演習：PokeAPI を偽装してポケモン図鑑アプリを作る（a6）

---

## 学習としての接続イメージ

1. UI を作れるようになる（Phase 1）
2. 壊れていないことをコードで証明できる（Phase 2）
3. その証明を自動実行できる（Phase 3）
4. 自動で公開までつなげる（Phase 4）
5. 自分の成果として説明できる（Phase 5）

---

## ディレクトリ構成

```text
curriculum/
  docs/
    phase1/    # 01〜07
    phase2/    # 08〜13
    phase3/    # 14〜19
    phase4/    # 20〜25
    phase5/    # 26〜30
    advanced/  # a1〜a6（発展編・任意）
implements/
  msw-pokedex/  # 発展6の参考実装（Next.js + Jest + MSW）
```

---

## 想定する学習者と環境

- React / Next.js：少し触ったことがある、または初めて（Phase 1 で最初から学び直す）
- JavaScript：基本の文法は既習（必要な文法は使う場面でおさらいする）
- GitHub Actions：初めて
- 環境：Windows + WSL2 Ubuntu、Node.js 24（nvm）、VS Code
- 使う技術：Next.js 16（App Router）/ React 19 / Jest + React Testing Library / ESLint + Prettier / GitHub Actions / Vercel / GitHub Pages

プロジェクトは WSL2 の中（`~/workspace/`）に作り、`npm run dev` で起動して Windows 側のブラウザで http://localhost:3000 を開きます。

---

## まとめ

この教材は「Next.js で画面を作るだけの教材」ではなく、
**「作る・守る・自動化する・届ける・説明する」** を30コマで身につける教材です。

最終的に到達するのは、

- 動くものを作れる
- 品質をテストで守れる
- CI/CD で運用できる
- 成果を他者に説明できる

という、実務に接続しやすい開発力です。
