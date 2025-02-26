import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

export interface AffiliateSignupResponse {
  success: boolean;
  referralCode?: string;
  error?: string;
}

// Store registered wallets and their referral codes (in production, this would be in a database)
const registeredAffiliates = new Map<string, string>();

const MESSAGE_TO_SIGN = "Sign this message to generate your unique Doompocalypse affiliate referral code";

export const generateReferralCode = (publicKey: PublicKey): string => {
  // Generate a unique referral code using first and last 4 characters of the public key
  const pubKeyString = publicKey.toString();
  return `${pubKeyString.slice(0, 4)}${pubKeyString.slice(-4)}`.toUpperCase();
};

export const signUpAsAffiliate = async (
  walletPublicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<AffiliateSignupResponse> => {
  try {
    // Check if wallet is already registered
    const existingCode = registeredAffiliates.get(walletPublicKey.toString());
    if (existingCode) {
      return {
        success: true,
        referralCode: existingCode
      };
    }

    // Request wallet signature
    const messageBytes = new TextEncoder().encode(MESSAGE_TO_SIGN);
    const signature = await signMessage(messageBytes);
    const signatureString = bs58.encode(signature);

    // Verify the signature (in production, this would be done on the backend)
    // Here we're just checking if we got a signature
    if (!signatureString) {
      throw new Error('Failed to sign the message');
    }

    // Generate referral code
    const referralCode = generateReferralCode(walletPublicKey);
    
    // Store the wallet and referral code (in production, this would be in a database)
    registeredAffiliates.set(walletPublicKey.toString(), referralCode);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      referralCode
    };
  } catch (error) {
    console.error('Affiliate signup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register as affiliate. Please try again.'
    };
  }
};

// Function to check if a wallet is already registered
export const isWalletRegistered = (walletPublicKey: PublicKey): boolean => {
  return registeredAffiliates.has(walletPublicKey.toString());
};

// Function to get existing referral code
export const getExistingReferralCode = (walletPublicKey: PublicKey): string | null => {
  return registeredAffiliates.get(walletPublicKey.toString()) || null;
}; 