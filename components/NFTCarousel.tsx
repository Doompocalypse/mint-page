import { useState, useEffect, useCallback } from 'react';
import { Box, Flex, IconButton, useBreakpointValue } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';

interface NFTCarouselProps {
  children: React.ReactNode[];
}

const NFTCarousel = ({ children }: NFTCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const slidesCount = children.length;
  const visibleItems = useBreakpointValue({ base: 1, md: 2, lg: 3 }) || 1;

  // Create an extended array that includes copies for smooth cycling
  const extendedItems = [...children, ...children.slice(0, visibleItems)];

  const prevSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    setCurrentIndex((prev) => {
      if (prev === 0) {
        setTimeout(() => {
          setIsAnimating(false);
          setCurrentIndex(slidesCount - 1);
        }, 0);
        return slidesCount;
      }
      setTimeout(() => setIsAnimating(false), 500);
      return prev - 1;
    });
  };

  const nextSlide = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    setCurrentIndex((prev) => {
      if (prev >= slidesCount - 1) {
        setTimeout(() => {
          setIsAnimating(false);
          setCurrentIndex(0);
        }, 500);
        return prev + 1;
      }
      setTimeout(() => setIsAnimating(false), 500);
      return prev + 1;
    });
  }, [isAnimating, slidesCount]);

  // Auto-play functionality
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <Box 
      w={{ base: "100%", md: "95%" }}
      position="relative"
      mx="auto"
      overflow="hidden"
    >
      <Flex
        position="relative"
        minH={{ base: "520px", md: "665px" }}
        alignItems="center"
      >
        <Flex
          w="full"
          transform={`translateX(-${currentIndex * (100 / visibleItems)}%)`}
          transition="transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
          gap={{ base: 2, md: 3 }}
          px={{ base: 2, md: 3 }}
        >
          {extendedItems.map((child, index) => (
            <Box
              key={index}
              flex={`0 0 ${100 / visibleItems}%`}
              px={{ base: 1, md: 1.5 }}
              transform={`scale(${
                index >= currentIndex && 
                index < currentIndex + visibleItems ? 0.95 : 0.81
              })`}
              opacity={
                index >= currentIndex && 
                index < currentIndex + visibleItems ? 1 : 0.3
              }
              transition="all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
              _hover={{
                transform: index >= currentIndex && 
                  index < currentIndex + visibleItems ? 
                  'scale(0.97)' : 'scale(0.81)'
              }}
            >
              {child}
            </Box>
          ))}
        </Flex>

        <IconButton
          aria-label="Previous"
          icon={<ChevronLeftIcon boxSize={{ base: 4, md: 5 }} />}
          onClick={prevSlide}
          position="absolute"
          left={{ base: 0, md: 1.5 }}
          zIndex={2}
          colorScheme="whiteAlpha"
          rounded="full"
          size={{ base: "sm", md: "md" }}
          bg="rgba(0, 0, 0, 0.5)"
          _hover={{
            bg: "rgba(0, 0, 0, 0.7)",
            transform: "scale(1.05)"
          }}
          _active={{
            transform: "scale(0.9)"
          }}
          transition="all 0.2s"
          disabled={isAnimating}
        />

        <IconButton
          aria-label="Next"
          icon={<ChevronRightIcon boxSize={{ base: 4, md: 5 }} />}
          onClick={nextSlide}
          position="absolute"
          right={{ base: 0, md: 1.5 }}
          zIndex={2}
          colorScheme="whiteAlpha"
          rounded="full"
          size={{ base: "sm", md: "md" }}
          bg="rgba(0, 0, 0, 0.5)"
          _hover={{
            bg: "rgba(0, 0, 0, 0.7)",
            transform: "scale(1.05)"
          }}
          _active={{
            transform: "scale(0.9)"
          }}
          transition="all 0.2s"
          disabled={isAnimating}
        />
      </Flex>

      {/* Progress Indicators */}
      <Flex 
        justify="center" 
        mt={{ base: 2, md: 3 }}
        gap={{ base: 1, md: 1.5 }}
      >
        {Array.from({ length: slidesCount }).map((_, idx) => (
          <Box
            key={idx}
            h="2px"
            w={{ base: "16px", md: "19px" }}
            bg={idx === currentIndex ? "yellow.400" : "whiteAlpha.300"}
            transition="all 0.3s"
            cursor="pointer"
            onClick={() => setCurrentIndex(idx)}
            _hover={{ bg: "yellow.300" }}
          />
        ))}
      </Flex>
    </Box>
  );
};

export default NFTCarousel; 