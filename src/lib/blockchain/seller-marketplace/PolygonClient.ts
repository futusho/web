import { polygon, polygonMumbai } from 'viem/chains'
import type { BlockchainAddress } from '@/types/blockchain'
import { BaseClient } from './BaseClient'
import type { Chain } from 'viem'

export type NetworkType = 'mainnet' | 'mumbai'

export class PolygonClient extends BaseClient {
  getAccountPrivateKey(): BlockchainAddress {
    return process.env.POLYGON_ACCOUNT_PRIVATE_KEY as BlockchainAddress
  }

  getChain(): Chain {
    switch (this.networkType) {
      case 'mumbai':
        return polygonMumbai
      case 'mainnet':
        return polygon
      default:
        throw new Error(`Unsupported network type: ${this.networkType}`)
    }
  }
}
