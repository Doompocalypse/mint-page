import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="preload"
          href="/fonts/your-font.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link 
          rel="preconnect" 
          href="https://api.devnet.solana.com" 
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
