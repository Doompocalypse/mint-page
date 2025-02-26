import { Box, Container, Flex, Text, Button, Input, VStack, Heading, useToast, Link, Divider } from '@chakra-ui/react';
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from 'react';
import VideoBackground from '../components/VideoBackground';
import Navigation from '../components/Navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import Head from 'next/head';
import { LoadingFallback } from '../components/DynamicLoader';
import { presaleService } from '../services/presale';
import { 
  Connection, 
  VersionedTransaction,
  TransactionMessage
} from '@solana/web3.js';
import { TransactionToast } from '../components/TransactionToast';
import { z } from 'zod';

const VideoBackgroundDynamic = dynamic(() => import('../components/VideoBackground'), {
  loading: () => <LoadingFallback />,
  ssr: false
});

const NavigationDynamic = dynamic(() => import('../components/Navigation'), {
  ssr: true
});

const WalletMultiButtonDynamic = dynamic(
  async () => {
    const { WalletMultiButton } = await import("@solana/wallet-adapter-react-ui");
    return function CustomWalletButton(props: any) {
      const wallet = useWallet();
      return (
        <WalletMultiButton 
          {...props}
          onClick={async (e) => {
            if (wallet.connected) {
              await props.onDisconnect?.();
            }
            props.onClick?.(e);
          }}
        />
      );
    };
  },
  { 
    loading: () => <Box w="150px" h="36px" bg="gray.700" borderRadius="md" />,
    ssr: false 
  }
);

const purchaseSchema = z.object({
  usdAmount: z.number().positive().max(100000), // Set reasonable max limit
  solEquivalent: z.number().positive(),
  dmcAmount: z.number().positive()
});

const TokenPresale = () => {
  const [usdAmount, setUsdAmount] = useState('0.0');
  const [solEquivalent, setSolEquivalent] = useState('0.0');
  const [dmcAmount, setDmcAmount] = useState('0.0');
  const [solBalance, setSolBalance] = useState(0);
  const [dmcBalance, setDmcBalance] = useState(0);
  const [solPrice, setSolPrice] = useState(0);
  const [maxUsdAmount, setMaxUsdAmount] = useState('0.0');
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC || '');
  const toast = useToast();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Update fetchPricesAndBalances to separate SOL price fetch
  const fetchSolPrice = useCallback(async () => {
    try {
      const price = await presaleService.getSolPrice();
      setSolPrice(price);
    } catch (error) {
      console.error('Error fetching SOL price:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SOL price. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  const fetchPricesAndBalances = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsInitializing(true);
      }
      
      // Fetch balances if wallet is connected
      if (wallet.connected && wallet.publicKey) {
        const [sol, dmc] = await Promise.all([
          presaleService.getSolBalance(wallet.publicKey),
          presaleService.getDmcBalance(wallet.publicKey)
        ]);
        setSolBalance(sol);
        setDmcBalance(dmc);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load wallet data. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      if (showLoading) {
        setTimeout(() => {
          setIsInitializing(false);
          setIsInitialLoad(false);
        }, 1000);
      }
    }
  }, [wallet.connected, wallet.publicKey, toast]);

  // Add new useEffect for SOL price
  useEffect(() => {
    fetchSolPrice();
    // Refresh price every minute
    const interval = setInterval(fetchSolPrice, 60000);
    return () => clearInterval(interval);
  }, [fetchSolPrice]);

  // Update existing useEffect for wallet-dependent data
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      fetchPricesAndBalances(isInitialLoad);
    } else {
      setIsInitializing(false);
    }
  }, [wallet.connected, wallet.publicKey, fetchPricesAndBalances, isInitialLoad]);

  // Update the useEffect for max amount calculation
  useEffect(() => {
    const calculateMaxUsdAmount = () => {
      try {
        // Reserve 0.0038 SOL for transaction fees
        const TRANSACTION_FEE_BUFFER = 0.0038;
        
        // Calculate available balance after reserving fee buffer
        const availableBalance = Math.max(0, solBalance - TRANSACTION_FEE_BUFFER);
        
        // Calculate max USD amount based on available balance
        const maxUsdAmount = availableBalance * solPrice;
        
        // Format to 2 decimal places
        setMaxUsdAmount(maxUsdAmount.toFixed(2));
        
        console.log('Max amount calculation:', {
          totalBalance: solBalance,
          feeBuffer: TRANSACTION_FEE_BUFFER,
          availableBalance,
          solPrice,
          maxUsdAmount: maxUsdAmount.toFixed(2)
        });
      } catch (error) {
        console.error('Error calculating max amount:', error);
        setMaxUsdAmount('0.0');
      }
    };

    calculateMaxUsdAmount();
  }, [solBalance, solPrice]);

  // Update amount handler for USD input
  const handleUsdAmountChange = async (value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    const formattedValue = parts.length > 2 ? 
      `${parts[0]}.${parts[1]}` : 
      cleanValue;
    
    setUsdAmount(formattedValue);
    
    const numValue = parseFloat(formattedValue);
    if (!isNaN(numValue)) {
      try {
        const solAmount = await presaleService.calculateSolAmountFromUsd(numValue);
        setSolEquivalent(solAmount.toFixed(4));
        setDmcAmount(formattedValue); // 1:1 ratio with USD
      } catch (error) {
        console.error('Error calculating amounts:', error);
      }
    } else {
      setSolEquivalent('0.0');
      setDmcAmount('0.0');
    }
  };

  // Update max button handler
  const handleMaxClick = () => {
    if (parseFloat(maxUsdAmount) <= 0) {
      toast({
        title: 'Insufficient Balance',
        description: 'Please ensure you have enough SOL to cover the purchase and transaction fees',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    handleUsdAmountChange(maxUsdAmount);
  };

  const handlePresale = async () => {
    if (!wallet.connected || !wallet.signTransaction) {
      toast({
        title: 'Wallet Connection Required',
        description: 'Please connect your Phantom wallet to continue',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);
      const amount = parseFloat(usdAmount);
      
      // Validate input
      try {
        purchaseSchema.parse({
          usdAmount: amount,
          solEquivalent: parseFloat(solEquivalent),
          dmcAmount: parseFloat(dmcAmount)
        });
      } catch (validationError) {
        throw new Error('Invalid purchase amount: ' + 
          (validationError instanceof Error ? validationError.message : String(validationError)));
      }

      // Check if user has enough SOL
      const requiredSol = parseFloat(solEquivalent);
      if (requiredSol > solBalance) {
        throw new Error('Insufficient SOL balance');
      }

      // Check secure context
      if (!window.isSecureContext) {
        throw new Error('Transactions require a secure connection (HTTPS)');
      }

      // Process both transactions
      const { solSignature, tokenSignature } = await presaleService.processPurchase(
        wallet,
        amount
      );

      // Show success toast
      toast({
        render: ({ onClose }) => (
          <TransactionToast
            type="success"
            message="Purchase Successful!"
            detail={`You purchased ${dmcAmount} DMC tokens`}
            signature={tokenSignature}
            onClose={onClose}
          />
        ),
        duration: 5000,
        isClosable: true,
      });

      // Refresh balances
      await fetchPricesAndBalances();

    } catch (error) {
      console.error('Purchase error:', error);
      
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Enhanced error messages
      if (errorMessage.includes('VersionedTransaction')) {
        errorMessage = 'Your wallet needs to be updated to support the latest transaction format';
      } else if (errorMessage.includes('secure context')) {
        errorMessage = 'Please ensure you are using HTTPS for secure transactions';
      }

      toast({
        render: ({ onClose }) => (
          <TransactionToast
            type="error"
            message="Transaction Failed"
            detail={errorMessage}
            onClose={onClose}
          />
        ),
        duration: 5000,
        isClosable: true,
        position: 'bottom-right',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add loading component
  const LoadingOverlay = () => (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(0, 0, 0, 0.8)"
      backdropFilter="blur(10px)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={5}
      borderRadius="2xl"
    >
      <VStack spacing={4}>
        <Box
          w="40px"
          h="40px"
          border="3px solid"
          borderColor="yellow.300"
          borderTopColor="transparent"
          borderRadius="50%"
          animation="spin 1s linear infinite"
          sx={{
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }}
        />
        <Text color="yellow.300" fontSize="lg" fontWeight="bold">
          Loading Wallet Data...
        </Text>
      </VStack>
    </Box>
  );

  // Add this near the top of TokenPresale component
  const handleDisconnect = useCallback(async () => {
    try {
      // Get provider
      const provider = (window as any).phantom?.solana;
      if (provider?.disconnect) {
        await provider.disconnect();
      }
      
      // Reset states
      setUsdAmount('0.0');
      setSolEquivalent('0.0');
      setDmcAmount('0.0');
      setSolBalance(0);
      setDmcBalance(0);
      setMaxUsdAmount('0.0');
      
      // Show toast
      toast({
        title: 'Wallet Disconnected',
        description: 'Your wallet has been disconnected successfully',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast({
        title: 'Disconnect Error',
        description: 'Failed to disconnect wallet properly',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [toast]);

  // Add useEffect to listen for wallet disconnect
  useEffect(() => {
    if (!wallet.connected && !isInitialLoad) {
      handleDisconnect();
    }
  }, [wallet.connected, isInitialLoad, handleDisconnect]);

  return (
    <>
      <Head>
        <title>DoomCoin Presale</title>
        <meta name="description" content="Purchase DoomCoin tokens in our presale event" />
      </Head>
      <main>
        <VideoBackground />
        <Navigation />
        
        <Box position="fixed" top={4} right={4} zIndex={10}>
          <WalletMultiButtonDynamic 
            onDisconnect={handleDisconnect}
          />
        </Box>

        <Container 
          maxW="container.sm" 
          pt={{ base: 20, md: 28 }}
          pb="10vh"
          minH="100vh"
          display="flex"
          flexDirection="column"
          justifyContent="flex-start"
        >
          <VStack 
            spacing={8} 
            align="center"
            w="full"
            flex="1"
            mb="10%"
          >
            <VStack spacing={2}>
              <Heading 
                color="white" 
                fontSize={{ base: "3xl", md: "4xl" }}
                textShadow="0 0 10px rgba(255, 255, 0, 0.3)"
              >
                DoomCoin Presale
              </Heading>
              <Text color="whiteAlpha.800" fontSize="md" textAlign="center">
                Join the apocalypse - Get your DMC tokens now
              </Text>
            </VStack>

            <Box
              w="full"
              bg="rgba(0, 0, 0, 0.8)"
              backdropFilter="blur(20px)"
              borderRadius="2xl"
              p={8}
              border="1px solid rgba(255, 255, 0, 0.15)"
              boxShadow="0 0 30px rgba(255, 255, 0, 0.1)"
              transition="all 0.3s"
              position="relative"
              _hover={{
                border: "1px solid rgba(255, 255, 0, 0.25)",
                boxShadow: "0 0 40px rgba(255, 255, 0, 0.15)"
              }}
            >
              {wallet.connected && isInitializing && isInitialLoad && <LoadingOverlay />}
              
              <VStack 
                spacing={8} 
                opacity={wallet.connected && isInitializing && isInitialLoad ? 0.3 : 1}
                transition="opacity 0.3s"
              >
                {/* Price Info Section */}
                <Flex 
                  w="full" 
                  justify="space-between"
                  align="center"
                  p={4} 
                  bg="rgba(255, 255, 0, 0.05)" 
                  borderRadius="xl"
                  border="1px solid rgba(255, 255, 0, 0.1)"
                >
                  <Box textAlign="center" flex="1">
                    <Text color="whiteAlpha.900" fontSize="sm" mb={1}>
                      Current SOL Price
                    </Text>
                    <Text color="yellow.300" fontSize="2xl" fontWeight="bold">
                      ${solPrice.toFixed(2)}
                    </Text>
                  </Box>
                  <Divider 
                    orientation="vertical" 
                    h="40px" 
                    borderColor="rgba(255, 255, 0, 0.2)" 
                    mx={4}
                  />
                  <Box textAlign="center" flex="1">
                    <Text color="whiteAlpha.900" fontSize="sm" mb={1}>
                      Token Price
                    </Text>
                    <Text color="yellow.300" fontSize="2xl" fontWeight="bold">
                      1 DMC = $1.00
                    </Text>
                  </Box>
                </Flex>

                {/* Input Section */}
                <VStack w="full" spacing={6}>
                  <Box w="full">
                    <Text color="yellow.300" fontSize="sm" mb={3}>
                      Enter amount in USD:
                    </Text>
                    <Flex>
                      <Input
                        value={usdAmount}
                        onChange={(e) => handleUsdAmountChange(e.target.value)}
                        placeholder="0.0"
                        size="lg"
                        height="60px"
                        fontSize="xl"
                        type="text"
                        textAlign="right"
                        color="yellow.300"
                        bg="rgba(255, 255, 255, 0.05)"
                        borderColor="rgba(255, 255, 0, 0.2)"
                        _hover={{ borderColor: "rgba(255, 255, 0, 0.3)" }}
                        _focus={{ 
                          borderColor: "yellow.300",
                          boxShadow: "0 0 0 1px rgba(255, 255, 0, 0.3)"
                        }}
                      />
                      <Button
                        ml={3}
                        onClick={handleMaxClick}
                        size="lg"
                        height="60px"
                        px={6}
                        variant="outline"
                        borderColor="yellow.300"
                        color="yellow.300"
                        _hover={{ 
                          bg: "rgba(255, 255, 0, 0.1)",
                          borderColor: "yellow.400"
                        }}
                      >
                        MAX ${maxUsdAmount}
                      </Button>
                    </Flex>
                  </Box>

                  {/* Amount Display */}
                  <Box 
                    w="full" 
                    p={4}
                    bg="rgba(255, 255, 0, 0.05)"
                    borderRadius="xl"
                    border="1px solid rgba(255, 255, 0, 0.1)"
                  >
                    <Flex justify="space-between" align="center">
                      <Text color="whiteAlpha.800">You will receive:</Text>
                      <Text color="yellow.300" fontSize="2xl" fontWeight="bold">
                        {dmcAmount} DMC
                      </Text>
                    </Flex>
                  </Box>

                  {/* Buy Button */}
                  <Button
                    w="full"
                    size="lg"
                    height="60px"
                    bg="yellow.400"
                    color="black"
                    fontSize="lg"
                    _hover={{ 
                      bg: "yellow.300",
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 20px rgba(255, 255, 0, 0.2)"
                    }}
                    _active={{
                      bg: "yellow.500",
                      transform: "translateY(1px)"
                    }}
                    onClick={handlePresale}
                    isLoading={isLoading}
                    loadingText="Processing..."
                    transition="all 0.2s"
                    fontWeight="bold"
                  >
                    Buy DMC Tokens
                  </Button>
                </VStack>
              </VStack>
            </Box>
          </VStack>
        </Container>
      </main>
    </>
  );
};

export default TokenPresale; 