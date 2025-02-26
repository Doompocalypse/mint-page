import { 
  CandyGuard, 
  CandyMachine,
  GuardGroup,
  DefaultGuardSet,
  DefaultGuardSetMintArgs,
  getMerkleRoot,
  route,
  getMerkleProof,
} from "@metaplex-foundation/mpl-candy-machine";
import { 
  DigitalAssetWithToken,
  TokenStandard 
} from "@metaplex-foundation/mpl-token-metadata";
import { some, none } from "@metaplex-foundation/umi";

// Define the GuardSet type with proper date structure
export interface GuardSet {
  startDate: {
    __option: "None" | "Some";
    value: {
      date: bigint;
    };
  };
  endDate: {
    __option: "None" | "Some";
    value: {
      date: bigint;
    };
  };
  // Add other guard properties as needed
}

export interface GuardReturn {
  label: string;
}

export const chooseGuardToUse = (
  guard: GuardReturn,
  candyGuard: CandyGuard
): GuardGroup<DefaultGuardSet> => {
  // Validate inputs
  if (!guard || !candyGuard) {
    throw new Error("Invalid guard or candyGuard parameters");
  }

  let guardGroup = candyGuard?.groups.find(
    (item) => item.label === guard.label
  );
  
  if (guardGroup) {
    return guardGroup;
  }

  if (candyGuard != null && candyGuard.guards) {
    return {
      label: "default",
      guards: candyGuard.guards,
    };
  }

  throw new Error("No valid guards defined for minting");
};

export const mintArgsBuilder = (
  candyMachine: CandyMachine,
  guardToUse: GuardGroup<DefaultGuardSet>,
  ownedTokens: DigitalAssetWithToken[]
): Partial<DefaultGuardSetMintArgs> => {
  // Validate inputs
  if (!candyMachine || !guardToUse) {
    throw new Error("Invalid candyMachine or guardToUse parameters");
  }

  const guards = guardToUse.guards;
  if (!guards) {
    throw new Error("No guards available");
  }

  let mintArgs: Partial<DefaultGuardSetMintArgs> = {};

  // Handle Token2022 payment with validation
  if (guards.token2022Payment.__option === "Some") {
    const payment = guards.token2022Payment.value;
    if (!payment.destinationAta || !payment.mint || !payment.amount) {
      throw new Error("Invalid token2022Payment configuration");
    }
    
    mintArgs.token2022Payment = some({
      destinationAta: payment.destinationAta,
      mint: payment.mint,
      amount: payment.amount
    });
  }

  return mintArgs;
};

export const validateCandyMachine = (
  candyMachine: CandyMachine,
  candyGuard: CandyGuard
): boolean => {
  if (!candyMachine || !candyGuard) {
    console.error("Missing candy machine or guard");
    return false;
  }

  try {
    // Validate candy machine configuration
    if (!candyMachine.data.itemsAvailable || 
        !candyMachine.data.symbol || 
        !candyMachine.data.sellerFeeBasisPoints ||
        !candyMachine.mintAuthority ||
        !candyMachine.authority) {
      console.error("Invalid candy machine configuration");
      return false;
    }

    // Validate candy guard configuration
    if (!candyGuard.base || 
        !candyGuard.publicKey || 
        !candyGuard.guards) {
      console.error("Invalid candy guard configuration");
      return false;
    }

    // Validate token payment configuration if present
    if (candyGuard.guards.token2022Payment.__option === "Some") {
      const payment = candyGuard.guards.token2022Payment.value;
      if (!payment.destinationAta || !payment.mint || !payment.amount) {
        console.error("Invalid token payment configuration");
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error validating candy machine:", error);
    return false;
  }
};

export const getCandyMachineState = (
  candyMachine: CandyMachine
) => {
  const itemsAvailable = Number(candyMachine.data.itemsAvailable);
  const itemsRedeemed = Number(candyMachine.itemsRedeemed);
  const itemsRemaining = itemsAvailable - itemsRedeemed;

  return {
    itemsAvailable,
    itemsRedeemed,
    itemsRemaining,
    isSoldOut: itemsRemaining === 0,
    isActive: true // Add additional conditions as needed
  };
};

export const getGuardDates = (guards: GuardSet) => {
  const startDate = guards.startDate.__option === "Some" ? 
    new Date(Number(guards.startDate.value.date)) : undefined;
  
  const endDate = guards.endDate.__option === "Some" ? 
    new Date(Number(guards.endDate.value.date)) : undefined;

  return {
    startDate,
    endDate,
    isLive: startDate ? new Date() >= startDate : true,
    hasEnded: endDate ? new Date() >= endDate : false
  };
}; 