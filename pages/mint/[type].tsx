import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUmi } from '../../utils/useUmi';
import dynamic from 'next/dynamic';
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
} from '@chakra-ui/react';
import LoadingState from '../../components/LoadingState';
import VideoBackground from '../../components/VideoBackground';
import Navigation from '../../components/Navigation';
import {
  fetchCandyMachine,
  safeFetchCandyGuard,
  mintV2,
  CandyMachine,
  CandyGuard,
} from '@metaplex-foundation/mpl-candy-machine';
import {
  setComputeUnitLimit,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import {
  transactionBuilder,
  generateSigner,
  some,
  none,
  publicKey,
} from '@metaplex-foundation/umi';
import { ExternalLinkIcon, CheckIcon } from '@chakra-ui/icons';
import { NFT_DATA } from '@/utils/nftData';
import Preloader from '@/components/Preloader';
import ImageNext from 'next/image';
import {
  chooseGuardToUse,
  mintArgsBuilder,
  validateCandyMachine,
  getCandyMachineState,
  getGuardDates,
} from '@/utils/candyMachineHelper';
import { Buffer } from 'buffer';
import { randomBytes } from 'crypto';

// Dynamic import for WalletMultiButton
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

// Fetch with retry utility
const fetchWithRetry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Sign and send transaction with Phantom compatibility
const signAndSendTransaction = async (umi, transaction) => {
  try {
    // Get latest blockhash
    const latestBlockhash = await umi.rpc.getLatestBlockhash();
    const tx = transactionBuilder()
      .add(transaction.instructions)
      .setBlockhash(latestBlockhash)
      .build(umi);

    // Simulate transaction to ensure Phantom accepts it
    const simulation = await umi.rpc.simulateTransaction(tx);
    if (simulation.value.err) {
      throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.logs)}`);
    }

    // Sign and send
    const signedTx = await umi.identity.signTransaction(tx);
    const signature = await umi.rpc.sendTransaction(signedTx, {
      skipPreflight: false, // Let Phantom verify
      preflightCommitment: 'processed',
    });

    // Confirm transaction
    const confirmation = await umi.rpc.confirmTransaction(signature, {
      strategy: {
        type: 'blockhash',
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
    });

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    return signature;
  } catch (error) {
    console.error('Sign and send error:', error);
    throw error;
  }
};

// Simplified message signing for user confirmation
const signMessage = async (wallet, { message }) => {
  if (!wallet.signMessage) {
    throw new Error('Wallet does not support message signing');
  }

  const encodedMessage = new TextEncoder().encode(message);
  const signedMessage = await wallet.signMessage(encodedMessage);
  return Buffer.from(signedMessage).toString('base64');
};

const NFTMintPage = () => {
  const router = useRouter();
  const { type } = router.query;
  const nftType = (typeof type === 'string' ? type.toLowerCase() : '');
  const nftData = NFT_DATA[nftType];

  const wallet = useWallet();
  const umi = useUmi();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [candyMachine, setCandyMachine] = useState(null);
  const [candyGuard, setCandyGuard] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize Candy Machine
  useEffect(() => {
    if (!nftType || !umi) return;

    const initializeCandyMachine = async () => {
      setIsInitializing(true);
      const envKey = `NEXT_PUBLIC_CANDY_MACHINE_${nftType.toUpperCase()}`;
      const candyMachineId = process.env[envKey];

      if (!candyMachineId) {
        console.error(`No candy machine ID for ${nftType}`);
        toast({
          title: 'Configuration Error',
          description: 'Invalid Candy Machine ID',
          status: 'error',
          duration: 5000,
        });
        setIsInitializing(false);
        return;
      }

      try {
        const cmId = publicKey(candyMachineId);
        const cm = await fetchWithRetry(() => fetchCandyMachine(umi, cmId));
        const guard = await fetchWithRetry(() => safeFetchCandyGuard(umi, cm.mintAuthority));

        setCandyMachine(cm);
        setCandyGuard(guard);
      } catch (error) {
        console.error('Initialization error:', error);
        toast({
          title: 'Initialization Failed',
          description: error.message || 'Failed to load Candy Machine',
          status: 'error',
          duration: 5000,
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeCandyMachine();
  }, [umi, nftType, toast]);

  // Mint handler
  const handleMint = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your Phantom wallet',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!candyMachine || !candyGuard || !nftData) {
      toast({
        title: 'Not Ready',
        description: 'Candy Machine not initialized',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (!validateCandyMachine(candyMachine, candyGuard)) {
      toast({
        title: 'Invalid Setup',
        description: 'Candy Machine configuration is invalid',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    const state = getCandyMachineState(candyMachine);
    if (state.isSoldOut) {
      toast({
        title: 'Sold Out',
        description: 'All NFTs have been minted',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    const guardDates = getGuardDates(candyGuard.guards);
    if (!guardDates.isLive || guardDates.hasEnded) {
      toast({
        title: 'Minting Not Active',
        description: guardDates.hasEnded ? 'Minting has ended' : 'Minting not started',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Sign confirmation message
      const message = `Mint ${nftData.name} NFT for ${nftData.price}? This will deduct ${nftData.price} from your wallet.`;
      await signMessage(wallet, { message });

      // Build mint transaction
      const nftMint = generateSigner(umi);
      let tx = transactionBuilder()
        .prepend(setComputeUnitPrice(umi, { microLamports: 1001 }))
        .prepend(setComputeUnitLimit(umi, { units: 800_000 }));

      const guardGroup = chooseGuardToUse(candyGuard, candyGuard);
      const mintArgs = mintArgsBuilder(candyMachine, guardGroup);

      tx = tx.add(
        mintV2(umi, {
          candyMachine: candyMachine.publicKey,
          nftMint,
          collectionMint: candyMachine.collectionMint,
          collectionUpdateAuthority: candyMachine.authority,
          candyGuard: candyMachine.mintAuthority,
          mintArgs,
          group: guardGroup.label === 'default' ? none() : some(guardGroup.label),
        })
      );

      // Sign and send
      const signature = await signAndSendTransaction(umi, tx);

      // Success
      toast({
        title: 'Minting Successful',
        description: (
          <>
            Your NFT has been minted!{' '}
            <Link
              href={`https://explorer.solana.com/tx/${signature}?cluster=${process.env.NEXT_PUBLIC_ENVIRONMENT}`}
              isExternal
            >
              View on Explorer <ExternalLinkIcon mx="2px" />
            </Link>
          </>
        ),
        status: 'success',
        duration: 10000,
      });
    } catch (error) {
      console.error('Minting error:', error);
      const msg = error.message || 'Unknown error';
      let description = msg;

      if (msg.includes('insufficient funds') || msg.includes('0x1')) {
        description = `Insufficient funds. You need ${nftData.price} and ~0.021 SOL`;
      } else if (msg.includes('User rejected')) {
        description = 'Transaction rejected by wallet';
      } else if (msg.includes('Simulation failed')) {
        description = 'Transaction simulation failed. Check funds and try again.';
      }

      toast({
        title: 'Minting Failed',
        description,
        status: 'error',
        duration: 8000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return <Preloader message="Initializing NFT Mint" />;
  }

  if (!nftData) {
    return <Box>Invalid NFT type</Box>;
  }

  return (
    <main>
      <VideoBackground />
      <Navigation />
      <Box position="fixed" top={4} right={4} zIndex={10}>
        {typeof window !== 'undefined' && <WalletMultiButton />}
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
            <Box flex="1" position="relative" width="100%" height="400px">
              <ImageNext
                src={nftData.image}
                alt={nftData.name}
                fill
                style={{ objectFit: 'cover', borderRadius: '12px' }}
                priority
              />
            </Box>
            <VStack flex="1" align="stretch" spacing={6}>
              <Heading color="white">{nftData.name} NFT</Heading>
              <Text color="whiteAlpha.900">{nftData.description}</Text>
              <Text color="yellow.400" fontSize="2xl" fontWeight="bold">
                {nftData.price}
              </Text>
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

export const getServerSideProps = async () => {
  return { props: {} };
};

export default NFTMintPage;