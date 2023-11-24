import type { BlockchainAddress } from '@/types/blockchain'
import type { IClient } from '../IClient'
import type { Transaction } from '../Transaction'

export class BitQueryClient implements IClient {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_networkChainId: number) {
    // Nothing to do
  }

  getTransactions(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _smartContractAddress: BlockchainAddress,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _transactions: string[]
  ): Promise<Transaction[]> {
    return Promise.resolve([])
  }
}
