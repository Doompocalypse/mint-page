import { useEffect, useState } from 'react';
import { Umi } from "@metaplex-foundation/umi";
import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';

async function getToken22Balance(
  connection: Connection,
  tokenAccountAddress: PublicKey,
  mint: PublicKey
) {
  try {
    // Fetch the token account info
    const tokenAccount = await getAccount(
      connection,
      tokenAccountAddress,
      'confirmed',
      TOKEN_2022_PROGRAM_ID
    );

    // Get the balance
    const balance = Number(tokenAccount.amount);
    
    // Log raw data for debugging
    console.log('Token account data:', {
      balance,
      mint: tokenAccount.mint.toString(),
      owner: tokenAccount.owner.toString()
    });
    
    return balance;
  } catch (error) {
    console.error('Error fetching Token-2022 balance:', error);
    throw error;
  }
}

export const useTokenBalance = (
  umi: Umi,
  tokenMint: string | undefined,
  walletConnected: boolean
) => {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!tokenMint || !walletConnected) {
        setBalance(0);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Create connection from UMI endpoint
        const connection = new Connection(umi.rpc.getEndpoint());
        const mintPubkey = new PublicKey(tokenMint);
        const walletPubkey = new PublicKey(umi.identity.publicKey.toString());

        // Get the token account address
        const tokenAccountAddress = getAssociatedTokenAddressSync(
          mintPubkey,
          walletPubkey,
          true, // allowOwnerOffCurve
          TOKEN_2022_PROGRAM_ID
        );

        console.log('Fetching Token-2022 balance:', {
          mint: tokenMint,
          wallet: walletPubkey.toString(),
          tokenAccount: tokenAccountAddress.toString()
        });

        // Get the balance
        const tokenBalance = await getToken22Balance(
          connection,
          tokenAccountAddress,
          mintPubkey
        );

        console.log('Token-2022 balance fetched:', tokenBalance);
        setBalance(tokenBalance);
        setError(null);

      } catch (err) {
        console.error('Failed to fetch token balance:', err);
        setBalance(0);
        setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();

    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [umi, tokenMint, walletConnected]);

  return { balance, isLoading, error };
}; 