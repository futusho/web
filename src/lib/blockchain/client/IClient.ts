import type { BlockchainAddress } from '@/types/blockchain'
import type { Transaction } from './Transaction'

export interface IClient {
  getTransactions(
    _smartContractAddress: BlockchainAddress,
    _transactions: string[]
  ): Promise<Transaction[]>
}
