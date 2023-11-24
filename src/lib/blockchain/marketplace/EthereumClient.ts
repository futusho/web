import { mainnet, sepolia } from 'viem/chains'
import type { BlockchainAddress } from '@/types/blockchain'
import { BaseClient } from './BaseClient'
import type { Chain } from 'viem'

export type NetworkType = 'mainnet' | 'sepolia'

export class EthereumClient extends BaseClient {
  getAccountPrivateKey(): BlockchainAddress {
    return process.env.ETHEREUM_ACCOUNT_PRIVATE_KEY as BlockchainAddress
  }

  getChain(): Chain {
    switch (this.networkType) {
      case 'sepolia':
        return sepolia
      case 'mainnet':
        return mainnet
      default:
        throw new Error(`Unsupported network type: ${this.networkType}`)
    }
  }
}
