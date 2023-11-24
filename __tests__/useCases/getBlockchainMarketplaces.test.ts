import { prisma } from '@/lib/prisma'
import { getBlockchainMarketplaces } from '@/useCases/getBlockchainMarketplaces'
import { cleanDatabase } from '../helpers'
import type { NetworkMarketplace } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getBlockchainMarketplaces', () => {
  describe('when everything is good', () => {
    let networkMarketplace1: NetworkMarketplace,
      networkMarketplace2: NetworkMarketplace

    beforeEach(async () => {
      const network1 = await prisma.network.create({
        data: {
          title: 'Network 1',
          chainId: 1,
          blockchainExplorerURL: 'https://localhost1/',
        },
      })

      const network2 = await prisma.network.create({
        data: {
          title: 'Network 2',
          chainId: 2,
          blockchainExplorerURL: 'https://localhost2/',
        },
      })

      networkMarketplace1 = await prisma.networkMarketplace.create({
        data: {
          networkId: network1.id,
          smartContractAddress: '0xDEADBEEF1',
          commissionRate: 3,
        },
      })

      await prisma.networkMarketplaceToken.create({
        data: {
          marketplaceId: networkMarketplace1.id,
          decimals: 18,
          symbol: 'COIN1',
        },
      })

      networkMarketplace2 = await prisma.networkMarketplace.create({
        data: {
          networkId: network2.id,
          smartContractAddress: '0xDEADBEEF2',
          commissionRate: 4,
        },
      })

      await prisma.networkMarketplaceToken.create({
        data: {
          marketplaceId: networkMarketplace2.id,
          decimals: 18,
          symbol: 'COIN2',
        },
      })
    })

    it('returns marketplaces', async () => {
      const networkMarketplaces = await getBlockchainMarketplaces()

      expect(networkMarketplaces).toHaveLength(2)

      expect(networkMarketplaces[0]).toEqual({
        id: networkMarketplace2.id,
        networkTitle: 'Network 2',
        networkChainId: 2,
        commissionRate: 4,
        smartContractAddress: '0xDEADBEEF2',
        tokens: ['COIN2'],
      })

      expect(networkMarketplaces[1]).toEqual({
        id: networkMarketplace1.id,
        networkTitle: 'Network 1',
        networkChainId: 1,
        commissionRate: 3,
        smartContractAddress: '0xDEADBEEF1',
        tokens: ['COIN1'],
      })
    })
  })
})
