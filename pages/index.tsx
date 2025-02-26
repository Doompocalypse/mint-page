import { PublicKey, publicKey, Umi } from "@metaplex-foundation/umi";
import {
  DigitalAssetWithToken,
  JsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import dynamic from "next/dynamic";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { useUmi } from "../utils/useUmi";
import {
  fetchCandyMachine,
  safeFetchCandyGuard,
  CandyGuard,
  CandyMachine,
  AccountVersion,
} from "@metaplex-foundation/mpl-candy-machine";
import styles from "../styles/Home.module.css";
import { guardChecker } from "../utils/checkAllowed";
import {
  Center,
  Card,
  CardHeader,
  CardBody,
  StackDivider,
  Heading,
  Stack,
  useToast,
  Text,
  Skeleton,
  useDisclosure,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  Image,
  ModalHeader,
  ModalOverlay,
  Box,
  Divider,
  VStack,
  Flex,
  Grid,
  GridItem,
  Select,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { ButtonList } from "../components/mintButton";
import { GuardReturn } from "../utils/checkerHelper";
import { ShowNft } from "../components/showNft";
import { InitializeModal } from "../components/initializeModal";
import { image, headerText } from "../settings";
import { useSolanaTime } from "@/utils/SolanaTimeContext";
import survivorImg from "../utils/img/survivor.webp";
import strategistImg from "../utils/img/strategist.webp";
import commanderImg from "../utils/img/commander.webp";
import architectImg from "../utils/img/architect.webp";
import vanguardImg from "../utils/img/vanguard.webp";
import visionaryImg from "../utils/img/visionary.webp";
import { MintStartPopup } from "../components/MintStartPopup";
import VideoBackground from '../components/VideoBackground';
import Header from '../components/Header';
import NFTCarousel from '../components/NFTCarousel';
import Navigation from '../components/Navigation';
import Head from 'next/head';
import { CheckIcon } from "@chakra-ui/icons";
import { useRouter } from "next/router";
import Preloader from '@/components/Preloader';

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const useCandyMachine = (
  umi: Umi,
  candyMachineId: string,
  checkEligibility: boolean,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>,
  firstRun: boolean,
  setfirstRun: Dispatch<SetStateAction<boolean>>
) => {
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [candyGuard, setCandyGuard] = useState<CandyGuard>();
  const toast = useToast();

  useEffect(() => {
    (async () => {
      if (checkEligibility) {
        if (!candyMachineId) {
          console.error("No candy machine in .env!");
          if (!toast.isActive("no-cm")) {
            toast({
              id: "no-cm",
              title: "No candy machine in .env!",
              description: "Add your candy machine address to the .env file!",
              status: "error",
              duration: 999999,
              isClosable: true,
            });
          }
          return;
        }

        let candyMachine;
        try {
          candyMachine = await fetchCandyMachine(
            umi,
            publicKey(candyMachineId)
          );
          //verify CM Version
          if (candyMachine.version != AccountVersion.V2) {
            toast({
              id: "wrong-account-version",
              title: "Wrong candy machine account version!",
              description:
                "Please use latest sugar to create your candy machine. Need Account Version 2!",
              status: "error",
              duration: 999999,
              isClosable: true,
            });
            return;
          }
        } catch (e) {
          console.error(e);
          toast({
            id: "no-cm-found",
            title: "The CM from .env is invalid",
            description: "Are you using the correct environment?",
            status: "error",
            duration: 999999,
            isClosable: true,
          });
        }
        setCandyMachine(candyMachine);
        if (!candyMachine) {
          return;
        }
        let candyGuard;
        try {
          candyGuard = await safeFetchCandyGuard(
            umi,
            candyMachine.mintAuthority
          );
        } catch (e) {
          console.error(e);
          toast({
            id: "no-guard-found",
            title: "No Candy Guard found!",
            description: "Do you have one assigned?",
            status: "error",
            duration: 999999,
            isClosable: true,
          });
        }
        if (!candyGuard) {
          return;
        }
        setCandyGuard(candyGuard);
        if (firstRun) {
          setfirstRun(false);
        }
      }
    })();
  }, [checkEligibility, candyMachineId, firstRun, setfirstRun, toast, umi]);

  return { candyMachine, candyGuard };
};

// const now = new Date();
// now.setMinutes(now.getMinutes() + 500); // Add 5 minutes
// const isoDate = now.toISOString(); // Convert to ISO 8601 format
// console.log(isoDate);
// ``;

// Add candy machine config type
type CandyMachineConfig = {
  id: string;
  name: string;
  image: string;
  description: string;
};

// Update the CANDY_MACHINES array to include the label property
const CANDY_MACHINES: (CandyMachineConfig & { label: string })[] = [
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_SURVIVOR || '',
    name: "Survivor",
    image: survivorImg.src,
    description: "Survivor NFT Collection",
    label: "survivor"
  },
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_STRATEGIST || '',
    name: "Strategist",
    image: strategistImg.src,
    description: "Strategist NFT Collection",
    label: "strategist"
  },
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_COMMANDER || '',
    name: "Commander",
    image: commanderImg.src,
    description: "Commander NFT Collection",
    label: "commander"
  },
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_ARCHITECT || '',
    name: "Architect",
    image: architectImg.src,
    description: "Architect NFT Collection",
    label: "architect"
  },
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_VANGUARD || '',
    name: "Vanguard",
    image: vanguardImg.src,
    description: "Vanguard NFT Collection",
    label: "vanguard"
  },
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_VISIONARY || '',
    name: "Visionary",
    image: visionaryImg.src,
    description: "Visionary NFT Collection",
    label: "visionary"
  }
];

const NFT_TIERS = [
  {
    name: "Survivor",
    image: survivorImg.src,
    description: "Basic tier NFT with core benefits",
    price: "5 DMC",
    benefits: ["Basic game access", "Common items", "Community access"]
  },
  {
    name: "Strategist",
    image: strategistImg.src,
    description: "Advanced tier with strategic advantages",
    price: "10 DMC",
    benefits: ["Advanced game features", "Rare items", "Strategy guides"]
  },
  {
    name: "Commander",
    image: commanderImg.src,
    description: "Elite tier with leadership perks",
    price: "20 DMC",
    benefits: ["Leadership roles", "Exclusive items", "Early access"]
  },
  {
    name: "Architect",
    image: architectImg.src,
    description: "Builder tier with creation tools",
    price: "50 DMC",
    benefits: ["World building tools", "Custom assets", "Creator badge"]
  },
  {
    name: "Vanguard",
    image: vanguardImg.src,
    description: "Pioneer tier with special access",
    price: "100 DMC",
    benefits: ["Beta access", "Special events", "Unique cosmetics"]
  },
  {
    name: "Visionary",
    image: visionaryImg.src,
    description: "Ultimate tier with all features",
    price: "1000 DMC",
    benefits: ["All features", "Exclusive events", "Governance rights"]
  }
];

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for images and resources
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleMintClick = (nftType: string) => {
    setIsLoading(true);
    router.push(`/mint/${nftType.toLowerCase()}`);
  };

  if (isLoading) {
    return <Preloader message="Loading ..." />;
  }

  return (
    <main>
      <VideoBackground />
      <Navigation />
      <Box 
        position="fixed" 
        top={{ base: 2, md: 4 }} 
        right={{ base: 2, md: 4 }} 
        zIndex={10}
      >
        <WalletMultiButtonDynamic />
      </Box>

      <Box minH="100vh" pt={{ base: 20, md: 24 }}>
        <Header />
        
        <Box maxW="1400px" mx="auto" px={4}>
          <VStack spacing={8} align="stretch">
            <Box>
              <NFTCarousel>
                {NFT_TIERS.map((nft) => (
                  <Box 
                    key={nft.name}
                    bg="rgba(0, 0, 0, 0.7)"
                    borderRadius="xl"
                    overflow="hidden"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    transition="all 0.3s"
                    _hover={{ 
                      transform: "translateY(-4px)",
                      borderColor: "yellow.400",
                      boxShadow: "0 0 20px rgba(255, 255, 0, 0.2)"
                    }}
                  >
                    <Image
                      src={nft.image}
                      alt={nft.name}
                      width="100%"
                      height="auto"
                      objectFit="cover"
                    />
                    
                    <VStack p={6} spacing={4} align="stretch">
                      <Heading size="md" color="white">
                        {nft.name}
                      </Heading>
                      
                      <Text color="whiteAlpha.800" fontSize="sm">
                        {nft.description}
                      </Text>
                      
                      <Text color="yellow.400" fontSize="xl" fontWeight="bold">
                        {nft.price}
                      </Text>
                      
                      <Divider borderColor="whiteAlpha.200" />
                      
                      <VStack align="start" spacing={2}>
                        {nft.benefits.map((benefit, i) => (
                          <HStack key={i} spacing={2}>
                            <Icon as={CheckIcon} color="yellow.400" />
                            <Text color="whiteAlpha.900" fontSize="sm">
                              {benefit}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>
                      
                      <Button
                        size="lg"
                        width="full"
                        height="50px"
                        backgroundColor="yellow.400"
                        color="black"
                        _hover={{ 
                          backgroundColor: "yellow.300",
                          transform: "translateY(-2px)",
                          boxShadow: "0 4px 12px rgba(255, 255, 0, 0.3)"
                        }}
                        _active={{
                          transform: "translateY(1px)"
                        }}
                        onClick={() => handleMintClick(nft.name)}
                        fontWeight="bold"
                        transition="all 0.2s"
                      >
                        Mint Now
                      </Button>
                    </VStack>
                  </Box>
                ))}
              </NFTCarousel>
            </Box>
          </VStack>
        </Box>
      </Box>
    </main>
  );
}
