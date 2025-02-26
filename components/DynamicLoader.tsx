import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

export const LoadingFallback = () => (
  <VStack 
    spacing={4} 
    justify="center" 
    align="center" 
    h="100vh"
    bg="rgba(0, 0, 0, 0.8)"
  >
    <Spinner size="xl" color="yellow.400" thickness="4px" />
    <Text color="white">Loading...</Text>
  </VStack>
); 