# ポケモン図鑑アプリ（MSW総合演習の参考実装）

発展6（`curriculum/docs/advanced/a6_msw_pokedex.md`）の完成形です。
PokeAPI（実在の公開API）の仕様をMSWで丸ごと偽装し、**本物のAPIに一度も接続せずに** 開発・テストが完結します。

## 動かし方

```bash
npm install
npm run dev -- --host
```

ブラウザで表示されたURLを開き、`pikachu` や `charizard` で検索してください。
本物のPokeAPIと同じく、図鑑番号（`25` など）でも検索できます。
フィクスチャに登録されていない名前（例：`mewtwo`）は404となり、「見つかりませんでした」と表示されます。

開発者ツールのNetworkタブを開くと、`pokeapi.co` へのリクエストがService Workerに横取りされ、本物には届いていないことが確認できます（公式アートワークの画像だけは、ハンドラを定義していないのでパススルーで本物から取得されます）。

## テスト

```bash
npm run test
```

成功・ポケモン切り替え・図鑑番号検索・404・500・ローディング表示 の6本が実行されます。

## ファイル構成

```text
src/
  mocks/
    fixtures/
      pokemon.js      # 偽データ本体（PokeAPIの応答の抜粋）
    handlers.js       # どのURLに何を返すかの定義
    browser.js        # 開発用（Service Worker）
    server.js         # テスト用（Node）
  pokedex/
    pokeApi.js        # API呼び出し＋データ整形
    Pokedex.jsx       # 検索フォームと状態管理
    PokemonCard.jsx   # 図鑑カードの表示
    pokedex.css       # 見た目
    Pokedex.test.jsx  # MSWを使ったテスト6本
  setupTests.js       # テスト全体のMSW起動・停止
  main.jsx            # 開発時のみMSWを有効化してから描画
```

## 本物のPokeAPIで動かす場合

`src/main.jsx` の `enableMocking()` の先頭で早期returnさせると、本物のAPIに接続します。
形をそっくりに偽装してあるため、アプリのコードは無修正で動きます。
PokeAPIはファンコミュニティが善意で運営しているので、確認は数回にとどめてください（フェアユース）。
