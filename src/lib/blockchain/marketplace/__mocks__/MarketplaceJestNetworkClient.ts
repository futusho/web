import { defineChain } from 'viem'
import type { Hex } from '@/types/blockchain'
import { BaseClient } from '../BaseClient'
import type { Chain } from 'viem'

export const jestTestnet = defineChain({
  id: 1,
  name: 'Jest Testnet',
  network: 'jest',
  nativeCurrency: {
    decimals: 18,
    name: 'JEST',
    symbol: 'tJEST',
  },
  rpcUrls: {
    default: { http: ['http://localhost:3000/'] },
    public: { http: ['http://localhost:3000/'] },
  },
  blockExplorers: {
    default: { name: 'JestScan', url: 'http://testnet.localhost' },
  },
  testnet: true,
})

export class MarketplaceJestNetworkClient extends BaseClient {
  getAccountPrivateKey(): Hex {
    return '0x1e99423a4ed27608a15a2616a2b0e9e52ced330ac530edcc32c8ffc6a526aedd'
  }

  getChain(): Chain {
    return jestTestnet
  }
}
