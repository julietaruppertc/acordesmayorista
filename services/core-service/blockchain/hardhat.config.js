import hardhatEthers from '@nomicfoundation/hardhat-ethers';
import hardhatNodeTestRunner from '@nomicfoundation/hardhat-node-test-runner';
import { defineConfig } from 'hardhat/config';

export default defineConfig({
  plugins: [hardhatEthers, hardhatNodeTestRunner],
  solidity: {
    profiles: {
      default: {
        version: '0.8.28'
      },
      production: {
        version: '0.8.28',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    }
  }
});
