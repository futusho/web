import { BitQueryClient } from './BitQueryClient'
import type { IClient } from './IClient'
import type { IFactory } from './IFactory'

export class BlockchainClientFactory implements IFactory {
  getClient(networkChainId: number): IClient | null {
    switch (networkChainId) {
      case 97:
        return new BitQueryClient(networkChainId)
      default:
        return null
    }
  }
}
