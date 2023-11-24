import type { BlockchainAddress, BlockchainTransactionHash } from './blockchain'

export type DraftMarketplace = {
  id: string
  sellerId: string
  networkChainId: number
  networkTitle: string
  networkMarketplaceSmartContractAddress: BlockchainAddress
  blockchainExplorerURL: string
}

export type UnconfirmedMarketplace = {
  id: string
  networkTitle: string
  transactionHash: BlockchainTransactionHash
  blockchainExplorerURL: string
}

export type ConfirmedMarketplace = {
  networkTitle: string
  networkMarketplaceSmartContractAddress: BlockchainAddress
  marketplaceSmartContractAddress: BlockchainAddress
  ownerWalletAddress: BlockchainAddress
  commissionRate: number
  confirmedAt: string
  gas: number
  transactionFee: string
}

export type UserMarketplace =
  | DraftMarketplace
  | UnconfirmedMarketplace
  | ConfirmedMarketplace

export interface AvailableBlockchainMarketplace {
  id: string
  networkTitle: string
  networkChainId: number
  smartContractAddress: BlockchainAddress
  commissionRate: number
  tokens: string[]
}

export interface UserMarketplaceItem {
  id: string
  networkTitle: string
  networkMarketplaceSmartContractAddress: BlockchainAddress
  smartContractAddress: BlockchainAddress | null
  ownerWalletAddress: BlockchainAddress | null
  commissionRate: number
  status: string
  tokens: string[]
}
