import type {
  BlockchainTransactionHash,
  BlockchainAddress,
} from '@/types/blockchain'

export interface Transaction {
  hash: BlockchainTransactionHash
  senderAddress: BlockchainAddress
  amountPaid: number
  error: string
  success: boolean
  tokenAddress: BlockchainAddress | null
  timestamp: Date
  gas: number
  gasValue: string
}
