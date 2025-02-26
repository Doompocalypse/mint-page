import { Box, Text, Link, VStack, Icon, Flex, IconButton } from '@chakra-ui/react';
import { WarningTwoIcon, CloseIcon, CheckCircleIcon, ExternalLinkIcon } from '@chakra-ui/icons';

interface TransactionToastProps {
  type: 'success' | 'error';
  message: string;
  detail?: string;
  signature?: string;
  isUserRejection?: boolean;
  onClose?: () => void;
}

export const TransactionToast = ({ 
  type, 
  message, 
  detail,
  signature, 
  isUserRejection, 
  onClose 
}: TransactionToastProps) => {
  const isExpiredError = message.includes('Expired');

  return (
    <Box
      bg="rgba(0, 0, 0, 0.8)"
      backdropFilter="blur(10px)"
      borderRadius="md"
      p={4}
      borderWidth="1px"
      borderColor="yellow.400"
      position="relative"
      minW="300px"
    >
      <IconButton
        icon={<CloseIcon />}
        aria-label="Close notification"
        onClick={onClose}
        size="sm"
        position="absolute"
        top={2}
        right={2}
        variant="ghost"
        color="yellow.400"
        _hover={{ 
          bg: 'whiteAlpha.100',
          color: 'yellow.300' 
        }}
      />

      <VStack align="start" spacing={2} pr={8}>
        <Flex align="center" gap={2}>
          {type === 'success' && <Icon as={CheckCircleIcon} color="yellow.400" boxSize={5} />}
          {isExpiredError && <Icon as={WarningTwoIcon} color="yellow.400" boxSize={5} />}
          <Text color="white" fontWeight="bold">{message}</Text>
        </Flex>
        
        {detail && (
          <Text color="whiteAlpha.800" fontSize="sm">
            {detail}
          </Text>
        )}

        {signature && !isUserRejection && (
          <Link
            href={`https://solscan.io/tx/${signature}`}
            isExternal
            color="yellow.300"
            textDecoration="underline"
            _hover={{ color: "yellow.400" }}
            fontSize="sm"
            display="flex"
            alignItems="center"
            gap={1}
          >
            View transaction details
            <Icon as={ExternalLinkIcon} boxSize={3} />
          </Link>
        )}
      </VStack>
    </Box>
  );
}; 