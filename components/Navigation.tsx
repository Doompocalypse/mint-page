import { Box, Menu, MenuButton, MenuList, MenuItem, Button, HStack, Text } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/router';

const Navigation = () => {
  const router = useRouter();

  const getCurrentPageTitle = () => {
    switch (router.pathname) {
      case '/':
        return 'NFT Marketplace';
      case '/presale':
        return 'Token Presale';
      case '/affiliate':
        return 'Affiliate Program';
      default:
        return 'Menu';
    }
  };

  return (
    <Box position="fixed" top={4} left={4} zIndex={10}>
      <Menu>
        <MenuButton
          as={Button}
          rightIcon={<ChevronDownIcon />}
          bg="rgba(0, 0, 0, 0.7)"
          color="white"
          _hover={{ bg: "rgba(0, 0, 0, 0.8)" }}
          _active={{ bg: "rgba(0, 0, 0, 0.9)" }}
          px={6}
          minW="200px"
        >
          <Text>
            {getCurrentPageTitle()}
          </Text>
        </MenuButton>
        <MenuList 
          bg="rgba(0, 0, 0, 0.9)" 
          border="1px solid rgba(255, 255, 255, 0.1)"
          minW="200px"
        >
          <MenuItem
            onClick={() => router.push('/')}
            bg="transparent"
            color="white"
            _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
          >
            <HStack spacing={2}>
              <Text>NFT Marketplace</Text>
              {router.pathname === '/' && (
                <Text fontSize="sm" color="yellow.400">•</Text>
              )}
            </HStack>
          </MenuItem>
          <MenuItem
            onClick={() => router.push('/presale')}
            bg="transparent"
            color="white"
            _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
          >
            <HStack spacing={2}>
              <Text>Token Presale</Text>
              {router.pathname === '/presale' && (
                <Text fontSize="sm" color="yellow.400">•</Text>
              )}
            </HStack>
          </MenuItem>
          <MenuItem
            onClick={() => router.push('/affiliate')}
            bg="transparent"
            color="white"
            _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
          >
            <HStack spacing={2}>
              <Text>Affiliate Program</Text>
              {router.pathname === '/affiliate' && (
                <Text fontSize="sm" color="yellow.400">•</Text>
              )}
            </HStack>
          </MenuItem>
        </MenuList>
      </Menu>
    </Box>
  );
};

export default Navigation; 