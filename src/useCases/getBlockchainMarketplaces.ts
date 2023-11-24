import { prisma } from '@/lib/prisma'
import type { BlockchainAddress } from '@/types/blockchain'

export interface BlockchainMarketplace {
  id: string
  networkTitle: string
  networkChainId: number
  smartContractAddress: BlockchainAddress
  commissionRate: number
  tokens: string[]
}

export type Result = BlockchainMarketplace[]

export const getBlockchainMarketplaces = async (): Promise<Result> => {
  const marketplaces = await prisma.networkMarketplace.findMany({
    include: {
      network: {
        select: {
          title: true,
          chainId: true,
        },
      },
      tokens: {
        select: {
          symbol: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return marketplaces.map((marketplace) => ({
    id: marketplace.id,
    networkTitle: marketplace.network.title,
    networkChainId: marketplace.network.chainId,
    smartContractAddress: marketplace.smartContractAddress as BlockchainAddress,
    commissionRate: marketplace.commissionRate,
    tokens: marketplace.tokens.map((token) => token.symbol),
  }))
}
