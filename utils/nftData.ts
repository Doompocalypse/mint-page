import { getImagePath } from './imageLoader';
import { NFTLabel } from './types';

export type NFTData = {
  name: string;
  image: string;
  description: string;
  price: string;
  benefits: string[];
};

export const NFT_DATA: Record<NFTLabel, NFTData> = {
  survivor: {
    name: "Survivor",
    image: getImagePath('survivor'),
    description: "Basic tier NFT with core benefits",
    price: "5 DMC",
    benefits: ["Basic game access", "Common items", "Community access"]
  },
  strategist: {
    name: "Strategist",
    image: getImagePath('strategist'),
    description: "Advanced tier with strategic advantages",
    price: "10 DMC",
    benefits: ["Advanced game features", "Rare items", "Strategy guides"]
  },
  commander: {
    name: "Commander",
    image: getImagePath('commander'),
    description: "Elite tier with leadership perks",
    price: "20 DMC",
    benefits: ["Leadership roles", "Exclusive items", "Early access"]
  },
  architect: {
    name: "Architect",
    image: getImagePath('architect'),
    description: "Builder tier with creation tools",
    price: "50 DMC",
    benefits: ["World building tools", "Custom assets", "Creator badge"]
  },
  vanguard: {
    name: "Vanguard",
    image: getImagePath('vanguard'),
    description: "Pioneer tier with special access",
    price: "100 DMC",
    benefits: ["Beta access", "Special events", "Unique cosmetics"]
  },
  visionary: {
    name: "Visionary",
    image: getImagePath('visionary'),
    description: "Ultimate tier with all features",
    price: "1000 DMC",
    benefits: ["All features", "Exclusive events", "Governance rights"]
  }
};

export const isValidNFTType = (type: string): type is NFTLabel => {
  return type in NFT_DATA;
}; 