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
