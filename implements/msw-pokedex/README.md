# ポケモン図鑑アプリ（MSW総合演習の参考実装）

発展6（`curriculum/docs/advanced/a6_msw_pokedex.md`）の完成形です。
PokeAPI（実在の公開API）の仕様を MSW で丸ごと偽装し、**本物のAPIに一度も接続せずに** 開発・テストが完結します。

Next.js（App Router）+ Jest + React Testing Library + MSW で作っています。

## 動かし方

```powershell
npm install
npm run dev
```

http://localhost:3000 を開き、`pikachu` や `charizard` で検索してください。
本物のPokeAPIと同じく、図鑑番号（`25` など）でも検索できます。
フィクスチャに登録されていない名前（例：`mewtwo`）は404となり、「見つかりませんでした」と表示されます。

`npm run dev` は `cross-env` で `NEXT_PUBLIC_API_MOCKING=enabled` を付けて起動するので（Windows の PowerShell でも Linux でも同じように動きます）、ブラウザの MSW（Service Worker）が PokeAPI への通信を横取りします。
開発者ツールの Console に `[MSW] ... GET https://pokeapi.co/...` と表示されれば、モックが効いています（公式アートワークの画像だけは、ハンドラを定義していないのでパススルーで本物から取得されます）。

## テスト

```powershell
npm test
```

成功・ポケモン切り替え・図鑑番号検索・404・500・ローディング表示 の6本が実行されます。
テストでは `mocks/server.js`（Node 用の MSW）が通信を横取りします。

## ファイル構成

```text
app/
  layout.js           # MswProvider で全体を包む
  page.js             # Pokedex を表示
components/
  MswProvider.js      # 開発時だけブラウザで MSW を起動してから描画
  Pokedex.js          # 検索フォームと状態管理（'use client'）
  PokemonCard.js      # 図鑑カードの表示
  pokedex.css         # 見た目
  Pokedex.test.js     # MSW を使ったテスト6本
lib/
  pokeApi.js          # API 呼び出し＋データ整形
mocks/
  fixtures/
    pokemon.js        # 偽データ本体（PokeAPIの応答の抜粋）
  handlers.js         # どのURLに何を返すかの定義（開発・テストで共有）
  browser.js          # 開発用（Service Worker）
  server.js           # テスト用（Node）
jest.config.mjs       # testEnvironment: jest-fixed-jsdom
jest.setup.js         # テスト全体の MSW 起動・停止
```

## 本物のPokeAPIで動かす場合

```powershell
npm run dev:real
```

`NEXT_PUBLIC_API_MOCKING` を付けずに起動するので、MSW は起動せず本物のAPIに接続します。
形をそっくりに偽装してあるため、アプリのコードは無修正で動きます。
PokeAPIはファンコミュニティが善意で運営しているので、確認は数回にとどめてください（フェアユース）。
