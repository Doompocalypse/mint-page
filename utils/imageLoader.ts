import { StaticImageData } from 'next/image';

// Import all NFT images
import survivorImg from '@/public/images/survivor.webp';
import strategistImg from '@/public/images/strategist.webp';
import commanderImg from '@/public/images/commander.webp';
import architectImg from '@/public/images/architect.webp';
import vanguardImg from '@/public/images/vanguard.webp';
import visionaryImg from '@/public/images/visionary.webp';

export const NFT_IMAGES: Record<string, StaticImageData> = {
  survivor: survivorImg,
  strategist: strategistImg,
  commander: commanderImg,
  architect: architectImg,
  vanguard: vanguardImg,
  visionary: visionaryImg,
};

export const getImagePath = (nftType: string): string => {
  return `/images/${nftType.toLowerCase()}.webp`;
}; 