# 発展6｜MSW総合演習：ポケモン図鑑アプリを作る

| 項目 | 内容 |
|------|------|
| フェーズ | 発展編（任意） |
| 所要時間 | 90分 |
| 前提コマ | 発展3 MSWでAPIモックを本格化する |
| 次コマ | なし（発展編は興味のある順に取り組んでよい） |

##  目標

- 複数のエンドポイントを持つ実在の Web API（PokeAPI）を、MSW で丸ごと偽装できる
- パスパラメータ（`:name`）を使って、URL ごとに違う応答を返すハンドラを書ける
- 見た目まで作り込んだ API 連携アプリを、本物の API に一度も接続せずに、開発からテストまで通せる

##  導入

### 発展3の先へ

発展3では、URL 1本のモックを作って、成功・失敗を切り替えた。実際の API 連携は、もう少し複雑になる。

- エンドポイント（API の URL）が **複数** ある
- 同じエンドポイントでも、**URL のパラメータによって応答が変わる**（`/pokemon/pikachu` と `/pokemon/charizard`）
- 1つの画面を作るのに、**API を2回以上呼ぶ** ことがある

今日は、これを全部含んだ「ポケモン図鑑アプリ」を、**新しい Next.js のプロジェクト** として1から作る。題材は **PokeAPI** という実在の公開 API。

> **PokeAPI とは**：ポケモンのデータ（名前・タイプ・種族値など）を JSON で返してくれる、登録不要・無料の公開 API（ファンのコミュニティが運営）。ブラウザで `https://pokeapi.co/api/v2/pokemon/pikachu` を開くと、実際の JSON が見られる。

### 本物の API があるのに、なぜモックで作るのか

- **相手に迷惑をかけない**：開発中は保存のたびに画面が更新され、そのたびに API を呼ぶことになる。PokeAPI は善意で運営されていて、節度ある利用（フェアユース）を求めている。モックなら何万回呼んでも負荷はゼロ
- **テストが安定する**：本物に依存したテストは、相手が止まったら一緒に落ちる（コマ12）
- **ネットがなくても進む**：教室の Wi-Fi が不調でも、開発は止まらない

今日やるのは、**本物の API の仕様をそっくりまねた偽物を作り、本物なしで開発を最後まで進める**（モックファースト開発）こと。

### 完成イメージ

検索フォームに名前（または図鑑番号）を入れると、図鑑のカードが表示される。

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

裏側の通信はこうなっている。**アプリは本物の PokeAPI を呼んでいるつもり** で、MSW が全部横取りする。

```text
検索 "pikachu"
  → fetch /api/v2/pokemon/pikachu        ┐
  → fetch /api/v2/pokemon-species/25     ┤← MSW が横取りして偽のデータを返す
図鑑カードを表示                           ┘
```

##  本題

### 1. プロジェクトを作り、完成形を把握する

```bash
cd ~/workspace
npx create-next-app@latest pokedex --js --eslint --app --no-tailwind --no-src-dir --no-react-compiler --import-alias "@/*" --use-npm --yes
cd pokedex
rm app/page.module.css
mkdir -p components lib mocks/fixtures

npm install -D jest jest-fixed-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event msw prettier
npx msw init public --save
```

今日作るファイルと、それぞれの役割を先に頭に入れておく。

```text
app/
  layout.js           # MswProvider で全体を包む
  page.js             # Pokedex を表示
components/
  MswProvider.js      # 開発中だけブラウザで MSW を起動してから描く
  Pokedex.js          # 検索フォームと状態の管理（'use client'）
  PokemonCard.js      # 図鑑カードの表示
  pokedex.css         # 見た目
  Pokedex.test.js     # MSW を使ったテスト
lib/
  pokeApi.js          # API の呼び出し＋データの整形
mocks/
  fixtures/
    pokemon.js        # 偽のデータ本体（PokeAPI の応答の抜粋）
  handlers.js         # どの URL に何を返すか（開発とテストで共有）
  browser.js          # 開発用（Service Worker）
  server.js           # テスト用（Node.js）
```

> **参考実装**：完成形が、教材リポジトリの `implements/msw-pokedex/` に動く状態で置いてある。詰まったら自分のコードと見比べよう（先に写すのではなく、まず自分で打つこと）。

### 2. テストとモックの土台を用意する

発展3と同じ設定をする。

```js
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const config = {
  // jsdom に fetch / Request / Response を足した環境（MSW を Jest で使うため）
  testEnvironment: 'jest-fixed-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
```

```js
import '@testing-library/jest-dom'
import { server } from '@/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })) // 全テスト開始前：横取り開始
afterEach(() => server.resetHandlers()) // 各テスト後：ハンドラを初期状態に戻す
afterAll(() => server.close()) // 全テスト終了後：横取り解除
```

```js
// mocks/server.js（テスト用：Node の中で通信を横取りする）
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

```js
// mocks/browser.js（開発用：ブラウザの Service Worker で通信を横取りする）
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

`package.json` のコマンドを設定する。`npm run dev` は **最初からモックを有効にして** 起動するようにし、本物の API で確かめたいときだけ `npm run dev:real` を使う。

```bash
npm pkg set scripts.dev="NEXT_PUBLIC_API_MOCKING=enabled next dev" scripts.dev:real="next dev" scripts.lint="eslint --max-warnings=0" scripts.test="NODE_OPTIONS=--experimental-vm-modules jest" scripts.test:watch="NODE_OPTIONS=--experimental-vm-modules jest --watch" scripts.format="prettier --write ." scripts.format:check="prettier --check ."
```

`eslint.config.mjs` の `globalIgnores` に `"public/mockServiceWorker.js"` を足し、`.prettierrc`・`.prettierignore` を `todo-app` と同じように用意する（`.prettierignore` には `public/mockServiceWorker.js` も書く）。

### 3. フィクスチャ：偽のデータを別ファイルに分ける

発展3ではハンドラの中に直接データを書いたが、今回はデータが大きいので **フィクスチャ** として別のファイルに分ける。

> **フィクスチャ（fixture）とは**：テストやモックで使う「決まったサンプルデータ」。ハンドラ（ロジック）とデータを分けておくと、データを増やすときにハンドラを触らずに済む。

データの形は **本物の PokeAPI の応答に合わせる** のがポイント。形が本物と違うと、「モックでは動くのに本物では動かない」アプリができてしまう。ブラウザで本物の JSON を一度見てから写すのが理想（ここでは使う項目だけを抜き出し、説明文は教材用に短くしてある）。

```js
// mocks/fixtures/pokemon.js
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
        flavor_text: 'ほっぺの　でんきぶくろに　でんきを　ためる。おこると　ほうでんする。',
      },
    ],
  },
  6: {
    names: [{ language: { name: 'ja' }, name: 'リザードン' }],
    genera: [{ language: { name: 'ja' }, genus: 'かえんポケモン' }],
    flavor_text_entries: [
      {
        language: { name: 'ja' },
        flavor_text: 'くちから　しゃくねつの　ほのおを　はく。たたかいの　けいけんを　つむほど　ほのおは　あつくなる。',
      },
    ],
  },
}
```

本物の API の単位にも合わせている点に注意。`height: 4` は 0.1m 単位（= 0.4m）、`weight: 60` は 0.1kg 単位（= 6kg）。

### 4. ハンドラ：URL のパラメータで応答を変える

```js
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
```

| 書き方 | 意味 |
|--------|------|
| `/pokemon/:name` | `:name` の部分に何が来ても一致する（**パスパラメータ**）。中身は `params.name` で取り出せる |
| `pokemonData[params.name] ?? ...find(...)` | 名前で探し、なければ図鑑番号で探す。本物の PokeAPI と同じく `/pokemon/25` でも引けるようにしている |
| `new HttpResponse(null, { status: 404 })` | 見つからなければ 404。**本物と同じステータスコード** を返すことで、アプリのエラー処理も本物どおりに確かめられる |
| `process.env.NODE_ENV !== 'test'` | ブラウザでは3秒待って「さがしています…」を観察できるようにし、テストでは待たない（発展3の演習3） |

### 5. API 層：呼び出しと整形を1つの関数にまとめる

画面の部品から直接 `fetch` を呼ぶのではなく、**API を呼んで、画面で使いやすい形に整える** 関数を `lib/` に作る。

```js
// lib/pokeApi.js
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
  const jaFlavor = species.flavor_text_entries.find((f) => f.language.name === 'ja')

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

- 基本データ（`/pokemon/...`）には日本語名がないので、**2回目の通信**（`/pokemon-species/...`）で日本語名・分類・説明文を取ってくる
- 404 のときは `NOT_FOUND`、それ以外の失敗は `SERVER_ERROR` という **エラーの種類** を投げる。画面側は、この種類でメッセージを変える
- 画面の部品は、PokeAPI の複雑な JSON の形を知らなくてよい。**API の形が変わっても、直すのはこの関数だけ** で済む

### 6. 画面：検索フォームと図鑑カード

検索フォームと状態の管理。

```jsx
'use client'

// components/Pokedex.js
import { useState } from 'react'
import { fetchPokemon } from '@/lib/pokeApi'
import PokemonCard from './PokemonCard'
import './pokedex.css'

export default function Pokedex() {
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
```

状態を `'idle'`（最初）→ `'loading'` → `'success'` か `'error'` の **4つの状態を1つの state** で持っている（コマ12の `SampleLoader` と同じ考え方）。

図鑑カード。

```jsx
// components/PokemonCard.js
import Image from 'next/image'

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

export default function PokemonCard({ pokemon }) {
  return (
    <article className="pokemon-card">
      <div className="artwork">
        <Image src={pokemon.imageUrl} alt={pokemon.name} width={240} height={240} />
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
              <span className="stat-bar-fill" style={{ width: barWidth(stat.value) }} />
            </span>
            <span className="stat-value">{stat.value}</span>
          </li>
        ))}
      </ul>

      {pokemon.flavorText && <p className="flavor-text">{pokemon.flavorText}</p>}
    </article>
  )
}
```

- **`next/image` の `<Image>`**：公式アートワークの画像を表示する。外部の URL の画像を `next/image` で使うには、`next.config.mjs` で **読み込んでよい場所** を許可する必要がある
- **種族値のバー**：`style={{ width: ... }}` で、値に応じて幅を変えている。**値によって変わるスタイル** は、クラスではなく style で書く

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 公式アートワークの画像は GitHub 上にあるので、読み込みを許可する
    remotePatterns: [new URL('https://raw.githubusercontent.com/PokeAPI/sprites/**')],
  },
}

export default nextConfig
```

### 7. 見た目を整えて、ブラウザで動かす

```css
/* components/pokedex.css */
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
.type-normal {
  background: #a8a878;
}
.type-fire {
  background: #f08030;
}
.type-water {
  background: #6890f0;
}
.type-electric {
  background: #f8d030;
}
.type-grass {
  background: #78c850;
}
.type-ice {
  background: #98d8d8;
}
.type-fighting {
  background: #c03028;
}
.type-poison {
  background: #a040a0;
}
.type-ground {
  background: #e0c068;
}
.type-flying {
  background: #a890f0;
}
.type-psychic {
  background: #f85888;
}
.type-bug {
  background: #a8b820;
}
.type-rock {
  background: #b8a038;
}
.type-ghost {
  background: #705898;
}
.type-dragon {
  background: #7038f8;
}
.type-dark {
  background: #705848;
}
.type-steel {
  background: #b8b8d0;
}
.type-fairy {
  background: #ee99ac;
}

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

全体の背景などは `app/globals.css` に書く。

```css
body {
  margin: 0;
  min-height: 100vh;
  background: #ececec;
  font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', system-ui, sans-serif;
}
```

MSW の準備ができてから描く部品（発展3と同じ）と、`app/` のファイル。

```jsx
'use client'

import { useEffect, useState } from 'react'

// NEXT_PUBLIC_API_MOCKING=enabled のときだけ、ブラウザで MSW（Service Worker）を起動する。
// 起動が終わるまで画面を描かないことで、最初の通信からモックに横取りさせる
const isMockingEnabled = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'

// 開発中の React は effect を2回実行して確かめるので、起動は1回だけにする
let startPromise = null

function startMocking() {
  if (!startPromise) {
    startPromise = import('@/mocks/browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }))
  }
  return startPromise
}

export default function MswProvider({ children }) {
  const [isReady, setIsReady] = useState(!isMockingEnabled)

  useEffect(() => {
    if (isReady) return
    startMocking().then(() => setIsReady(true))
  }, [isReady])

  if (!isReady) return null
  return children
}
```

```jsx
import MswProvider from '@/components/MswProvider'
import './globals.css'

export const metadata = {
  title: 'ポケモン図鑑（MSW総合演習）',
  description: 'PokeAPI を MSW で偽装して作るポケモン図鑑',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <MswProvider>{children}</MswProvider>
      </body>
    </html>
  )
}
```

```jsx
import Pokedex from '@/components/Pokedex'

export default function Home() {
  return <Pokedex />
}
```

```bash
npm run dev
```

http://localhost:3000 を開き、`pikachu`・`charizard`・`25` で検索する。

- 「さがしています…」が3秒表示されてから、図鑑カードが出る
- `mewtwo`（フィクスチャにない名前）は「見つかりませんでした」になる
- 開発者ツールの **Console** に `[MSW] ... GET https://pokeapi.co/api/v2/pokemon/pikachu (200 OK)` と表示されている。**本物の PokeAPI には一度も通信していない**

> 公式アートワークの画像だけは、ハンドラを書いていないので本物の GitHub から取得されている（`onUnhandledRequest: 'bypass'` の効果）。画像まで偽物にしたい場合は、画像を `public/` に置いてフィクスチャの URL を書き換える（課題5）。

### 8. テスト：成功・404・500・読み込み中まで確かめる

```jsx
// components/Pokedex.test.js
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
import { pokemonData } from '@/mocks/fixtures/pokemon'
import { server } from '@/mocks/server'
import Pokedex from './Pokedex'

// 「描画して、名前を入力して、検索ボタンを押す」までを共通化
async function search(name) {
  const user = userEvent.setup()
  render(<Pokedex />)
  await user.type(screen.getByRole('textbox', { name: 'ポケモン名' }), name)
  await user.click(screen.getByRole('button', { name: '検索' }))
}

describe('ポケモン図鑑', () => {
  test('名前で検索すると図鑑カードが表示される', async () => {
    await search('pikachu')

    expect(await screen.findByRole('heading', { name: 'ピカチュウ' })).toBeInTheDocument()
    expect(screen.getByText('No.0025')).toBeInTheDocument()
    expect(screen.getByText('でんき')).toBeInTheDocument()
    expect(screen.getByText('ねずみポケモン')).toBeInTheDocument()
  })

  test('検索するポケモンを変えれば表示も変わる', async () => {
    await search('charizard')

    expect(await screen.findByRole('heading', { name: 'リザードン' })).toBeInTheDocument()
    expect(screen.getByText('ほのお')).toBeInTheDocument()
    expect(screen.getByText('ひこう')).toBeInTheDocument()
  })

  test('図鑑番号でも検索できる', async () => {
    await search('25')

    expect(await screen.findByRole('heading', { name: 'ピカチュウ' })).toBeInTheDocument()
  })

  test('存在しない名前なら「見つかりませんでした」と案内される', async () => {
    await search('nazonopokemon')

    expect(await screen.findByRole('alert')).toHaveTextContent('見つかりませんでした')
  })

  test('サーバエラーなら通信エラーの案内が表示される', async () => {
    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/:name', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )

    await search('pikachu')

    expect(await screen.findByRole('alert')).toHaveTextContent('通信エラー')
  })

  test('検索中は「さがしています…」と表示される', async () => {
    server.use(
      http.get('https://pokeapi.co/api/v2/pokemon/:name', async () => {
        await delay(300) // わざと0.3秒待たせてローディング状態を作る
        return HttpResponse.json(pokemonData.pikachu)
      }),
    )

    await search('pikachu')

    expect(await screen.findByText('さがしています…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'ピカチュウ' })).toBeInTheDocument()
  })
})
```

- **`search()` 関数**：「描画して、名前を入力して、検索を押す」までをまとめている。テストの中身が「何を確かめたいか」だけになって読みやすい
- 成功・404 のテストには **モックのコードがない**。フィクスチャとハンドラが、そのまま「仕様書」になっている
- 500 と読み込み中のテストだけ、`server.use` でその場で応答を上書きしている

```bash
npm test
npm run lint
npm run build
```

```text
PASS components/Pokedex.test.js
  ポケモン図鑑
    ✓ 名前で検索すると図鑑カードが表示される
    ✓ 検索するポケモンを変えれば表示も変わる
    ✓ 図鑑番号でも検索できる
    ✓ 存在しない名前なら「見つかりませんでした」と案内される
    ✓ サーバエラーなら通信エラーの案内が表示される
    ✓ 検索中は「さがしています…」と表示される
```

最後に、**本物の PokeAPI でも同じように動く** ことを1〜2回だけ確かめる（フェアユース）。

```bash
npm run dev:real
```

コードを1行も変えずに本物につながるのは、**フィクスチャとハンドラを本物の形にそっくり合わせた** から。

```bash
git add .
git commit -m "feat: MSWで偽装したPokeAPIでポケモン図鑑を作る"
gh repo create pokedex --public --source=. --remote=origin --push
```

##  演習

### 演習1（基本）：ポケモンを1匹増やす

フィクスチャに、好きなポケモンを1匹追加する（本物の PokeAPI の JSON を1回だけ見て、必要な項目を写す）。

**確認方法**：ブラウザ（`npm run dev`）でそのポケモンを名前と図鑑番号の両方で検索できる。さらに、そのポケモンのテストを1本追加して通ればOK。

> ハンドラは変えずに、**フィクスチャを足すだけ** で動くことを確かめる。

### 演習2（基本）：species の取得が失敗したとき

`/pokemon-species/:id` だけが 500 を返したとき、画面に「通信エラー」と表示されることを確かめるテストを書く。

**確認方法**：テストが通ればOK。さらに、`lib/pokeApi.js` の `if (!speciesRes.ok) throw ...` の行を消しても **テストが通ってしまう** ことを確かめ、その理由を説明する（確かめたら戻す）。

<details>
<summary>解説</summary>

行を消すと、500 のレスポンスの中身（空）を読もうとして `species.names` が `undefined` になり、`.find` のところで `TypeError` が起きる。この例外も `Pokedex.js` の `catch` に捕まり、`NOT_FOUND` ではないので「通信エラー」と表示される。**画面の結果は同じでも、たまたまそうなっているだけ**。

「エラーの種類ごとに正しく扱えているか」まで確かめたいなら、画面ではなく `lib/pokeApi.js` の `fetchPokemon` を直接テストし、`rejects.toThrow('SERVER_ERROR')` のように **投げられたエラーの種類** を確かめる。`TypeError` のままなら、このテストは失敗する。

</details>

### 演習3（応用）：大文字や空白を含む入力

`' Pikachu '` のように、前後に空白があったり大文字が混ざったりしていても検索できることをテストで確かめる。

**確認方法**：テストが通り、`lib/pokeApi.js` の `.trim().toLowerCase()` を消すと失敗すればOK。

> 本物の PokeAPI は小文字の名前しか受け付けない。**モックも本物と同じく小文字でしか一致しない** ようにしてあるので、アプリ側の整形が本当に必要かをテストで確かめられる。

### 演習4（早く終わった人向け）：検索の履歴

最近検索したポケモンを3件まで、フォームの下にボタンとして表示し、押すとそのポケモンを再検索できるようにする。

**確認方法**：3匹検索するとボタンが3つ並び、押すとそのポケモンのカードが表示されるテストが通ればOK。「履歴を更新する処理」は `lib/` の純粋関数にしてテストする。

##  まとめ

### 今日できるようになったこと

- 2つのエンドポイントを持つ実在の API を、フィクスチャとパスパラメータのハンドラで丸ごと偽装できた
- API の呼び出しと整形を `lib/` に分け、画面は整形後のデータだけを扱う設計にできた
- 成功・404・500・読み込み中をテストし、本物の API に一度も接続せずに開発とテストを完了できた

### よくある詰まりポイント

- **画像が表示されず、`hostname ... is not configured under images` というエラー**：`next.config.mjs` の `images.remotePatterns` を確認する
- **ブラウザで本物の PokeAPI に通信してしまう**：`npm run dev`（`NEXT_PUBLIC_API_MOCKING=enabled` 付き）で起動しているか、`public/mockServiceWorker.js` があるか確認する
- **テストが `onUnhandledRequest` のエラーで落ちる**：URL の打ち間違いで、ハンドラと一致していない。エラーに出ている URL と `mocks/handlers.js` を見比べる

### 次の一歩

今日の作り方（本物の形にそっくりのモックを先に作り、画面とテストを完成させてから本物につなぐ）は、バックエンドがまだできていないチーム開発でも使える。個人制作で外部の API を使うときも、まず MSW で偽装してから作ってみよう。

##  課題

### 基礎課題（必須）

1. 本題を完成させ、`pokedex` リポジトリに `ci.yml`（`todo-app` のものを参考に lint・test・build）を入れて、CI が緑になることを確かめる
2. 演習1・2を完成させる

### 応用課題（推奨）

3. Vercel にデプロイする。本番では MSW が動かず、本物の PokeAPI につながることを確かめる（`NEXT_PUBLIC_API_MOCKING` を設定していないため）
4. 発展4の Playwright で「pikachu を検索するとカードが表示される」E2E テストを書く。E2E では `page.route` で PokeAPI を差し替えるか、`NEXT_PUBLIC_API_MOCKING=enabled` で起動したサーバに対して実行するかを選び、理由を書く

### チャレンジ課題（挑戦）

5. 公式アートワークの画像も `public/` に置いて、画像まで含めて完全にオフラインで動くようにする
6. `https://pokeapi.co/api/v2/pokemon?limit=20` （一覧）のハンドラとフィクスチャを追加し、一覧から選んで図鑑カードを表示できるようにする。一覧のテストも書く
