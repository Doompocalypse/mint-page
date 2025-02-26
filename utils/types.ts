export type NFTLabel = 'survivor' | 'strategist' | 'commander' | 'architect' | 'vanguard' | 'visionary';

export interface GuardReturn {
  label: NFTLabel;
  allowed: boolean;
  minting: boolean;
  loadingText?: string;
  tooltip?: string; // Add tooltip to type
}

export const PRICES: Record<NFTLabel, number> = {
  survivor: 5,
  strategist: 10,
  commander: 20,
  architect: 50,
  vanguard: 100,
  visionary: 1000,
}; 