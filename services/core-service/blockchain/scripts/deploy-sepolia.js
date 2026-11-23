import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ethers } from 'ethers';
import { coreEnvPath, upsertPrivateEnv } from './private-env.js';

dotenv.config({ path: coreEnvPath, override: false });

const SEPOLIA_CHAIN_ID = 11155111n;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const artifactPath = path.resolve(
  scriptDirectory,
  '../artifacts/contracts/AcordesOrderAttestation.sol/AcordesOrderAttestation.json'
);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} es obligatorio para desplegar en Sepolia.`);
  return value;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(required('BLOCKCHAIN_RPC_URL'));
  const wallet = new ethers.Wallet(required('RELAYER_PRIVATE_KEY'), provider);
  const network = await provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      `RPC incorrecto: se esperaba Sepolia (${SEPOLIA_CHAIN_ID}) y respondió ${network.chainId}.`
    );
  }

  const balance = await provider.getBalance(wallet.address);
  if (balance === 0n) {
    throw new Error(`La billetera ${wallet.address} no tiene Sepolia ETH para desplegar.`);
  }

  const artifact = JSON.parse(await readFile(artifactPath, 'utf8'));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(wallet.address);
  const deploymentTransaction = contract.deploymentTransaction();
  const receipt = await deploymentTransaction.wait(1);
  const contractAddress = await contract.getAddress();

  await upsertPrivateEnv({
    BLOCKCHAIN_ENABLED: 'true',
    ATTESTATION_CONTRACT_ADDRESS: contractAddress,
    BLOCKCHAIN_DEPLOYMENT_BLOCK: String(receipt.blockNumber),
    BLOCKCHAIN_NETWORK: 'sepolia',
    BLOCKCHAIN_CHAIN_ID: String(network.chainId)
  });

  console.log(
    JSON.stringify(
      {
        network: 'sepolia',
        chainId: Number(network.chainId),
        deployerAndRelayer: wallet.address,
        contractAddress,
        deploymentTransactionHash: deploymentTransaction.hash,
        deploymentBlock: receipt.blockNumber
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[BLOCKCHAIN DEPLOY] ${error.message}`);
  process.exitCode = 1;
});
