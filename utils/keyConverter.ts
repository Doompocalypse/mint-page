import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export function convertPrivateKey(base58Key: string): string {
  const decoded = bs58.decode(base58Key);
  const array = Array.from(decoded);
  
  // Validate length
  if (array.length !== 64) {
    throw new Error(`Invalid private key length. Expected 64 bytes, got ${array.length}`);
  }
  
  // Format with line breaks for readability
  return `[\n  ${array.slice(0, 16).join(',')},\n  ${array.slice(16, 32).join(',')},\n  ${array.slice(32, 48).join(',')},\n  ${array.slice(48).join(',')}\n]`;
}

// Example usage:
// const base58Key = "your_base58_key_here";
// console.log(convertPrivateKey(base58Key)); 