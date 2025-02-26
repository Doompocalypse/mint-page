import { Connection, TransactionSignature } from '@solana/web3.js';

export const verifyTransaction = async (
  signature: TransactionSignature,
  connection: Connection
): Promise<boolean> => {
  try {
    const status = await connection.confirmTransaction(signature, 'confirmed');
    if (status.value.err) {
      throw new Error('Transaction failed');
    }
    
    const tx = await connection.getTransaction(signature);
    if (!tx) {
      throw new Error('Transaction not found');
    }

    // Add additional verification logic here
    
    return true;
  } catch (error) {
    console.error('Transaction verification failed:', error);
    return false;
  }
}; 