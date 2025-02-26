import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useMemo } from "react";
import { UmiProvider } from "../utils/UmiProvider";
import "@/styles/globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { ChakraProvider } from '@chakra-ui/react'
import { image, headerText } from 'settings'
import { SolanaTimeProvider } from "@/utils/SolanaTimeContext";
import ErrorBoundary from '../components/ErrorBoundary';
import { Inter } from 'next/font/google'

// Initialize the font
const inter = Inter({ subsets: ['latin'] })

export default function App({ Component, pageProps }: AppProps) {
  let network = WalletAdapterNetwork.Devnet;
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === "mainnet-beta" || process.env.NEXT_PUBLIC_ENVIRONMENT === "mainnet") {
    network = WalletAdapterNetwork.Mainnet;
  }
  let endpoint = "https://api.devnet.solana.com";
  if (process.env.NEXT_PUBLIC_RPC) {
    endpoint = process.env.NEXT_PUBLIC_RPC;
  }
  const wallets = useMemo(
    () => [
    ],
    []
  );
  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={headerText} />
        <meta
          property="og:description"
          content="The apocalyptic virtual world where you can earn crypto by playing and convert it into real money."
        />
        <meta name="description" content="The apocalyptic virtual world where you can earn crypto by playing and convert it into real money." />
        <meta name="keywords" content="Doompocalypse, NFT, Play to Earn, P2E, Crypto Gaming, Solana NFT, Web3 Gaming" />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={headerText} />
        <meta name="twitter:description" content="The apocalyptic virtual world where you can earn crypto by playing and convert it into real money." />
        <meta name="twitter:image" content={image} />

        <meta
          property="og:image"
          content={image}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{headerText}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ChakraProvider>
        <main className={inter.className}>
          <ErrorBoundary>
            <WalletProvider wallets={wallets}>
              <ErrorBoundary>
                <UmiProvider endpoint={endpoint}>
                  <ErrorBoundary>
                    <WalletModalProvider>
                      <SolanaTimeProvider>
                        <ErrorBoundary>
                          <Component {...pageProps} />
                        </ErrorBoundary>
                      </SolanaTimeProvider>
                    </WalletModalProvider>
                  </ErrorBoundary>
                </UmiProvider>
              </ErrorBoundary>
            </WalletProvider>
          </ErrorBoundary>
        </main>
      </ChakraProvider>
    </>
  );
}
