import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUmi } from '../../utils/useUmi';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  useToast,
  Link,
  Image,
  Divider,
  HStack,
  Icon,
} from '@chakra-ui/react';
import LoadingState from '../../components/LoadingState';
import VideoBackground from '../../components/VideoBackground';
import Navigation from '../../components/Navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  fetchCandyMachine,
  safeFetchCandyGuard,
  mintV2,
  CandyMachine,
  CandyGuard,
} from "@metaplex-foundation/mpl-candy-machine";
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import { transactionBuilder, generateSigner, some } from '@metaplex-foundation/umi';
import { publicKey } from '@metaplex-foundation/umi';
import { ExternalLinkIcon, CheckIcon } from '@chakra-ui/icons';
import { NFT_DATA } from '@/utils/nftData';
import Preloader from '@/components/Preloader';
import { TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

const StrategistMint = () => {
  const wallet = useWallet();
  const umi = useUmi();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [candyMachine, setCandyMachine] = useState<CandyMachine | null>(null);
  const [candyGuard, setCandyGuard] = useState<CandyGuard | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const nftData = NFT_DATA.strategist;

  useEffect(() => {
    const initializeCandyMachine = async () => {
      if (!process.env.NEXT_PUBLIC_CANDY_MACHINE_STRATEGIST) {
        console.error('No candy machine ID found');
        setIsInitializing(false);
        return;
      }

      try {
        const cmId = publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_STRATEGIST);
        
        // First fetch the candy machine
        const fetchedCm = await fetchCandyMachine(umi, cmId);
        console.log('Fetched CM:', fetchedCm);
        
        // Then fetch the candy guard using the candy machine's guard address
        const guardAddress = fetchedCm.mintAuthority;
        const fetchedGuard = await safeFetchCandyGuard(umi, guardAddress);
        console.log('Fetched Guard:', fetchedGuard);
        
        setCandyMachine(fetchedCm);
        setCandyGuard(fetchedGuard);
      } catch (error) {
        console.error('Error initializing candy machine:', error);
        toast({
          title: "Failed to initialize candy machine",
          description: error instanceof Error ? error.message : "Unknown error",
          status: "error",
          duration: 5000,
        });
      } finally {
        setIsInitializing(false);
      }
    };

    if (umi) {
      initializeCandyMachine();
    }
  }, [umi, toast]);

  const handleMint = async () => {
    if (!wallet.connected || !candyMachine || !candyGuard) {
      toast({
        title: "Please connect your wallet",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const nftMint = generateSigner(umi);
      
      // DMC token constants
      const DMC_MINT = "DooMsvwZZKTgYvg1cfAL4BQpcgQ9WtNLTdM9eTUUQpJ";
      const DMC_TREASURY = "ARSUQNDGm6KxXKJgCctcWMxbDyHYKuadLrKrtAz3rpCT";
      const PRICE = 10 * Math.pow(10, 6); // 10 DMC with 6 decimals

      // Build transaction
      const tx = transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 800_000 }))
        .add(
          mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            nftMint,
            collectionMint: candyMachine.collectionMint,
            collectionUpdateAuthority: candyMachine.authority,
            tokenStandard: TokenStandard.NonFungible,
            candyGuard: candyMachine.mintAuthority,
            mintArgs: {
              token2022Payment: some({
                amount: BigInt(PRICE),
                mint: publicKey(DMC_MINT),
                destinationAta: publicKey(DMC_TREASURY)
              })
            }
          })
        );

      // Send with retries
      let signature;
      try {
        const result = await tx.sendAndConfirm(umi, {
          confirm: { commitment: 'confirmed' },
          send: {
            skipPreflight: true,
            maxRetries: 3,
          },
        });
        signature = result.signature;

        console.log('Transaction successful:', {
          signature,
          nftMint: nftMint.publicKey.toString(),
          candyGuard: candyMachine.mintAuthority.toString(),
        });

      } catch (sendError) {
        console.error('Send error:', sendError);
        throw new Error(sendError instanceof Error ? sendError.message : 'Failed to send transaction');
      }

      toast({
        title: "Minting successful!",
        description: (
          <>
            Your NFT has been minted!
            <Link 
              href={`https://explorer.solana.com/tx/${signature}?cluster=${process.env.NEXT_PUBLIC_ENVIRONMENT}`}
              isExternal
              color="blue.400"
              ml={2}
            >
              View on Explorer <ExternalLinkIcon mx="2px" />
            </Link>
          </>
        ),
        status: "success",
        duration: 10000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Minting error:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      let description = errorMessage;

      if (errorMessage.includes("AccountNotInitialized")) {
        description = "Candy Guard not initialized. Please contact support.";
      } else if (errorMessage.includes("insufficient funds")) {
        description = "Insufficient DMC tokens to mint this NFT. You need exactly 10 DMC tokens.";
      } else if (errorMessage.includes("start date")) {
        description = "Minting starts on January 28, 2025";
      } else if (errorMessage.includes("end date")) {
        description = "Minting period has ended";
      } else if (errorMessage.includes("simulation failed")) {
        description = "Transaction failed. Please ensure you have exactly 10 DMC tokens and try again.";
      } else if (errorMessage.includes("account not initialized")) {
        description = "Please initialize your DMC token account first";
      }

      toast({
        title: "Minting failed",
        description: description,
        status: "error",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return <Preloader message="Initializing NFT Mint" />;
  }

  return (
    <main>
      <VideoBackground />
      <Navigation />
      
      <Box position="fixed" top={4} right={4} zIndex={10}>
        <WalletMultiButton />
      </Box>

      <Box 
        minH="100vh" 
        pt={24} 
        px={4}
        position="relative"
        zIndex={1}
      >
        <VStack 
          maxW="800px" 
          mx="auto" 
          spacing={8}
          bg="rgba(0, 0, 0, 0.7)"
          p={8}
          borderRadius="xl"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <HStack spacing={8} align="start" w="full">
            <Box flex="1">
              <Image
                src={nftData.image}
                alt={nftData.name}
                borderRadius="xl"
                width="100%"
                height="auto"
                objectFit="cover"
              />
            </Box>
            
            <VStack flex="1" align="stretch" spacing={6}>
              <Heading color="white">{nftData.name} NFT</Heading>
              
              <Text color="whiteAlpha.900">
                {nftData.description}
              </Text>
              
              <Text color="yellow.400" fontSize="2xl" fontWeight="bold">
                {nftData.price}
              </Text>
              
              <Divider borderColor="whiteAlpha.200" />
              
              <VStack align="start" spacing={3}>
                <Text color="white" fontWeight="bold">Benefits:</Text>
                {nftData.benefits.map((benefit, i) => (
                  <HStack key={i} spacing={2}>
                    <Icon as={CheckIcon} color="yellow.400" />
                    <Text color="whiteAlpha.900">
                      {benefit}
                    </Text>
                  </HStack>
                ))}
              </VStack>
              
              <Button
                size="lg"
                width="full"
                height="60px"
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
                onClick={handleMint}
                isLoading={isLoading}
                loadingText="Minting..."
                fontWeight="bold"
                transition="all 0.2s"
                isDisabled={!candyMachine || !candyGuard}
              >
                Mint {nftData.name} NFT
              </Button>
            </VStack>
          </HStack>
        </VStack>
      </Box>

      {isLoading && <LoadingState message="Minting your NFT..." />}
    </main>
  );
};

export default StrategistMint; 