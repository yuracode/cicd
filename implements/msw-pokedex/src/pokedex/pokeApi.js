// src/pokedex/pokeApi.js
const BASE_URL = 'https://pokeapi.co/api/v2'

// 2つのエンドポイントを呼び、画面で使いやすい1つのオブジェクトに整形して返す
export async function fetchPokemon(nameOrId) {
  const query = String(nameOrId).trim().toLowerCase()

  const res = await fetch(`${BASE_URL}/pokemon/${query}`)
  if (res.status === 404) throw new Error('NOT_FOUND')
  if (!res.ok) throw new Error('SERVER_ERROR')
  const pokemon = await res.json()

  // 日本語名などは species 側にしかないので、2回目のfetchが必要
  const speciesRes = await fetch(`${BASE_URL}/pokemon-species/${pokemon.id}`)
  if (!speciesRes.ok) throw new Error('SERVER_ERROR')
  const species = await speciesRes.json()

  const jaName = species.names.find((n) => n.language.name === 'ja')
  const jaGenus = species.genera.find((g) => g.language.name === 'ja')
  const jaFlavor = species.flavor_text_entries.find(
    (f) => f.language.name === 'ja',
  )

  return {
    id: pokemon.id,
    name: jaName ? jaName.name : pokemon.name,
    englishName: pokemon.name,
    genus: jaGenus ? jaGenus.genus : '',
    // 本物のAPIの説明文には改行や空白が混ざっているので取り除く
    flavorText: jaFlavor ? jaFlavor.flavor_text.replace(/\s/g, '') : '',
    imageUrl: pokemon.sprites.other['official-artwork'].front_default,
    types: pokemon.types.map((t) => t.type.name),
    height: pokemon.height / 10, // m に換算
    weight: pokemon.weight / 10, // kg に換算
    stats: pokemon.stats.map((s) => ({
      name: s.stat.name,
      value: s.base_stat,
    })),
  }
}
