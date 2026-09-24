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
