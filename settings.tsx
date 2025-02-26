// Token mint address for DMC
export const DMC_TOKEN_MINT = "";

// Add this type definition
export type NFTLabel = 'survivor' | 'strategist' | 'commander' | 'architect' | 'vanguard' | 'visionary';

// Update PRICES to use the new values
export const PRICES: Record<NFTLabel, number> = {
  survivor: 5,      // Changed from 10 to 5
  strategist: 10,   // Changed from 100 to 10
  commander: 20,    // Changed from 1000 to 20
  architect: 50,    // Changed from 10000 to 50
  vanguard: 100,    // Changed from 100000 to 100
  visionary: 1000   // Changed from 1000000 to 1000
};

// Candy Guard configurations
export const guardConfigs = {
  survivor: {
    token2022Payment: {
      amount: 5,
      mint: DMC_TOKEN_MINT
    }
  },
  strategist: {
    token2022Payment: {
      amount: 10,
      mint: DMC_TOKEN_MINT
    }
  },
  commander: {
    token2022Payment: {
      amount: 20,
      mint: DMC_TOKEN_MINT
    }
  },
  architect: {
    token2022Payment: {
      amount: 50,
      mint: DMC_TOKEN_MINT
    }
  },
  vanguard: {
    token2022Payment: {
      amount: 100,
      mint: DMC_TOKEN_MINT
    }
  },
  visionary: {
    token2022Payment: {
      amount: 1000,
      mint: DMC_TOKEN_MINT
    }
  }
};

// Helper function to format large numbers
export const formatAmount = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 10000) {
    return `${(amount / 1000000).toFixed(3)}M`;
  }
  return amount.toLocaleString();
};

// Update mintText with new prices
export const mintText: Array<{
  label: NFTLabel;
  buttonLabel: string;
  price: number;
  header: string;
  mintText: string;
}> = [
  {
    label: "survivor",
    buttonLabel: "Mint (5 DMC)",
    price: 5,
    header: "Survivor NFT",
    mintText: "Mint your Survivor NFT"
  },
  {
    label: "strategist", 
    buttonLabel: "Mint (10 DMC)",
    price: 10,
    header: "Strategist NFT",
    mintText: "Mint your Strategist NFT"
  },
  {
    label: "commander",
    buttonLabel: "Mint (20 DMC)",
    price: 20,
    header: "Commander NFT",
    mintText: "Mint your Commander NFT"
  },
  {
    label: "architect",
    buttonLabel: "Mint (50 DMC)",
    price: 50,
    header: "Architect NFT",
    mintText: "Mint your Architect NFT"
  },
  {
    label: "vanguard",
    buttonLabel: "Mint (100 DMC)",
    price: 100,
    header: "Vanguard NFT",
    mintText: "Mint your Vanguard NFT"
  },
  {
    label: "visionary",
    buttonLabel: "Mint (1000 DMC)",
    price: 1000,
    header: "Visionary NFT",
    mintText: "Mint your Visionary NFT"
  }
];

//header image in the ui. replace with your own
export const image =
  "https://arweave.net/WQRCKlF7Cedf_kLIwn41-iO9oSC1WiKciO73ohvegmc";

//website title
export const headerText = "NFT Collection";
