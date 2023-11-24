import { createPublicClient, http, zeroAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sellerMarketplaceABI } from '@/lib/blockchain/generated'
import type { BlockchainAddress } from '@/types/blockchain'
import type { IClient } from './IClient'
import type { ProductOrder } from './ProductOrder'
import type { Chain, PrivateKeyAccount, PublicClient } from 'viem'

export abstract class BaseClient implements IClient {
  abstract getChain(): Chain
  abstract getAccountPrivateKey(): BlockchainAddress

  protected networkType: string
  private client: PublicClient
  private account: PrivateKeyAccount

  constructor(networkType: string) {
    this.networkType = networkType

    this.client = createPublicClient({
      chain: this.getChain(),
      transport: http(),
    })

    // FIXME: I think there will be a problem when we try to make many requests simultaneously.
    // Blockchain network can ban us for that.
    // Maybe it would be good to use Infura or other providers to make requests.
    this.account = privateKeyToAccount(this.getAccountPrivateKey())
  }

  getOrder = async (
    sellerMarketplaceAddress: BlockchainAddress,
    productOrderId: string
  ): Promise<ProductOrder | null> => {
    const result = await this.client.readContract({
      abi: sellerMarketplaceABI,
      functionName: 'getOrder',
      address: sellerMarketplaceAddress,
      args: [productOrderId],
      account: this.account,
    })

    // result[0] - exists
    // result[1] - buyerAddress
    // result[2] - price
    // result[3] - paymentContract

    if (!result[0]) {
      return null
    }

    if (result[1].toLowerCase() === zeroAddress) {
      throw new Error('Unexpected zero address for buyer address')
    }

    return {
      buyerAddress: result[1] as BlockchainAddress,
      price: result[2],
      paymentContract: result[3] as BlockchainAddress,
    }
  }
}
