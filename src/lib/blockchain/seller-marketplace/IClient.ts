import type { BlockchainAddress } from '@/types/blockchain'
import type { ProductOrder } from './ProductOrder'
import type { Chain } from 'viem'

export interface IClient {
  getChain(): Chain
  getAccountPrivateKey(): BlockchainAddress

  getOrder(
    _sellerMarketplaceAddress: BlockchainAddress,
    _productOrderId: string
  ): Promise<ProductOrder | null>
}
