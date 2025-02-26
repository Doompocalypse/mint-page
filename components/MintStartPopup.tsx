import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState, useMemo } from "react";

interface MintStartPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MintStartPopup = ({ isOpen, onClose }: MintStartPopupProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const startDate = useMemo(() => new Date("2025-03-28T23:00:00Z"), []);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const difference = startDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft("DMC is now live on DEXs!");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    const timer = setInterval(updateTimeLeft, 1000);
    updateTimeLeft();

    return () => clearInterval(timer);
  }, [startDate]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      isCentered 
      closeOnOverlayClick={false}
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />
      <ModalContent bg="gray.800" color="white" mx={4}>
        <ModalHeader textAlign="center">Doomcoin (DMC) will go live to DEXs on:</ModalHeader>
        <ModalCloseButton size="sm" />
        <ModalBody pb={6}>
          <VStack spacing={4} align="center">
            <Text fontSize="md" color="yellow.300" fontWeight="bold">
              March 28, 2025 at 06:00 PM EST
            </Text>
            <Text fontSize="md" mt={4}>
              Time until DMC goes live:
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="yellow.300">
              {timeLeft}
            </Text>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}; 