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
