import { debugEnvironment } from '../utils/debug';
import { settings } from '../utils/settings';

console.log('Verifying environment setup...');
debugEnvironment();

console.log('\nVerifying settings...');
console.log('Settings:', {
  ...settings,
  presaleWalletPrivateKey: '[HIDDEN]'
});

console.log('\nEnvironment verification complete!'); 