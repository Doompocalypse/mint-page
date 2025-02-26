import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from '@chakra-ui/react';

export const useWalletCheck = () => {
  const { connected } = useWallet();
  const toast = useToast();

  useEffect(() => {
    if (!connected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to use this feature',
        status: 'warning',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
    }
  }, [connected, toast]);

  return connected;
}; 