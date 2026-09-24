// mocks/handlers.js
import { http, HttpResponse, delay } from 'msw'
import { pokemonData, speciesData } from './fixtures/pokemon'

export const handlers = [
  // ポケモンの基本データ（タイプ・種族値・画像など）
  // 本物のPokeAPIは名前でも図鑑番号でも引けるので、モックも同じ仕様にする
  http.get('https://pokeapi.co/api/v2/pokemon/:name', async ({ params }) => {
    // ローディング表示をゆっくり観察するための擬似ディレイ。
    // テスト（NODE_ENV === 'test'）で3秒待つと findBy〜 が先にあきらめて
    // テストが落ちるので、テストでは待たない
    if (process.env.NODE_ENV !== 'test') {
      await delay(3000)
    }
    const pokemon = pokemonData[params.name] ?? Object.values(pokemonData).find((p) => p.id === Number(params.name))
    if (!pokemon) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(pokemon)
  }),

  // 種族データ（日本語名・分類・説明文）
  http.get('https://pokeapi.co/api/v2/pokemon-species/:id', ({ params }) => {
    const species = speciesData[params.id]
    if (!species) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(species)
  }),
]
