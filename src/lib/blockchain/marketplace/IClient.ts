import type { BlockchainAddress } from '@/types/blockchain'
import type { Chain } from 'viem'

export interface IClient {
  getChain(): Chain
  getAccountPrivateKey(): BlockchainAddress

  getSellerMarketplaceAddress(
    _marketplaceAddress: BlockchainAddress,
    _sellerId: string,
    _sellerMarketplaceId: string
  ): Promise<BlockchainAddress | null>
}
