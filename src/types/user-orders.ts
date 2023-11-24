// FIXME: Rename to user-product-orders
import type { BlockchainAddress, BlockchainTransactionHash } from './blockchain'

export interface UserProductOrderItem {
  id: string
  productTitle: string
  priceFormatted: string
  status: string
  cancellable: boolean
}

interface OrderTransaction {
  transactionHash: BlockchainTransactionHash
  status: string
  date: string
}

export type DraftOrderCoin = {
  id: string
  productTitle: string
  priceFormatted: string
  networkChainId: number
  networkTitle: string
  sellerMarketplaceSmartContractAddress: BlockchainAddress
  networkBlockchainExplorerURL: string
  sellerWalletAddress: BlockchainAddress
  priceInCoins: string
  sellerDisplayName: string
  sellerUsername: string
}

export type DraftOrderERC20 = {
  id: string
  productTitle: string
  priceFormatted: string
  networkChainId: number
  networkTitle: string
  sellerMarketplaceSmartContractAddress: BlockchainAddress
  tokenSmartContractAddress: BlockchainAddress
  networkBlockchainExplorerURL: string
  sellerWalletAddress: BlockchainAddress
  priceInTokens: string
  sellerDisplayName: string
  sellerUsername: string
}

export type PendingOrderCoin = DraftOrderCoin & {
  transactions: OrderTransaction[]
}

export type PendingOrderERC20 = DraftOrderERC20 & {
  transactions: OrderTransaction[]
}

export type UnconfirmedOrder = {
  id: string
  productTitle: string
  transactionId: string
  transactionHash: BlockchainAddress
  networkBlockchainExplorerURL: string
}

export type ConfirmedOrder = {
  confirmedAt: string
  productTitle: string
  productContent: string
  // FIXME: Actually product without thumbnail can't be purchased
  // We need to force it to string later.
  productThumbnailImageURL: string | null
  sellerWalletAddress: BlockchainAddress
  buyerWalletAddress: BlockchainAddress
  networkBlockchainExplorerURL: string
  gas: number
  transactionFee: string
}

export type RefundedOrder = {
  productTitle: string
  refundedAt: string
}

export type CancelledOrder = {
  productTitle: string
  cancelledAt: string
}

export type UserProductOrder =
  | DraftOrderCoin
  | DraftOrderERC20
  | PendingOrderCoin
  | PendingOrderERC20
  | UnconfirmedOrder
  | ConfirmedOrder
  | RefundedOrder
  | CancelledOrder
