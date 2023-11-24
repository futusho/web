import { BinanceSmartChainClient } from './BinanceSmartChainClient'
import { EthereumClient } from './EthereumClient'
import { PolygonClient } from './PolygonClient'
import type { IClient } from './IClient'
import type { IFactory } from './IFactory'

export class BlockchainSellerMarketplaceClientFactory implements IFactory {
  getClient(networkChainId: number): IClient | null {
    switch (networkChainId) {
      case 1:
        return new EthereumClient('mainnet')
      case 11155111:
        return new EthereumClient('sepolia')
      case 56:
        return new BinanceSmartChainClient('mainnet')
      case 97:
        return new BinanceSmartChainClient('testnet')
      case 137:
        return new PolygonClient('mainnet')
      case 80001:
        return new PolygonClient('mumbai')
      default:
        return null
    }
  }
}
