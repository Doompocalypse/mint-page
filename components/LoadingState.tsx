import { Box, Text } from '@chakra-ui/react';

const LoadingState = ({ message }: { message: string }) => {
  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="rgba(0, 0, 0, 0.7)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={9999}
    >
      <Text color="white" fontSize="xl">
        {message}
      </Text>
    </Box>
  );
};

export default LoadingState; 