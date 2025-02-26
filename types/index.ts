export interface WalletStatus {
  connected: boolean;
  publicKey: string | null;
}

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface AffiliateData {
  referralCode: string;
  earnings: number;
  referrals: number;
}

export type TransactionStatus = 'pending' | 'success' | 'failed';

export interface TransactionDetails {
  signature: string;
  status: TransactionStatus;
  timestamp: number;
  amount?: number;
}

export interface SecurityConfig {
  maxAttempts: number;
  timeWindow: number;
  maxAmount: number;
} 