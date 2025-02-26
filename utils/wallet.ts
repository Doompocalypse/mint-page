import { Keypair } from '@solana/web3.js';

export function createKeypairFromJson(privateKeyString: string): Keypair {
  const privateKeyArray = JSON.parse(privateKeyString);
  const secretKey = Uint8Array.from(privateKeyArray);
  return Keypair.fromSecretKey(secretKey);
} 