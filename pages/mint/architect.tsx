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
} from '@chakra-ui/react';
import LoadingState from '../../components/LoadingState';
import VideoBackground from '../../components/VideoBackground';
import Navigation from '../../components/Navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  fetchCandyMachine,
  safeFetchCandyGuard,
  mintV2,
} from '@metaplex-foundation/mpl-candy-machine';
import { setComputeUnitLimit, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { transactionBuilder, generateSigner, some, publicKey } from '@metaplex-foundation/umi';
import { ExternalLinkIcon, CheckIcon } from '@chakra-ui/icons';
import { NFT_DATA } from '@/utils/nftData';
import Preloader from '@/components/Preloader';
import { Buffer } from 'buffer';

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
    const latestBlockhash = await umi.rpc.getLatestBlockhash();
    const tx = transactionBuilder()
      .add(transaction.instructions)
      .setBlockhash(latestBlockhash)
      .build(umi);

    // Simulate to catch Phantom "unsafe" issues
    const simulation = await umi.rpc.simulateTransaction(tx);
    if (simulation.value.err) {
      throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.logs)}`);
    }

    const signedTx = await umi.identity.signTransaction(tx);
    const signature = await umi.rpc.sendTransaction(signedTx, {
      skipPreflight: false, // Let Phantom verify
      preflightCommitment: 'processed',
    });

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

// Simplified message signing
const signMessage = async (wallet, { message }) => {
  if (!wallet.signMessage) {
    throw new Error('Wallet does not support message signing');
  }
  const encodedMessage = new TextEncoder().encode(message);
  const signedMessage = await wallet.signMessage(encodedMessage);
  return Buffer.from(signedMessage).toString('base64');
};

const ArchitectMint = () => {
  const wallet = useWallet();
  const umi = useUmi();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [candyMachine, setCandyMachine] = useState(null);
  const [candyGuard, setCandyGuard] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const nftData = NFT_DATA.architect;

  useEffect(() => {
    const initializeCandyMachine = async () => {
      if (!umi || !process.env.NEXT_PUBLIC_CANDY_MACHINE_ARCHITECT) {
        console.error('No candy machine ID or UMI instance');
        setIsInitializing(false);
        return;
      }

      try {
        const cmId = publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ARCHITECT);
        const cm = await fetchWithRetry(() => fetchCandyMachine(umi, cmId));
        const guard = await fetchWithRetry(() => safeFetchCandyGuard(umi, cm.mintAuthority));

        setCandyMachine(cm);
        setCandyGuard(guard);
      } catch (error) {
        console.error('Error initializing:', error);
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
  }, [umi, toast]);

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

    if (!candyMachine || !candyGuard) {
      toast({
        title: 'Not Ready',
        description: 'Candy Machine not initialized',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      // DMC token constants
      const DMC_MINT = publicKey('DooMsvwZZKTgYvg1cfAL4BQpcgQ9WtNLTdM9eTUUQpJ');
      const DMC_TREASURY = publicKey('ARSUQNDGm6KxXKJgCctcWMxbDyHYKuadLrKrtAz3rpCT');
      const PRICE = BigInt(50 * 10 ** 6); // 50 DMC with 6 decimals

      // Sign confirmation message
      const message = `Mint ${nftData.name} NFT for ${nftData.price}? This will deduct ${nftData.price} from your wallet.`;
      await signMessage(wallet, { message });

      // Build transaction
      const nftMint = generateSigner(umi);
      const tx = transactionBuilder()
        .prepend(setComputeUnitPrice(umi, { microLamports: 1001 }))
        .prepend(setComputeUnitLimit(umi, { units: 800_000 }))
        .add(
          mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            nftMint,
            collectionMint: candyMachine.collectionMint,
            collectionUpdateAuthority: candyMachine.authority,
            candyGuard: candyMachine.mintAuthority,
            mintArgs: {
              token2022Payment: some({
                amount: PRICE,
                mint: DMC_MINT,
                destinationAta: DMC_TREASURY,
              }),
            },
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
        description = "Insufficient DMC tokens to mint this NFT. You need exactly 50 DMC tokens.";
      } else if (errorMessage.includes("start date")) {
        description = "Minting has not started yet";
      } else if (errorMessage.includes("end date")) {
        description = "Minting period has ended";
      } else if (errorMessage.includes("simulation failed")) {
        description = "Transaction failed. Please ensure you have exactly 50 DMC tokens and try again.";
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

export default ArchitectMint;