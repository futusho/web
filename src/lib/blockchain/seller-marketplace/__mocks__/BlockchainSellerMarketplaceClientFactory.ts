import type { IClient } from '../IClient'
import type { IFactory } from '../IFactory'

export class BlockchainSellerMarketplaceClientFactory implements IFactory {
  getClient(networkChainId: number): IClient | null {
    switch (networkChainId) {
      default:
        return null
    }
  }
}
