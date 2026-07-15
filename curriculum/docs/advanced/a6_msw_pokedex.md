# 発展6｜MSW総合演習：ポケモン図鑑アプリを作る

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 |  |
| 前提コマ | 発展3 MSWでAPIモックを本格化する |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- 複数のエンドポイントを持つ実在のWeb API（PokeAPI）を、MSWで丸ごと偽装できる
- パスパラメータ（`:name`）を使って「URLごとに違う応答」を返すハンドラが書ける
- 見た目を作り込んだAPI連携アプリを、本物のAPIに一度も接続せずに開発→テストまで通せる

##  導入

### 発展3の先へ：総合演習

発展3では、URL1本のモックを作って成功／失敗を切り替えた。ただ、実務のAPI連携はもう少し複雑だ。

- エンドポイントが**複数**ある（一覧用、詳細用、…）
- 同じエンドポイントでも**URLのパラメータによって応答が変わる**（`/pokemon/pikachu` と `/pokemon/charizard`）
- 1画面を作るのに**APIを2回以上呼ぶ**ことがある

今日はこれを全部盛り込んだ「ポケモン図鑑アプリ」を作る。題材は **PokeAPI** という実在の公開APIだ。

> **PokeAPIとは**：ポケモンのデータ（名前・タイプ・種族値など）をJSONで返してくれる、登録不要・無料の公開API（ファンコミュニティ運営）。ブラウザで `https://pokeapi.co/api/v2/pokemon/pikachu` を開くと、実際のJSONが見られる。

### 本物のAPIがあるのに、なぜモックで作るのか

「本物があるなら本物につなげばいいのでは？」と思うかもしれない。でも実務ではこう考える。

- **相手に迷惑をかけない**：PokeAPIは善意で運営されている。開発中は保存のたびに画面がリロードされ、そのたびAPIを叩くことになる。モックなら何万回叩いてもゼロ負荷（PokeAPI自身もフェアユース＝節度ある利用を求めている）
- **テストが安定する**：本物に依存したテストは、相手が落ちたら一緒に落ちる（コマ11でやった話）
- **ネットワークがなくても進む**：教室のWi-Fiが不調でも開発は止まらない

つまり今日やるのは「**本物のAPIの仕様をそっくり偽装して、本物なしで開発を完走する**」という、モックファースト開発の実践だ。

### 完成イメージ

検索フォームに名前を入れると、図鑑カードが表示される。

```text
┌─────────────────────────┐
│      （公式アートワーク）      │
│         No.0025          │
│        ピカチュウ           │
│         PIKACHU          │
│       ねずみポケモン         │
│        [でんき]            │
│  たかさ 0.4 m／おもさ 6 kg   │
│  HP      ▓▓▓░░░░░  35    │
│  こうげき  ▓▓▓▓▓░░░  55    │
│  すばやさ  ▓▓▓▓▓▓▓░  90    │
│  （説明文）                 │
└─────────────────────────┘
```

裏側の通信はこうなっている。**アプリは本物のPokeAPIを呼んでいるつもり**で、MSWが全部横取りする。

```text
検索 "pikachu"
  → fetch /api/v2/pokemon/pikachu        ┐
  → fetch /api/v2/pokemon-species/25     ┤← MSWが横取りして偽データを返す
図鑑カードを表示                           ┘
```

##  本題

発展3を終えた `todo-app`（`src/mocks/` がある状態）で進める。

### 1. ブランチを切って、完成形を把握する

```bash
cd ~/workspace/todo-app
git switch main
git pull origin main
git switch -c feature/pokedex
```

今日作るファイルは6つ。役割分担を先に頭に入れておくと迷わない。

```text
src/
  mocks/
    fixtures/
      pokemon.js      # 偽データ本体（PokeAPIの応答の抜粋）
    handlers.js       # ハンドラ追加（どのURLに何を返すか）
  pokedex/
    pokeApi.js        # API呼び出し＋データ整形
    Pokedex.jsx       # 検索フォームと状態管理
    PokemonCard.jsx   # 図鑑カードの表示
    pokedex.css       # 見た目
    Pokedex.test.jsx  # MSWを使ったテスト
```

> **参考実装**：このコマの完成形が、教材リポジトリの `implements/msw-pokedex/` に動く状態で置いてある。詰まったら自分のコードと見比べよう（先に写すのではなく、まず自分で打つこと）。

### 2. フィクスチャ：偽データを別ファイルに切り出す

まず偽データから作る。発展3ではハンドラの中に直接データを書いたが、今回はデータが大きいので **フィクスチャ** として別ファイルに分ける。

> **フィクスチャ（fixture）とは**：テストやモックで使う「決まったサンプルデータ」のこと。ハンドラ（ロジック）とデータを分けておくと、データを増やすときにハンドラを触らずに済む。

データの形は**本物のPokeAPIの応答に合わせる**のがポイント。形が本物と違うと「モックでは動くのに本物では動かない」アプリができてしまう。ブラウザで実物のJSONを一度見てから写すのが理想だ（ここでは使う項目だけ抜粋し、説明文は教材用に簡略化してある）。

```javascript
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
```

`pokemonData` と `speciesData` が分かれているのは、**本物のPokeAPIがそういう設計**だから。基本データは `/pokemon/名前`、日本語名や説明文は `/pokemon-species/番号` と、2つのエンドポイントに分かれている。

### 3. ハンドラ：パスパラメータでURLごとに応答を変える

`src/mocks/handlers.js` を書き換える。発展3で作ったTODOのハンドラはそのまま残し、ポケモン用を2本追加する。

```javascript
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw'
import { pokemonData, speciesData } from './fixtures/pokemon'

export const handlers = [
  // 発展3で作ったTODO APIのモック（そのまま残す）
  http.get('https://jsonplaceholder.typicode.com/todos', () => {
    return HttpResponse.json([
      { id: 1, title: 'MSWで返したTODO', completed: false },
      { id: 2, title: '2件目', completed: true },
    ])
  }),

  // ポケモンの基本データ（タイプ・種族値・画像など）
  // 本物のPokeAPIは名前でも図鑑番号でも引けるので、モックも同じ仕様にする
  http.get('https://pokeapi.co/api/v2/pokemon/:name', ({ params }) => {
    const pokemon =
      pokemonData[params.name] ??
      Object.values(pokemonData).find((p) => p.id === Number(params.name))
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
```

発展3からの進化ポイントが2つある。

> **パスパラメータ `:name`**：URLの `:name` の部分は「何が来てもマッチする」プレースホルダで、実際に来た値は `params.name` で取り出せる。`/pokemon/pikachu` なら `params.name` は `"pikachu"`、`/pokemon/25` なら `"25"`。本物のPokeAPIは名前でも図鑑番号でも引けるので、名前で見つからなければ `Number(params.name)` を `id` と突き合わせる2段構えにして、モックの仕様を本物に合わせている。

- **404を自分で設計している**：フィクスチャにない名前が来たら404を返す。つまり「存在しない名前で検索したときのテスト」に、`server.use()` の上書きすら不要になる。本物のPokeAPIも未知の名前には404を返すので、挙動が本物と揃う

### 4. API層：呼び出しと整形を1つの関数にまとめる

次に、コンポーネントから通信の詳細を追い出す。「2回fetchして、画面で使いやすい形に整形して返す」関数を作る。

```javascript
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
```

なぜ整形をここでやるのか。

- **コンポーネントが薄くなる**：`pokemon.sprites.other['official-artwork'].front_default` のような深いネストをJSXに書かずに済む
- **エラーの種類を先に分類**：「見つからない（404）」と「サーバ側の異常」を別のエラーとして投げ分けておくと、画面側はメッセージの出し分けに専念できる
- **APIの都合をここで吸収**：単位換算（0.1m→m）や改行除去のような「APIの生データの癖」への対処が1か所に集まる

### 5. 画面：検索フォームと図鑑カード

状態管理と検索フォームを持つ `Pokedex` と、表示専用の `PokemonCard` に分ける（コマ3でやった「容器と見た目の分離」）。

```jsx
// src/pokedex/Pokedex.jsx
import { useState } from 'react'
import { fetchPokemon } from './pokeApi'
import PokemonCard from './PokemonCard'
import './pokedex.css'

function Pokedex() {
  const [input, setInput] = useState('')
  // idle（初期）→ loading → success か error、の4状態を1つのstateで持つ
  const [status, setStatus] = useState('idle')
  const [pokemon, setPokemon] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!input.trim()) return

    setStatus('loading')
    try {
      const data = await fetchPokemon(input)
      setPokemon(data)
      setStatus('success')
    } catch (err) {
      setErrorMessage(
        err.message === 'NOT_FOUND'
          ? '見つかりませんでした。名前のつづり（英語）を確認しよう'
          : '通信エラーが発生しました。少し待ってからもう一度試そう',
      )
      setStatus('error')
    }
  }

  return (
    <div className="pokedex">
      <h1 className="pokedex-title">ポケモン図鑑</h1>

      <form className="search-form" onSubmit={handleSubmit}>
        <input
          aria-label="ポケモン名"
          placeholder="pikachu または 25"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit">検索</button>
      </form>

      {status === 'loading' && <p className="status">さがしています…</p>}
      {status === 'error' && (
        <p className="status" role="alert">
          {errorMessage}
        </p>
      )}
      {status === 'success' && <PokemonCard pokemon={pokemon} />}
    </div>
  )
}

export default Pokedex
```

設計の意図を2つだけ。

- **`loading` と `error` を別々の `useState(true/false)` にしない**：「loadingがtrueのままerrorもtrue」のような矛盾状態が構造的に起きなくなる。状態が増えてきたら「とりうる状態を1つの値で列挙する」のが定石
- **`role="alert"`**：エラー表示に付けておくと、スクリーンリーダーが即座に読み上げる。さらに後でテストからも「エラー通知」として意味で取得できる

続いて図鑑カード。タイプ名と種族値は英語で届くので、表示用の対訳表をコンポーネント内に持つ。

```jsx
// src/pokedex/PokemonCard.jsx
const TYPE_LABELS = {
  normal: 'ノーマル',
  fire: 'ほのお',
  water: 'みず',
  electric: 'でんき',
  grass: 'くさ',
  ice: 'こおり',
  fighting: 'かくとう',
  poison: 'どく',
  ground: 'じめん',
  flying: 'ひこう',
  psychic: 'エスパー',
  bug: 'むし',
  rock: 'いわ',
  ghost: 'ゴースト',
  dragon: 'ドラゴン',
  dark: 'あく',
  steel: 'はがね',
  fairy: 'フェアリー',
}

const STAT_LABELS = {
  hp: 'HP',
  attack: 'こうげき',
  defense: 'ぼうぎょ',
  'special-attack': 'とくこう',
  'special-defense': 'とくぼう',
  speed: 'すばやさ',
}

// 種族値は理論上255まであるが、150あれば実質トップクラスなので150を満タンとして描く
function barWidth(value) {
  return `${Math.min((value / 150) * 100, 100)}%`
}

function PokemonCard({ pokemon }) {
  return (
    <article className="pokemon-card">
      <div className="artwork">
        <img src={pokemon.imageUrl} alt={pokemon.name} />
      </div>

      <p className="dex-number">No.{String(pokemon.id).padStart(4, '0')}</p>
      <h2 className="name">{pokemon.name}</h2>
      <p className="english-name">{pokemon.englishName}</p>
      <p className="genus">{pokemon.genus}</p>

      <ul className="type-list">
        {pokemon.types.map((type) => (
          <li key={type} className={`type-badge type-${type}`}>
            {TYPE_LABELS[type] ?? type}
          </li>
        ))}
      </ul>

      <dl className="body-info">
        <div>
          <dt>たかさ</dt>
          <dd>{pokemon.height} m</dd>
        </div>
        <div>
          <dt>おもさ</dt>
          <dd>{pokemon.weight} kg</dd>
        </div>
      </dl>

      <ul className="stat-list">
        {pokemon.stats.map((stat) => (
          <li key={stat.name} className="stat-row">
            <span className="stat-name">{STAT_LABELS[stat.name] ?? stat.name}</span>
            <span className="stat-bar">
              <span
                className="stat-bar-fill"
                style={{ width: barWidth(stat.value) }}
              />
            </span>
            <span className="stat-value">{stat.value}</span>
          </li>
        ))}
      </ul>

      {pokemon.flavorText && <p className="flavor-text">{pokemon.flavorText}</p>}
    </article>
  )
}

export default PokemonCard
```

`TYPE_LABELS[type] ?? type` としているのは保険。対訳表にないタイプが来ても、英語のまま表示されて画面は壊れない（`??` は「左がnull/undefinedなら右」の演算子）。

### 6. 見た目を整えて、ブラウザで動かす

CSSを書く。図鑑らしい赤いボディに白いカード、タイプごとの定番カラーのバッジ、種族値のバーまで作り込む。

```css
/* src/pokedex/pokedex.css */
.pokedex {
  max-width: 420px;
  margin: 24px auto;
  padding: 24px 20px;
  border-radius: 20px;
  background: linear-gradient(165deg, #e3350d 0%, #b3230a 60%, #8e1b06 100%);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}

.pokedex-title {
  margin: 0 0 16px;
  text-align: center;
  color: #fff;
  font-size: 1.4rem;
  letter-spacing: 0.2em;
}

.search-form {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.search-form input {
  flex: 1;
  min-width: 0;
  padding: 10px 16px;
  border: none;
  border-radius: 999px;
  font-size: 1rem;
}

.search-form button {
  padding: 10px 20px;
  border: none;
  border-radius: 999px;
  background: #222;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}

.search-form button:hover {
  background: #444;
}

.status {
  margin: 0;
  padding: 12px;
  border-radius: 10px;
  text-align: center;
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
}

.pokemon-card {
  padding: 20px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.artwork {
  width: 180px;
  height: 180px;
  margin: 0 auto 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fafafa, #e0e0e0);
  display: flex;
  align-items: center;
  justify-content: center;
}

.artwork img {
  width: 150px;
  height: 150px;
  object-fit: contain;
}

.dex-number {
  margin: 0;
  color: #999;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
}

.name {
  margin: 2px 0 0;
  font-size: 1.6rem;
}

.english-name {
  margin: 0;
  color: #aaa;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.genus {
  margin: 4px 0 12px;
  color: #666;
  font-size: 0.9rem;
}

.type-list {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
}

.type-badge {
  padding: 4px 14px;
  border-radius: 999px;
  color: #fff;
  font-size: 0.85rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

/* タイプ別の定番カラー */
.type-normal { background: #a8a878; }
.type-fire { background: #f08030; }
.type-water { background: #6890f0; }
.type-electric { background: #f8d030; }
.type-grass { background: #78c850; }
.type-ice { background: #98d8d8; }
.type-fighting { background: #c03028; }
.type-poison { background: #a040a0; }
.type-ground { background: #e0c068; }
.type-flying { background: #a890f0; }
.type-psychic { background: #f85888; }
.type-bug { background: #a8b820; }
.type-rock { background: #b8a038; }
.type-ghost { background: #705898; }
.type-dragon { background: #7038f8; }
.type-dark { background: #705848; }
.type-steel { background: #b8b8d0; }
.type-fairy { background: #ee99ac; }

.body-info {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 0 0 16px;
}

.body-info div {
  flex: 1;
  max-width: 130px;
  padding: 8px;
  border-radius: 10px;
  background: #f5f5f5;
}

.body-info dt {
  color: #888;
  font-size: 0.75rem;
}

.body-info dd {
  margin: 0;
  font-weight: bold;
}

.stat-list {
  display: grid;
  gap: 6px;
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
}

.stat-row {
  display: grid;
  grid-template-columns: 64px 1fr 32px;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.stat-name {
  color: #555;
  text-align: left;
}

.stat-bar {
  height: 10px;
  border-radius: 999px;
  background: #eee;
  overflow: hidden;
}

.stat-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffd76f, #e3350d);
}

.stat-value {
  color: #333;
  font-weight: bold;
  text-align: right;
}

.flavor-text {
  margin: 0;
  padding: 12px;
  border-radius: 10px;
  background: #f5f5f5;
  color: #555;
  font-size: 0.85rem;
  line-height: 1.7;
  text-align: left;
}
```

`src/App.jsx` を図鑑に差し替える（TODOアプリのコードはブランチ上で消しても、mainには残っているので心配ない。並べて表示したい人は `<Pokedex />` を追加するだけでもよい）。

```jsx
// src/App.jsx
import Pokedex from './pokedex/Pokedex'

function App() {
  return <Pokedex />
}

export default App
```

起動して確認する。発展3でブラウザ用MSW（Service Worker）を仕込み済みなので、**追加した瞬間からポケモンAPIも横取りされる**。

```bash
npm run dev -- --host
```

`pikachu` や `charizard` で検索するとカードが表示され、`mewtwo` など（フィクスチャ未登録）だと「見つかりませんでした」になるはず。開発者ツールのNetworkタブで、`pokeapi.co` へのリクエストが Service Worker から返されている（本物には届いていない）ことを確認しよう。

> **画像だけは本物から来ている**：MSWは「ハンドラを定義したURL**だけ**」を横取りし、それ以外は素通し（パススルー）する。公式アートワークのpng はハンドラを書いていないので、本物のネットワークから取得されている。「どこまでを偽装し、どこからを素通しにするか」を自分で線引きできるのがMSWの強みだ。

### 7. テスト：成功・404・500・ローディングまで面倒を見る

仕上げにテストを書く。ユーザー操作（コマ10）→ 非同期待ち（コマ11）→ MSW（発展3）の合わせ技だ。

```jsx
// src/pokedex/Pokedex.test.jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
import { server } from '../mocks/server'
import { pokemonData } from '../mocks/fixtures/pokemon'
import Pokedex from './Pokedex'

// 「描画して、名前を入力して、検索ボタンを押す」までを共通化
async function search(name) {
  const user = userEvent.setup()
  render(<Pokedex />)
  await user.type(screen.getByRole('textbox', { name: 'ポケモン名' }), name)
  await user.click(screen.getByRole('button', { name: '検索' }))
}

describe('ポケモン図鑑', () => {
  it('名前で検索すると図鑑カードが表示される', async () => {
    await search('pikachu')

    expect(
      await screen.findByRole('heading', { name: 'ピカチュウ' }),
    ).toBeInTheDocument()
    expect(screen.getByText('No.0025')).toBeInTheDocument()
    expect(screen.getByText('でんき')).toBeInTheDocument()
    expect(screen.getByText('ねずみポケモン')).toBeInTheDocument()
  })

  it('検索するポケモンを変えれば表示も変わる', async () => {
    await search('charizard')

    expect(
      await screen.findByRole('heading', { name: 'リザードン' }),
    ).toBeInTheDocument()
    expect(screen.getByText('ほのお')).toBeInTheDocument()
    expect(screen.getByText('ひこう')).toBeInTheDocument()
  })

  it('図鑑番号でも検索できる', async () => {
    await search('25')

    expect(
      await screen.findByRole('heading', { name: 'ピカチュウ' }),
    ).toBeInTheDocument()
  })

  it('存在しない名前なら「見つかりませんでした」と案内される', async () => {
    await search('nazonopokemon')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '見つかりませんでした',
    )
  })

  it('サーバエラーなら通信エラーの案内が表示される', async () => {
    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/:name', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )

    await search('pikachu')

    expect(await screen.findByRole('alert')).toHaveTextContent('通信エラー')
  })

  it('検索中は「さがしています…」と表示される', async () => {
    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/:name', async () => {
        await delay(300) // わざと0.3秒待たせてローディング状態を作る
        return HttpResponse.json(pokemonData.pikachu)
      }),
    )

    await search('pikachu')

    expect(await screen.findByText('さがしています…')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'ピカチュウ' }),
    ).toBeInTheDocument()
  })
})
```

```bash
npm run test
```

6本すべてPASSすれば完成。このテストの読みどころ：

- **404のテストに `server.use()` がない**：フィクスチャにない名前なら404、というルールをハンドラ自体に設計したから。モックが「本物のAPIの仕様書」として機能している
- **`findByRole('alert')`**：`role="alert"` を付けたおかげで「エラーの通知が出たか」を意味で検証できる。文言のタグ構造が変わってもテストは壊れない
- **ローディングのテスト**：応答が一瞬で返るとローディング表示を目視も検証もできない。`delay()` で「遅いサーバ」を再現するのはMSWの定番テクニック

最後にコミットして、いつもの流れで取り込む。

```bash
git add .
git commit -m "ポケモン図鑑アプリを追加（MSW総合演習）"
git push origin feature/pokedex
```

PRを作り、CIが緑になったらマージする。

##  まとめ

### 今日できるようになったこと

- パスパラメータ付きハンドラとフィクスチャで、複数エンドポイントの実在APIを丸ごと偽装できる
- 2回のfetchを1つのAPI層関数にまとめ、コンポーネントを表示に専念させる設計ができる
- 成功・404・500・ローディングまで、本物のAPIに一度も接続せずにテストで保証できる

### よくある詰まりポイント

- **検索しても何も出ない／コンソールに `[MSW] Warning: intercepted a request without a matching request handler` が出る**：ハンドラのURLとアプリがfetchしているURLが一致していない。タイポ（`pokemon` と `pokemon-species` の取り違えなど）を確認する
- **404テストだけ通らない**：フィクスチャのキーは小文字の英語名（`pikachu`）。`pokeApi.js` の `toLowerCase()` を書き忘れていると、大文字入力がそのまま404になり他のテストも不安定になる
- **テストが `getByText` で落ちる**：検索は非同期。結果の検証は `findBy〜`（await付き）を使う。コマ11の復習

### 次の一歩

発展4（Playwright）まで終えていれば、このアプリのE2Eテストを書くのに最適な題材になる。また、個人制作（Phase 5）でAPI連携をやりたい人は、今日の「フィクスチャ＋ハンドラ＋API層」の3点セットをそのまま雛形にできる。

##  課題

### 基礎課題（必須）

1. ポケモン図鑑アプリ一式を実装し、テスト6本をPASSさせる
2. ブラウザで pikachu / charizard / 未登録の名前 の3パターンの表示を確認する
3. ブランチ→PR→CI緑→マージ の流れで取り込む

### 応用課題（推奨）

4. **大文字対応の証明**：「`PIKACHU` と大文字で検索してもピカチュウが表示される」テストを追加する（`pokeApi.js` の `toLowerCase()` が仕様として保証されるようになる）
5. **エラーメッセージの出し分け**：`9999` のような未登録の図鑑番号で検索すると「名前のつづり（英語）を確認しよう」と出るのは不自然。入力が数字のときは「図鑑番号がまちがっていないか確認しよう」と出し分けるようにして、そのテストも足す
6. **好きなポケモンを図鑑に追加する**：本物の `https://pokeapi.co/api/v2/pokemon/名前` をブラウザで開き、応答を参考にフィクスチャへ3匹目を登録する

### チャレンジ課題（挑戦）

7. **「つかまえる」機能**：カードにボタンを置き、押したら画面下部の「手持ちリスト」に追加されるようにする（同じポケモンは2匹追加できない）。この機能のテストも書く
8. **本物のAPIで最終確認**：`main.jsx` の `enableMocking` を一時的に無効化し、本物のPokeAPIで動くことを確認する（形をそっくりに偽装できていれば無修正で動くはず）。確認は数回にとどめること（フェアユース）。確認後は必ずモックに戻す
