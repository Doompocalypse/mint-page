import { Box, Heading, Text, VStack } from "@chakra-ui/react";

const Header = () => {
  return (
    <VStack 
      spacing={{ base: 3, md: 4 }}
      textAlign="center" 
      mb={{ base: 8, md: 12 }}
      mt={{ base: 4, md: 6 }}
      px={{ base: 4, md: 0 }}
    >
      <Heading 
        as="h1" 
        size={{ base: "xl", md: "2xl" }}
        color="white"
        textShadow="0 0 10px rgba(255, 255, 0, 0.3)"
        lineHeight={{ base: "1.2", md: "1.4" }}
      >
        Doompocalypse NFTs
      </Heading>
      <Text 
        fontSize={{ base: "sm", md: "md" }}
        color="whiteAlpha.900"
        maxW={{ base: "300px", md: "570px" }}
        px={3}
        lineHeight={{ base: "1.5", md: "1.6" }}
      >
        Explore and collect exclusive NFTs in the Doompocalypse universe
      </Text>
    </VStack>
  );
};

export default Header; 