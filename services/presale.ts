import { 
  Connection, 
  PublicKey, 
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  Account as TokenAccount,
  unpackAccount,
} from '@solana/spl-token';
import { createKeypairFromJson } from '../utils/wallet';
import { settings } from '../utils/settings';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { PhantomProvider } from '../types/phantom';
import {
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction,
} from "@solana-program/compute-budget";
import { z } from 'zod';
import { rateLimit } from '../utils/rateLimiter';

interface PythPriceResponse {
  parsed: [{
    price: {
      price: string;
      conf: string;
      expo: number;
    }
  }];
}

// Add this interface near the top with other interfaces
interface TransactionConfirmation {
  value: {
    err: any;
    slot: number;
    confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
  };
}

// Add this function to detect Phantom provider
const getProvider = (): PhantomProvider | undefined => {
  if ('phantom' in window) {
    const provider = (window as any).phantom?.solana;
    if (provider?.isPhantom) {
      return provider;
    }
  }
  return undefined;
};

// Add schema definition after imports
const purchaseSchema = z.object({
  usdAmount: z.number().positive().max(100000), // Set reasonable max limit
  solEquivalent: z.number().positive(),
  dmcAmount: z.number().positive()
});

// Add additional validation schema
const walletSecuritySchema = z.object({
  isSecure: z.boolean(),
  isConnected: z.boolean(),
  hasProvider: z.boolean(),
  publicKey: z.string().min(32).max(44)
});

export class PresaleService {
  private connection: Connection;
  private dmcMint: PublicKey;
  private presaleWallet: Keypair;
  private lastTransaction: string | null = null;
  private lastBalance: number | null = null;

  constructor() {
    try {
      this.connection = new Connection(process.env.NEXT_PUBLIC_RPC || '');
      this.dmcMint = new PublicKey(process.env.NEXT_PUBLIC_DMC_MINT!);

      // Use a less obvious name for the private key
      const secretBytes = process.env.NEXT_PUBLIC_AUTHORITY_CONFIG;
      if (!secretBytes) {
        throw new Error('Authority configuration is missing');
      }

      // Convert JSON array string to Uint8Array
      const secretArray = JSON.parse(secretBytes);
      const secretUint8 = new Uint8Array(secretArray);
      
      // Create keypair from bytes
      this.presaleWallet = Keypair.fromSecretKey(secretUint8);

      // Verify the public key matches expected
      if (this.presaleWallet.publicKey.toString() !== process.env.NEXT_PUBLIC_PRESALE_WALLET) {
        throw new Error('Authority configuration mismatch');
      }

    } catch (error) {
      console.error('Service initialization error:', error);
      throw new Error('Failed to initialize service: ' + 
        (error instanceof Error ? error.message : String(error)));
    }
  }

  async getTokenAccount(pubkey: PublicKey, isToken2022: boolean = false): Promise<TokenAccount | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(pubkey);
      if (!accountInfo) {
        return null;
      }

      return unpackAccount(pubkey, accountInfo, TOKEN_2022_PROGRAM_ID);
    } catch (error) {
      console.error('Error fetching token account:', error);
      return null;
    }
  }

  async getDmcBalance(walletPublicKey: PublicKey): Promise<number> {
    try {
      const dmcAta = getAssociatedTokenAddressSync(
        this.dmcMint,
        walletPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const account = await this.getTokenAccount(dmcAta, true);
      if (!account) {
        return 0;
      }

      return Number(account.amount) / (10 ** 6); // Convert from smallest units to DMC
    } catch (error) {
      console.error('Error fetching DMC balance:', error);
      return 0;
    }
  }

  async getAllTokenBalances(walletPublicKey: PublicKey) {
    try {
      const balances: { [mint: string]: number } = {};

      // Get standard token accounts
      const standardAta = getAssociatedTokenAddressSync(
        this.dmcMint,
        walletPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      const usdcAccount = await this.getTokenAccount(standardAta);
      if (usdcAccount) {
        balances[this.dmcMint.toString()] = Number(usdcAccount.amount);
      }

      // Get Token-2022 accounts
      const dmcAta = getAssociatedTokenAddressSync(
        this.dmcMint,
        walletPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      const dmcAccount = await this.getTokenAccount(dmcAta, true);
      if (dmcAccount) {
        balances[this.dmcMint.toString()] = Number(dmcAccount.amount);
      }

      return balances;
    } catch (error) {
      console.error('Error fetching token balances:', error);
      return {};
    }
  }

  private async transferSplToken(
    fromWallet: Keypair,
    toPublicKey: PublicKey,
    tokenMint: PublicKey,
    amount: number,
    decimals: number,
    isToken2022: boolean = false
  ): Promise<string> {
    try {
      // Create array of instructions
      const instructions: TransactionInstruction[] = [];

      // Get token accounts
      const fromAta = getAssociatedTokenAddressSync(
        tokenMint,
        fromWallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const toAta = getAssociatedTokenAddressSync(
        tokenMint,
        toPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Create destination account if it doesn't exist
      const toAccount = await this.getTokenAccount(toAta, true);
      if (!toAccount) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            fromWallet.publicKey,
            toAta,
            toPublicKey,
            tokenMint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Add compute budget instruction
      instructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 5000
        })
      );

      // Add transfer instruction
      const transferAmount = amount * Math.pow(10, decimals);
      instructions.push(
        createTransferCheckedInstruction(
          fromAta,
          tokenMint,
          toAta,
          fromWallet.publicKey,
          BigInt(Math.floor(transferAmount)),
          decimals,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');

      // Create v0 compatible message
      const messageV0 = new TransactionMessage({
        payerKey: fromWallet.publicKey,
        recentBlockhash: blockhash,
        instructions
      }).compileToV0Message();

      // Create versioned transaction
      const transaction = new VersionedTransaction(messageV0);

      // Sign transaction
      transaction.sign([fromWallet]);

      // Send and confirm transaction
      const signature = await this.connection.sendTransaction(transaction);
      
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
      }

      return signature;

    } catch (error) {
      console.error('Error transferring tokens:', error);
      throw new Error('Failed to transfer tokens: ' + 
        (error instanceof Error ? error.message : String(error)));
    }
  }

  async transferDmcTokens(
    fromWallet: Keypair,
    toPublicKey: PublicKey,
    amount: number
  ): Promise<string> {
    try {
      // Create array of instructions
      const instructions: TransactionInstruction[] = [];

      // Get token accounts
      const fromAta = getAssociatedTokenAddressSync(
        this.dmcMint,
        fromWallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const toAta = getAssociatedTokenAddressSync(
        this.dmcMint,
        toPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Check if recipient token account exists
      const toAccount = await this.getTokenAccount(toAta, true);
      if (!toAccount) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            fromWallet.publicKey,
            toAta,
            toPublicKey,
            this.dmcMint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Add compute budget instruction
      instructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 5000
        })
      );

      // Add transfer instruction
      instructions.push(
        createTransferCheckedInstruction(
          fromAta,
          this.dmcMint,
          toAta,
          fromWallet.publicKey,
          BigInt(Math.floor(amount * Math.pow(10, 6))),
          6,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');

      // Create v0 compatible message
      const messageV0 = new TransactionMessage({
        payerKey: fromWallet.publicKey,
        recentBlockhash: blockhash,
        instructions
      }).compileToV0Message();

      // Create versioned transaction
      const transaction = new VersionedTransaction(messageV0);

      // Sign transaction
      transaction.sign([fromWallet]);

      // Send and confirm transaction
      const signature = await this.connection.sendTransaction(transaction);
      
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
      }

      return signature;

    } catch (error) {
      console.error('Transfer error:', error);
      throw new Error('Failed to transfer DMC tokens: ' + 
        (error instanceof Error ? error.message : JSON.stringify(error)));
    }
  }

  async calculateSolAmountFromUsd(usdAmount: number): Promise<number> {
    try {
      const solPrice = await this.getSolPrice();
      return usdAmount / solPrice; // This gives us SOL amount needed for the USD value
    } catch (error) {
      console.error('Error calculating SOL amount:', error);
      throw new Error('Failed to calculate SOL amount: ' + 
        (error instanceof Error ? error.message : String(error)));
    }
  }

  async processPurchase(
    wallet: WalletContextState,
    usdAmount: number
  ): Promise<{ solSignature: string; tokenSignature: string }> {
    try {
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error('Wallet is not connected');
      }

      console.log('Starting purchase process...');

      // Calculate total amount including potential token account fee
      const { solAmount, needsTokenAccount } = await this.calculateTotalSolAmount(wallet, usdAmount);
      console.log('Calculated amounts:', { solAmount, needsTokenAccount });

      // Create and send SOL transfer transaction
      const solTransaction = await this.createSolTransferTransaction(wallet, usdAmount);
      
      if (!wallet.signTransaction) {
        throw new Error('Wallet does not support signing transactions');
      }

      // Sign and send transaction
      console.log('Sending SOL transfer transaction...');
      const signedTx = await wallet.signTransaction(solTransaction);
      const solSignature = await this.connection.sendRawTransaction(signedTx.serialize());
      console.log('SOL transfer sent:', solSignature);

      // Wait for SOL transfer confirmation
      const solConfirmation = await this.connection.confirmTransaction(solSignature, 'confirmed');
      if (solConfirmation.value.err) {
        throw new Error('SOL transfer failed');
      }
      console.log('SOL transfer confirmed successfully');

      // Execute token transfer with retries
      let tokenSignature: string | null = null;
      let lastError: Error | null = null;
      const maxRetries = 5;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempting token transfer (attempt ${attempt}/${maxRetries})...`);
          tokenSignature = await this.executeInternalTokenTransfer(
            wallet.publicKey, 
            usdAmount,
            solSignature // Pass the successful SOL transaction signature
          );
          console.log('Token transfer successful:', tokenSignature);
          break; // Exit loop if successful
        } catch (error) {
          lastError = error as Error;
          console.error(`Token transfer attempt ${attempt} failed:`, error);
          
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!tokenSignature) {
        throw new Error(`Token transfer failed after ${maxRetries} attempts: ${lastError?.message}`);
      }

      return { solSignature, tokenSignature };
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Purchase process error:', errorMessage);
      
      if (errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by the user';
      }
      
      throw new Error(`Wallet error: ${errorMessage}`);
    }
  }

  async getTransactionStatus(signature: string, maxRetries: number = 60): Promise<boolean> {
    try {
      let retries = 0;
      while (retries < maxRetries) {
        const status = await this.connection.getSignatureStatus(signature);
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
      }
      return false;
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return false;
    }
  }

  async waitForTransaction(signature: string, maxRetries: number = 60): Promise<boolean> {
    try {
      console.log(`Waiting for transaction ${signature} to confirm...`);
      let retries = 0;
      while (retries < maxRetries) {
        const status = await this.connection.getSignatureStatus(signature);
        
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          console.log(`Transaction ${signature} confirmed after ${retries} seconds`);
          return true;
        }
        
        if (status.value?.err) {
          console.error(`Transaction ${signature} failed:`, status.value.err);
          return false;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
      }
      
      console.error(`Transaction ${signature} timed out after ${maxRetries} seconds`);
      return false;
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      return false;
    }
  }

  async getSolPrice(): Promise<number> {
    try {
      const response = await fetch(
        'https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d&encoding=base64&parsed=true&ignore_invalid_price_ids=true'
      );
      
      const data: PythPriceResponse = await response.json();
      const solPrice = Number(data.parsed[0].price.price) * Math.pow(10, data.parsed[0].price.expo);
      
      return solPrice;
    } catch (error) {
      console.error('Error fetching SOL price:', error);
      throw new Error('Failed to fetch SOL price');
    }
  }

  async calculateDmcAmount(solAmount: number): Promise<number> {
    const solPrice = await this.getSolPrice();
    return solAmount * solPrice; // Convert SOL to USD value (DMC)
  }

  async calculateSolAmount(dmcAmount: number): Promise<number> {
    const solPrice = await this.getSolPrice();
    return dmcAmount / solPrice; // Convert DMC (USD) to SOL
  }

  async getSolBalance(walletPublicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(walletPublicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return 0;
    }
  }

  // Add method to verify wallet state
  private async verifyWalletState(wallet: WalletContextState): Promise<boolean> {
    if (!wallet.connected || !wallet.publicKey) {
      return false;
    }

    const userPublicKey = wallet.publicKey;
    try {
      const balance = await this.connection.getBalance(userPublicKey);
      return balance > 0;
    } catch {
      return false;
    }
  }

  async handleWalletDisconnect(wallet: WalletContextState): Promise<void> {
    try {
      // Get provider
      const provider = getProvider();
      if (!provider) {
        throw new Error('Phantom wallet not found');
      }

      // Verify current connection state
      if (!wallet.connected) {
        return; // Already disconnected
      }

      // Attempt to disconnect
      await provider.disconnect();

      // Clear any cached data or state
      this.clearWalletState();

    } catch (error) {
      console.error('Error handling wallet disconnect:', error);
      throw new Error('Failed to disconnect wallet properly: ' + 
        (error instanceof Error ? error.message : String(error)));
    }
  }

  private clearWalletState(): void {
    try {
      // Clear stored data
      localStorage.removeItem('walletData');
      sessionStorage.removeItem('walletSession');
      
      // Reset internal state
      this.lastTransaction = null;
      this.lastBalance = null;
    } catch (error) {
      console.error('Error clearing wallet state:', error);
    }
  }

  async createSolTransferTransaction(
    wallet: WalletContextState,
    usdAmount: number
  ): Promise<VersionedTransaction> {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    // Calculate SOL amount
    const { solAmount, needsTokenAccount } = await this.calculateTotalSolAmount(wallet, usdAmount);
    const totalLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
    const tokenAccountFeeLamports = 2170000; // 0.00217 SOL in lamports

    // Create instructions array
    const instructions = [];

    // Add compute budget instructions for priority fee
    instructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }) // Priority fee: 0.00005 SOL
    );

    if (needsTokenAccount) {
      // Send token account fee to presale wallet
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: this.presaleWallet.publicKey,
          lamports: tokenAccountFeeLamports
        })
      );

      // Send remaining SOL to treasury
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(process.env.NEXT_PUBLIC_TREASURY_WALLET!),
          lamports: totalLamports - tokenAccountFeeLamports
        })
      );
    } else {
      // If no token account needed, send all SOL to treasury
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(process.env.NEXT_PUBLIC_TREASURY_WALLET!),
          lamports: totalLamports
        })
      );
    }

    // Get latest blockhash
    const { blockhash } = await this.connection.getLatestBlockhash('finalized');

    // Create transaction message
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
  }

  async createTokenTransferTransaction(
    wallet: WalletContextState,
    usdAmount: number
  ): Promise<VersionedTransaction> {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    const instructions: TransactionInstruction[] = [];

    // Get buyer's DMC token account
    const buyerDmcAta = getAssociatedTokenAddressSync(
      this.dmcMint,
      wallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Check if buyer's DMC token account exists
    const buyerDmcAccount = await this.getTokenAccount(buyerDmcAta, true);
    if (!buyerDmcAccount) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          buyerDmcAta,
          wallet.publicKey,
          this.dmcMint,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    // Get presale wallet's DMC token account
    const presaleDmcAta = getAssociatedTokenAddressSync(
      this.dmcMint,
      this.presaleWallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Add DMC transfer instruction
    instructions.push(
      createTransferCheckedInstruction(
        presaleDmcAta,
        this.dmcMint,
        buyerDmcAta,
        this.presaleWallet.publicKey,
        BigInt(Math.floor(usdAmount * Math.pow(10, 6))),
        6,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    // Get latest blockhash
    const { blockhash } = await this.connection.getLatestBlockhash('finalized');

    // Create transaction message
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();

    // Create versioned transaction
    const transaction = new VersionedTransaction(messageV0);

    // Sign with presale wallet
    transaction.sign([this.presaleWallet]);

    return transaction;
  }

  async calculateTotalSolAmount(
    wallet: WalletContextState,
    usdAmount: number
  ): Promise<{ solAmount: number; needsTokenAccount: boolean }> {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    // Calculate base SOL amount for USD
    const baseSolAmount = await this.calculateSolAmountFromUsd(usdAmount);

    // Get buyer's DMC token account
    const buyerDmcAta = getAssociatedTokenAddressSync(
      this.dmcMint,
      wallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Check if buyer's DMC token account exists
    const buyerDmcAccount = await this.getTokenAccount(buyerDmcAta, true);
    const needsTokenAccount = !buyerDmcAccount;

    // If token account needs to be created, add 0.00217 SOL to the total
    const totalSolAmount = needsTokenAccount ? 
      baseSolAmount + 0.00217 : // Add exact token account creation fee
      baseSolAmount;

    return {
      solAmount: totalSolAmount,
      needsTokenAccount
    };
  }

  private async executeInternalTokenTransfer(
    recipientPublicKey: PublicKey,
    usdAmount: number,
    solTxSignature: string
  ): Promise<string> {
    try {
      console.log('Starting internal token transfer...', {
        recipient: recipientPublicKey.toString(),
        amount: usdAmount,
        solTxSignature
      });

      // Get recipient's DMC token account
      const recipientDmcAta = getAssociatedTokenAddressSync(
        this.dmcMint,
        recipientPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      console.log('Recipient DMC ATA:', recipientDmcAta.toString());

      // Create instructions array
      const instructions: TransactionInstruction[] = [];

      // Add compute budget instructions with higher priority for retries
      instructions.push(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 150000 }) // Increased priority fee for retries
      );

      // Check if recipient's token account exists
      const recipientAccount = await this.getTokenAccount(recipientDmcAta, true);
      if (!recipientAccount) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            this.presaleWallet.publicKey,
            recipientDmcAta,
            recipientPublicKey,
            this.dmcMint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Get presale wallet's DMC token account
      const presaleDmcAta = getAssociatedTokenAddressSync(
        this.dmcMint,
        this.presaleWallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Add DMC transfer instruction
      instructions.push(
        createTransferCheckedInstruction(
          presaleDmcAta,
          this.dmcMint,
          recipientDmcAta,
          this.presaleWallet.publicKey,
          BigInt(Math.floor(usdAmount * Math.pow(10, 6))),
          6,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      // Get latest blockhash with higher priority
      const { blockhash } = await this.connection.getLatestBlockhash('finalized');

      // Create transaction message
      const messageV0 = new TransactionMessage({
        payerKey: this.presaleWallet.publicKey,
        recentBlockhash: blockhash,
        instructions
      }).compileToV0Message();

      // Create versioned transaction
      const transaction = new VersionedTransaction(messageV0);

      // Sign with presale wallet
      transaction.sign([this.presaleWallet]);

      // Send transaction with preflight and increased priority
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'processed',
        maxRetries: 5,
        minContextSlot: await this.connection.getSlot('confirmed')
      });
      console.log('Token transfer transaction sent:', signature);

      // Wait for confirmation with longer timeout
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        console.error('Token transfer confirmation error:', confirmation.value.err);
        throw new Error('Token transfer failed to confirm');
      }

      console.log('Token transfer confirmed successfully');
      return signature;
    } catch (error) {
      console.error('Error executing internal token transfer:', error);
      throw new Error('Failed to transfer tokens: ' + 
        (error instanceof Error ? error.message : String(error)));
    }
  }
}

export const presaleService = new PresaleService(); 