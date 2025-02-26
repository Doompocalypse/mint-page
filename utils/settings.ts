interface Settings {
  rpcEndpoint: string;
  dmcMint: string;
  treasuryWallet: string;
  presaleWalletPublicKey: string;
  presaleWalletPrivateKey: string;
}

function validatePrivateKey(key: string | undefined): string {
  if (!key) {
    throw new Error('PRESALE_WALLET_PRIVATE_KEY is not set in environment variables');
  }

  // Clean up the string
  const cleanKey = key.trim().replace(/\s+/g, '');
  
  try {
    // Try to parse as JSON array
    const keyArray = JSON.parse(cleanKey);
    if (!Array.isArray(keyArray)) {
      throw new Error('Private key must be a JSON array');
    }
    if (keyArray.length !== 64) {
      throw new Error(`Invalid private key length. Expected 64 bytes, got ${keyArray.length}`);
    }
    if (!keyArray.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) {
      throw new Error('Private key must contain only integers between 0 and 255');
    }
    return cleanKey;
  } catch (e) {
    throw new Error('Invalid private key format in environment variables');
  }
}

function validateSettings(settings: Settings): void {
  const missing = Object.entries(settings)
    .filter(([key, value]) => !value && key !== 'presaleWalletPrivateKey')
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required settings: ${missing.join(', ')}`);
  }
}

// Load environment variables
const envVars = {
  rpcEndpoint: process.env.NEXT_PUBLIC_RPC,
  treasuryWallet: process.env.NEXT_PUBLIC_TREASURY_WALLET,
  presaleWalletPublicKey: process.env.NEXT_PUBLIC_PRESALE_WALLET,
  presaleWalletPrivateKey: process.env.PRESALE_WALLET_PRIVATE_KEY,
};

export const settings: Settings = {
  rpcEndpoint: envVars.rpcEndpoint || '',
  dmcMint: 'DooMsvwZZKTgYvg1cfAL4BQpcgQ9WtNLTdM9eTUUQpJ',
  treasuryWallet: envVars.treasuryWallet || '',
  presaleWalletPublicKey: envVars.presaleWalletPublicKey || '',
  presaleWalletPrivateKey: validatePrivateKey(envVars.presaleWalletPrivateKey),
};

// Validate settings
validateSettings(settings); 