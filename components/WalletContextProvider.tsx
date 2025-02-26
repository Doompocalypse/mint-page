import { useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CloverWalletAdapter
} from '@solana/wallet-adapter-wallets';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { GlowWalletAdapter } from '@solana/wallet-adapter-glow';

require('@solana/wallet-adapter-react-ui/styles.css');

export const WalletContextProvider = ({ children }: { children: React.ReactNode }) => {
  const network = process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet-beta' ? 
    WalletAdapterNetwork.Mainnet : 
    WalletAdapterNetwork.Devnet;

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CloverWalletAdapter(),
      new BackpackWalletAdapter(),
      new GlowWalletAdapter()
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={process.env.NEXT_PUBLIC_RPC || ''}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}; 