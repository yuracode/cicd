# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## リポジトリの概要

専門学校ICT学科の授業「技術研究」で使う学習教材リポジトリ。**Next.js（App Router）で React の初歩から学び直し → テスト → GitHub Actions → CI/CD → デプロイ** を、1コマ90分×本編30コマ＋発展編6コマで学ぶカリキュラムを、**1コマ1ファイルのMarkdown**として管理している。教材本体はMarkdownだが、`implements/` 配下にのみ動くコード（発展6の参考実装）がある。

### 構成（2026-09 に Vite 版から Next.js 版へ作り直し済み）

- Phase 1（01〜07）Next.jsでReact基礎：環境構築 / JSXとprops / stateとイベント・`'use client'` / リストと条件表示 / TODO①フォーム / TODO②保存とルーティング・layout / Git・GitHub・PR
- Phase 2（08〜13）テスト：Jest導入 / 関数の単体テスト / RTL表示 / RTL操作 / モックと非同期（`next/navigation`・fetch）/ カバレッジとServer Componentのテスト方針
- Phase 3（14〜19）GitHub Actions：概要とYAML / 初ワークフロー / lint+build / test / ルールセット / Secretsと環境変数（`NEXT_PUBLIC_`）
- Phase 4（20〜25）CI/CD：デプロイ先比較 / Vercel / GitHub Pages（`output: 'export'`＋`basePath`＋`trailingSlash`）/ パイプライン完成 / トラブルシューティング / チーム開発
- Phase 5（26〜30）個人制作（例：ポモドーロタイマー）：企画・設計と土台 / 実装 / テストとCI/CDの仕上げ / 発表準備 / 最終発表
- 発展編（`advanced/`）：a1 TypeScript化 / a2 Tailwind v4 / a3 MSW（Jest＋ブラウザ）/ a4 Playwright E2E / a5 CI強化（ビルドキャッシュ・Composite Action・Dependabot）/ a6 MSW総合演習（ポケモン図鑑、独立した Next.js プロジェクト）。本編と同じ形式（90分・演習あり）

## ディレクトリ

- `curriculum/docs/phase1/`〜`phase5/`：ファイル名は `NN_topic.md`（NNは全体の通し番号）
- `curriculum/docs/advanced/`：発展編（`aN_topic.md`、任意教材）
- `implements/msw-pokedex/`：発展6（a6）の参考実装（Next.js + Jest + MSW）。**a6のMarkdownに載せたコードと中身を完全に一致させたまま保つこと**（教材側を直したら実装側も直し、`npm ci && npm test && npm run lint && npm run build` が通ることを確認する。一致確認は a6 の ```js/```jsx/```css ブロックとファイル内容の比較で行う）
  - `mocks/handlers.js` を開発用（`browser.js`＝Service Worker、`components/MswProvider.js` が `NEXT_PUBLIC_API_MOCKING=enabled` のときだけ起動）とテスト用（`server.js`＝Node、`jest.setup.js` で起動）が共有する。偽データは `mocks/fixtures/` に分離
  - `npm run dev` がモック有効、`npm run dev:real` が本物の PokeAPI
  - `next dev` が `AGENTS.md`・`CLAUDE.md` を自動生成するが、`.gitignore` で除外している
- `claude.md`（小文字）：カリキュラム生成時に使った元の仕様書。**`.gitignore` 対象のローカル専用ファイル**で、中身は旧Vite版前提（現在の規約はこの CLAUDE.md が正）。存在しない環境もある
- `README.md`：学習者向けの全体案内

## 教材ファイルの形式

```markdown
# コマN｜タイトル

| 項目 | 内容 |
|------|------|
| フェーズ | Phase X |
| 所要時間 | 90分 |            ← 総時間のみ。授業内の時間の割り振り（導入◯分など）は書かない
| 前提コマ | コマN-1 のタイトル |
| 次コマ | コマN+1 のタイトル |

##  目標        ← 絵文字なし・## の後にスペース2つ
##  導入
##  本題        ← 解説＋ハンズオン（先生と一緒に打つ）
##  演習        ← 授業内で各自解く。基本→応用→早く終わった人向け。解答例は <details> に畳む
##  まとめ
##  課題        ← 授業外の宿題（基礎／応用／チャレンジ）
```

- 目標：学習者が「できるようになること」を箇条書き2〜3点
- 本題：そのまま打てるコマンドをステップ形式で。「なぜそうするか」の理由を必ず添える
- 演習：本題で打ったコードを少し変えれば解ける難易度から始める。必ず「確認方法（ブラウザで何が見えればOKか／どのテストが通ればOKか）」を書く
- まとめ：要点整理＋よくある詰まりポイント1〜2点＋次コマ予告
- 各ファイルは**単体で読めるように**書く（前のコマを開かなくても手順が完結する）
- 発展編はタイトルが `# 発展N｜タイトル`、フェーズ欄が `発展編（任意）`、次コマ欄が `なし（発展編は興味のある順に取り組んでよい）`

## 内容の規約

- **文体**：専門学校1〜2年生向け。丁寧すぎず砕けすぎない。専門用語は初出時に一言説明を添える
- **初歩から**：Phase 1 は「React/Nextを少し触ったことがある人の学び直し」も兼ねる。ターミナル操作やJSの文法（分割代入・アロー関数・map など）も、使う場面で一言おさらいする
- **コードブロック言語**：シェルは `bash`、React/Next のコードは `jsx`、GitHub Actionsは `yaml`
- **ファイル拡張子**：`create-next-app --js` の生成物に合わせて `.js`（`page.js`, `layout.js`, `components/Counter.js`, `Counter.test.js`）
- **開発サーバは `npm run dev`**（オプション不要。`next dev` は全インターフェースで待ち受けるので WSL2 から Windows 側ブラウザで `http://localhost:3000` が開ける）。`-- --host` は Next にないので書かない
- プロジェクト作成コマンドは次で統一（JS・ESLint・App Router・Tailwindなし・srcなし）：
  ```bash
  npx create-next-app@latest <プロジェクト名> --js --eslint --app --no-tailwind --no-src-dir --no-react-compiler --import-alias "@/*" --use-npm --yes
  ```
- 自作コンポーネントは `components/` に置き、`@/components/...` で import する
- 学習者の環境は Windows + WSL2 Ubuntu（プロジェクトは `~/workspace/` 配下。`/mnt/c` には置かない）、Node.js 24（nvm）、Next.js 16 + React 19
- 教える技術スタック：Next.js 16（App Router, Turbopack）/ React 19 / Jest（`next/jest`）+ React Testing Library / ESLint（`npm run lint` = `eslint`。`next lint` は廃止済み）/ GitHub Actions / Vercel + GitHub Pages（静的書き出し）
- **Vite・Vitest は使わない**
- テストの定番構成（Phase 2 以降の前提）：
  ```bash
  npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
  ```
  `jest.config.mjs` は `next/jest.js` の `createJestConfig` に `testEnvironment: 'jsdom'`、`setupFilesAfterEnv: ['<rootDir>/jest.setup.js']`、`moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }` を渡す（`jest.mock('@/...')` の解決に moduleNameMapper が必須）。`jest.setup.js` は `import '@testing-library/jest-dom'` の1行。scripts は `"test": "jest"`, `"test:watch": "jest --watch"`, `"test:coverage": "jest --coverage"`（コマ13で `collectCoverageFrom` と `coverageThreshold` を追加し、`eslint.config.mjs` の globalIgnores に `coverage/**` を足す）
- MSW を Jest で使うときは `testEnvironment: 'jest-fixed-jsdom'`（jsdom に fetch/Request がないため）と、scripts の `NODE_OPTIONS=--experimental-vm-modules`（MSW の依存に ESM 専用パッケージがあるため）が必須。`MswProvider` は StrictMode の二重実行対策で起動 Promise をモジュール変数で1つにまとめる
- Next特有のテスト上の注意：`async` な Server Component は `render(<Page />)` では描画できない（`render(await Page())` なら単純なものは可。基本はデータ取得を関数に切り出して単体テスト、画面はE2E）。`next/navigation` は `jest.mock` する
- localStorage を読む部品は `dynamic(() => import(...), { ssr: false })` のラッパー（`TodoAppClient.js`）経由で読み込む。`useEffect` 内で同期的に setState すると `react-hooks/set-state-in-effect` が **error** になるので、読み込みは `useState(loadTodos)` の遅延初期化で行う
- 本編の TODO アプリの到達形（コマ5〜23）：`components/` に TodoApp / TodoAppClient / TodoForm / TodoList / TodoItem / Header / SampleLoader、`lib/` に todos.js（純粋関数）/ api.js（fetch）/ tips.js、`app/` に page / layout / about / tips（async Server Component）/ not-found、`lib/` に config.js（環境変数）/ nav.js（`isCurrentPath`：Pages の trailingSlash 対策）、`components/Footer.js`。`.github/workflows/ci.yml` は lint・test → build → pages-build → pages-deploy の1本

## 確認コマンド

```bash
# 教材ファイル数（本編30＋発展編6）
find curriculum/docs -name "*.md" | wc -l

# 本編30コマが新形式（90分・演習あり）になっているか
grep -l "所要時間 | 90分" curriculum/docs/phase*/*.md | wc -l

# 教材のコードを検証するときは scratchpad 等に上記 create-next-app で作り、npm run build / npm run lint / npm test を通す
# ワークフローの YAML は actionlint で検証する

# 参考実装の確認（implements/msw-pokedex を触ったとき）
cd implements/msw-pokedex && npm ci && npm test && npm run lint && npm run build
```
