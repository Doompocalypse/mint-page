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
import { guardChecker } from "../utils/checkAllowed";
import {
  Box,
  useToast,
  useDisclosure,
  VStack,
  Grid,
  GridItem,
  Flex,
  Select,
} from "@chakra-ui/react";
import { ButtonList } from "../components/mintButton";
import { GuardReturn } from "../utils/checkerHelper";
import { ShowNft } from "../components/showNft";
import { InitializeModal } from "../components/initializeModal";
import { image, headerText } from 'settings';
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

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// Add candy machine config type
type CandyMachineConfig = {
  id: string;
  name: string;
  image: string;
  description: string;
  label: string;
};

// Update the CANDY_MACHINES array to use environment variable
const CANDY_MACHINES: CandyMachineConfig[] = [
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_ID || '',
    name: "Survivor",
    image: survivorImg.src,
    description: "Survivor NFT Collection",
    label: "survivor"
  },
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_ID || '',
    name: "Strategist",
    image: strategistImg.src,
    description: "Strategist NFT Collection",
    label: "strategist"
  },
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_ID || '',
    name: "Commander",
    image: commanderImg.src,
    description: "Commander NFT Collection",
    label: "commander"
  },
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_ID || '',
    name: "Architect",
    image: architectImg.src,
    description: "Architect NFT Collection",
    label: "architect"
  },
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_ID || '',
    name: "Vanguard",
    image: vanguardImg.src,
    description: "Vanguard NFT Collection",
    label: "vanguard"
  },
  {
    id: process.env.NEXT_PUBLIC_CANDY_MACHINE_ID || '',
    name: "Visionary",
    image: visionaryImg.src,
    description: "Visionary NFT Collection",
    label: "visionary"
  }
];

const useCandyMachine = (
  umi: Umi,
  candyMachineId: PublicKey,
  checkEligibility: boolean,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>
) => {
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [candyGuard, setCandyGuard] = useState<CandyGuard>();
  const toast = useToast();

  useEffect(() => {
    const fetchCandyMachineData = async () => {
      if (!checkEligibility) return;

      try {
        console.log('Fetching candy machine...');
        const fetchedCandyMachine = await fetchCandyMachine(umi, candyMachineId);
        console.log('Candy machine:', fetchedCandyMachine);
        
        if (!fetchedCandyMachine) {
          throw new Error("Failed to fetch candy machine");
        }
        setCandyMachine(fetchedCandyMachine);

        console.log('Fetching candy guard...');
        const fetchedCandyGuard = await safeFetchCandyGuard(umi, fetchedCandyMachine.mintAuthority);
        console.log('Candy guard:', fetchedCandyGuard);
        
        if (!fetchedCandyGuard) {
          throw new Error("Failed to fetch candy guard");
        }
        setCandyGuard(fetchedCandyGuard);

        setCheckEligibility(false);
      } catch (error) {
        console.error("Error fetching candy machine:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch candy machine data",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };

    fetchCandyMachineData();
  }, [umi, candyMachineId, checkEligibility, setCheckEligibility, toast]);

  return { candyMachine, candyGuard };
};

const NFTMarketplace = () => {
  const umi = useUmi();
  const solanaTime = useSolanaTime();
  const toast = useToast();
  const {
    isOpen: isShowNftOpen,
    onOpen: onShowNftOpen,
    onClose: onShowNftClose,
  } = useDisclosure();
  const {
    isOpen: isInitializerOpen,
    onOpen: onInitializerOpen,
    onClose: onInitializerClose,
  } = useDisclosure();
  
  const [mintsCreated, setMintsCreated] = useState<
    | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
    | undefined
  >();
  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [ownedTokens, setOwnedTokens] = useState<DigitalAssetWithToken[]>();
  const [guards, setGuards] = useState<GuardReturn[]>([
    { label: CANDY_MACHINES[0].label, allowed: false, maxAmount: 15 },
  ]);
  const [checkEligibility, setCheckEligibility] = useState<boolean>(true);
  const [selectedCM, setSelectedCM] = useState<string>(CANDY_MACHINES[0].id);
  const [showMintPopup, setShowMintPopup] = useState(false);
  const [mintStartDate, setMintStartDate] = useState<Date | undefined>();
  const [mintStartTime, setMintStartTime] = useState<bigint | null>(null);

  const candyMachineId: PublicKey = useMemo(() => {
    if (!process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
      console.error("No candy machine ID in environment variables");
      toast({
        title: "Configuration Error",
        description: "Candy machine ID not found",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return publicKey("11111111111111111111111111111111");
    }
    return publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
  }, [toast]);

  const { candyMachine, candyGuard } = useCandyMachine(
    umi,
    candyMachineId,
    checkEligibility,
    setCheckEligibility
  );

  const handleClosePopup = () => {
    setShowMintPopup(false);
  };

  const PageContent = () => {
    if (!candyMachine || !candyGuard) {
      return null;
    }

    return (
      <>
        <Head>
          <title>{headerText}</title>
          <meta name="description" content="Mint your Doompocalypse NFTs" />
        </Head>

        <Box minH="100vh" w="full" color="white">
          <Header />
          
          <VStack 
            spacing={8} 
            maxW="1200px" 
            mx="auto" 
            px={4} 
            pb={20}
          >
            <NFTCarousel>
              {CANDY_MACHINES.map((cm) => (
                <Box 
                  key={cm.name}
                  position="relative"
                  width="100%"
                  height="100%"
                >
                  <Box
                    as="img"
                    src={cm.image}
                    alt={cm.name}
                    width="100%"
                    height="auto"
                    objectFit="cover"
                    borderRadius="xl"
                  />
                </Box>
              ))}
            </NFTCarousel>

            <Grid
              templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}
              gap={6}
              width="full"
            >
              <ButtonList
                guardList={guards}
                candyMachine={candyMachine}
                candyGuard={candyGuard}
                ownedTokens={ownedTokens}
                mintsCreated={mintsCreated}
                setMintsCreated={setMintsCreated}
                setGuardList={setGuards}
                onOpen={onShowNftOpen}
                setCheckEligibility={setCheckEligibility}
              />
            </Grid>
          </VStack>
        </Box>

        <InitializeModal
          isOpen={isInitializerOpen}
          onClose={onInitializerClose}
          candyMachine={candyMachine}
          candyGuard={candyGuard}
        />

        <Modal 
          isOpen={isShowNftOpen} 
          onClose={onShowNftClose}
          size={{ base: "sm", md: "md", lg: "lg" }}
          scrollBehavior="inside"
        >
          <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />
          <ModalContent
            mx="2%"
            sx={{
              "&::-webkit-scrollbar": {
                width: "10px",
                background: "transparent",
              },
              "&::-webkit-scrollbar-track": {
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(255, 255, 255, 0.3)",
                borderRadius: "10px",
                border: "2px solid transparent",
                backgroundClip: "content-box",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: "rgba(255, 255, 255, 0.5)",
              },
            }}
          >
            <ModalHeader>Your minted NFT:</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <ShowNft nfts={mintsCreated} />
            </ModalBody>
          </ModalContent>
        </Modal>

        <MintStartPopup 
          isOpen={showMintPopup} 
          onClose={handleClosePopup}
        />
      </>
    );
  };

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
      <PageContent />
    </main>
  );
};

export default NFTMarketplace; 