import fetch from 'node-fetch'
import type {
  BlockchainAddress,
  BlockchainTransactionHash,
} from '@/types/blockchain'
import type { IClient } from './IClient'
import type { Transaction } from './Transaction'
import type { RequestInit } from 'node-fetch'

interface BitQueryTransaction {
  error: string
  success: boolean
  sender: {
    address: string
  }
  amount: number
  currency: {
    address: string
    name: string
    tokenId: string
    symbol: string
    tokenType: string
    decimals: number
  }
  date: {
    date: string
  }
  gas: number
  gasValue: number
  gasPrice: number
  hash: string
  block: {
    timestamp: {
      iso8601: string
    }
  }
}

interface BitQueryResponse {
  ethereum: {
    transactions: BitQueryTransaction[]
  }
}

interface GraphQLResponse {
  data: BitQueryResponse
}

interface GraphQLVariables {
  network: string
  smart_contract_address: string
  transactions: string[]
  time_after: string
}

interface GraphQLRequest {
  query: string
  variables: string
}

export class BitQueryClient implements IClient {
  private network: string

  constructor(networkChainId: number) {
    this.network = this.getNetworkByChain(networkChainId)
  }

  async getTransactions(
    smartContractAddress: BlockchainAddress,
    transactions: string[]
  ): Promise<Transaction[]> {
    const response = await this.fetchTransactions(
      smartContractAddress,
      transactions
    )

    const tx: Transaction[] = []

    response.data.ethereum.transactions.forEach((transaction) => {
      tx.push({
        hash: transaction.hash as BlockchainTransactionHash,
        senderAddress: transaction.sender.address as BlockchainAddress,
        amountPaid: transaction.amount,
        error: transaction.error,
        success: transaction.success,
        tokenAddress:
          transaction.currency.address === '-'
            ? null
            : (transaction.currency.address as BlockchainAddress),
        timestamp: new Date(transaction.block.timestamp.iso8601),
        gas: transaction.gas,
        gasValue: transaction.gasValue.toString(),
      })
    })

    return tx
  }

  private getNetworkByChain(networkChainId: number): string {
    switch (networkChainId) {
      case 97:
        return 'bsc_testnet'
      default:
        throw new Error(`Chain ${networkChainId} is not supported`)
    }
  }

  private async fetchTransactions(
    smartContractAddress: BlockchainAddress,
    transactions: string[]
  ): Promise<GraphQLResponse> {
    try {
      const url = 'https://graphql.bitquery.io'
      const apiKey = process.env.BIT_QUERY_API_KEY
      const timeAfter = this.getOneDayAgo()

      const variables: GraphQLVariables = {
        network: this.network,
        smart_contract_address: smartContractAddress,
        transactions: transactions,
        time_after: timeAfter,
      }

      const data: GraphQLRequest = {
        query: `query MyQuery($network: EthereumNetwork, $smart_contract_address: String, $time_after: ISO8601DateTime, $transactions: [String!]) {
          ethereum(network: $network) {
            transactions(
              txHash: {in: $transactions}
              time: {after: $time_after}
              txTo: {is: $smart_contract_address}
            ) {
              error
              success
              sender {
                address
              }
              amount
              currency {
                address
                tokenId
              }
              gas
              gasValue
              hash
              block {
                timestamp {
                  iso8601
                }
              }
            }
          }
        }`,
        variables: JSON.stringify(variables),
      }

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify(data),
        redirect: 'follow',
      } as RequestInit

      const response = await fetch(url, requestOptions)

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      return (await response.json()) as GraphQLResponse
    } catch (error) {
      throw new Error(`Unable to get transactions: ${error}`)
    }
  }

  private getOneDayAgo = (): string => {
    const now = new Date()
    now.setHours(now.getHours() - 24)
    return now.toISOString()
  }
}
