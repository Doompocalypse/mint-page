import { Box, VStack, Text, Image } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const rotateAnimation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const Preloader = ({ message = "Loading" }) => {
  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="rgba(0, 0, 0, 0.9)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={9999}
      backdropFilter="blur(8px)"
    >
      <VStack spacing={6}>
        <Box position="relative" width="120px" height="120px">
          {/* Logo */}
          <Image
            src="/favicon.ico"
            alt="Doompocalypse"
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            width="64px"
            height="64px"
          />
          
          {/* Rotating Circle */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            borderRadius="full"
            border="4px solid"
            borderColor="yellow.400"
            sx={{ 
              animation: `${rotateAnimation} 2s linear infinite`,
              borderTopColor: "transparent",
              borderRightColor: "transparent",
            }}
            boxShadow="0 0 15px rgba(255, 255, 0, 0.3)"
          />
        </Box>
        
        <Text
          color="white"
          fontSize="xl"
          fontWeight="bold"
        >
          {message}
        </Text>
      </VStack>
    </Box>
  );
};

export default Preloader; 