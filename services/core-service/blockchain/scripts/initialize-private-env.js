import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { coreEnvPath, upsertPrivateEnv } from './private-env.js';

dotenv.config({ path: coreEnvPath, override: false });

let wallet;
if (process.env.RELAYER_PRIVATE_KEY) {
  wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY);
} else {
  wallet = ethers.Wallet.createRandom();
}

const blockchainEnabled = (process.env.BLOCKCHAIN_ENABLED || 'false') === 'true';

await upsertPrivateEnv({
  BLOCKCHAIN_ENABLED: String(blockchainEnabled),
  BLOCKCHAIN_RPC_URL:
    process.env.BLOCKCHAIN_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  RELAYER_PRIVATE_KEY: wallet.privateKey,
  ATTESTATION_CONTRACT_ADDRESS: process.env.ATTESTATION_CONTRACT_ADDRESS || '',
  BLOCKCHAIN_NETWORK: 'sepolia',
  BLOCKCHAIN_CHAIN_ID: '11155111',
  BLOCKCHAIN_DEPLOYMENT_BLOCK: process.env.BLOCKCHAIN_DEPLOYMENT_BLOCK || '0',
  BLOCKCHAIN_EXPLORER_URL: 'https://sepolia.etherscan.io/tx/',
  BLOCKCHAIN_CONFIRMATIONS: '1',
  BLOCKCHAIN_TX_TIMEOUT_SECONDS: '180',
  HIGH_VALUE_THRESHOLD_ARS: '2000000',
  OUTBOX_LOCK_TIMEOUT_SECONDS: process.env.OUTBOX_LOCK_TIMEOUT_SECONDS || '300'
});

console.log(
  JSON.stringify(
    {
      message: 'Configuración blockchain privada inicializada. La clave no se muestra.',
      network: 'sepolia',
      relayerAddress: wallet.address,
      blockchainEnabled
    },
    null,
    2
  )
);
