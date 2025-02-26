import {
  CandyGuard,
  CandyMachine,
  mintV2,
} from "@metaplex-foundation/mpl-candy-machine";
import { GuardReturn } from "../utils/checkerHelper";
import {
  AddressLookupTableInput,
  KeypairSigner,
  PublicKey,
  Transaction,
  Umi,
  createBigInt,
  generateSigner,
  none,
  publicKey,
  signAllTransactions,
  signTransaction,
  sol,
  some,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import {
  DigitalAsset,
  DigitalAssetWithToken,
  JsonMetadata,
  fetchDigitalAsset,
  fetchJsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { mintText, formatAmount, PRICES, NFTLabel } from "../settings";
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  SimpleGrid,
  Text,
  Tooltip,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  Divider,
  createStandaloneToast,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from "@chakra-ui/react";
import {
  fetchAddressLookupTable, setComputeUnitPrice,
} from "@metaplex-foundation/mpl-toolbox";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  chooseGuardToUse,
  routeBuilder,
  mintArgsBuilder,
  GuardButtonList as GuardButtonListType,
  buildTx,
  getRequiredCU,
} from "../utils/mintHelper";
import { useSolanaTime } from "@/utils/SolanaTimeContext";
import { verifyTx } from "@/utils/verifyTx";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { NFTLabel as NFTLabelType, GuardReturn as GuardReturnType } from '../utils/types';
import { Buffer } from 'buffer';
import { randomBytes } from 'crypto';

type SignMessageParams = {
  message: string;
  nftName: string;
  price: string;
};

const signMessage = async (
  wallet: any,
  { message, nftName, price }: SignMessageParams
): Promise<string> => {
  try {
    // Generate nonce for replay protection
    const nonce = Array.from(randomBytes(16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Add timestamp validation
    const timestamp = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (timestamp > Date.now() + fiveMinutes) {
      throw new Error("Message expired");
    }

    // Create structured message
    const structuredMessage = JSON.stringify({
      action: "mint_nft",
      nftName,
      price,
      timestamp,
      nonce,
      warning: "This transaction will deduct tokens from your wallet",
      domain: window.location.hostname
    }, null, 2);

    // Encode message with clear prefix
    const encodedMessage = new TextEncoder().encode(
      `[DOOM LABS NFT MINT]\n\n${structuredMessage}`
    );

    // Sign with wallet
    if (!wallet.signMessage) {
      throw new Error("Wallet does not support message signing");
    }

    const signedMessage = await wallet.signMessage(encodedMessage);
    if (!signedMessage) {
      throw new Error("Failed to sign message");
    }

    return Buffer.from(signedMessage).toString('base64');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('User rejected')) {
        throw new Error('Message signing rejected by user');
      }
      throw new Error(`Failed to sign message: ${error.message}`);
    }
    throw error;
  }
};

const updateLoadingText = (
  loadingText: string | undefined,
  guardList: GuardReturnType[],
  label: string,
  setGuardList: Dispatch<SetStateAction<GuardReturnType[]>>
) => {
  const guardIndex = guardList.findIndex((g) => g.label === label);
  if (guardIndex === -1) {
    console.error("guard not found");
    return;
  }
  const newGuardList = [...guardList];
  newGuardList[guardIndex].loadingText = loadingText;
  setGuardList(newGuardList);
};

const fetchNft = async (
  umi: Umi,
  nftAdress: PublicKey,
) => {
  let digitalAsset: DigitalAsset | undefined;
  let jsonMetadata: JsonMetadata | undefined;
  try {
    digitalAsset = await fetchDigitalAsset(umi, nftAdress);
    jsonMetadata = await fetchJsonMetadata(umi, digitalAsset.metadata.uri);
  } catch (e) {
    console.error(e);
    createStandaloneToast().toast({
      title: "Nft could not be fetched!",
      description: "Please check your Wallet instead.",
      status: "info",
      duration: 900,
      isClosable: true,
    });
  }

  return { digitalAsset, jsonMetadata };
};

const mintClick = async (
  umi: Umi,
  guard: GuardReturnType,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  ownedTokens: DigitalAssetWithToken[],
  mintAmount: number,
  mintsCreated: { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[] | undefined,
  setMintsCreated: Dispatch<SetStateAction<{ mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[] | undefined>>,
  guardList: GuardReturnType[],
  setGuardList: Dispatch<SetStateAction<GuardReturnType[]>>,
  onOpen: () => void,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>,
  wallet: any,
  nftData: NFTData
) => {
  const guardToUse = chooseGuardToUse(guard, candyGuard);
  if (!guardToUse.guards) {
    console.error("no guard defined!");
    return;
  }

  try {
    // Sign message first for user confirmation
    const messageText = `I confirm that I want to mint ${nftData.name} NFT for ${nftData.price}.\n\nThis transaction will deduct ${nftData.price} from my wallet.`;
    
    try {
      updateLoadingText("Signing message...", guardList, guardToUse.label, setGuardList);
      
      const signedMessage = await signMessage(wallet, {
        message: messageText,
        nftName: nftData.name,
        price: nftData.price
      });
      
      console.log('Message signed successfully:', signedMessage);
    } catch (error) {
      if (error instanceof Error && error.message.includes('rejected')) {
        createStandaloneToast().toast({
          title: "Minting cancelled",
          description: "You rejected the message signing",
          status: "info",
          duration: 5000,
        });
        const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
        if (guardIndex !== -1) {
          const newGuardList = [...guardList];
          newGuardList[guardIndex].minting = false;
          setGuardList(newGuardList);
        }
        return;
      }
      throw error;
    }

    let buyBeer = true;
    console.log("buyBeer",process.env.NEXT_PUBLIC_BUYMARKBEER )

    if (process.env.NEXT_PUBLIC_BUYMARKBEER  === "false") {
      buyBeer = false;
      console.log("The Creator does not want to pay for MarkSackerbergs beer 😒");
    }

    const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
    if (guardIndex === -1) {
      console.error("guard not found");
      return;
    }
    const newGuardList = [...guardList];
    newGuardList[guardIndex].minting = true;
    setGuardList(newGuardList);

    // fetch LUT
    let tables: AddressLookupTableInput[] = [];
    const lut = process.env.NEXT_PUBLIC_LUT;
    if (lut) {
      const lutPubKey = publicKey(lut);
      const fetchedLut = await fetchAddressLookupTable(umi, lutPubKey);
      tables = [fetchedLut];
    } else {
      createStandaloneToast().toast({
        title: "The developer should really set a lookup table!",
        status: "warning",
        duration: 900,
        isClosable: true,
      });
    }

    const mintTxs: Transaction[] = [];
    let nftsigners = [] as KeypairSigner[];

    const latestBlockhash = (await umi.rpc.getLatestBlockhash({commitment: "finalized"}));
    
    const mintArgs = mintArgsBuilder(candyMachine, guardToUse, ownedTokens);
    const nftMint = generateSigner(umi);
    const txForSimulation = buildTx(
      umi,
      candyMachine,
      candyGuard,
      nftMint,
      guardToUse,
      mintArgs,
      tables,
      latestBlockhash,
      1_400_000,
      buyBeer
    );
    const requiredCu = await getRequiredCU(umi, txForSimulation);

    for (let i = 0; i < mintAmount; i++) {
      const nftMint = generateSigner(umi);
      nftsigners.push(nftMint);
      const transaction = buildTx(
        umi,
        candyMachine,
        candyGuard,
        nftMint,
        guardToUse,
        mintArgs,
        tables,
        latestBlockhash,
        requiredCu,
        buyBeer
      );
      console.log(transaction)
      mintTxs.push(transaction);
    }
    if (!mintTxs.length) {
      console.error("no mint tx built!");
      return;
    }

    updateLoadingText(`Please sign`, guardList, guardToUse.label, setGuardList);
    const signedTransactions = await signAllTransactions(
      mintTxs.map((transaction, index) => ({
        transaction,
        signers: [umi.payer, nftsigners[index]],
      }))
    );

    let signatures: Uint8Array[] = [];
    let amountSent = 0;
    
    const sendPromises = signedTransactions.map((tx, index) => {
      return umi.rpc
        .sendTransaction(tx, { skipPreflight:true, maxRetries: 1, preflightCommitment: "finalized", commitment: "finalized" })
        .then((signature) => {
          console.log(
            `Transaction ${index + 1} resolved with signature: ${
              base58.deserialize(signature)[0]
            }`
          );
          amountSent = amountSent + 1;
          signatures.push(signature);
          return { status: "fulfilled", value: signature };
        })
        .catch((error) => {
          console.error(`Transaction ${index + 1} failed:`, error);
          return { status: "rejected", reason: error };
        });
    });

    await Promise.allSettled(sendPromises);

    if (!(await sendPromises[0]).status === true) {
      throw new Error("no tx was created");
    }
    updateLoadingText(
      `finalizing transaction(s)`,
      guardList,
      guardToUse.label,
      setGuardList
    );

    createStandaloneToast().toast({
      title: `${signedTransactions.length} Transaction(s) sent!`,
      status: "success",
      duration: 3000,
    });
    
    const successfulMints = await verifyTx(umi, signatures, latestBlockhash, "finalized");

    updateLoadingText(
      "Fetching your NFT",
      guardList,
      guardToUse.label,
      setGuardList
    );

    const fetchNftPromises = successfulMints.map((mintResult) =>
      fetchNft(umi, mintResult).then((nftData) => ({
        mint: mintResult,
        nftData,
      }))
    );

    const fetchedNftsResults = await Promise.all(fetchNftPromises);

    let newMintsCreated: { mint: PublicKey; offChainMetadata: JsonMetadata }[] = [];
    fetchedNftsResults.map((acc) => {
      if (acc.nftData.digitalAsset && acc.nftData.jsonMetadata) {
        newMintsCreated.push({
          mint: acc.mint,
          offChainMetadata: acc.nftData.jsonMetadata,
        });
      }
      return acc;
    }, []);

    if (newMintsCreated.length > 0) {
        setMintsCreated(newMintsCreated);
        onOpen();
    }
  } catch (e) {
    console.error(`minting failed because of ${e}`);
    createStandaloneToast().toast({
      title: "Your mint failed!",
      description: "Please try again.",
      status: "error",
      duration: 900,
      isClosable: true,
    });
  } finally {
    const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
    if (guardIndex === -1) {
      console.error("guard not found");
      return;
    }
    const newGuardList = [...guardList];
    newGuardList[guardIndex].minting = false;
    setGuardList(newGuardList);
    setCheckEligibility(true);
    updateLoadingText(undefined, guardList, guardToUse.label, setGuardList);
  }
};

// new component called timer that calculates the remaining Time based on the bigint solana time and the bigint toTime difference.
const Timer = ({
  solanaTime,
  toTime,
  setCheckEligibility,
}: {
  solanaTime: bigint;
  toTime: bigint;
  setCheckEligibility: Dispatch<SetStateAction<boolean>>;
}) => {
  const [remainingTime, setRemainingTime] = useState<bigint>(
    toTime - solanaTime
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        return prev - BigInt(1);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  //convert the remaining time in seconds to the amount of days, hours, minutes and seconds left
  const days = remainingTime / BigInt(86400);
  const hours = (remainingTime % BigInt(86400)) / BigInt(3600);
  const minutes = (remainingTime % BigInt(3600)) / BigInt(60);
  const seconds = remainingTime % BigInt(60);
  if (days > BigInt(0)) {
    return (
      <Text fontSize="sm" fontWeight="bold">
        {days.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}
        d{" "}
        {hours.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}
        h{" "}
        {minutes.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}
        m{" "}
        {seconds.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}
        s
      </Text>
    );
  }
  if (hours > BigInt(0)) {
    return (
      <Text fontSize="sm" fontWeight="bold">
        {hours.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}
        h{" "}
        {minutes.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}
        m{" "}
        {seconds.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}
        s
      </Text>
    );
  }
  if (minutes > BigInt(0) || seconds > BigInt(0)) {
    return (
      <Text fontSize="sm" fontWeight="bold">
        {minutes.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}
        m{" "}
        {seconds.toLocaleString("en-US", {
          minimumIntegerDigits: 2,
          useGrouping: false,
        })}
        s
      </Text>
    );
  }
  if (remainingTime === BigInt(0)) {
    setCheckEligibility(true);
  }
  return <Text></Text>;
};

type Props = {
  umi: Umi;
  guardList: GuardReturnType[];
  candyMachine: CandyMachine | undefined;
  candyGuard: CandyGuard | undefined;
  ownedTokens: DigitalAssetWithToken[] | undefined;
  setGuardList: Dispatch<SetStateAction<GuardReturnType[]>>;
  mintsCreated:
    | {
        mint: PublicKey;
        offChainMetadata: JsonMetadata | undefined;
      }[]
    | undefined;
  setMintsCreated: Dispatch<
    SetStateAction<
      | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
      | undefined
    >
  >;
  onOpen: () => void;
  setCheckEligibility: Dispatch<SetStateAction<boolean>>;
  nftTier: NFTLabelType;
};

// Update the interface to match the mintText structure
interface MintText {
  label: NFTLabelType;
  buttonLabel: string;
  price: number;
  header: string;
  mintText: string;
}

export const ButtonList = ({
  umi,
  guardList,
  candyMachine,
  candyGuard,
  ownedTokens = [],
  mintsCreated,
  setMintsCreated,
  setGuardList,
  onOpen,
  setCheckEligibility,
  nftTier
}: Props): JSX.Element => {
  const solanaTime = useSolanaTime();
  const [numberInputValues, setNumberInputValues] = useState<{
    [label: string]: number;
  }>({});
  const [mintAmount, setMintAmount] = useState(1);

  if (!candyMachine || !candyGuard) {
    return <></>;
  }

  const handleNumberInputChange = (label: string, value: number) => {
    setNumberInputValues((prev) => ({ ...prev, [label]: value }));
  };

  // Filter guards for specific tier
  const tierGuards = guardList.filter(guard => 
    guard.label.toLowerCase() === nftTier
  );

  return (
    <VStack spacing={4} align="center" width="full">
      {/* Price Display */}
      <Text fontSize="sm" color="whiteAlpha.900">
        Price: {formatAmount(PRICES[nftTier as NFTLabelType] * mintAmount)} DMC
      </Text>
      
      {/* Mint Amount Slider */}
      <HStack width="200px" justify="center">
        <Text fontSize="sm" color="whiteAlpha.900">Amount:</Text>
        <Text fontSize="sm" fontWeight="bold" color="yellow.300">
          {mintAmount}
        </Text>
      </HStack>
      
      <Slider
        aria-label="mint-amount"
        defaultValue={1}
        min={1}
        max={20}
        step={1}
        width="200px"
        onChange={(val) => setMintAmount(val)}
        focusThumbOnChange={false}
      >
        <SliderTrack bg="whiteAlpha.200">
          <SliderFilledTrack bg="yellow.300" />
        </SliderTrack>
        <SliderThumb boxSize={6} bg="yellow.300">
          <Box color="black" fontSize="xs" fontWeight="bold">
            {mintAmount}
          </Box>
        </SliderThumb>
      </Slider>

      {/* Mint Button */}
      {tierGuards.map((guard) => (
        <Tooltip 
          key={guard.label}
          label={guard.tooltip || "Mint your NFT"}
          aria-label="Mint button tooltip"
        >
          <Button
            onClick={() => mintClick(
              umi,
              guard,
              candyMachine,
              candyGuard,
              ownedTokens || [],
              mintAmount,
              mintsCreated,
              setMintsCreated,
              guardList,
              setGuardList,
              onOpen,
              setCheckEligibility,
              wallet,
              nftData
            )}
            size="lg"
            width="200px"
            height="50px"
            backgroundColor="yellow.400"
            color="black"
            _hover={{ 
              backgroundColor: "yellow.300",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(255, 255, 0, 0.3)"
            }}
            _active={{
              transform: "translateY(1px)"
            }}
            isDisabled={!guard.allowed || mintAmount === 0}
            isLoading={guard.minting}
            loadingText={guard.loadingText}
            fontWeight="bold"
            transition="all 0.2s"
          >
            {`Mint ${formatAmount(PRICES[nftTier as NFTLabelType] * mintAmount)} DMC`}
          </Button>
        </Tooltip>
      ))}
    </VStack>
  );
};
