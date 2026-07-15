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
