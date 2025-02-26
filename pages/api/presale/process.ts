import { NextApiRequest, NextApiResponse } from 'next';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  Keypair 
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { rateLimit } from '@/utils/rateLimiter';

// Configure API route
export const config = {
  api: {
    bodyParser: true,
    externalResolver: false,
  },
};

const connection = new Connection(process.env.NEXT_PUBLIC_RPC || '');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set proper headers
  res.setHeader('Content-Type', 'application/json');

  // Add error handling for the entire request
  try {
    console.log('Received presale request:', {
      method: req.method,
      body: req.body,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      console.log('Invalid method:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { buyerPublicKey, usdcAmount } = req.body;

      if (!buyerPublicKey || !usdcAmount) {
        console.error('Missing required parameters:', { buyerPublicKey, usdcAmount });
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Check rate limit
      const identifier = buyerPublicKey.toString();
      const rateLimitResult = rateLimit(identifier);
      
      if (!rateLimitResult.allowed) {
        console.log('Rate limit exceeded for:', identifier, 'Time left:', rateLimitResult.timeLeft);
        return res.status(429).json({ 
          error: 'Too many requests', 
          timeLeft: rateLimitResult.timeLeft 
        });
      }

      console.log('Processing transaction for:', {
        buyer: buyerPublicKey,
        amount: usdcAmount
      });

      const buyerPubkey = new PublicKey(buyerPublicKey);
      
      // Create single transaction for all operations
      const transaction = new Transaction();
      
      try {
        // Get all token accounts
        const buyerUsdcAta = getAssociatedTokenAddressSync(
          new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!),
          buyerPubkey,
          false
        );
        console.log('Buyer USDC ATA:', buyerUsdcAta.toString());

        const buyerDmcAta = getAssociatedTokenAddressSync(
          new PublicKey(process.env.NEXT_PUBLIC_DMC_MINT!),
          buyerPubkey,
          false
        );
        console.log('Buyer DMC ATA:', buyerDmcAta.toString());

        const presaleWallet = Keypair.fromSecretKey(
          bs58.decode(process.env.PRESALE_WALLET_PRIVATE_KEY || '')
        );
        console.log('Presale wallet loaded:', presaleWallet.publicKey.toString());

        // Use the token holding account directly instead of deriving it
        const tokenHoldingAccount = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_HOLDING_ACCOUNT!);

        // Check if buyer's DMC token account exists and create if needed
        const buyerDmcAccount = await connection.getAccountInfo(buyerDmcAta);
        if (!buyerDmcAccount) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              buyerPubkey,
              buyerDmcAta,
              buyerPubkey,
              new PublicKey(process.env.NEXT_PUBLIC_DMC_MINT!),
              TOKEN_2022_PROGRAM_ID
            )
          );
        }

        // Add USDC transfer instruction first
        console.log('Adding USDC transfer instruction:', {
          from: buyerUsdcAta.toString(),
          to: process.env.NEXT_PUBLIC_TREASURY_WALLET,
          amount: usdcAmount * (10 ** 6)
        });
        
        transaction.add(
          createTransferCheckedInstruction(
            buyerUsdcAta,
            new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!),
            new PublicKey(process.env.NEXT_PUBLIC_TREASURY_WALLET!),
            buyerPubkey,
            usdcAmount * (10 ** 6),
            6
          )
        );

        // Add DMC token transfer using the token holding account
        console.log('Adding DMC transfer instruction:', {
          from: tokenHoldingAccount.toString(),
          to: buyerDmcAta.toString(),
          amount: usdcAmount * (10 ** 9)
        });
        
        transaction.add(
          createTransferCheckedInstruction(
            tokenHoldingAccount,
            new PublicKey(process.env.NEXT_PUBLIC_DMC_MINT!),
            buyerDmcAta,
            presaleWallet.publicKey,
            usdcAmount * (10 ** 9),
            9,
            [],
            TOKEN_2022_PROGRAM_ID
          )
        );

        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = buyerPubkey;

        // Sign with presale wallet
        console.log('Signing transaction with presale wallet');
        transaction.partialSign(presaleWallet);

        const serializedTransaction = transaction.serialize({ 
          requireAllSignatures: false 
        }).toString('base64');

        console.log('Transaction created and signed successfully');

        console.log('Preparing response with transaction');
        const response = { serializedTransaction };
        console.log('Response object:', response);
        
        return res.status(200).json(response);

      } catch (txError) {
        console.error('Transaction creation error:', {
          error: txError,
          message: txError instanceof Error ? txError.message : String(txError),
          stack: txError instanceof Error ? txError.stack : undefined
        });

        return res.status(500).json({ 
          error: 'Transaction creation failed',
          details: txError instanceof Error ? txError.message : String(txError)
        });
      }

    } catch (error) {
      console.error('API error:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Ensure we're always sending a JSON response
      return res.status(500).json({ 
        error: 'Failed to process transaction',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error('Unhandled API error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 