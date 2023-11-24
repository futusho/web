import { createPublicClient, http, zeroAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { futushoABI } from '@/lib/blockchain/generated'
import type { BlockchainAddress } from '@/types/blockchain'
import type { IClient } from './IClient'
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

    this.account = privateKeyToAccount(this.getAccountPrivateKey())
  }

  // FIXME: It will be good to add another function getSellerMarketplacesBatch
  // which accepts an array of sellerId and returns an array of marketplaces,
  // just to decrease number of calls from the frontend
  async getSellerMarketplaceAddress(
    marketplaceAddress: BlockchainAddress,
    sellerId: string,
    sellerMarketplaceId: string
  ): Promise<BlockchainAddress | null> {
    const result = await this.client.readContract({
      abi: futushoABI,
      functionName: 'getSellerMarketplace',
      address: marketplaceAddress,
      args: [sellerId, sellerMarketplaceId],
      account: this.account,
    })

    // result[0] - exists
    // result[1] - marketplaceAddress

    if (!result[0]) {
      return null
    }

    if (result[1].toLowerCase() === zeroAddress) {
      throw new Error('Unexpected zero address for seller marketplace')
    }

    return result[1] as BlockchainAddress
  }
}
