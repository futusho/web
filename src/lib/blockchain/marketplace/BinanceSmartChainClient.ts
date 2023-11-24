import { bsc, bscTestnet } from 'viem/chains'
import type { BlockchainAddress } from '@/types/blockchain'
import { BaseClient } from './BaseClient'
import type { Chain } from 'viem'

export type NetworkType = 'mainnet' | 'testnet'

export class BinanceSmartChainClient extends BaseClient {
  getAccountPrivateKey(): BlockchainAddress {
    return process.env.BINANCE_ACCOUNT_PRIVATE_KEY as BlockchainAddress
  }

  getChain(): Chain {
    switch (this.networkType) {
      case 'testnet':
        return bscTestnet
      case 'mainnet':
        return bsc
      default:
        throw new Error(`Unsupported network type: ${this.networkType}`)
    }
  }
}
