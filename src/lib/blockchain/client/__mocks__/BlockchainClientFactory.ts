import type { IClient } from '../IClient'
import type { IFactory } from '../IFactory'

export class BlockchainClientFactory implements IFactory {
  getClient(networkChainId: number): IClient | null {
    switch (networkChainId) {
      default:
        return null
    }
  }
}
