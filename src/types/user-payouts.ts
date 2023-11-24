import type { BlockchainAddress, BlockchainTransactionHash } from './blockchain'

export interface UserPayoutItem {
  id: string
  amountFormatted: string
  networkTitle: string
  date: string
  status: string
}

export interface TokenBalanceForWithdrawal {
  userMarketplaceId: string
  userMarketplaceTokenId: string
  networkTitle: string
  amountFormatted: string
  marketplaceSmartContractAddress: BlockchainAddress
  tokenSmartContractAddress: BlockchainAddress | null
}

interface PayoutTransaction {
  transactionHash: BlockchainTransactionHash
  status: string
  date: string
}

type DraftPayout = {
  id: string
  networkChainId: number
  sellerMarketplaceSmartContractAddress: BlockchainAddress
  networkBlockchainExplorerURL: string
  amountFormatted: string
}

export type DraftPayoutCoin = DraftPayout & {
  amountInCoins: string
}

export type DraftPayoutERC20 = DraftPayout & {
  tokenSmartContractAddress: BlockchainAddress
  amountInTokens: string
}

export type PendingPayoutCoin = DraftPayoutCoin & {
  transactions: PayoutTransaction[]
}

export type PendingPayoutERC20 = DraftPayoutERC20 & {
  transactions: PayoutTransaction[]
}

export type UnconfirmedPayout = {
  id: string
  transactionId: string
  transactionHash: BlockchainAddress
  networkBlockchainExplorerURL: string
}

export type ConfirmedPayout = {
  confirmedAt: string
  gas: number
  transactionFee: string
}

export type CancelledPayout = {
  cancelledAt: string
}

export type UserPayout =
  | DraftPayoutCoin
  | DraftPayoutERC20
  | PendingPayoutCoin
  | PendingPayoutERC20
  | UnconfirmedPayout
  | ConfirmedPayout
  | CancelledPayout
