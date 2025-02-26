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
  HStack,
  Icon,
  Divider,
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
} from '@metaplex-foundation/mpl-candy-machine';
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import { transactionBuilder, generateSigner, some, publicKey } from '@metaplex-foundation/umi';
import { ExternalLinkIcon, CheckIcon } from '@chakra-ui/icons';
import { NFT_DATA } from '@/utils/nftData';
import Preloader from '@/components/Preloader';
import { Buffer } from 'buffer';

const SurvivorMint = () => {
  const wallet = useWallet();
  const umi = useUmi();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [candyMachine, setCandyMachine] = useState<CandyMachine | null>(null);
  const [candyGuard, setCandyGuard] = useState<CandyGuard | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const nftData = NFT_DATA.survivor;

  useEffect(() => {
    const initializeCandyMachine = async () => {
      if (!umi || !process.env.NEXT_PUBLIC_CANDY_MACHINE_SURVIVOR) {
        console.error('Missing UMI instance or Candy Machine ID');
        setIsInitializing(false);
        return;
      }

      try {
        const cmId = publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_SURVIVOR);
        const fetchedCm = await fetchCandyMachine(umi, cmId);
        console.log('Fetched Candy Machine:', fetchedCm);
        
        const guardAddress = fetchedCm.mintAuthority;
        const fetchedGuard = await safeFetchCandyGuard(umi, guardAddress);
        console.log('Fetched Candy Guard:', fetchedGuard);

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

    initializeCandyMachine();
  }, [umi, toast]);

  const handleConnect = async () => {
    try {
      const provider = window.solana; // Access the Phantom provider
      const resp = await provider.connect(); // Request connection
      console.log('Connected to wallet:', resp.publicKey.toString());
    } catch (err) {
      console.error('Connection error:', err);
      toast({
        title: "Connection failed",
        description: typeof err === 'object' && err !== null && 'message' in err ? (err as Error).message : "User rejected the request.",
        status: "error",
        duration: 5000,
      });
    }
  };

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
      const DMC_MINT = publicKey('DooMsvwZZKTgYvg1cfAL4BQpcgQ9WtNLTdM9eTUUQpJ');
      const DMC_TREASURY = publicKey('ARSUQNDGm6KxXKJgCctcWMxbDyHYKuadLrKrtAz3rpCT');
      const PRICE = BigInt(5 * 10 ** 6); // Adjust the price as needed

      // Sign a message before proceeding with the transaction
      if (wallet.signMessage) {
        const message = `Mint ${nftData.name} NFT for ${nftData.price}? This will deduct ${nftData.price} from your wallet.`;
        await wallet.signMessage(new TextEncoder().encode(message));
      }

      const tx = transactionBuilder()
        .prepend(setComputeUnitLimit(umi, { units: 800_000 }))
        .add(
          mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            nftMint,
            collectionMint: candyMachine.collectionMint,
            collectionUpdateAuthority: candyMachine.authority,
            candyGuard: candyGuard.publicKey,
            mintArgs: {
              token2022Payment: some({
                amount: PRICE,
                mint: DMC_MINT,
                destinationAta: DMC_TREASURY,
              }),
            },
          })
        );

      const result = await tx.sendAndConfirm(umi, {
        confirm: { commitment: 'confirmed' },
        send: {
          skipPreflight: true,
          maxRetries: 3,
        },
      });

      const signature = result.signature;
      await umi.connection.getSignatureStatus(signature);

      toast({
        title: "Minting successful!",
        description: (
          <>
            Your NFT has been minted!{' '}
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

      if (errorMessage.includes("insufficient funds")) {
        description = "Insufficient DMC tokens to mint this NFT. You need exactly 5 DMC tokens.";
      } else if (errorMessage.includes("simulation failed")) {
        description = "Transaction failed. Please ensure you have enough DMC tokens and try again.";
      } else if (errorMessage.includes("account not initialized")) {
        description = "Please initialize your DMC token account first.";
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
        <WalletMultiButton onClick={handleConnect} />
      </Box>
      <Box minH="100vh" pt={24} px={4} position="relative" zIndex={1}>
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
              <img
                src={nftData.image}
                alt={nftData.name}
                style={{
                  borderRadius: '12px',
                  width: '100%',
                  height: 'auto',
                  objectFit: 'cover',
                }}
              />
            </Box>
            <VStack flex="1" align="stretch" spacing={6}>
              <Heading color="white">{nftData.name} NFT</Heading>
              <Text color="whiteAlpha.900">{nftData.description}</Text>
              <Text color="yellow.400" fontSize="2xl" fontWeight="bold">
                {nftData.price}
              </Text>
              <Divider borderColor="whiteAlpha.200" />
              <VStack align="start" spacing={3}>
                <Text color="white" fontWeight="bold">Benefits:</Text>
                {nftData.benefits.map((benefit, i) => (
                  <HStack key={i} spacing={2}>
                    <Icon as={CheckIcon} color="yellow.400" />
                    <Text color="whiteAlpha.900">{benefit}</Text>
                  </HStack>
                ))}
              </VStack>
              <Button
                size="lg"
                width="full"
                height="60px"
                backgroundColor="yellow.400"
                color="black"
                _hover={{ backgroundColor: 'yellow.300', transform: 'translateY(-2px)' }}
                _active={{ transform: 'translateY(1px)' }}
                onClick={handleMint}
                isLoading={isLoading}
                loadingText="Minting..."
                fontWeight="bold"
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

export default SurvivorMint;
