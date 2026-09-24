/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 公式アートワークの画像は GitHub 上にあるので、読み込みを許可する
    remotePatterns: [new URL('https://raw.githubusercontent.com/PokeAPI/sprites/**')],
  },
}

export default nextConfig
