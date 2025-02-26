import { Box, Container, VStack, Heading, Text, Button, useToast, Flex } from '@chakra-ui/react';
import dynamic from "next/dynamic";
import { useWallet } from '@solana/wallet-adapter-react';
import VideoBackground from '../components/VideoBackground';
import Navigation from '../components/Navigation';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { signUpAsAffiliate, isWalletRegistered, getExistingReferralCode } from '../services/affiliate';
import { CopyIcon } from '@chakra-ui/icons';

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { 
    loading: () => <Box w="150px" h="36px" bg="gray.700" borderRadius="md" />,
    ssr: false 
  }
);

const AffiliateProgram = () => {
  const wallet = useWallet();
  const toast = useToast();
  const [referralCode, setReferralCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Check for existing registration on wallet connect
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      const existingCode = getExistingReferralCode(wallet.publicKey);
      if (existingCode) {
        setReferralCode(existingCode);
        setIsRegistered(true);
      }
    }
  }, [wallet.connected, wallet.publicKey]);

  const handleSignUp = async () => {
    if (!wallet.connected || !wallet.publicKey || !wallet.signMessage) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to continue',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const result = await signUpAsAffiliate(
        wallet.publicKey,
        wallet.signMessage
      );
      
      if (result.success && result.referralCode) {
        setReferralCode(result.referralCode);
        setIsRegistered(true);
        toast({
          title: 'Success!',
          description: 'You are now registered as an affiliate. Your referral code is permanent and cannot be changed.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to register');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Signup failed',
        description: error instanceof Error ? error.message : 'Failed to register as affiliate. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast({
        title: 'Copied!',
        description: 'Referral code copied to clipboard',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      <Head>
        <title>Doompocalypse Affiliate Program</title>
        <meta name="description" content="Join our affiliate program and earn rewards" />
      </Head>
      <main>
        <VideoBackground />
        
        <Navigation />
        
        <Box position="fixed" top={4} right={4} zIndex={10}>
          <WalletMultiButtonDynamic />
        </Box>

        <Container 
          maxW="container.sm"
          pt={{ base: 16, md: 24 }}
        >
          <VStack spacing={6} align="center">
            <Box textAlign="center">
              <Heading 
                color="white" 
                fontSize={{ base: "3xl", md: "5xl" }}
                textShadow="0 0 10px rgba(255, 255, 0, 0.3)"
                mb={3}
              >
                Play. Earn. Repeat!
              </Heading>
            </Box>

            <Box
              w="full"
              bg="rgba(0, 0, 0, 0.7)"
              backdropFilter="blur(10px)"
              borderRadius="lg"
              p={6}
              border="1px solid rgba(255, 255, 255, 0.1)"
            >
              <VStack spacing={5} align="start">
                {!isRegistered ? (
                  // Show signup content when not registered
                  <>
                    <Heading 
                      size="md"
                      color="white"
                      mb={3}
                    >
                      How it works:
                    </Heading>

                    <VStack spacing={3} align="start" w="full">
                      <Text color="whiteAlpha.900" fontSize="md">
                        • Connect your crypto wallet to sign up as an affiliate
                      </Text>
                      <Text color="whiteAlpha.900" fontSize="md">
                        • Get your unique referral code
                      </Text>
                      <Text color="whiteAlpha.900" fontSize="md">
                        • Start earning by introducing new players to the world of Doompocalypse!
                      </Text>
                    </VStack>

                    <Box w="full" pt={4}>
                      <Button
                        w="full"
                        size="lg"
                        bg="yellow.400"
                        color="black"
                        _hover={{ bg: "yellow.300" }}
                        onClick={handleSignUp}
                        height="54px"
                        fontSize="lg"
                        isLoading={isLoading}
                        loadingText="Signing Up..."
                      >
                        Sign Up as Affiliate
                      </Button>
                    </Box>
                  </>
                ) : (
                  // Show referral code content when registered
                  <>
                    <Heading 
                      size="md" 
                      color="white"
                      mb={3}
                    >
                      Your Affiliate Dashboard
                    </Heading>

                    <VStack spacing={4} w="full">
                      <Box 
                        w="full" 
                        p={4}
                        bg="rgba(255, 255, 255, 0.1)" 
                        borderRadius="md"
                        border="1px solid rgba(255, 255, 255, 0.2)"
                      >
                        <Text color="whiteAlpha.900" fontSize="sm" mb={2}>
                          Your Referral Code:
                        </Text>
                        <Flex 
                          justify="space-between" 
                          align="center"
                          bg="rgba(0, 0, 0, 0.3)"
                          p={3}
                          borderRadius="md"
                        >
                          <Text 
                            color="yellow.300" 
                            fontSize="xl"
                            fontWeight="bold"
                            fontFamily="mono"
                          >
                            {referralCode}
                          </Text>
                          <Button
                            size="sm"
                            variant="outline"
                            color="yellow.300"
                            borderColor="yellow.300"
                            _hover={{ 
                              bg: "whiteAlpha.200",
                              transform: "scale(1.05)"
                            }}
                            onClick={copyReferralCode}
                            leftIcon={<CopyIcon />}
                          >
                            Copy Code
                          </Button>
                        </Flex>
                      </Box>

                      <VStack 
                        spacing={2}
                        align="start" 
                        w="full"
                        p={3}
                        borderRadius="md"
                      >
                        <Text color="whiteAlpha.900" fontSize="md">
                          Share your referral code with others to:
                        </Text>
                        <Text color="whiteAlpha.800" fontSize="sm" pl={3}>
                          • Earn rewards for each referral
                        </Text>
                        <Text color="whiteAlpha.800" fontSize="sm" pl={3}>
                          • Track your earnings in real-time
                        </Text>
                        <Text color="whiteAlpha.800" fontSize="sm" pl={3}>
                          • Get special bonuses for active referrers
                        </Text>
                      </VStack>
                    </VStack>
                  </>
                )}
              </VStack>
            </Box>
          </VStack>
        </Container>
      </main>
    </>
  );
};

export default AffiliateProgram; 