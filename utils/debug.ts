export function debugEnvVariables() {
  console.log('Environment variables:');
  console.log('RPC:', process.env.NEXT_PUBLIC_RPC ? 'Set' : 'Not set');
  console.log('USDC Mint:', process.env.NEXT_PUBLIC_USDC_MINT ? 'Set' : 'Not set');
  console.log('DMC Mint:', process.env.NEXT_PUBLIC_DMC_MINT ? 'Set' : 'Not set');
  console.log('Treasury:', process.env.NEXT_PUBLIC_TREASURY_WALLET ? 'Set' : 'Not set');
  console.log('Presale Wallet:', process.env.NEXT_PUBLIC_PRESALE_WALLET ? 'Set' : 'Not set');
  console.log('Private Key:', process.env.PRESALE_WALLET_PRIVATE_KEY ? 'Set' : 'Not set');
}

export function debugEnvironment() {
  console.log('Environment Check:');
  
  const vars = [
    'NEXT_PUBLIC_RPC',
    'NEXT_PUBLIC_USDC_MINT',
    'NEXT_PUBLIC_DMC_MINT',
    'NEXT_PUBLIC_TREASURY_WALLET',
    'NEXT_PUBLIC_PRESALE_WALLET',
    'PRESALE_WALLET_PRIVATE_KEY'
  ];

  vars.forEach(varName => {
    const value = process.env[varName];
    console.log(`${varName}: ${value ? 'Set' : 'Not Set'} (${value ? value.length : 0} chars)`);
  });
} 