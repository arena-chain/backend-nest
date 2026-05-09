import type { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';

const pk =
  process.env.MINTER_PRIVATE_KEY?.trim() ||
  process.env.PRIVATE_KEY?.trim() ||
  '';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: './contracts',
    cache: './cache/hardhat',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {},
    amoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || '',
      accounts: pk ? [pk] : [],
    },
    anvil: {
      url: process.env.RPC_URL || 'http://127.0.0.1:8545',
      accounts: pk ? [pk] : [],
    },
  },
};

export default config;
