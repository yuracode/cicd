// src/mocks/fixtures/pokemon.js
// PokeAPI（https://pokeapi.co）の応答から、この教材で使う項目だけを抜粋した偽データ

export const pokemonData = {
  pikachu: {
    id: 25,
    name: 'pikachu',
    height: 4, // 0.1m単位（本物のAPIの仕様に合わせる）
    weight: 60, // 0.1kg単位
    types: [{ slot: 1, type: { name: 'electric' } }],
    stats: [
      { base_stat: 35, stat: { name: 'hp' } },
      { base_stat: 55, stat: { name: 'attack' } },
      { base_stat: 40, stat: { name: 'defense' } },
      { base_stat: 50, stat: { name: 'special-attack' } },
      { base_stat: 50, stat: { name: 'special-defense' } },
      { base_stat: 90, stat: { name: 'speed' } },
    ],
    sprites: {
      other: {
        'official-artwork': {
          front_default:
            'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        },
      },
    },
  },
  charizard: {
    id: 6,
    name: 'charizard',
    height: 17,
    weight: 905,
    types: [
      { slot: 1, type: { name: 'fire' } },
      { slot: 2, type: { name: 'flying' } },
    ],
    stats: [
      { base_stat: 78, stat: { name: 'hp' } },
      { base_stat: 84, stat: { name: 'attack' } },
      { base_stat: 78, stat: { name: 'defense' } },
      { base_stat: 109, stat: { name: 'special-attack' } },
      { base_stat: 85, stat: { name: 'special-defense' } },
      { base_stat: 100, stat: { name: 'speed' } },
    ],
    sprites: {
      other: {
        'official-artwork': {
          front_default:
            'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
        },
      },
    },
  },
}

export const speciesData = {
  25: {
    names: [{ language: { name: 'ja' }, name: 'ピカチュウ' }],
    genera: [{ language: { name: 'ja' }, genus: 'ねずみポケモン' }],
    flavor_text_entries: [
      {
        language: { name: 'ja' },
        flavor_text:
          'ほっぺの　でんきぶくろに　でんきを　ためる。おこると　ほうでんする。',
      },
    ],
  },
  6: {
    names: [{ language: { name: 'ja' }, name: 'リザードン' }],
    genera: [{ language: { name: 'ja' }, genus: 'かえんポケモン' }],
    flavor_text_entries: [
      {
        language: { name: 'ja' },
        flavor_text:
          'くちから　しゃくねつの　ほのおを　はく。たたかいの　けいけんを　つむほど　ほのおは　あつくなる。',
      },
    ],
  },
}
