import type { BlockchainAddress } from '@/types/blockchain'

export interface ProductOrder {
  buyerAddress: BlockchainAddress
  price: bigint
  paymentContract: BlockchainAddress
}
