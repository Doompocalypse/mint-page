import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

export interface PhantomProvider {
  publicKey: PublicKey | null;
  isPhantom?: boolean;
  signAndSendTransaction(
    transaction: VersionedTransaction,
    options?: {
      skipPreflight?: boolean;
      preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
      maxRetries?: number;
    }
  ): Promise<{
    signature: string;
    publicKey: PublicKey;
  }>;
  signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction>;
  signAllTransactions(transactions: (Transaction | VersionedTransaction)[]): Promise<Transaction[]>;
  signMessage(
    message: Uint8Array,
    display?: 'utf8' | 'hex'
  ): Promise<{ signature: Uint8Array; publicKey: PublicKey }>;
  connect(): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  on(event: string, callback: (args: any) => void): void;
  off(event: string, callback: (args: any) => void): void;
  on(event: 'disconnect', callback: () => void): void;
  on(event: 'connect', callback: (publicKey: PublicKey) => void): void;
  off(event: 'disconnect', callback: () => void): void;
  off(event: 'connect', callback: (publicKey: PublicKey) => void): void;
  request(method: string, params: any): Promise<any>;
} 